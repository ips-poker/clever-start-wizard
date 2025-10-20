-- Возвращаем оригинальную политику INSERT для profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Возвращаем оригинальную функцию handle_new_user без ON CONFLICT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    email, 
    user_role,
    privacy_consent_given,
    privacy_consent_at,
    terms_consent_given,
    terms_consent_at
  )
  VALUES (
    NEW.id, 
    NEW.email,
    'user'::public.user_role,
    COALESCE((NEW.raw_user_meta_data->>'privacy_consent')::boolean, false),
    CASE 
      WHEN (NEW.raw_user_meta_data->>'privacy_consent')::boolean THEN now()
      ELSE NULL
    END,
    COALESCE((NEW.raw_user_meta_data->>'terms_consent')::boolean, false),
    CASE 
      WHEN (NEW.raw_user_meta_data->>'terms_consent')::boolean THEN now()
      ELSE NULL
    END
  );
  
  PERFORM public.create_first_admin();
  
  RETURN NEW;
END;
$$;