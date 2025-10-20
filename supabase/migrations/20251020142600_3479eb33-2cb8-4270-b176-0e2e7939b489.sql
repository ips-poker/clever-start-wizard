-- Создаем функцию для безопасного получения профиля пользователя
-- Эта функция обходит RLS и работает с кастомным доменом
CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  user_role user_role,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  privacy_consent_given boolean,
  privacy_consent_at timestamp with time zone,
  terms_consent_given boolean,
  terms_consent_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    user_id,
    email,
    full_name,
    avatar_url,
    user_role,
    created_at,
    updated_at,
    privacy_consent_given,
    privacy_consent_at,
    terms_consent_given,
    terms_consent_at
  FROM public.profiles
  WHERE profiles.user_id = user_uuid;
$$;