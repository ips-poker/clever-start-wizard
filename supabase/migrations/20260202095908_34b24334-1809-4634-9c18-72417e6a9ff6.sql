-- Удаляем старую версию функции
DROP FUNCTION IF EXISTS get_tournament_stats(uuid);

-- Создаем новую версию функции
CREATE OR REPLACE FUNCTION get_tournament_stats(p_tournament_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_entries', COUNT(*),
    'total_rebuys', COALESCE(SUM(rebuys), 0),
    'total_reentries', COALESCE(SUM(reentries), 0),
    'total_addons', COALESCE(SUM(addons), 0),
    'total_additional_sets', COALESCE(SUM(additional_sets), 0),
    'prize_places', (SELECT COUNT(*) FROM tournament_payouts WHERE tournament_id = p_tournament_id)
  ) INTO v_result
  FROM tournament_registrations
  WHERE tournament_id = p_tournament_id;
  
  RETURN v_result;
END;
$$;