-- Создаем таблицу кланов
CREATE TABLE public.clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  don_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  emblem_id INTEGER NOT NULL DEFAULT 1,
  seal_id INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  total_rating INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT emblem_id_range CHECK (emblem_id >= 1 AND emblem_id <= 5),
  CONSTRAINT seal_id_range CHECK (seal_id >= 1 AND seal_id <= 5)
);

-- Создаем таблицу членов клана
CREATE TABLE public.clan_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  hierarchy_role TEXT NOT NULL DEFAULT 'soldier',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id) -- Игрок может быть только в одном клане
);

-- Создаем таблицу приглашений
CREATE TABLE public.clan_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  UNIQUE(clan_id, player_id),
  CONSTRAINT status_values CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
);

-- Включаем RLS
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_invitations ENABLE ROW LEVEL SECURITY;

-- Политики для clans
CREATE POLICY "Clans are viewable by everyone"
ON public.clans FOR SELECT
USING (true);

CREATE POLICY "Don can create clan"
ON public.clans FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = don_player_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Don can update own clan"
ON public.clans FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = don_player_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Don can delete own clan"
ON public.clans FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = don_player_id
    AND p.user_id = auth.uid()
  )
);

-- Политики для clan_members
CREATE POLICY "Clan members are viewable by everyone"
ON public.clan_members FOR SELECT
USING (true);

CREATE POLICY "Don can add members"
ON public.clan_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clans c
    JOIN public.players p ON p.id = c.don_player_id
    WHERE c.id = clan_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Don can remove members"
ON public.clan_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clans c
    JOIN public.players p ON p.id = c.don_player_id
    WHERE c.id = clan_id
    AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = player_id
    AND p.user_id = auth.uid()
  )
);

-- Политики для clan_invitations
CREATE POLICY "Invitations viewable by clan don and invited player"
ON public.clan_invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clans c
    JOIN public.players p ON p.id = c.don_player_id
    WHERE c.id = clan_id
    AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = player_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Don can send invitations"
ON public.clan_invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clans c
    JOIN public.players p ON p.id = c.don_player_id
    WHERE c.id = clan_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Invited player can update invitation status"
ON public.clan_invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = player_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Don can delete invitations"
ON public.clan_invitations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clans c
    JOIN public.players p ON p.id = c.don_player_id
    WHERE c.id = clan_id
    AND p.user_id = auth.uid()
  )
);

-- Функция для пересчета рейтинга клана
CREATE OR REPLACE FUNCTION public.update_clan_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clans
  SET total_rating = (
    SELECT COALESCE(SUM(p.elo_rating), 0)
    FROM public.clan_members cm
    JOIN public.players p ON p.id = cm.player_id
    WHERE cm.clan_id = COALESCE(NEW.clan_id, OLD.clan_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.clan_id, OLD.clan_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Триггер для автоматического обновления рейтинга клана
CREATE TRIGGER update_clan_rating_on_member_change
AFTER INSERT OR DELETE ON public.clan_members
FOR EACH ROW
EXECUTE FUNCTION public.update_clan_rating();

-- Функция для проверки лимита членов клана (20 человек)
CREATE OR REPLACE FUNCTION public.check_clan_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_count
  FROM public.clan_members
  WHERE clan_id = NEW.clan_id;
  
  IF member_count >= 20 THEN
    RAISE EXCEPTION 'Клан уже достиг максимального количества участников (20)';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Триггер для проверки лимита
CREATE TRIGGER check_clan_member_limit_trigger
BEFORE INSERT ON public.clan_members
FOR EACH ROW
EXECUTE FUNCTION public.check_clan_member_limit();