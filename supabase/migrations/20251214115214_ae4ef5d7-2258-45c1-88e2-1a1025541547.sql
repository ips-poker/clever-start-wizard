-- Recreate tournaments_display view with explicit SECURITY INVOKER
-- This ensures RLS is properly enforced

DROP VIEW IF EXISTS public.tournaments_display;

CREATE VIEW public.tournaments_display 
WITH (security_invoker = true)
AS
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
    buy_in,
    calculate_tournament_rps_pool(id) AS total_rps_pool,
    (SELECT count(*) FROM tournament_registrations WHERE tournament_registrations.tournament_id = tournaments.id) AS participant_count,
    (SELECT COALESCE(sum(tournament_registrations.reentries), 0) FROM tournament_registrations WHERE tournament_registrations.tournament_id = tournaments.id) AS total_reentries,
    (SELECT COALESCE(sum(tournament_registrations.additional_sets), 0) FROM tournament_registrations WHERE tournament_registrations.tournament_id = tournaments.id) AS total_additional_sets
FROM tournaments;

COMMENT ON VIEW public.tournaments_display IS 'Tournament display view with calculated fields. Uses SECURITY INVOKER for proper RLS enforcement.';