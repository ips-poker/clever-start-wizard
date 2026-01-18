-- Fix action_type check constraint to match server values
ALTER TABLE poker_actions DROP CONSTRAINT poker_actions_action_type_check;

ALTER TABLE poker_actions ADD CONSTRAINT poker_actions_action_type_check 
CHECK (action_type IN (
  'post_sb', 'post_bb', 'post_ante',  -- Blind/ante posts
  'fold', 'check', 'call', 'bet', 'raise', 'all_in',  -- Standard actions
  'show', 'muck',  -- Showdown actions
  'posts_sb', 'posts_bb', 'posts_ante', 'all-in'  -- Alternative spellings from server
));