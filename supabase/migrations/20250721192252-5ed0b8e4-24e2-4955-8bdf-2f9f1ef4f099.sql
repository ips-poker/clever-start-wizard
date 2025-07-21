-- Исправление проблем безопасности с search_path для функций
-- Обновление функций с установкой search_path для безопасности

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_tournament_timer(tournament_id_param uuid, new_timer_remaining integer, new_timer_active boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.tournaments 
  SET 
    timer_remaining = new_timer_remaining,
    updated_at = now()
  WHERE id = tournament_id_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.publish_tournament(tournament_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.tournaments 
  SET 
    is_published = true,
    status = 'registration',
    updated_at = now()
  WHERE id = tournament_id_param AND status = 'scheduled';
  
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_tournament(tournament_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.tournaments 
  SET 
    is_archived = true,
    updated_at = now()
  WHERE id = tournament_id_param AND status = 'completed';
  
  RETURN FOUND;
END;
$function$;