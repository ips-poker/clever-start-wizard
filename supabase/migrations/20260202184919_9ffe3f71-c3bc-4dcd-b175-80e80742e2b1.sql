
-- =====================================================
-- PHASE 1: Multi-Tenant Club System
-- =====================================================

-- 1. Создаём ENUM для ролей клуба
CREATE TYPE public.club_role AS ENUM ('owner', 'admin', 'director', 'member');

-- 2. Создаём ENUM для планов подписки
CREATE TYPE public.subscription_plan AS ENUM ('free', 'basic', 'pro', 'enterprise');

-- 3. Добавляем clan_id к tournaments
ALTER TABLE public.tournaments 
ADD COLUMN clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL;

-- 4. Создаём индекс для быстрой фильтрации
CREATE INDEX idx_tournaments_clan_id ON public.tournaments(clan_id);

-- 5. Таблица подписок клубов
CREATE TABLE public.club_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE UNIQUE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  max_tournaments INTEGER NOT NULL DEFAULT 3,
  max_players INTEGER NOT NULL DEFAULT 20,
  max_online_tables INTEGER NOT NULL DEFAULT 0,
  max_staff INTEGER NOT NULL DEFAULT 2,
  features JSONB NOT NULL DEFAULT '{"voice_control": false, "online_poker": false, "analytics": false, "api_access": false}'::jsonb,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  payment_status TEXT NOT NULL DEFAULT 'active',
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Таблица персонала клуба (роли хранятся отдельно!)
CREATE TABLE public.club_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  role club_role NOT NULL DEFAULT 'member',
  permissions JSONB NOT NULL DEFAULT '{"manage_tournaments": false, "manage_players": false, "manage_staff": false, "view_analytics": false}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clan_id, player_id)
);

-- 7. Индексы для club_staff
CREATE INDEX idx_club_staff_clan_id ON public.club_staff(clan_id);
CREATE INDEX idx_club_staff_player_id ON public.club_staff(player_id);
CREATE INDEX idx_club_staff_role ON public.club_staff(role);

-- =====================================================
-- SECURITY DEFINER FUNCTIONS (предотвращают рекурсию RLS)
-- =====================================================

-- 8. Функция получения clan_id пользователя
CREATE OR REPLACE FUNCTION public.get_user_clan_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Сначала проверяем, является ли дон клана
    (SELECT c.id FROM clans c
     JOIN players p ON p.id = c.don_player_id
     WHERE p.user_id = p_user_id
     LIMIT 1),
    -- Затем проверяем членство в клане
    (SELECT cm.clan_id FROM clan_members cm
     JOIN players p ON p.id = cm.player_id
     WHERE p.user_id = p_user_id
     LIMIT 1)
  );
$$;

-- 9. Функция проверки роли в клубе
CREATE OR REPLACE FUNCTION public.get_club_role(p_user_id UUID, p_clan_id UUID)
RETURNS club_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE
      -- Дон клана = owner
      WHEN EXISTS (
        SELECT 1 FROM clans c
        JOIN players p ON p.id = c.don_player_id
        WHERE c.id = p_clan_id AND p.user_id = p_user_id
      ) THEN 'owner'::club_role
      -- Роль из club_staff
      ELSE (
        SELECT cs.role FROM club_staff cs
        JOIN players p ON p.id = cs.player_id
        WHERE cs.clan_id = p_clan_id 
          AND p.user_id = p_user_id 
          AND cs.is_active = true
      )
    END;
$$;

-- 10. Функция проверки: является ли пользователь админом клуба
CREATE OR REPLACE FUNCTION public.is_club_admin(p_user_id UUID, p_clan_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_club_role(p_user_id, p_clan_id) IN ('owner', 'admin');
$$;

-- 11. Функция проверки: может ли пользователь управлять турнирами
CREATE OR REPLACE FUNCTION public.can_manage_club_tournaments(p_user_id UUID, p_clan_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.get_club_role(p_user_id, p_clan_id) IN ('owner', 'admin', 'director')
    OR public.is_admin(p_user_id); -- Глобальные админы тоже могут
$$;

-- =====================================================
-- RLS для club_subscriptions
-- =====================================================

ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;

-- Все могут видеть подписки (для отображения лимитов)
CREATE POLICY "Subscriptions are viewable by everyone"
ON public.club_subscriptions FOR SELECT
USING (true);

-- Только owner может управлять подпиской
CREATE POLICY "Only club owner can manage subscription"
ON public.club_subscriptions FOR ALL
USING (
  public.get_club_role(auth.uid(), clan_id) = 'owner'
  OR public.is_admin(auth.uid())
);

-- =====================================================
-- RLS для club_staff
-- =====================================================

ALTER TABLE public.club_staff ENABLE ROW LEVEL SECURITY;

-- Персонал виден всем членам клуба
CREATE POLICY "Staff viewable by club members"
ON public.club_staff FOR SELECT
USING (
  public.get_user_clan_id(auth.uid()) = clan_id
  OR public.is_admin(auth.uid())
);

-- Только owner и admin могут управлять персоналом
CREATE POLICY "Owner and admin can manage staff"
ON public.club_staff FOR INSERT
WITH CHECK (
  public.is_club_admin(auth.uid(), clan_id)
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Owner and admin can update staff"
ON public.club_staff FOR UPDATE
USING (
  public.is_club_admin(auth.uid(), clan_id)
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Owner and admin can delete staff"
ON public.club_staff FOR DELETE
USING (
  public.is_club_admin(auth.uid(), clan_id)
  OR public.is_admin(auth.uid())
);

-- =====================================================
-- ОБНОВЛЕНИЕ RLS для tournaments (изоляция по клубам)
-- =====================================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON public.tournaments;
DROP POLICY IF EXISTS "Only admins can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Only admins can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Only admins can delete tournaments" ON public.tournaments;

-- Новые политики с изоляцией
CREATE POLICY "View tournaments: global or own club"
ON public.tournaments FOR SELECT
USING (
  clan_id IS NULL -- Глобальные турниры Syndicate
  OR clan_id = public.get_user_clan_id(auth.uid()) -- Турниры своего клуба
  OR public.is_admin(auth.uid()) -- Глобальные админы
);

CREATE POLICY "Create tournaments: club staff or global admin"
ON public.tournaments FOR INSERT
WITH CHECK (
  (clan_id IS NOT NULL AND public.can_manage_club_tournaments(auth.uid(), clan_id))
  OR (clan_id IS NULL AND public.is_admin(auth.uid()))
);

CREATE POLICY "Update tournaments: club staff or global admin"
ON public.tournaments FOR UPDATE
USING (
  (clan_id IS NOT NULL AND public.can_manage_club_tournaments(auth.uid(), clan_id))
  OR (clan_id IS NULL AND public.is_admin(auth.uid()))
);

CREATE POLICY "Delete tournaments: club admin or global admin"
ON public.tournaments FOR DELETE
USING (
  (clan_id IS NOT NULL AND public.is_club_admin(auth.uid(), clan_id))
  OR (clan_id IS NULL AND public.is_admin(auth.uid()))
);

-- =====================================================
-- ТРИГГЕРЫ
-- =====================================================

-- Автоматическое создание подписки при создании клана
CREATE OR REPLACE FUNCTION public.create_club_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.club_subscriptions (clan_id, plan)
  VALUES (NEW.id, 'free');
  
  -- Автоматически добавляем дона как owner в club_staff
  INSERT INTO public.club_staff (clan_id, player_id, role, permissions)
  VALUES (
    NEW.id, 
    NEW.don_player_id, 
    'owner',
    '{"manage_tournaments": true, "manage_players": true, "manage_staff": true, "view_analytics": true}'::jsonb
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_clan_created
AFTER INSERT ON public.clans
FOR EACH ROW
EXECUTE FUNCTION public.create_club_subscription();

-- Триггер обновления updated_at
CREATE TRIGGER update_club_subscriptions_updated_at
BEFORE UPDATE ON public.club_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_club_staff_updated_at
BEFORE UPDATE ON public.club_staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- КОММЕНТАРИИ
-- =====================================================

COMMENT ON TABLE public.club_subscriptions IS 'Подписки клубов на SaaS-платформу';
COMMENT ON TABLE public.club_staff IS 'Персонал клуба с ролями и правами';
COMMENT ON COLUMN public.tournaments.clan_id IS 'ID клуба-владельца турнира (NULL = глобальный турнир Syndicate)';
COMMENT ON FUNCTION public.get_user_clan_id IS 'Возвращает clan_id пользователя (как дон или член)';
COMMENT ON FUNCTION public.get_club_role IS 'Возвращает роль пользователя в конкретном клубе';
COMMENT ON FUNCTION public.is_club_admin IS 'Проверяет, является ли пользователь админом клуба (owner/admin)';
COMMENT ON FUNCTION public.can_manage_club_tournaments IS 'Проверяет право управления турнирами (owner/admin/director)';
