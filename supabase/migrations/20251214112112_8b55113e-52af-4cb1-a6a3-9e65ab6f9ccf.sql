-- Fix 1: Добавить search_path к функции protect_user_role
CREATE OR REPLACE FUNCTION public.protect_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Запрещаем изменение user_role обычным пользователям
  IF OLD.user_role IS DISTINCT FROM NEW.user_role THEN
    -- Только service_role может менять роли
    IF NOT (current_setting('role', true) = 'service_role' OR current_setting('request.jwt.claim.role', true) = 'service_role') THEN
      RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix 2: Пересоздать view tournaments_display как SECURITY INVOKER (по умолчанию)
DROP VIEW IF EXISTS public.tournaments_display;

CREATE VIEW public.tournaments_display AS
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
    calculate_tournament_rps_pool(id) AS total_rps_pool,
    (SELECT count(*) FROM tournament_registrations WHERE tournament_registrations.tournament_id = tournaments.id) AS participant_count,
    (SELECT COALESCE(sum(tournament_registrations.reentries), 0) FROM tournament_registrations WHERE tournament_registrations.tournament_id = tournaments.id) AS total_reentries,
    (SELECT COALESCE(sum(tournament_registrations.additional_sets), 0) FROM tournament_registrations WHERE tournament_registrations.tournament_id = tournaments.id) AS total_additional_sets
FROM tournaments;

-- Добавляем комментарий для ясности
COMMENT ON VIEW public.tournaments_display IS 'Tournament display view with calculated fields. Uses SECURITY INVOKER for proper RLS enforcement.';