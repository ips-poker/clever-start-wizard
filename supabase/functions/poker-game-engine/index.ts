import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==========================================
// CONSTANTS
// ==========================================
const SUITS = ['h', 'd', 'c', 's'] as const;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const ACTION_TIME_SECONDS = 30;
const PHASES = ['preflop', 'flop', 'turn', 'river', 'showdown'] as const;

// ==========================================
// TYPES
// ==========================================
interface PlayerContribution {
  playerId: string;
  totalBet: number;
  isFolded: boolean;
  isAllIn: boolean;
}

interface SidePot {
  amount: number;
  eligiblePlayers: string[];
  cappedAt: number;
}

interface PotResult {
  mainPot: SidePot;
  sidePots: SidePot[];
  totalPot: number;
}

interface HandResult {
  playerId: string;
  handRank: number;
  handName: string;
  bestCards: string[];
  kickers: number[];
}

interface ActionRequest {
  action: 'join' | 'leave' | 'start_hand' | 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'check_timeout';
  tableId: string;
  playerId: string;
  amount?: number;
  seatNumber?: number;
}

// ==========================================
// SIDE POT CALCULATION
// ==========================================
function calculateSidePots(contributions: PlayerContribution[]): PotResult {
  const empty = { mainPot: { amount: 0, eligiblePlayers: [], cappedAt: 0 }, sidePots: [], totalPot: 0 };
  if (contributions.length === 0) return empty;

  const activeBettors = contributions.filter(c => c.totalBet > 0);
  if (activeBettors.length === 0) return empty;

  // Get unique bet levels from all-in players
  const allInLevels = new Set<number>();
  for (const c of activeBettors) {
    if (c.isAllIn && c.totalBet > 0) allInLevels.add(c.totalBet);
  }
  allInLevels.add(Math.max(...activeBettors.map(c => c.totalBet)));

  const levels = Array.from(allInLevels).sort((a, b) => a - b);
  const pots: SidePot[] = [];
  let previousLevel = 0;

  for (const level of levels) {
    const increment = level - previousLevel;
    if (increment <= 0) continue;

    let potAmount = 0;
    const eligiblePlayers: string[] = [];

    for (const c of activeBettors) {
      if (c.totalBet > previousLevel) {
        potAmount += Math.min(c.totalBet - previousLevel, increment);
        if (!c.isFolded && c.totalBet >= level && !eligiblePlayers.includes(c.playerId)) {
          eligiblePlayers.push(c.playerId);
        }
      }
    }

    if (potAmount > 0) pots.push({ amount: potAmount, eligiblePlayers, cappedAt: level });
    previousLevel = level;
  }

  const [mainPot, ...sidePots] = pots;
  return {
    mainPot: mainPot || { amount: 0, eligiblePlayers: [], cappedAt: 0 },
    sidePots,
    totalPot: pots.reduce((sum, pot) => sum + pot.amount, 0)
  };
}

// ==========================================
// HAND EVALUATION
// ==========================================
function getSortedValues(cards: string[]): number[] {
  return cards.map(c => RANK_VALUES[c[0]]).sort((a, b) => b - a);
}

function isFlush(cards: string[]): boolean {
  const suit = cards[0][1];
  return cards.every(c => c[1] === suit);
}

function isStraight(values: number[]): { isStraight: boolean; highCard: number } {
  const sorted = [...new Set(values)].sort((a, b) => b - a);
  
  for (let i = 0; i <= sorted.length - 5; i++) {
    if (sorted[i] - sorted[i + 4] === 4) {
      return { isStraight: true, highCard: sorted[i] };
    }
  }
  
  // Wheel (A-5-4-3-2)
  if (sorted.includes(14) && sorted.includes(5) && sorted.includes(4) && 
      sorted.includes(3) && sorted.includes(2)) {
    return { isStraight: true, highCard: 5 };
  }
  
  return { isStraight: false, highCard: 0 };
}

function getRankCounts(cards: string[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const card of cards) {
    const value = RANK_VALUES[card[0]];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function compareKickers(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function evaluateFiveCards(cards: string[]): HandResult {
  const values = getSortedValues(cards);
  const flush = isFlush(cards);
  const straightResult = isStraight(values);
  const rankCounts = getRankCounts(cards);
  
  const countsArray = Array.from(rankCounts.entries()).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const counts = countsArray.map(c => c[1]);
  const rankedValues = countsArray.map(c => c[0]);

  if (flush && straightResult.isStraight && straightResult.highCard === 14) {
    return { playerId: '', handRank: 10, handName: 'Royal Flush', bestCards: cards, kickers: [14] };
  }
  if (flush && straightResult.isStraight) {
    return { playerId: '', handRank: 9, handName: 'Straight Flush', bestCards: cards, kickers: [straightResult.highCard] };
  }
  if (counts[0] === 4) {
    return { playerId: '', handRank: 8, handName: 'Four of a Kind', bestCards: cards, kickers: rankedValues };
  }
  if (counts[0] === 3 && counts[1] >= 2) {
    return { playerId: '', handRank: 7, handName: 'Full House', bestCards: cards, kickers: rankedValues.slice(0, 2) };
  }
  if (flush) {
    return { playerId: '', handRank: 6, handName: 'Flush', bestCards: cards, kickers: values.slice(0, 5) };
  }
  if (straightResult.isStraight) {
    return { playerId: '', handRank: 5, handName: 'Straight', bestCards: cards, kickers: [straightResult.highCard] };
  }
  if (counts[0] === 3) {
    return { playerId: '', handRank: 4, handName: 'Three of a Kind', bestCards: cards, kickers: rankedValues };
  }
  if (counts[0] === 2 && counts[1] === 2) {
    return { playerId: '', handRank: 3, handName: 'Two Pair', bestCards: cards, kickers: rankedValues };
  }
  if (counts[0] === 2) {
    return { playerId: '', handRank: 2, handName: 'One Pair', bestCards: cards, kickers: rankedValues };
  }
  return { playerId: '', handRank: 1, handName: 'High Card', bestCards: cards, kickers: values.slice(0, 5) };
}

function evaluateHand(holeCards: string[], communityCards: string[]): HandResult {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    return { playerId: '', handRank: 0, handName: 'Unknown', bestCards: [], kickers: [] };
  }

  // Generate all 5-card combinations
  const combinations: string[][] = [];
  for (let i = 0; i < allCards.length - 4; i++) {
    for (let j = i + 1; j < allCards.length - 3; j++) {
      for (let k = j + 1; k < allCards.length - 2; k++) {
        for (let l = k + 1; l < allCards.length - 1; l++) {
          for (let m = l + 1; m < allCards.length; m++) {
            combinations.push([allCards[i], allCards[j], allCards[k], allCards[l], allCards[m]]);
          }
        }
      }
    }
  }

  let bestResult: HandResult = { playerId: '', handRank: 0, handName: 'High Card', bestCards: [], kickers: [] };

  for (const combo of combinations) {
    const result = evaluateFiveCards(combo);
    if (result.handRank > bestResult.handRank || 
       (result.handRank === bestResult.handRank && compareKickers(result.kickers, bestResult.kickers) > 0)) {
      bestResult = result;
    }
  }

  return bestResult;
}

function compareHands(a: HandResult, b: HandResult): number {
  if (a.handRank !== b.handRank) return a.handRank - b.handRank;
  return compareKickers(a.kickers, b.kickers);
}

// ==========================================
// DECK MANAGEMENT
// ==========================================
function createDeck(): string[] {
  const deck: string[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  // Cryptographically secure shuffle using Web Crypto API
  const array = new Uint32Array(deck.length);
  crypto.getRandomValues(array);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function getNextPhase(current: string): string {
  const idx = PHASES.indexOf(current as typeof PHASES[number]);
  return idx < PHASES.length - 1 ? PHASES[idx + 1] : 'showdown';
}

// Find next active player to act (clockwise from current seat)
function findNextActivePlayer(players: any[], currentSeat: number, excludePlayerId?: string): any {
  const sorted = [...players].sort((a, b) => a.seat_number - b.seat_number);
  
  // First try to find player after current seat
  let next = sorted.find(p => 
    p.seat_number > currentSeat && 
    !p.is_folded && 
    !p.is_all_in && 
    p.player_id !== excludePlayerId
  );
  
  // If not found, wrap around to beginning
  if (!next) {
    next = sorted.find(p => 
      !p.is_folded && 
      !p.is_all_in && 
      p.player_id !== excludePlayerId
    );
  }
  
  return next;
}

// ==========================================
// MAIN HANDLER
// ==========================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const request: ActionRequest = await req.json();
    const { action, tableId, playerId, amount, seatNumber } = request;
    
    console.log(`[Engine] ${action} | table=${tableId?.slice(0,8)} | player=${playerId?.slice(0,8)} | amount=${amount}`);

    // Validate input
    if (!tableId || !playerId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing tableId or playerId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get table
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

    // Get players
    const { data: tablePlayers } = await supabase
      .from('poker_table_players')
      .select('*, players(name, avatar_url)')
      .eq('table_id', tableId);

    let result: any = { success: false };

    // ==========================================
    // ACTION: JOIN
    // ==========================================
    if (action === 'join') {
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
          // Use diamond wallet for buy-in
          const { data: wallet } = await supabase
            .from('diamond_wallets')
            .select('balance, total_spent')
            .eq('player_id', playerId)
            .single();

          const diamondBalance = wallet?.balance || 0;
          
          // Buy-in comes from request or defaults to min
          const requestedBuyIn = amount || table.min_buy_in;
          
          if (diamondBalance < requestedBuyIn) {
            result = { success: false, error: `Недостаточно алмазов. Баланс: ${diamondBalance}, требуется: ${requestedBuyIn}` };
          } else {
            const buyIn = Math.min(Math.max(requestedBuyIn, table.min_buy_in), table.max_buy_in);
            
            // Deduct diamonds from wallet
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
              // Refund diamonds on race condition
              await supabase
                .from('diamond_wallets')
                .update({ 
                  balance: diamondBalance,
                  total_spent: wallet?.total_spent || 0
                })
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
              // Refund diamonds on error
              await supabase
                .from('diamond_wallets')
                .update({ 
                  balance: diamondBalance,
                  total_spent: wallet?.total_spent || 0
                })
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
    // ACTION: LEAVE - Return remaining stack to diamond wallet
    // ==========================================
    else if (action === 'leave') {
      const playerAtTable = tablePlayers?.find(p => p.player_id === playerId);
      const remainingStack = playerAtTable?.stack || 0;
      
      if (remainingStack > 0) {
        const { data: wallet } = await supabase
          .from('diamond_wallets')
          .select('balance, total_won')
          .eq('player_id', playerId)
          .single();
        
        if (wallet) {
          await supabase
            .from('diamond_wallets')
            .update({ 
              balance: wallet.balance + remainingStack,
              total_won: wallet.total_won + remainingStack
            })
            .eq('player_id', playerId);
          
          console.log(`[Engine] Returned ${remainingStack} diamonds to player wallet`);
        }
      }
      
      await supabase.from('poker_table_players').delete().eq('table_id', tableId).eq('player_id', playerId);
      result = { success: true, returnedDiamonds: remainingStack };
    }

    // ==========================================
    // ACTION: START_HAND
    // ==========================================
    else if (action === 'start_hand') {
      // Cleanup stuck hands
      const { data: cleanupResult } = await supabase.rpc('cleanup_stuck_poker_hands');
      if (cleanupResult && cleanupResult > 0) {
        console.log(`[Engine] Cleaned up ${cleanupResult} stuck hands`);
      }

      // Clean up players with 0 chips
      const zeroChipPlayers = tablePlayers?.filter(p => p.status === 'active' && p.stack <= 0) || [];
      for (const p of zeroChipPlayers) {
        await supabase.from('poker_table_players').update({ status: 'sitting_out' }).eq('id', p.id);
      }

      // Check current hand
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

      // Re-fetch players
      const { data: freshPlayers } = await supabase
        .from('poker_table_players')
        .select('*, players(name, avatar_url)')
        .eq('table_id', tableId);

      const activePlayers = freshPlayers?.filter(p => p.status === 'active' && p.stack > 0) || [];
      
      if (activePlayers.length < 2) {
        result = { success: false, error: 'Need at least 2 players' };
      } else {
        const deck = createDeck();
        const sortedPlayers = [...activePlayers].sort((a, b) => a.seat_number - b.seat_number);
        
        // Determine dealer (rotate from previous)
        let dealerIndex = 0;
        if (table.current_dealer_seat) {
          const prevDealerIdx = sortedPlayers.findIndex(p => p.seat_number === table.current_dealer_seat);
          dealerIndex = prevDealerIdx >= 0 ? (prevDealerIdx + 1) % sortedPlayers.length : 0;
        }
        
        const dealerSeat = sortedPlayers[dealerIndex].seat_number;
        
        // Heads-up special case: dealer is SB
        const isHeadsUp = sortedPlayers.length === 2;
        const sbIndex = isHeadsUp ? dealerIndex : (dealerIndex + 1) % sortedPlayers.length;
        const bbIndex = isHeadsUp ? (dealerIndex + 1) % sortedPlayers.length : (dealerIndex + 2) % sortedPlayers.length;
        
        const sbPlayer = sortedPlayers[sbIndex];
        const bbPlayer = sortedPlayers[bbIndex];

        const sbAmount = Math.min(table.small_blind, sbPlayer.stack);
        const bbAmount = Math.min(table.big_blind, bbPlayer.stack);

        // Create hand
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
          // Deal cards and create hand players
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

          // Update stacks for blinds
          await supabase.from('poker_table_players').update({ stack: sbPlayer.stack - sbAmount }).eq('id', sbPlayer.id);
          await supabase.from('poker_table_players').update({ stack: bbPlayer.stack - bbAmount }).eq('id', bbPlayer.id);

          // First to act preflop: player after BB (or SB in heads-up)
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
            let actionAmount = 0;
            let newBet = hp.bet_amount;
            let newStack = tp.stack;
            let isFolded = false;
            let isAllIn = hp.is_all_in;
            let actionValid = true;

            if (action === 'fold') {
              isFolded = true;
            } else if (action === 'check') {
              if (hand.current_bet > hp.bet_amount) {
                result = { success: false, error: 'Cannot check, must call or raise' };
                actionValid = false;
              }
            } else if (action === 'call') {
              const toCall = hand.current_bet - hp.bet_amount;
              actionAmount = Math.min(toCall, tp.stack);
              newBet = hp.bet_amount + actionAmount;
              newStack = tp.stack - actionAmount;
              if (newStack === 0) isAllIn = true;
            } else if (action === 'raise') {
              const totalRaise = amount || (hand.current_bet * 2);
              const minRaise = hand.current_bet + table.big_blind;
              
              // Calculate how much more to add
              actionAmount = totalRaise - hp.bet_amount;
              
              if (actionAmount > tp.stack) {
                // All-in if not enough chips
                actionAmount = tp.stack;
                isAllIn = true;
              } else if (totalRaise < minRaise && tp.stack > minRaise - hp.bet_amount) {
                // Must raise at least min raise amount
                actionAmount = minRaise - hp.bet_amount;
              }
              
              newBet = hp.bet_amount + actionAmount;
              newStack = tp.stack - actionAmount;
              if (newStack === 0) isAllIn = true;
            } else if (action === 'all_in') {
              actionAmount = tp.stack;
              newBet = hp.bet_amount + actionAmount;
              newStack = 0;
              isAllIn = true;
            }

            if (actionValid) {
              // Update player state
              await supabase.from('poker_hand_players').update({ 
                bet_amount: newBet, 
                is_folded: isFolded, 
                is_all_in: isAllIn 
              }).eq('id', hp.id);
              
              await supabase.from('poker_table_players').update({ stack: newStack }).eq('id', tp.id);

              // Record action
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

              // Get updated hand players
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
                // Determine if betting round is complete
                // Round is complete when:
                // 1. All active players have had a chance to act
                // 2. All bets are equal (or players are all-in with less)
                // 3. For preflop, BB must have option if no raise
                
                let roundComplete = true;
                
                // Check if all remaining players have matched the bet or are all-in
                for (const p of remaining) {
                  if (p.is_all_in) continue; // All-in players don't need to match
                  
                  // Refresh bet amount for current player
                  const currentBet = p.player_id === playerId ? newBet : p.bet_amount;
                  
                  if (currentBet < newCurrentBet) {
                    roundComplete = false;
                    break;
                  }
                }
                
                // Preflop: BB gets option if limped to them (no raise beyond BB)
                if (roundComplete && hand.phase === 'preflop') {
                  const bbPlayer = remaining.find(p => p.seat_number === hand.big_blind_seat);
                  if (bbPlayer && !bbPlayer.is_all_in && bbPlayer.player_id !== playerId) {
                    // Check if there was any raise beyond BB
                    const { data: preflopActions } = await supabase
                      .from('poker_actions')
                      .select('action_type, amount')
                      .eq('hand_id', hand.id)
                      .eq('phase', 'preflop');
                    
                    const hasRaise = preflopActions?.some(a => 
                      a.action_type === 'raise' || a.action_type === 'all_in'
                    );
                    
                    // BB hasn't acted yet and no raise = BB option
                    const bbHasActed = preflopActions?.some(a => 
                      allHp?.find(hp => hp.player_id === bbPlayer.player_id)?.seat_number === hand.big_blind_seat &&
                      ['check', 'raise', 'call', 'fold'].includes(a.action_type)
                    );
                    
                    if (!hasRaise && !bbHasActed && newCurrentBet === table.big_blind) {
                      roundComplete = false;
                    }
                  }
                }
                
                // If only all-in players remain, go to showdown
                if (active.length === 0 && remaining.length > 1) {
                  roundComplete = true;
                }
                
                // Find next player to act
                let nextPlayer = findNextActivePlayer(allHp || [], tp.seat_number, playerId);
                
                // After raise, action continues from next player
                if ((action === 'raise' || action === 'all_in') && newBet > hand.current_bet) {
                  // Mark that a raise happened - need to give others chance to respond
                  roundComplete = false;
                  nextPlayer = findNextActivePlayer(allHp || [], tp.seat_number, playerId);
                }

                console.log(`[Engine] Round complete: ${roundComplete}, next: ${nextPlayer?.seat_number}, phase: ${hand.phase}`);

                let newPhase = hand.phase;
                let newCommunityCards = hand.community_cards || [];
                const deck: string[] = JSON.parse(hand.deck_state || '[]');
                const playerCount = allHp?.length || 0;
                
                // Cards are dealt after hole cards: 
                // deck[0..2*playerCount-1] = hole cards
                // deck[2*playerCount] = burn, deck[2*playerCount+1,2,3] = flop
                // deck[2*playerCount+4] = burn, deck[2*playerCount+5] = turn
                // deck[2*playerCount+6] = burn, deck[2*playerCount+7] = river
                const deckStart = playerCount * 2;

                // Determine if we should move to next phase
                // River + roundComplete = SHOWDOWN (not next phase)
                const shouldAdvancePhase = roundComplete && hand.phase !== 'river';
                const shouldShowdown = roundComplete && (hand.phase === 'river' || active.length === 0);
                
                if (shouldAdvancePhase && !shouldShowdown) {
                  newPhase = getNextPhase(hand.phase);
                  
                  console.log(`[Engine] Phase transition: ${hand.phase} -> ${newPhase}`);
                  
                  // Deal community cards with proper burn cards
                  if (newPhase === 'flop') {
                    // Burn 1, deal 3
                    newCommunityCards = [deck[deckStart + 1], deck[deckStart + 2], deck[deckStart + 3]];
                  } else if (newPhase === 'turn') {
                    // Burn 1, deal 1
                    newCommunityCards = [...(hand.community_cards || []), deck[deckStart + 5]];
                  } else if (newPhase === 'river') {
                    // Burn 1, deal 1
                    newCommunityCards = [...(hand.community_cards || []), deck[deckStart + 7]];
                  }

                  // Reset bets for new street
                  for (const p of (allHp || [])) {
                    if (!p.is_folded) {
                      await supabase.from('poker_hand_players').update({ bet_amount: 0 }).eq('id', p.id);
                    }
                  }

                  // First to act postflop: first active player after dealer
                  const sortedRemaining = [...remaining].filter(p => !p.is_all_in).sort((a, b) => a.seat_number - b.seat_number);
                  nextPlayer = sortedRemaining.find(p => p.seat_number > hand.dealer_seat) || sortedRemaining[0];
                  
                  console.log(`[Engine] New street, first to act: seat ${nextPlayer?.seat_number}`);
                }

                // SHOWDOWN - after river is complete OR all players all-in
                if (shouldShowdown || newPhase === 'showdown') {
                  // Deal remaining cards if needed
                  while (newCommunityCards.length < 5) {
                    if (newCommunityCards.length === 0) {
                      newCommunityCards = [deck[deckStart + 1], deck[deckStart + 2], deck[deckStart + 3]];
                    } else if (newCommunityCards.length === 3) {
                      newCommunityCards.push(deck[deckStart + 5]);
                    } else if (newCommunityCards.length === 4) {
                      newCommunityCards.push(deck[deckStart + 7]);
                    }
                  }

                  // Calculate contributions for side pots
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

                  // Evaluate hands
                  const handResults: HandResult[] = [];
                  for (const p of remaining) {
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
