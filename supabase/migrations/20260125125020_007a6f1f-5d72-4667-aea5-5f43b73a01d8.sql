-- Fix tournament rebuy: also update poker_table_players.stack to prevent elimination timeout
CREATE OR REPLACE FUNCTION public.process_online_tournament_rebuy(
  p_tournament_id UUID,
  p_player_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_wallet RECORD;
  v_new_balance INTEGER;
  v_new_chips INTEGER;
  v_table_id UUID;
BEGIN
  -- Get tournament data
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF NOT v_tournament.rebuy_enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rebuys are not enabled');
  END IF;

  IF v_tournament.current_level > COALESCE(v_tournament.rebuy_end_level, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rebuy period has ended');
  END IF;

  -- Get participant data
  SELECT * INTO v_participant
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not in tournament');
  END IF;

  -- Check wallet
  SELECT * INTO v_wallet
  FROM diamond_wallets
  WHERE player_id = p_player_id;

  IF NOT FOUND OR v_wallet.balance < v_tournament.rebuy_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Calculate new chips
  v_new_chips := v_participant.chips + COALESCE(v_tournament.rebuy_chips, v_tournament.starting_chips);

  -- Deduct rebuy cost from wallet
  UPDATE diamond_wallets
  SET 
    balance = balance - v_tournament.rebuy_cost,
    total_spent = total_spent + v_tournament.rebuy_cost,
    updated_at = now()
  WHERE player_id = p_player_id
  RETURNING balance INTO v_new_balance;

  -- Update participant chips and rebuy count
  UPDATE online_poker_tournament_participants
  SET 
    rebuys_count = rebuys_count + 1,
    chips = v_new_chips,
    status = 'playing',
    eliminated_at = NULL
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id
  RETURNING table_id INTO v_table_id;

  -- CRITICAL: Also update poker_table_players.stack to prevent elimination timeout
  IF v_table_id IS NOT NULL THEN
    UPDATE poker_table_players
    SET 
      stack = v_new_chips,
      status = 'active'
    WHERE table_id = v_table_id AND player_id = p_player_id;
  ELSE
    -- Find the table from poker_tables with this tournament
    SELECT pt.id INTO v_table_id
    FROM poker_tables pt
    JOIN poker_table_players ptp ON ptp.table_id = pt.id
    WHERE pt.tournament_id = p_tournament_id AND ptp.player_id = p_player_id
    LIMIT 1;
    
    IF v_table_id IS NOT NULL THEN
      UPDATE poker_table_players
      SET 
        stack = v_new_chips,
        status = 'active'
      WHERE table_id = v_table_id AND player_id = p_player_id;
    END IF;
  END IF;

  -- Recalculate prize pool
  PERFORM calculate_online_tournament_prize_pool(p_tournament_id);

  RETURN jsonb_build_object(
    'success', true,
    'new_chips', v_new_chips,
    'rebuy_cost', v_tournament.rebuy_cost,
    'new_balance', v_new_balance
  );
END;
$function$;