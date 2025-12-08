import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import core engine (relative path for Deno)
import {
  createDeck,
  calculateSidePots,
  evaluateHand,
  compareHands,
  compareKickers,
  getNextPhase,
  validateAndProcessAction,
  determineShowdownOrder,
  isBettingRoundComplete,
  findFirstToActPostflop,
  dealRemainingCards,
  type PlayerContribution,
  type HandResult,
  type SidePot,
  type GamePlayer,
  type GamePhase,
  PHASES,
} from "../_shared/poker-engine-core.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACTION_TIME_SECONDS = 30;

interface ActionRequest {
  action: 'join' | 'join_table' | 'leave' | 'leave_table' | 'start_hand' | 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'check_timeout';
  tableId: string;
  playerId: string;
  amount?: number;
  seatNumber?: number;
  buyIn?: number;
}

// Helper to convert DB player to GamePlayer
function toGamePlayer(dbPlayer: any, handPlayer?: any): GamePlayer {
  return {
    id: dbPlayer.player_id,
    seatNumber: dbPlayer.seat_number || handPlayer?.seat_number,
    stack: dbPlayer.stack,
    betAmount: handPlayer?.bet_amount || 0,
    holeCards: handPlayer?.hole_cards || [],
    isFolded: handPlayer?.is_folded || false,
    isAllIn: handPlayer?.is_all_in || false,
    isSittingOut: dbPlayer.status === 'sitting_out'
  };
}

// Find next active player
function findNextActivePlayer(players: any[], currentSeat: number, excludePlayerId?: string): any {
  const sorted = [...players].sort((a, b) => a.seat_number - b.seat_number);
  
  let next = sorted.find(p => 
    p.seat_number > currentSeat && 
    !p.is_folded && 
    !p.is_all_in && 
    p.player_id !== excludePlayerId
  );
  
  if (!next) {
    next = sorted.find(p => 
      !p.is_folded && 
      !p.is_all_in && 
      p.player_id !== excludePlayerId
    );
  }
  
  return next;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const request: ActionRequest = await req.json();
    const { action, tableId, playerId, amount, seatNumber, buyIn: requestBuyIn } = request;
    
    console.log(`[Engine] ${action} | table=${tableId?.slice(0,8)} | player=${playerId?.slice(0,8)} | amount=${amount || requestBuyIn}`);

    if (!tableId || !playerId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing tableId or playerId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: table, error: tableError } = await supabase
      .from('poker_tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (tableError || !table) {
      return new Response(JSON.stringify({ success: false, error: 'Table not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: tablePlayers } = await supabase
      .from('poker_table_players')
      .select('*, players(name, avatar_url)')
      .eq('table_id', tableId);

    let result: any = { success: false };

    // ==========================================
    // ACTION: JOIN / JOIN_TABLE
    // ==========================================
    if (action === 'join' || action === 'join_table') {
      const existingPlayer = tablePlayers?.find(p => p.player_id === playerId);
      if (existingPlayer) {
        result = { success: true, seatNumber: existingPlayer.seat_number, stack: existingPlayer.stack, alreadySeated: true };
      } else {
        const occupiedSeats = new Set(tablePlayers?.map(p => p.seat_number) || []);
        let targetSeat = seatNumber;
        
        if (targetSeat && occupiedSeats.has(targetSeat)) targetSeat = undefined;
        
        const availableSeat = targetSeat || 
          Array.from({ length: table.max_players }, (_, i) => i + 1).find(s => !occupiedSeats.has(s));

        if (!availableSeat) {
          result = { success: false, error: 'No available seats' };
        } else {
          const { data: wallet } = await supabase
            .from('diamond_wallets')
            .select('balance, total_spent')
            .eq('player_id', playerId)
            .single();

          const diamondBalance = wallet?.balance || 0;
          const requestedBuyIn = requestBuyIn || amount || table.min_buy_in;
          
          if (diamondBalance < requestedBuyIn) {
            result = { success: false, error: `Недостаточно алмазов. Баланс: ${diamondBalance}, требуется: ${requestedBuyIn}` };
          } else {
            const buyIn = Math.min(Math.max(requestedBuyIn, table.min_buy_in), table.max_buy_in);
            
            await supabase
              .from('diamond_wallets')
              .update({ 
                balance: diamondBalance - buyIn,
                total_spent: (wallet?.total_spent || 0) + buyIn
              })
              .eq('player_id', playerId);

            const { error: joinError } = await supabase
              .from('poker_table_players')
              .insert({ table_id: tableId, player_id: playerId, seat_number: availableSeat, stack: buyIn, status: 'active' });

            if (joinError?.message?.includes('unique')) {
              await supabase
                .from('diamond_wallets')
                .update({ balance: diamondBalance, total_spent: wallet?.total_spent || 0 })
                .eq('player_id', playerId);
              
              const { data: existing } = await supabase
                .from('poker_table_players')
                .select('*')
                .eq('table_id', tableId)
                .eq('player_id', playerId)
                .single();
              
              result = existing 
                ? { success: true, seatNumber: existing.seat_number, stack: existing.stack, alreadySeated: true }
                : { success: false, error: 'Seat taken, try again' };
            } else if (joinError) {
              await supabase
                .from('diamond_wallets')
                .update({ balance: diamondBalance, total_spent: wallet?.total_spent || 0 })
                .eq('player_id', playerId);
              result = { success: false, error: joinError.message };
            } else {
              console.log(`[Engine] Player joined seat ${availableSeat} with ${buyIn} diamonds`);
              result = { success: true, seatNumber: availableSeat, stack: buyIn };
            }
          }
        }
      }
    }

    // ==========================================
    // ACTION: LEAVE / LEAVE_TABLE
    // ==========================================
    else if (action === 'leave' || action === 'leave_table') {
      const playerAtTable = tablePlayers?.find(p => p.player_id === playerId);
      const remainingStack = playerAtTable?.stack || 0;
      
      if (remainingStack > 0) {
        const { data: wallet } = await supabase
          .from('diamond_wallets')
          .select('balance')
          .eq('player_id', playerId)
          .single();
        
        if (wallet) {
          // Return remaining stack to wallet (not as winnings, just return)
          await supabase
            .from('diamond_wallets')
            .update({ 
              balance: wallet.balance + remainingStack
              // Don't update total_won - this is a return, not winnings
            })
            .eq('player_id', playerId);
          
          console.log(`[Engine] Returned ${remainingStack} diamonds to player wallet (balance: ${wallet.balance} + ${remainingStack} = ${wallet.balance + remainingStack})`);
        }
      }
      
      await supabase.from('poker_table_players').delete().eq('table_id', tableId).eq('player_id', playerId);
      result = { success: true, returnedDiamonds: remainingStack };
    }

    // ==========================================
    // ACTION: START_HAND
    // ==========================================
    else if (action === 'start_hand') {
      const { data: cleanupResult } = await supabase.rpc('cleanup_stuck_poker_hands');
      if (cleanupResult && cleanupResult > 0) {
        console.log(`[Engine] Cleaned up ${cleanupResult} stuck hands`);
      }

      const zeroChipPlayers = tablePlayers?.filter(p => p.status === 'active' && p.stack <= 0) || [];
      for (const p of zeroChipPlayers) {
        await supabase.from('poker_table_players').update({ status: 'sitting_out' }).eq('id', p.id);
      }

      if (table.current_hand_id) {
        const { data: currentHand } = await supabase
          .from('poker_hands')
          .select('*')
          .eq('id', table.current_hand_id)
          .maybeSingle();
        
        if (currentHand) {
          const handAge = Date.now() - new Date(currentHand.action_started_at || currentHand.created_at).getTime();
          const isStuck = handAge > 60000;
          const isCompleted = currentHand.completed_at !== null;
          
          if (isStuck || isCompleted) {
            await supabase.from('poker_hands')
              .update({ completed_at: new Date().toISOString(), phase: 'showdown', pot: 0 })
              .eq('id', table.current_hand_id);
            await supabase.from('poker_tables')
              .update({ current_hand_id: null, status: 'waiting' })
              .eq('id', tableId);
          } else {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'Hand already in progress',
              handAge: Math.round(handAge/1000)
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } else {
          await supabase.from('poker_tables')
            .update({ current_hand_id: null, status: 'waiting' })
            .eq('id', tableId);
        }
      }

      const { data: freshPlayers } = await supabase
        .from('poker_table_players')
        .select('*, players(name, avatar_url)')
        .eq('table_id', tableId);

      const activePlayers = freshPlayers?.filter(p => p.status === 'active' && p.stack > 0) || [];
      
      if (activePlayers.length < 2) {
        result = { success: false, error: 'Need at least 2 players' };
      } else {
        // Use core engine to create deck
        const deck = createDeck();
        const sortedPlayers = [...activePlayers].sort((a, b) => a.seat_number - b.seat_number);
        
        let dealerIndex = 0;
        if (table.current_dealer_seat) {
          const prevDealerIdx = sortedPlayers.findIndex(p => p.seat_number === table.current_dealer_seat);
          dealerIndex = prevDealerIdx >= 0 ? (prevDealerIdx + 1) % sortedPlayers.length : 0;
        }
        
        const dealerSeat = sortedPlayers[dealerIndex].seat_number;
        const isHeadsUp = sortedPlayers.length === 2;
        const sbIndex = isHeadsUp ? dealerIndex : (dealerIndex + 1) % sortedPlayers.length;
        const bbIndex = isHeadsUp ? (dealerIndex + 1) % sortedPlayers.length : (dealerIndex + 2) % sortedPlayers.length;
        
        const sbPlayer = sortedPlayers[sbIndex];
        const bbPlayer = sortedPlayers[bbIndex];

        const sbAmount = Math.min(table.small_blind, sbPlayer.stack);
        const bbAmount = Math.min(table.big_blind, bbPlayer.stack);

        const { data: hand, error: handError } = await supabase
          .from('poker_hands')
          .insert({
            table_id: tableId,
            dealer_seat: dealerSeat,
            small_blind_seat: sbPlayer.seat_number,
            big_blind_seat: bbPlayer.seat_number,
            phase: 'preflop',
            pot: sbAmount + bbAmount,
            current_bet: bbAmount,
            deck_state: JSON.stringify(deck),
            side_pots: JSON.stringify([])
          })
          .select()
          .single();

        if (handError) {
          result = { success: false, error: handError.message };
        } else {
          const handPlayers = [];
          let deckIndex = 0;

          for (const player of sortedPlayers) {
            const holeCards = [deck[deckIndex++], deck[deckIndex++]];
            const isSB = player.seat_number === sbPlayer.seat_number;
            const isBB = player.seat_number === bbPlayer.seat_number;
            const blindAmount = isSB ? sbAmount : isBB ? bbAmount : 0;

            handPlayers.push({
              hand_id: hand.id,
              player_id: player.player_id,
              seat_number: player.seat_number,
              stack_start: player.stack,
              hole_cards: holeCards,
              bet_amount: blindAmount,
              is_all_in: blindAmount >= player.stack,
            });
          }

          await supabase.from('poker_hand_players').insert(handPlayers);
          await supabase.from('poker_table_players').update({ stack: sbPlayer.stack - sbAmount }).eq('id', sbPlayer.id);
          await supabase.from('poker_table_players').update({ stack: bbPlayer.stack - bbAmount }).eq('id', bbPlayer.id);

          const firstToActIndex = isHeadsUp ? sbIndex : (bbIndex + 1) % sortedPlayers.length;
          const firstToActSeat = sortedPlayers[firstToActIndex].seat_number;

          await supabase.from('poker_tables').update({
            current_hand_id: hand.id,
            current_dealer_seat: dealerSeat,
            status: 'playing'
          }).eq('id', tableId);

          await supabase.from('poker_hands').update({
            current_player_seat: firstToActSeat,
            action_started_at: new Date().toISOString()
          }).eq('id', hand.id);

          console.log(`[Engine] Hand started: dealer=${dealerSeat}, SB=${sbPlayer.seat_number}(${sbAmount}), BB=${bbPlayer.seat_number}(${bbAmount}), first=${firstToActSeat}`);

          result = {
            success: true,
            handId: hand.id,
            dealerSeat,
            smallBlindSeat: sbPlayer.seat_number,
            bigBlindSeat: bbPlayer.seat_number,
            currentPlayerSeat: firstToActSeat,
            pot: sbAmount + bbAmount,
            actionTime: ACTION_TIME_SECONDS,
          };
        }
      }
    }

    // ==========================================
    // ACTION: CHECK_TIMEOUT
    // ==========================================
    else if (action === 'check_timeout') {
      if (!table.current_hand_id) {
        result = { success: false, error: 'No active hand' };
      } else {
        const { data: hand } = await supabase
          .from('poker_hands')
          .select('*')
          .eq('id', table.current_hand_id)
          .single();

        if (!hand) {
          result = { success: false, error: 'Hand not found' };
        } else {
          const actionStarted = new Date(hand.action_started_at || hand.created_at);
          const elapsed = (Date.now() - actionStarted.getTime()) / 1000;

          if (elapsed < ACTION_TIME_SECONDS) {
            result = { success: false, error: 'Time not expired', elapsed, required: ACTION_TIME_SECONDS };
          } else {
            const { data: hp } = await supabase
              .from('poker_hand_players')
              .select('*')
              .eq('hand_id', hand.id)
              .eq('seat_number', hand.current_player_seat)
              .single();

            if (!hp || hp.is_folded) {
              result = { success: false, error: 'No player to timeout' };
            } else {
              await supabase.from('poker_hand_players').update({ is_folded: true }).eq('id', hp.id);

              const { count } = await supabase.from('poker_actions').select('*', { count: 'exact' }).eq('hand_id', hand.id);
              await supabase.from('poker_actions').insert({
                hand_id: hand.id,
                player_id: hp.player_id,
                seat_number: hand.current_player_seat,
                action_type: 'fold',
                amount: 0,
                phase: hand.phase,
                action_order: (count || 0) + 1,
              });

              const { data: allHp } = await supabase.from('poker_hand_players').select('*').eq('hand_id', hand.id);
              const remaining = allHp?.filter(p => !p.is_folded) || [];

              if (remaining.length === 1) {
                const winner = remaining[0];
                const { data: winnerTp } = await supabase
                  .from('poker_table_players')
                  .select('stack')
                  .eq('player_id', winner.player_id)
                  .eq('table_id', tableId)
                  .single();

                await supabase.from('poker_table_players')
                  .update({ stack: (winnerTp?.stack || 0) + hand.pot })
                  .eq('player_id', winner.player_id)
                  .eq('table_id', tableId);

                await supabase.from('poker_hands').update({
                  pot: 0, phase: 'showdown',
                  completed_at: new Date().toISOString(),
                  winners: JSON.stringify([{ playerId: winner.player_id, amount: hand.pot }]),
                }).eq('id', hand.id);

                await supabase.from('poker_tables').update({ current_hand_id: null, status: 'waiting' }).eq('id', tableId);

                result = { success: true, action: 'timeout_fold', handComplete: true, winner: winner.player_id, winAmount: hand.pot };
              } else {
                const next = findNextActivePlayer(remaining, hand.current_player_seat, hp.player_id);

                await supabase.from('poker_hands').update({
                  current_player_seat: next?.seat_number,
                  action_started_at: new Date().toISOString()
                }).eq('id', hand.id);

                result = { success: true, action: 'timeout_fold', foldedSeat: hand.current_player_seat, nextPlayerSeat: next?.seat_number };
              }
            }
          }
        }
      }
    }

    // ==========================================
    // BETTING ACTIONS
    // ==========================================
    else if (['fold', 'check', 'call', 'raise', 'all_in'].includes(action)) {
      if (!table.current_hand_id) {
        result = { success: false, error: 'No active hand' };
      } else {
        const { data: hand } = await supabase.from('poker_hands').select('*').eq('id', table.current_hand_id).single();
        if (!hand) {
          result = { success: false, error: 'Hand not found' };
        } else {
          const { data: hp } = await supabase.from('poker_hand_players').select('*').eq('hand_id', hand.id).eq('player_id', playerId).single();
          const tp = tablePlayers?.find(p => p.player_id === playerId);

          if (!hp || !tp) {
            result = { success: false, error: 'Player not in hand' };
          } else if (hand.current_player_seat !== tp.seat_number) {
            result = { success: false, error: `Not your turn. Current: ${hand.current_player_seat}, You: ${tp.seat_number}` };
          } else if (hp.is_folded) {
            result = { success: false, error: 'Already folded' };
          } else {
            // Use core engine validation
            const gamePlayer: GamePlayer = {
              id: playerId,
              seatNumber: tp.seat_number,
              stack: tp.stack,
              betAmount: hp.bet_amount,
              holeCards: hp.hole_cards || [],
              isFolded: hp.is_folded,
              isAllIn: hp.is_all_in,
              isSittingOut: false
            };
            
            const bettingResult = validateAndProcessAction(
              { type: action as any, amount },
              gamePlayer,
              hand.current_bet,
              table.big_blind
            );

            if (!bettingResult.valid) {
              result = { success: false, error: bettingResult.error };
            } else {
              const { newBet, newStack, actionAmount, isFolded, isAllIn } = bettingResult;
              
              await supabase.from('poker_hand_players').update({ 
                bet_amount: newBet, 
                is_folded: isFolded, 
                is_all_in: isAllIn 
              }).eq('id', hp.id);
              
              await supabase.from('poker_table_players').update({ stack: newStack }).eq('id', tp.id);

              const { count } = await supabase.from('poker_actions').select('*', { count: 'exact' }).eq('hand_id', hand.id);
              await supabase.from('poker_actions').insert({
                hand_id: hand.id,
                player_id: playerId,
                seat_number: tp.seat_number,
                action_type: action,
                amount: actionAmount,
                phase: hand.phase,
                action_order: (count || 0) + 1,
              });

              const newPot = hand.pot + actionAmount;
              const newCurrentBet = Math.max(hand.current_bet, newBet);

              const { data: allHp } = await supabase.from('poker_hand_players').select('*').eq('hand_id', hand.id);
              const remaining = allHp?.filter(p => !p.is_folded) || [];
              const active = remaining.filter(p => !p.is_all_in);

              console.log(`[Engine] After ${action}: pot=${newPot}, bet=${newCurrentBet}, remaining=${remaining.length}, active=${active.length}`);

              // Check for winner by fold
              if (remaining.length === 1) {
                const winner = remaining[0];
                const { data: winnerTp } = await supabase.from('poker_table_players')
                  .select('stack').eq('player_id', winner.player_id).eq('table_id', tableId).single();

                await supabase.from('poker_table_players')
                  .update({ stack: (winnerTp?.stack || 0) + newPot })
                  .eq('player_id', winner.player_id).eq('table_id', tableId);

                await supabase.from('poker_hands').update({
                  pot: 0, phase: 'showdown',
                  completed_at: new Date().toISOString(),
                  winners: JSON.stringify([{ playerId: winner.player_id, amount: newPot }]),
                }).eq('id', hand.id);

                await supabase.from('poker_tables').update({ current_hand_id: null, status: 'waiting' }).eq('id', tableId);

                result = { success: true, action, amount: actionAmount, handComplete: true, winner: winner.player_id, winAmount: newPot };
              } else {
                // Check round completion
                let roundComplete = true;
                
                for (const p of remaining) {
                  if (p.is_all_in) continue;
                  const currentBet = p.player_id === playerId ? newBet : p.bet_amount;
                  if (currentBet < newCurrentBet) {
                    roundComplete = false;
                    break;
                  }
                }
                
                // Preflop BB option
                if (roundComplete && hand.phase === 'preflop') {
                  const bbPlayer = remaining.find(p => p.seat_number === hand.big_blind_seat);
                  if (bbPlayer && !bbPlayer.is_all_in && bbPlayer.player_id !== playerId) {
                    const { data: preflopActions } = await supabase
                      .from('poker_actions')
                      .select('action_type, amount')
                      .eq('hand_id', hand.id)
                      .eq('phase', 'preflop');
                    
                    const hasRaise = preflopActions?.some(a => 
                      a.action_type === 'raise' || a.action_type === 'all_in'
                    );
                    
                    const bbHasActed = preflopActions?.some(a => 
                      allHp?.find(hp => hp.player_id === bbPlayer.player_id)?.seat_number === hand.big_blind_seat &&
                      ['check', 'raise', 'call', 'fold'].includes(a.action_type)
                    );
                    
                    if (!hasRaise && !bbHasActed && newCurrentBet === table.big_blind) {
                      roundComplete = false;
                    }
                  }
                }
                
                if (active.length === 0 && remaining.length > 1) {
                  roundComplete = true;
                }
                
                let nextPlayer = findNextActivePlayer(allHp || [], tp.seat_number, playerId);
                
                if ((action === 'raise' || action === 'all_in') && newBet > hand.current_bet) {
                  roundComplete = false;
                  nextPlayer = findNextActivePlayer(allHp || [], tp.seat_number, playerId);
                }

                console.log(`[Engine] Round complete: ${roundComplete}, next: ${nextPlayer?.seat_number}, phase: ${hand.phase}`);

                let newPhase = hand.phase as GamePhase;
                let newCommunityCards = hand.community_cards || [];
                const deck: string[] = JSON.parse(hand.deck_state || '[]');
                const playerCount = allHp?.length || 0;
                const deckStart = playerCount * 2;

                const shouldAdvancePhase = roundComplete && hand.phase !== 'river';
                const shouldShowdown = roundComplete && (hand.phase === 'river' || active.length === 0);
                
                if (shouldAdvancePhase && !shouldShowdown) {
                  newPhase = getNextPhase(hand.phase);
                  
                  console.log(`[Engine] Phase transition: ${hand.phase} -> ${newPhase}`);
                  
                  if (newPhase === 'flop') {
                    newCommunityCards = [deck[deckStart + 1], deck[deckStart + 2], deck[deckStart + 3]];
                  } else if (newPhase === 'turn') {
                    newCommunityCards = [...(hand.community_cards || []), deck[deckStart + 5]];
                  } else if (newPhase === 'river') {
                    newCommunityCards = [...(hand.community_cards || []), deck[deckStart + 7]];
                  }

                  for (const p of (allHp || [])) {
                    if (!p.is_folded) {
                      await supabase.from('poker_hand_players').update({ bet_amount: 0 }).eq('id', p.id);
                    }
                  }

                  const sortedRemaining = [...remaining].filter(p => !p.is_all_in).sort((a, b) => a.seat_number - b.seat_number);
                  nextPlayer = sortedRemaining.find(p => p.seat_number > hand.dealer_seat) || sortedRemaining[0];
                  
                  console.log(`[Engine] New street, first to act: seat ${nextPlayer?.seat_number}`);
                }

                // SHOWDOWN
                if (shouldShowdown || newPhase === 'showdown') {
                  // Deal remaining cards using core engine
                  newCommunityCards = dealRemainingCards(deck, playerCount, newCommunityCards);

                  // Calculate contributions using core engine
                  const contributions: PlayerContribution[] = (allHp || []).map(p => {
                    const playerTp = tablePlayers?.find(t => t.player_id === p.player_id);
                    const originalStack = p.stack_start;
                    const currentStack = p.player_id === playerId ? newStack : (playerTp?.stack || 0);
                    return {
                      playerId: p.player_id,
                      totalBet: originalStack - currentStack,
                      isFolded: p.is_folded || (p.player_id === playerId && isFolded),
                      isAllIn: p.is_all_in || (p.player_id === playerId && isAllIn)
                    };
                  });
                  
                  const potResult = calculateSidePots(contributions);

                  // Get actions for showdown order
                  const { data: allActions } = await supabase
                    .from('poker_actions')
                    .select('*')
                    .eq('hand_id', hand.id)
                    .order('action_order', { ascending: true });

                  // Determine showdown order using core engine
                  const gamePlayers: GamePlayer[] = remaining.map(p => ({
                    id: p.player_id,
                    seatNumber: p.seat_number,
                    stack: 0,
                    betAmount: p.bet_amount,
                    holeCards: p.hole_cards || [],
                    isFolded: p.is_folded,
                    isAllIn: p.is_all_in,
                    isSittingOut: false
                  }));
                  
                  const actions = (allActions || []).map(a => ({
                    playerId: a.player_id,
                    type: a.action_type,
                    phase: a.phase
                  }));
                  
                  const showdownOrder = determineShowdownOrder(gamePlayers, actions, hand.dealer_seat);
                  console.log(`[Engine] Showdown order: ${showdownOrder.map(id => id.slice(0,8)).join(' -> ')}`);

                  // Evaluate hands using core engine
                  const handResults: HandResult[] = [];
                  for (const pid of showdownOrder) {
                    const p = remaining.find(r => r.player_id === pid)!;
                    const ev = evaluateHand(p.hole_cards || [], newCommunityCards);
                    handResults.push({ ...ev, playerId: p.player_id });
                  }

                  // Distribute pots
                  const winnings = new Map<string, number>();
                  const winnersInfo: { playerId: string; amount: number; handName: string }[] = [];
                  const allPots = [potResult.mainPot, ...potResult.sidePots];

                  for (const pot of allPots) {
                    if (pot.amount === 0) continue;
                    const eligible = handResults.filter(hr => pot.eligiblePlayers.includes(hr.playerId));
                    if (eligible.length === 0) continue;

                    eligible.sort((a, b) => compareHands(b, a));
                    const best = eligible[0];
                    const winners = eligible.filter(hr => 
                      hr.handRank === best.handRank && compareKickers(hr.kickers, best.kickers) === 0
                    );

                    const share = Math.floor(pot.amount / winners.length);
                    const rem = pot.amount % winners.length;

                    winners.forEach((w, i) => {
                      const amt = share + (i === 0 ? rem : 0);
                      winnings.set(w.playerId, (winnings.get(w.playerId) || 0) + amt);
                      winnersInfo.push({ playerId: w.playerId, amount: amt, handName: w.handName });
                    });
                  }

                  // Update stacks
                  for (const [pid, amt] of winnings) {
                    const pTp = tablePlayers?.find(t => t.player_id === pid);
                    const currentStack = pid === playerId ? newStack : (pTp?.stack || 0);
                    await supabase.from('poker_table_players')
                      .update({ stack: currentStack + amt })
                      .eq('player_id', pid).eq('table_id', tableId);
                  }

                  // Update hand results
                  for (const hr of handResults) {
                    await supabase.from('poker_hand_players').update({
                      hand_rank: hr.handName,
                      won_amount: winnings.get(hr.playerId) || 0
                    }).eq('hand_id', hand.id).eq('player_id', hr.playerId);
                  }

                  await supabase.from('poker_hands').update({
                    pot: 0, phase: 'showdown',
                    community_cards: newCommunityCards,
                    completed_at: new Date().toISOString(),
                    winners: JSON.stringify(winnersInfo),
                    side_pots: JSON.stringify(allPots)
                  }).eq('id', hand.id);

                  await supabase.from('poker_tables').update({ current_hand_id: null, status: 'waiting' }).eq('id', tableId);

                  console.log(`[Engine] Showdown complete. Winners: ${JSON.stringify(winnersInfo)}`);

                  result = {
                    success: true, action, amount: actionAmount, handComplete: true,
                    winners: winnersInfo, communityCards: newCommunityCards, sidePots: allPots,
                    showdownOrder,
                    handResults: handResults.map(hr => ({ playerId: hr.playerId, handName: hr.handName, bestCards: hr.bestCards }))
                  };
                } else {
                  // Continue hand
                  await supabase.from('poker_hands').update({
                    pot: newPot,
                    current_bet: newPhase !== hand.phase ? 0 : newCurrentBet,
                    current_player_seat: nextPlayer?.seat_number,
                    phase: newPhase,
                    community_cards: newCommunityCards,
                    action_started_at: new Date().toISOString(),
                  }).eq('id', hand.id);

                  result = {
                    success: true, action, amount: actionAmount, pot: newPot,
                    currentBet: newPhase !== hand.phase ? 0 : newCurrentBet,
                    nextPlayerSeat: nextPlayer?.seat_number,
                    phase: newPhase, communityCards: newCommunityCards,
                    actionTime: ACTION_TIME_SECONDS,
                  };
                }
              }
            }
          }
        }
      }
    }

    else {
      result = { success: false, error: 'Unknown action' };
    }

    console.log(`[Engine] Result: ${JSON.stringify(result).slice(0, 300)}`);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Engine] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
