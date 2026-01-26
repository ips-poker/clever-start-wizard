
-- Create diamond wallets for all bots (players without user_id) with a large starting balance
-- This allows bots to participate in cash games without balance errors

-- 1. Create wallets for bots that don't have one
INSERT INTO diamond_wallets (player_id, balance, total_purchased)
SELECT p.id, 10000000, 10000000  -- 10 million diamonds for bots
FROM players p
LEFT JOIN diamond_wallets dw ON dw.player_id = p.id
WHERE p.user_id IS NULL  -- Bots have no user_id
  AND dw.id IS NULL;     -- No wallet exists

-- 2. Top up existing bot wallets that have low balance
UPDATE diamond_wallets dw
SET 
  balance = 10000000,
  total_purchased = total_purchased + (10000000 - balance),
  updated_at = now()
FROM players p
WHERE dw.player_id = p.id
  AND p.user_id IS NULL
  AND dw.balance < 1000000;  -- Less than 1 million

-- 3. Create function to auto-provision bot wallets when seating
CREATE OR REPLACE FUNCTION ensure_bot_wallet_for_seating(p_player_id UUID, p_required_amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_bot BOOLEAN;
  v_wallet_exists BOOLEAN;
  v_current_balance INTEGER;
BEGIN
  -- Check if player is a bot (no user_id)
  SELECT (user_id IS NULL) INTO v_is_bot
  FROM players
  WHERE id = p_player_id;
  
  IF NOT v_is_bot THEN
    RETURN FALSE; -- Not a bot, don't auto-provision
  END IF;
  
  -- Check if wallet exists
  SELECT EXISTS(SELECT 1 FROM diamond_wallets WHERE player_id = p_player_id) INTO v_wallet_exists;
  
  IF NOT v_wallet_exists THEN
    -- Create wallet with sufficient balance
    INSERT INTO diamond_wallets (player_id, balance, total_purchased)
    VALUES (p_player_id, GREATEST(10000000, p_required_amount * 100), GREATEST(10000000, p_required_amount * 100));
    RETURN TRUE;
  END IF;
  
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM diamond_wallets
  WHERE player_id = p_player_id;
  
  -- Top up if needed
  IF v_current_balance < p_required_amount THEN
    UPDATE diamond_wallets
    SET 
      balance = GREATEST(10000000, p_required_amount * 100),
      total_purchased = total_purchased + GREATEST(10000000, p_required_amount * 100) - balance,
      updated_at = now()
    WHERE player_id = p_player_id;
  END IF;
  
  RETURN TRUE;
END;
$$;
