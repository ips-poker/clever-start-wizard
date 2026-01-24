CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS timestamp with time zone
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT now();
$$;