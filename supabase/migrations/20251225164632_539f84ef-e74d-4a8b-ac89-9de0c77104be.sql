-- =====================================================
-- ИЗМЕНЕНИЕ СИСТЕМЫ БИЛЕТОВ НА УНИВЕРСАЛЬНЫЕ ВХОДЫ
-- =====================================================

-- 1. Добавляем новые колонки для универсальных входов
ALTER TABLE tournament_tickets 
ADD COLUMN IF NOT EXISTS entry_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'offline_entry';

-- Комментарий: entry_count = количество входов (1 вход = 1 участие в любом офлайн турнире)
-- entry_type: 'offline_entry' - вход на офлайн, 'special_entry' - особый вход

-- 2. Обновляем функцию выдачи билетов для использования входов
CREATE OR REPLACE FUNCTION public.issue_offline_tickets_for_winners(
  p_tournament_id UUID,
  p_top_positions INTEGER DEFAULT 3,
  p_entries_per_position INTEGER[] DEFAULT ARRAY[3, 2, 1]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner RECORD;
  v_tickets_issued INTEGER := 0;
  v_total_entries INTEGER := 0;
  v_entries INTEGER;
  v_tournament_name TEXT;
BEGIN
  -- Получаем название турнира
  SELECT name INTO v_tournament_name 
  FROM online_poker_tournaments 
  WHERE id = p_tournament_id;

  -- Выдаем билеты топ N игрокам
  FOR v_winner IN 
    SELECT player_id, finish_position 
    FROM online_poker_tournament_participants
    WHERE tournament_id = p_tournament_id
      AND finish_position IS NOT NULL
      AND finish_position <= p_top_positions
    ORDER BY finish_position
  LOOP
    -- Определяем количество входов для позиции
    IF v_winner.finish_position <= array_length(p_entries_per_position, 1) THEN
      v_entries := p_entries_per_position[v_winner.finish_position];
    ELSE
      v_entries := 1;
    END IF;

    -- Создаем билет с входами
    INSERT INTO tournament_tickets (
      player_id,
      won_from_tournament_id,
      finish_position,
      ticket_value,
      entry_count,
      entry_type,
      expires_at
    ) VALUES (
      v_winner.player_id,
      p_tournament_id,
      v_winner.finish_position,
      v_entries * 1000, -- Номинальная стоимость для отображения
      v_entries,
      'offline_entry',
      now() + interval '90 days' -- 90 дней на использование
    );
    
    v_tickets_issued := v_tickets_issued + 1;
    v_total_entries := v_total_entries + v_entries;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'tickets_issued', v_tickets_issued,
    'total_entries', v_total_entries,
    'tournament_name', v_tournament_name,
    'entries_structure', p_entries_per_position
  );
END;
$$;

-- 3. Функция для использования входа при регистрации на офлайн турнир
CREATE OR REPLACE FUNCTION public.use_offline_entry(
  p_player_id UUID,
  p_offline_tournament_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_remaining_entries INTEGER;
BEGIN
  -- Находим активный билет с доступными входами
  SELECT * INTO v_ticket
  FROM tournament_tickets
  WHERE player_id = p_player_id
    AND status = 'active'
    AND entry_count > 0
    AND (expires_at IS NULL OR expires_at > now())
    AND entry_type = 'offline_entry'
  ORDER BY expires_at ASC NULLS LAST, created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Нет доступных входов'
    );
  END IF;

  -- Уменьшаем количество входов
  v_remaining_entries := v_ticket.entry_count - 1;

  IF v_remaining_entries <= 0 THEN
    -- Если входы закончились - помечаем билет как использованный
    UPDATE tournament_tickets
    SET entry_count = 0,
        status = 'used',
        used_at = now(),
        offline_tournament_id = p_offline_tournament_id
    WHERE id = v_ticket.id;
  ELSE
    -- Уменьшаем количество входов
    UPDATE tournament_tickets
    SET entry_count = v_remaining_entries
    WHERE id = v_ticket.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket.id,
    'remaining_entries', v_remaining_entries,
    'offline_tournament_id', p_offline_tournament_id
  );
END;
$$;

-- 4. Функция для получения общего количества доступных входов у игрока
CREATE OR REPLACE FUNCTION public.get_player_available_entries(
  p_player_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_entries INTEGER;
BEGIN
  SELECT COALESCE(SUM(entry_count), 0) INTO v_total_entries
  FROM tournament_tickets
  WHERE player_id = p_player_id
    AND status = 'active'
    AND entry_count > 0
    AND (expires_at IS NULL OR expires_at > now())
    AND entry_type = 'offline_entry';

  RETURN v_total_entries;
END;
$$;

-- 5. Функция для автоматического расчета структуры призов на основе кол-ва участников
CREATE OR REPLACE FUNCTION public.generate_online_tournament_payout_structure(
  p_tournament_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participants_count INTEGER;
  v_payout_percentages NUMERIC[];
  v_entries_structure INTEGER[];
  v_prize_pool INTEGER;
  v_rps_pool INTEGER;
  v_tournament RECORD;
  v_payout RECORD;
  v_position INTEGER;
BEGIN
  -- Получаем информацию о турнире
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Турнир не найден');
  END IF;

  -- Считаем участников
  SELECT COUNT(*) INTO v_participants_count
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id
    AND status IN ('registered', 'playing');

  -- Рассчитываем призовой фонд
  v_prize_pool := calculate_online_tournament_prize_pool(p_tournament_id);
  v_rps_pool := calculate_online_tournament_rps_pool(p_tournament_id);

  -- Определяем структуру выплат и входов в зависимости от кол-ва участников
  IF v_participants_count >= 50 THEN
    -- Топ 6 призовых мест для 50+ игроков
    v_payout_percentages := ARRAY[35, 25, 15, 10, 8, 7]::NUMERIC[];
    v_entries_structure := ARRAY[5, 4, 3, 2, 1, 1];
  ELSIF v_participants_count >= 30 THEN
    -- Топ 4 для 30-49 игроков
    v_payout_percentages := ARRAY[40, 30, 20, 10]::NUMERIC[];
    v_entries_structure := ARRAY[4, 3, 2, 1];
  ELSIF v_participants_count >= 20 THEN
    -- Топ 3 для 20-29 игроков
    v_payout_percentages := ARRAY[50, 30, 20]::NUMERIC[];
    v_entries_structure := ARRAY[3, 2, 1];
  ELSIF v_participants_count >= 10 THEN
    -- Топ 2 для 10-19 игроков
    v_payout_percentages := ARRAY[60, 40]::NUMERIC[];
    v_entries_structure := ARRAY[2, 1];
  ELSE
    -- Победитель забирает всё для менее 10 игроков
    v_payout_percentages := ARRAY[100]::NUMERIC[];
    v_entries_structure := ARRAY[1];
  END IF;

  -- Очищаем старые записи выплат
  DELETE FROM online_poker_tournament_payouts WHERE tournament_id = p_tournament_id;

  -- Создаем новые записи
  FOR v_position IN 1..array_length(v_payout_percentages, 1) LOOP
    INSERT INTO online_poker_tournament_payouts (
      tournament_id,
      position,
      percentage,
      amount
    ) VALUES (
      p_tournament_id,
      v_position,
      v_payout_percentages[v_position],
      ROUND(v_rps_pool * v_payout_percentages[v_position] / 100)
    );
  END LOOP;

  -- Обновляем турнир
  UPDATE online_poker_tournaments
  SET prize_pool = v_prize_pool,
      tickets_for_top = array_length(v_entries_structure, 1)
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object(
    'success', true,
    'participants_count', v_participants_count,
    'prize_pool', v_prize_pool,
    'rps_pool', v_rps_pool,
    'payout_places', array_length(v_payout_percentages, 1),
    'payout_percentages', v_payout_percentages,
    'entries_structure', v_entries_structure
  );
END;
$$;

-- 6. Обновляем существующие билеты, устанавливая entry_count = 1
UPDATE tournament_tickets 
SET entry_count = 1, 
    entry_type = 'offline_entry'
WHERE entry_count IS NULL;