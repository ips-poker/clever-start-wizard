-- Update admin email in the create_first_admin function
CREATE OR REPLACE FUNCTION public.create_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email text := 'casinofix@ya.ru';
  existing_admin_count int;
BEGIN
  -- Check if any admin already exists
  SELECT COUNT(*) INTO existing_admin_count 
  FROM public.profiles 
  WHERE user_role = 'admin';
  
  -- If no admin exists, make the first registered user with this email an admin
  IF existing_admin_count = 0 THEN
    UPDATE public.profiles 
    SET user_role = 'admin'
    WHERE email = admin_email OR user_id = (
      SELECT id FROM auth.users WHERE email = admin_email LIMIT 1
    );
  END IF;
END;
$$;