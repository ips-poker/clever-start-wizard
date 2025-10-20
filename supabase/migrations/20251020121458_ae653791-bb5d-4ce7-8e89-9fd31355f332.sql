-- Обновляем функцию handle_new_user чтобы она не создавала дубликаты профилей
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Проверяем, существует ли уже профиль
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
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
  END IF;
  
  PERFORM public.create_first_admin();
  
  RETURN NEW;
END;
$$;