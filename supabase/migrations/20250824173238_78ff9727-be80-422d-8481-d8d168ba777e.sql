-- Fix CRITICAL: Security Definer View issue
-- Remove the security definer view and replace with secure function
DROP VIEW IF EXISTS public.players_public;

-- Fix WARN: Function Search Path Mutable
-- Update existing functions to have secure search_path
CREATE OR REPLACE FUNCTION public.update_player_wins()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.players 
  SET wins = (
    SELECT COUNT(*) 
    FROM public.game_results 
    WHERE game_results.player_id = players.id 
    AND game_results.position = 1
  ),
  updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_tournament_registration(tournament_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tournaments 
  SET 
    status = 'registration',
    is_published = true,
    updated_at = now()
  WHERE id = tournament_id_param AND status = 'scheduled';
  
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_tournament(tournament_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tournaments 
  SET 
    status = 'running',
    updated_at = now()
  WHERE id = tournament_id_param AND status = 'registration';
  
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT user_role FROM public.profiles WHERE user_id = user_uuid;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND user_role = 'admin'::public.user_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pause_tournament(tournament_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tournaments 
  SET 
    status = 'paused',
    updated_at = now()
  WHERE id = tournament_id_param AND status = 'running';
  
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resume_tournament(tournament_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tournaments 
  SET 
    status = 'running',
    updated_at = now()
  WHERE id = tournament_id_param AND status = 'paused';
  
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, user_role)
  VALUES (
    NEW.id, 
    NEW.email,
    'user'::public.user_role
  );
  
  PERFORM public.create_first_admin();
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_first_admin()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_email text := 'casinofix@ya.ru';
  existing_admin_count int;
BEGIN
  SELECT COUNT(*) INTO existing_admin_count 
  FROM public.profiles 
  WHERE user_role = 'admin';
  
  IF existing_admin_count = 0 THEN
    UPDATE public.profiles 
    SET user_role = 'admin'
    WHERE email = admin_email OR user_id = (
      SELECT id FROM auth.users WHERE email = admin_email LIMIT 1
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_tournament(tournament_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tournaments 
  SET 
    status = 'completed',
    finished_at = now(),
    updated_at = now()
  WHERE id = tournament_id_param AND status IN ('running', 'paused');
  
  RETURN FOUND;
END;
$function$;

-- Update all other functions with proper search_path
CREATE OR REPLACE FUNCTION public.secure_profile_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.user_role IS DISTINCT FROM NEW.user_role THEN
    IF NOT is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
  END IF;
  
  IF OLD.user_role IS DISTINCT FROM NEW.user_role THEN
    INSERT INTO public.cms_content (
      page_slug, 
      content_key, 
      content_type, 
      content_value,
      meta_data
    ) VALUES (
      'audit_log',
      'role_change_' || NEW.id::text || '_' || extract(epoch from now())::text,
      'audit',
      'Role changed from ' || COALESCE(OLD.user_role::text, 'null') || ' to ' || COALESCE(NEW.user_role::text, 'null'),
      jsonb_build_object(
        'user_id', NEW.user_id,
        'changed_by', auth.uid(),
        'old_role', OLD.user_role,
        'new_role', NEW.user_role,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;