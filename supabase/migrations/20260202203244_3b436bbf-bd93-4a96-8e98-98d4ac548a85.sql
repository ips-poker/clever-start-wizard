-- Add club personalization fields for Mini App
ALTER TABLE public.clans 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#ff6b35',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
ADD COLUMN IF NOT EXISTS telegram_channel_id TEXT,
ADD COLUMN IF NOT EXISTS mini_app_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mini_app_url TEXT,
ADD COLUMN IF NOT EXISTS auto_post_registrations BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_post_results BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.clans.logo_url IS 'Custom logo for the club Mini App';
COMMENT ON COLUMN public.clans.primary_color IS 'Primary brand color for club theming';
COMMENT ON COLUMN public.clans.telegram_bot_token IS 'Encrypted Telegram bot token for the club';
COMMENT ON COLUMN public.clans.mini_app_enabled IS 'Whether the club has Mini App enabled';
COMMENT ON COLUMN public.clans.auto_post_registrations IS 'Auto-post registration lists to Telegram';
COMMENT ON COLUMN public.clans.auto_post_results IS 'Auto-post tournament results to Telegram';

-- Create index for fast lookup by Mini App URL
CREATE INDEX IF NOT EXISTS idx_clans_mini_app_enabled ON public.clans(mini_app_enabled) WHERE mini_app_enabled = true;