-- Add unique constraint if not exists and handle duplicates
DO $$ 
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'voice_settings_user_id_key'
    ) THEN
        -- Remove duplicates first
        DELETE FROM public.voice_settings 
        WHERE id NOT IN (
            SELECT DISTINCT ON (user_id) id 
            FROM public.voice_settings 
            ORDER BY user_id, created_at DESC
        );
        
        -- Add unique constraint
        ALTER TABLE public.voice_settings 
        ADD CONSTRAINT voice_settings_user_id_key UNIQUE (user_id);
    END IF;
END $$;