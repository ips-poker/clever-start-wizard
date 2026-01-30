-- Update cron job to call edge function for waking idle tables
-- First, remove the old jobs
SELECT cron.unschedule('poker-watchdog-aggressive');
SELECT cron.unschedule('poker-watchdog-fast');

-- Create new job that calls both the DB cleanup AND the edge function
SELECT cron.schedule(
  'poker-watchdog-combined',
  '* * * * *',  -- Every minute
  $$
  -- Step 1: Run DB cleanup
  SELECT cleanup_stuck_hands_aggressive();
  
  -- Step 2: Call edge function to wake idle tables via pg_net
  SELECT net.http_post(
    url := 'https://mokhssmnorrhohrowxvu.supabase.co/functions/v1/wake-idle-tables',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2hzc21ub3JyaG9ocm93eHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODUzNDYsImV4cCI6MjA2ODY2MTM0Nn0.ZWYgSZFeidY0b_miC7IyfXVPh1EUR2WtxlEvt_fFmGc'
    ),
    body := '{}'::jsonb
  );
  $$
);