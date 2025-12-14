-- Fix: Add search_path to convert_amount_to_rps function
CREATE OR REPLACE FUNCTION public.convert_amount_to_rps(amount_rubles integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ROUND(amount_rubles / 10.0)::INTEGER;
$$;

-- Add comment for clarity
COMMENT ON FUNCTION public.convert_amount_to_rps IS 'Converts rubles to RPS points (10:1 ratio). Has search_path set for security.';