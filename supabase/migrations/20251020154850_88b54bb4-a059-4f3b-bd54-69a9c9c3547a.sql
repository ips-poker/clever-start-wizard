-- Создание безопасной RPC функции для создания профиля пользователя

CREATE OR REPLACE FUNCTION public.create_user_profile_safe(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_existing_profile UUID;
BEGIN
  -- Проверяем, не существует ли уже профиль
  SELECT id INTO v_existing_profile
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  IF v_existing_profile IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile already exists',
      'profile_id', v_existing_profile
    );
  END IF;

  -- Создаем новый профиль
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    avatar_url,
    user_role
  )
  VALUES (
    p_user_id,
    p_email,
    p_full_name,
    p_avatar_url,
    'user'::public.user_role
  )
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object(
    'success', true,
    'profile', row_to_json(v_profile)
  );
END;
$$;