-- Fix: clean up orphaned/uncompleted hands that trigger random recovery/auto-actions
-- Marks any hand older than 10 minutes with completed_at IS NULL as complete.

UPDATE public.poker_hands
SET
  completed_at = now(),
  phase = 'complete'
WHERE completed_at IS NULL
  AND created_at < (now() - interval '10 minutes');

-- Fix: clear poker_tables.current_hand_id when it points to a non-active hand
UPDATE public.poker_tables t
SET
  current_hand_id = NULL,
  status = 'waiting',
  updated_at = now()
WHERE t.current_hand_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.poker_hands h
    WHERE h.id = t.current_hand_id
      AND h.completed_at IS NULL
  );