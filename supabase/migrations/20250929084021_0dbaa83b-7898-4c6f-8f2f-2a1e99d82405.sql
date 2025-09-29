-- Обновляем базу данных для соответствия договору оферты
-- Переименовываем поля для соответствия терминологии из договора

-- Добавляем новые поля с правильной терминологией
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS participation_fee INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reentry_fee INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_fee INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reentry_chips INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_chips INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reentry_end_level INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS additional_level INTEGER DEFAULT 7;

-- Копируем данные из старых полей в новые
UPDATE tournaments SET
  participation_fee = COALESCE(buy_in, 0),
  reentry_fee = COALESCE(rebuy_cost, 0),
  additional_fee = COALESCE(addon_cost, 0),
  reentry_chips = COALESCE(rebuy_chips, 0),
  additional_chips = COALESCE(addon_chips, 0),
  reentry_end_level = COALESCE(rebuy_end_level, 6),
  additional_level = COALESCE(addon_level, 7);

-- Добавляем новые поля для регистраций
ALTER TABLE tournament_registrations 
ADD COLUMN IF NOT EXISTS reentries INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_sets INTEGER DEFAULT 0;

-- Копируем данные из старых полей
UPDATE tournament_registrations SET
  reentries = COALESCE(rebuys, 0),
  additional_sets = COALESCE(addons, 0);

-- Обновляем поля для расчета RPS баллов
ALTER TABLE tournament_payouts 
ADD COLUMN IF NOT EXISTS rps_points INTEGER DEFAULT 0;

-- Функция для конвертации денежных сумм в RPS баллы (1000₽ = 100 баллов)
CREATE OR REPLACE FUNCTION convert_amount_to_rps(amount_rubles INTEGER)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT ROUND(amount_rubles / 10.0)::INTEGER;
$$;

-- Заполняем RPS баллы на основе старых денежных сумм
UPDATE tournament_payouts SET
  rps_points = convert_amount_to_rps(amount);

-- Создаем функцию для расчета общего фонда RPS баллов
CREATE OR REPLACE FUNCTION calculate_tournament_rps_pool(tournament_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_rps INTEGER := 0;
  t_participation_fee INTEGER;
  t_reentry_fee INTEGER;
  t_additional_fee INTEGER;
  participant_count INTEGER;
  total_reentries INTEGER;
  total_additional_sets INTEGER;
BEGIN
  -- Получаем данные турнира
  SELECT participation_fee, reentry_fee, additional_fee 
  INTO t_participation_fee, t_reentry_fee, t_additional_fee
  FROM tournaments 
  WHERE id = tournament_id_param;

  -- Получаем статистику регистраций
  SELECT 
    COUNT(*),
    COALESCE(SUM(reentries), 0),
    COALESCE(SUM(additional_sets), 0)
  INTO participant_count, total_reentries, total_additional_sets
  FROM tournament_registrations 
  WHERE tournament_id = tournament_id_param;

  -- Рассчитываем общий фонд RPS баллов
  total_rps := convert_amount_to_rps(
    (participant_count * COALESCE(t_participation_fee, 0)) +
    (total_reentries * COALESCE(t_reentry_fee, 0)) +
    (total_additional_sets * COALESCE(t_additional_fee, 0))
  );

  RETURN total_rps;
END;
$$;

-- Создаем представление для отображения турниров с правильной терминологией
CREATE OR REPLACE VIEW tournaments_display AS
SELECT 
  id,
  name,
  description,
  participation_fee,
  reentry_fee,
  additional_fee,
  starting_chips,
  reentry_chips,
  additional_chips,
  max_players,
  start_time,
  status,
  tournament_format,
  current_level,
  current_small_blind,
  current_big_blind,
  timer_duration,
  timer_remaining,
  reentry_end_level,
  additional_level,
  break_start_level,
  is_published,
  is_archived,
  finished_at,
  voice_control_enabled,
  last_voice_command,
  voice_session_id,
  created_at,
  updated_at,
  -- Расчетные поля
  calculate_tournament_rps_pool(id) as total_rps_pool,
  -- Количество участников
  (SELECT COUNT(*) FROM tournament_registrations WHERE tournament_id = tournaments.id) as participant_count,
  -- Количество повторных входов
  (SELECT COALESCE(SUM(reentries), 0) FROM tournament_registrations WHERE tournament_id = tournaments.id) as total_reentries,
  -- Количество дополнительных наборов
  (SELECT COALESCE(SUM(additional_sets), 0) FROM tournament_registrations WHERE tournament_id = tournaments.id) as total_additional_sets
FROM tournaments;

-- Комментарии для документации новых полей
COMMENT ON COLUMN tournaments.participation_fee IS 'Организационный взнос за стандартный набор игрового инвентаря (в рублях)';
COMMENT ON COLUMN tournaments.reentry_fee IS 'Стоимость дополнительной аренды набора инвентаря (повторный вход)';
COMMENT ON COLUMN tournaments.additional_fee IS 'Стоимость дополнительного стандартного набора инвентаря';
COMMENT ON COLUMN tournaments.reentry_chips IS 'Количество фишек при повторном входе';
COMMENT ON COLUMN tournaments.additional_chips IS 'Количество фишек в дополнительном наборе';
COMMENT ON COLUMN tournaments.reentry_end_level IS 'До какого уровня блайндов доступен повторный вход';
COMMENT ON COLUMN tournaments.additional_level IS 'На каком уровне блайндов доступен дополнительный набор';

COMMENT ON COLUMN tournament_registrations.reentries IS 'Количество повторных входов (дополнительная аренда наборов)';
COMMENT ON COLUMN tournament_registrations.additional_sets IS 'Количество дополнительных стандартных наборов инвентаря';

COMMENT ON COLUMN tournament_payouts.rps_points IS 'Количество RPS баллов для данного места (вместо денежной суммы)';