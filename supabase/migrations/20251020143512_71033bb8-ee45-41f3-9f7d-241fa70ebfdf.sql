-- Обновляем функцию is_admin для надежной работы через кастомный домен
-- Используем CREATE OR REPLACE вместо DROP для сохранения зависимостей
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND user_role = 'admin'::public.user_role
  );
$$;