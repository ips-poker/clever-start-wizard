-- Add privacy and terms consent fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN privacy_consent_given boolean DEFAULT false,
ADD COLUMN privacy_consent_at timestamp with time zone,
ADD COLUMN terms_consent_given boolean DEFAULT false,
ADD COLUMN terms_consent_at timestamp with time zone;

-- Update handle_new_user function to store consent information
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