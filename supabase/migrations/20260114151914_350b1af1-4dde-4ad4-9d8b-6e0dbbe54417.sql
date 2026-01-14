-- =====================================================
-- ROLLBACK: Откат БД к состоянию на 10 января 2026
-- Удаление миграций 20260111132358 и 20260113075017
-- =====================================================

-- 1. Удалить триггер и функцию cleanup
DROP TRIGGER IF EXISTS trg_cleanup_expired_waiting ON public.poker_waiting_list;
DROP FUNCTION IF EXISTS public.cleanup_expired_waiting_list();

-- 2. Удалить RLS политики для poker_player_sessions (добавленные 11 янв)
DROP POLICY IF EXISTS "Service role can insert sessions" ON public.poker_player_sessions;
DROP POLICY IF EXISTS "Service role can update sessions" ON public.poker_player_sessions;
DROP POLICY IF EXISTS "Service role can delete sessions" ON public.poker_player_sessions;

-- 3. Удалить таблицу poker_waiting_list
DROP TABLE IF EXISTS public.poker_waiting_list CASCADE;

-- 4. Удалить добавленные колонки из poker_table_players
ALTER TABLE public.poker_table_players 
  DROP COLUMN IF EXISTS sit_out_at,
  DROP COLUMN IF EXISTS sit_out_reason,
  DROP COLUMN IF EXISTS missed_blinds,
  DROP COLUMN IF EXISTS auto_post_blinds,
  DROP COLUMN IF EXISTS leave_next_bb,
  DROP COLUMN IF EXISTS away_since,
  DROP COLUMN IF EXISTS return_warning_sent_at,
  DROP COLUMN IF EXISTS session_started_at;

-- 5. Удалить записи миграций из истории
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN ('20260113075017', '20260111132358');