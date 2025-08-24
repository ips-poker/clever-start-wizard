-- Phase 1: Fix Critical Privilege Escalation
-- Remove the duplicate role column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Phase 2: Fix Overly Permissive Policies
-- Drop and recreate tournament policies with proper restrictions
DROP POLICY IF EXISTS "Allow all operations on tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON public.tournaments;

CREATE POLICY "Tournaments are viewable by everyone" 
ON public.tournaments 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create tournaments" 
ON public.tournaments 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update tournaments" 
ON public.tournaments 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete tournaments" 
ON public.tournaments 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Fix tournament registrations policies
DROP POLICY IF EXISTS "Allow all operations on registrations" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Tournament registrations are viewable by everyone" ON public.tournament_registrations;

CREATE POLICY "Registrations are viewable by everyone" 
ON public.tournament_registrations 
FOR SELECT 
USING (true);

CREATE POLICY "Users can register for tournaments" 
ON public.tournament_registrations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own registrations" 
ON public.tournament_registrations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = player_id AND p.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Only admins can delete registrations" 
ON public.tournament_registrations 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Fix game results policies
DROP POLICY IF EXISTS "Allow all operations on game results" ON public.game_results;
DROP POLICY IF EXISTS "Game results are viewable by everyone" ON public.game_results;

CREATE POLICY "Game results are viewable by everyone" 
ON public.game_results 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage game results" 
ON public.game_results 
FOR ALL 
USING (is_admin(auth.uid()));

-- Fix fiscal receipts policies - more restrictive
DROP POLICY IF EXISTS "Service can manage all receipts" ON public.fiscal_receipts;

CREATE POLICY "Only service role can manage receipts" 
ON public.fiscal_receipts 
FOR ALL 
USING (auth.role() = 'service_role');

-- Strengthen profiles RLS to prevent users from modifying their role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile (except role)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND (OLD.user_role IS NOT DISTINCT FROM NEW.user_role)
);

-- Create admin-only role management policy
CREATE POLICY "Only admins can change user roles" 
ON public.profiles 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Fix tournament payouts policies
DROP POLICY IF EXISTS "Allow all operations on tournament payouts" ON public.tournament_payouts;
DROP POLICY IF EXISTS "Tournament payouts are viewable by everyone" ON public.tournament_payouts;

CREATE POLICY "Payouts are viewable by everyone" 
ON public.tournament_payouts 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage payouts" 
ON public.tournament_payouts 
FOR ALL 
USING (is_admin(auth.uid()));

-- Fix blind levels policies  
DROP POLICY IF EXISTS "Allow all operations on blind levels" ON public.blind_levels;
DROP POLICY IF EXISTS "Blind levels are viewable by everyone" ON public.blind_levels;

CREATE POLICY "Blind levels are viewable by everyone" 
ON public.blind_levels 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage blind levels" 
ON public.blind_levels 
FOR ALL 
USING (is_admin(auth.uid()));

-- Add audit logging function for role changes
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role change auditing
CREATE TRIGGER audit_role_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_changes();