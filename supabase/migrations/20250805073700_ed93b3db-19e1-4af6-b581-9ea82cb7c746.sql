-- Fix RLS policies for voice_settings table to allow upsert operations
DROP POLICY IF EXISTS "Users can create their own voice settings" ON public.voice_settings;
DROP POLICY IF EXISTS "Users can update their own voice settings" ON public.voice_settings;

-- Create new policy that allows both insert and update in one
CREATE POLICY "Users can manage their own voice settings" 
ON public.voice_settings 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Also make user_id not nullable and set default
ALTER TABLE public.voice_settings 
ALTER COLUMN user_id SET DEFAULT auth.uid(),
ALTER COLUMN user_id SET NOT NULL;