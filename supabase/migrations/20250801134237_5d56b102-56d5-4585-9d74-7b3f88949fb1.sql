-- Create first admin user profile (you'll need to register this email first)
-- This will be used to create the first admin after user registration
CREATE OR REPLACE FUNCTION public.create_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email text := 'admin@ipspoker.ru';
  existing_admin_count int;
BEGIN
  -- Check if any admin already exists
  SELECT COUNT(*) INTO existing_admin_count 
  FROM public.profiles 
  WHERE user_role = 'admin';
  
  -- If no admin exists, make the first registered user an admin
  IF existing_admin_count = 0 THEN
    UPDATE public.profiles 
    SET user_role = 'admin'
    WHERE email = admin_email OR user_id = (
      SELECT id FROM auth.users WHERE email = admin_email LIMIT 1
    );
  END IF;
END;
$$;

-- Create trigger to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, user_role)
  VALUES (
    NEW.id, 
    NEW.email,
    'user'::public.user_role
  );
  
  -- Call function to potentially make first user an admin
  PERFORM public.create_first_admin();
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();