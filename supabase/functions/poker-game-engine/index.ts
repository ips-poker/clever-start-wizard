import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Card types
const SUITS = ['h', 'd', 'c', 's'] as const;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

interface PlayerState {
  oderId: string;
  playerId: string;
  seatNumber: number;
  stack: number;
  holeCards: string[];
  currentBet: number;
  totalBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  hasActed: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

interface SidePot {
  amount: number;
  eligiblePlayers: string[];
  cappedAt: number;
}

interface HandResult {
  playerId: string;
  handRank: number;
  handName: string;
  bestCards: string[];
  kickers: number[];
}

interface ActionRequest {
  action: 'join' | 'leave' | 'start_hand' | 'fold' | 'check' | 'call' | 'raise' | 'all_in';
  tableId: string;
  playerId: string;
  amount?: number;
  seatNumber?: number;
}

// ==========================================
// SIDE POT CALCULATION - Professional Grade
// ==========================================

interface PlayerContribution {
  playerId: string;
  totalBet: number;
  isFolded: boolean;
  isAllIn: boolean;
}

interface PotResult {
  mainPot: SidePot;
  sidePots: SidePot[];
  totalPot: number;
}

function calculateSidePots(contributions: PlayerContribution[]): PotResult {
  if (contributions.length === 0) {
    return {
      mainPot: { amount: 0, eligiblePlayers: [], cappedAt: 0 },
      sidePots: [],
      totalPot: 0
    };
  }

  const activeBettors = contributions.filter(c => c.totalBet > 0);
  if (activeBettors.length === 0) {
    return {
      mainPot: { amount: 0, eligiblePlayers: [], cappedAt: 0 },
      sidePots: [],
      totalPot: 0
    };
  }

  // Get unique bet levels from all-in players
  const allInLevels = new Set<number>();
  for (const c of activeBettors) {
    if (c.isAllIn && c.totalBet > 0) {
      allInLevels.add(c.totalBet);
    }
  }

  const maxBet = Math.max(...activeBettors.map(c => c.totalBet));
  allInLevels.add(maxBet);

  const levels = Array.from(allInLevels).sort((a, b) => a - b);
  const pots: SidePot[] = [];
  let previousLevel = 0;

  for (const level of levels) {
    const increment = level - previousLevel;
    if (increment <= 0) continue;

    let potAmount = 0;
    const eligiblePlayers: string[] = [];

    for (const contribution of activeBettors) {
      if (contribution.totalBet > previousLevel) {
        const contributionAtLevel = Math.min(
          contribution.totalBet - previousLevel,
          increment
        );
        potAmount += contributionAtLevel;

        // Only non-folded players can win
        if (!contribution.isFolded && contribution.totalBet >= level) {
          if (!eligiblePlayers.includes(contribution.playerId)) {
            eligiblePlayers.push(contribution.playerId);
          }
        }
      }
    }

    if (potAmount > 0) {
      pots.push({
        amount: potAmount,
        eligiblePlayers,
        cappedAt: level
      });
    }

    previousLevel = level;
  }

  const [mainPot, ...sidePots] = pots;
  const totalPot = pots.reduce((sum, pot) => sum + pot.amount, 0);

  return {
    mainPot: mainPot || { amount: 0, eligiblePlayers: [], cappedAt: 0 },
    sidePots,
    totalPot
  };
}

// ==========================================
// HAND EVALUATION - Professional Grade
// ==========================================

function parseCard(card: string): { rank: string; suit: string; value: number } {
  const rank = card[0];
  const suit = card[1];
  return { rank, suit, value: RANK_VALUES[rank] };
}

function getSortedValues(cards: string[]): number[] {
  return cards.map(c => RANK_VALUES[c[0]]).sort((a, b) => b - a);
}

function isFlush(cards: string[]): boolean {
  const suit = cards[0][1];
  return cards.every(c => c[1] === suit);
}

function isStraight(values: number[]): { isStraight: boolean; highCard: number } {
  const sorted = [...new Set(values)].sort((a, b) => b - a);
  
  // Check for regular straight
  for (let i = 0; i <= sorted.length - 5; i++) {
    if (sorted[i] - sorted[i + 4] === 4) {
      return { isStraight: true, highCard: sorted[i] };
    }
  }
  
  // Check wheel (A-2-3-4-5)
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

function evaluateHand(holeCards: string[], communityCards: string[]): HandResult {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    return {
      playerId: '',
      handRank: 0,
      handName: 'Unknown',
      bestCards: [],
      kickers: []
    };
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

  let bestResult: HandResult = {
    playerId: '',
    handRank: 0,
    handName: 'High Card',
    bestCards: [],
    kickers: []
  };

  for (const combo of combinations) {
    const result = evaluateFiveCards(combo);
    if (result.handRank > bestResult.handRank || 
       (result.handRank === bestResult.handRank && compareKickers(result.kickers, bestResult.kickers) > 0)) {
      bestResult = result;
    }
  }

  return bestResult;
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
  
  const countsArray = Array.from(rankCounts.entries())
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const counts = countsArray.map(c => c[1]);
  const rankedValues = countsArray.map(c => c[0]);

  // Royal Flush
  if (flush && straightResult.isStraight && straightResult.highCard === 14) {
    return { playerId: '', handRank: 10, handName: 'Royal Flush', bestCards: cards, kickers: [14] };
  }

  // Straight Flush
  if (flush && straightResult.isStraight) {
    return { playerId: '', handRank: 9, handName: 'Straight Flush', bestCards: cards, kickers: [straightResult.highCard] };
  }

  // Four of a Kind
  if (counts[0] === 4) {
    return { playerId: '', handRank: 8, handName: 'Four of a Kind', bestCards: cards, kickers: rankedValues };
  }

  // Full House
  if (counts[0] === 3 && counts[1] >= 2) {
    return { playerId: '', handRank: 7, handName: 'Full House', bestCards: cards, kickers: rankedValues.slice(0, 2) };
  }

  // Flush
  if (flush) {
    return { playerId: '', handRank: 6, handName: 'Flush', bestCards: cards, kickers: values.slice(0, 5) };
  }

  // Straight
  if (straightResult.isStraight) {
    return { playerId: '', handRank: 5, handName: 'Straight', bestCards: cards, kickers: [straightResult.highCard] };
  }

  // Three of a Kind
  if (counts[0] === 3) {
    return { playerId: '', handRank: 4, handName: 'Three of a Kind', bestCards: cards, kickers: rankedValues };
  }

  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    return { playerId: '', handRank: 3, handName: 'Two Pair', bestCards: cards, kickers: rankedValues };
  }

  // One Pair
  if (counts[0] === 2) {
    return { playerId: '', handRank: 2, handName: 'One Pair', bestCards: cards, kickers: rankedValues };
  }

  // High Card
  return { playerId: '', handRank: 1, handName: 'High Card', bestCards: cards, kickers: values.slice(0, 5) };
}

// Compare two hand results, returns positive if a wins, negative if b wins, 0 for tie
function compareHands(a: HandResult, b: HandResult): number {
  if (a.handRank !== b.handRank) {
    return a.handRank - b.handRank;
  }
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
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ==========================================
// MAIN HANDLER
// ==========================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: ActionRequest = await req.json();
    const { action, tableId, playerId, amount, seatNumber } = request;

    console.log(`[Poker Engine] Action: ${action}, Table: ${tableId}, Player: ${playerId}`);

    // Get current table state
    const { data: table, error: tableError } = await supabase
      .from('poker_tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (tableError) {
      console.error('Table error:', tableError);
      return new Response(JSON.stringify({ error: 'Table not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get players at table
    const { data: tablePlayers, error: playersError } = await supabase
      .from('poker_table_players')
      .select('*, players(name, avatar_url)')
      .eq('table_id', tableId);

    if (playersError) {
      console.error('Players error:', playersError);
    }

    let result: any = { success: false };

    switch (action) {
      case 'join': {
        const occupiedSeats = (tablePlayers || []).map(p => p.seat_number);
        const availableSeat = seatNumber || 
          Array.from({ length: table.max_players }, (_, i) => i + 1)
            .find(s => !occupiedSeats.includes(s));

        if (!availableSeat) {
          result = { success: false, error: 'No available seats' };
          break;
        }

        const { data: balance } = await supabase
          .from('player_balances')
          .select('balance')
          .eq('player_id', playerId)
          .single();

        const buyIn = Math.min(balance?.balance || table.min_buy_in, table.max_buy_in);

        const { error: joinError } = await supabase
          .from('poker_table_players')
          .upsert({
            table_id: tableId,
            player_id: playerId,
            seat_number: availableSeat,
            stack: buyIn,
            status: 'active'
          }, { onConflict: 'table_id,player_id' });

        if (joinError) {
          console.error('Join error:', joinError);
          result = { success: false, error: joinError.message };
        } else {
          result = { success: true, seatNumber: availableSeat, stack: buyIn };
        }
        break;
      }

      case 'leave': {
        const { error: leaveError } = await supabase
          .from('poker_table_players')
          .delete()
          .eq('table_id', tableId)
          .eq('player_id', playerId);

        result = { success: !leaveError };
        break;
      }

      case 'start_hand': {
        const activePlayers = (tablePlayers || []).filter(p => p.status === 'active' && p.stack > 0);
        
        if (activePlayers.length < 2) {
          result = { success: false, error: 'Need at least 2 players' };
          break;
        }

        const deck = createDeck();
        const sortedPlayers = [...activePlayers].sort((a, b) => a.seat_number - b.seat_number);
        
        // Determine positions
        const dealerIndex = (table.current_dealer_seat 
          ? sortedPlayers.findIndex(p => p.seat_number > table.current_dealer_seat) 
          : 0) % sortedPlayers.length;
        
        const dealerSeat = sortedPlayers[dealerIndex >= 0 ? dealerIndex : 0].seat_number;
        const sbIndex = (dealerIndex + 1) % sortedPlayers.length;
        const bbIndex = (dealerIndex + 2) % sortedPlayers.length;
        
        const sbPlayer = sortedPlayers[sbIndex];
        const bbPlayer = sortedPlayers[bbIndex];
        
        // Create hand record
        const { data: hand, error: handError } = await supabase
          .from('poker_hands')
          .insert({
            table_id: tableId,
            dealer_seat: dealerSeat,
            small_blind_seat: sbPlayer.seat_number,
            big_blind_seat: bbPlayer.seat_number,
            phase: 'preflop',
            pot: table.small_blind + table.big_blind,
            current_bet: table.big_blind,
            deck_state: JSON.stringify(deck),
            side_pots: JSON.stringify([])
          })
          .select()
          .single();

        if (handError) {
          console.error('Hand creation error:', handError);
          result = { success: false, error: handError.message };
          break;
        }

        // Deal cards and post blinds
        const playerUpdates = [];
        const handPlayers = [];
        let deckIndex = 0;

        for (const player of sortedPlayers) {
          const holeCards = [deck[deckIndex++], deck[deckIndex++]];
          const isSB = player.seat_number === sbPlayer.seat_number;
          const isBB = player.seat_number === bbPlayer.seat_number;
          
          let blindAmount = 0;
          if (isSB) blindAmount = Math.min(table.small_blind, player.stack);
          if (isBB) blindAmount = Math.min(table.big_blind, player.stack);

          handPlayers.push({
            hand_id: hand.id,
            player_id: player.player_id,
            seat_number: player.seat_number,
            stack_start: player.stack,
            hole_cards: holeCards,
            bet_amount: blindAmount,
            is_all_in: blindAmount >= player.stack,
          });

          if (blindAmount > 0) {
            playerUpdates.push(
              supabase
                .from('poker_table_players')
                .update({ stack: player.stack - blindAmount })
                .eq('id', player.id)
            );
          }
        }

        await supabase.from('poker_hand_players').insert(handPlayers);
        await Promise.all(playerUpdates);

        // First to act (after BB)
        const firstToActIndex = (bbIndex + 1) % sortedPlayers.length;
        const firstToAct = sortedPlayers[firstToActIndex];

        await supabase
          .from('poker_tables')
          .update({
            current_hand_id: hand.id,
            current_dealer_seat: dealerSeat,
            status: 'playing'
          })
          .eq('id', tableId);

        await supabase
          .from('poker_hands')
          .update({ current_player_seat: firstToAct.seat_number })
          .eq('id', hand.id);

        result = {
          success: true,
          handId: hand.id,
          dealerSeat,
          smallBlindSeat: sbPlayer.seat_number,
          bigBlindSeat: bbPlayer.seat_number,
          currentPlayerSeat: firstToAct.seat_number,
          pot: table.small_blind + table.big_blind,
        };
        break;
      }

      case 'fold':
      case 'check':
      case 'call':
      case 'raise':
      case 'all_in': {
        // Get current hand
        const { data: currentHand } = await supabase
          .from('poker_hands')
          .select('*')
          .eq('id', table.current_hand_id)
          .single();

        if (!currentHand) {
          result = { success: false, error: 'No active hand' };
          break;
        }

        // Get hand player
        const { data: handPlayer } = await supabase
          .from('poker_hand_players')
          .select('*')
          .eq('hand_id', currentHand.id)
          .eq('player_id', playerId)
          .single();

        if (!handPlayer) {
          result = { success: false, error: 'Player not in hand' };
          break;
        }

        // Get table player
        const tablePlayer = (tablePlayers || []).find(p => p.player_id === playerId);
        if (!tablePlayer) {
          result = { success: false, error: 'Player not at table' };
          break;
        }

        let actionAmount = 0;
        let newBet = handPlayer.bet_amount;
        let newStack = tablePlayer.stack;
        let isFolded = handPlayer.is_folded;
        let isAllIn = handPlayer.is_all_in;

        switch (action) {
          case 'fold':
            isFolded = true;
            break;
            
          case 'check':
            if (currentHand.current_bet > handPlayer.bet_amount) {
              result = { success: false, error: 'Cannot check, must call or raise' };
              break;
            }
            break;
            
          case 'call':
            actionAmount = Math.min(currentHand.current_bet - handPlayer.bet_amount, tablePlayer.stack);
            newBet = handPlayer.bet_amount + actionAmount;
            newStack = tablePlayer.stack - actionAmount;
            if (newStack === 0) isAllIn = true;
            break;
            
          case 'raise':
            const raiseAmount = amount || (currentHand.current_bet * 2);
            actionAmount = raiseAmount - handPlayer.bet_amount;
            if (actionAmount > tablePlayer.stack) {
              actionAmount = tablePlayer.stack;
              isAllIn = true;
            }
            newBet = handPlayer.bet_amount + actionAmount;
            newStack = tablePlayer.stack - actionAmount;
            break;
            
          case 'all_in':
            actionAmount = tablePlayer.stack;
            newBet = handPlayer.bet_amount + actionAmount;
            newStack = 0;
            isAllIn = true;
            break;
        }

        if (!result.success && result.error) break;

        // Update hand player
        await supabase
          .from('poker_hand_players')
          .update({
            bet_amount: newBet,
            is_folded: isFolded,
            is_all_in: isAllIn,
          })
          .eq('id', handPlayer.id);

        // Update stack
        await supabase
          .from('poker_table_players')
          .update({ stack: newStack })
          .eq('id', tablePlayer.id);

        // Record action
        const { data: actionsCount } = await supabase
          .from('poker_actions')
          .select('id', { count: 'exact' })
          .eq('hand_id', currentHand.id);

        await supabase.from('poker_actions').insert({
          hand_id: currentHand.id,
          player_id: playerId,
          seat_number: tablePlayer.seat_number,
          action_type: action,
          amount: actionAmount,
          phase: currentHand.phase,
          action_order: (actionsCount?.length || 0) + 1,
        });

        // Update pot and current bet
        const newPot = currentHand.pot + actionAmount;
        const newCurrentBet = Math.max(currentHand.current_bet, newBet);

        // Get all hand players
        const { data: allHandPlayers } = await supabase
          .from('poker_hand_players')
          .select('*')
          .eq('hand_id', currentHand.id);

        const activePlayers = (allHandPlayers || []).filter(p => !p.is_folded && !p.is_all_in);
        const remainingPlayers = (allHandPlayers || []).filter(p => !p.is_folded);

        // Check if only one player remains
        if (remainingPlayers.length === 1) {
          const winner = remainingPlayers[0];
          const winnerTablePlayer = (tablePlayers || []).find(p => p.player_id === winner.player_id);
          
          await supabase
            .from('poker_table_players')
            .update({ stack: (winnerTablePlayer?.stack || 0) + newPot })
            .eq('player_id', winner.player_id)
            .eq('table_id', tableId);

          await supabase
            .from('poker_hands')
            .update({
              pot: 0,
              phase: 'showdown',
              completed_at: new Date().toISOString(),
              winners: JSON.stringify([{ playerId: winner.player_id, amount: newPot }]),
            })
            .eq('id', currentHand.id);

          await supabase
            .from('poker_tables')
            .update({ current_hand_id: null, status: 'waiting' })
            .eq('id', tableId);

          result = {
            success: true,
            action,
            amount: actionAmount,
            handComplete: true,
            winner: winner.player_id,
            winAmount: newPot,
          };
          break;
        }

        // Find next player
        const currentSeat = tablePlayer.seat_number;
        const sortedActive = [...activePlayers].sort((a, b) => a.seat_number - b.seat_number);
        let nextPlayer = sortedActive.find(p => p.seat_number > currentSeat) || sortedActive[0];

        // Check if betting round is complete
        const allActed = activePlayers.every(p => {
          if (p.player_id === playerId) return true;
          return p.bet_amount === newCurrentBet;
        });

        let newPhase = currentHand.phase;
        let newCommunityCards = currentHand.community_cards || [];
        const deck = JSON.parse(currentHand.deck_state || '[]');

        if (allActed && activePlayers.length > 0) {
          // Move to next street
          const phases = ['preflop', 'flop', 'turn', 'river', 'showdown'];
          const currentPhaseIndex = phases.indexOf(currentHand.phase);
          
          if (currentPhaseIndex < phases.length - 1) {
            newPhase = phases[currentPhaseIndex + 1];
            
            // Deal community cards
            const usedCards = (allHandPlayers?.length || 0) * 2;
            if (newPhase === 'flop') {
              newCommunityCards = [deck[usedCards], deck[usedCards + 1], deck[usedCards + 2]];
            } else if (newPhase === 'turn') {
              newCommunityCards = [...(currentHand.community_cards || []), deck[usedCards + 3]];
            } else if (newPhase === 'river') {
              newCommunityCards = [...(currentHand.community_cards || []), deck[usedCards + 4]];
            }

            // Reset bets for new street
            for (const hp of (allHandPlayers || [])) {
              if (!hp.is_folded) {
                await supabase
                  .from('poker_hand_players')
                  .update({ bet_amount: 0 })
                  .eq('id', hp.id);
              }
            }

            // First to act is player after dealer
            const dealerIndex = sortedActive.findIndex(p => p.seat_number >= currentHand.dealer_seat);
            nextPlayer = sortedActive[(dealerIndex + 1) % sortedActive.length] || sortedActive[0];
          }

          // ==========================================
          // SHOWDOWN WITH SIDE POTS
          // ==========================================
          if (newPhase === 'showdown') {
            // Calculate side pots
            const contributions: PlayerContribution[] = (allHandPlayers || []).map(hp => ({
              playerId: hp.player_id,
              totalBet: hp.bet_amount + (hp.stack_start - (tablePlayers?.find(tp => tp.player_id === hp.player_id)?.stack || 0)),
              isFolded: hp.is_folded,
              isAllIn: hp.is_all_in
            }));

            const potResult = calculateSidePots(contributions);
            
            // Evaluate all remaining hands
            const handResults: (HandResult & { playerId: string })[] = [];
            for (const hp of remainingPlayers) {
              const evalResult = evaluateHand(hp.hole_cards || [], newCommunityCards);
              handResults.push({
                ...evalResult,
                playerId: hp.player_id
              });
            }

            // Distribute winnings
            const winnings = new Map<string, number>();
            const allPots = [potResult.mainPot, ...potResult.sidePots];
            const winnersInfo: { playerId: string; amount: number; handName: string; potType: string }[] = [];

            for (let i = 0; i < allPots.length; i++) {
              const pot = allPots[i];
              if (pot.amount === 0) continue;

              // Find eligible players who have the best hand
              const eligibleResults = handResults.filter(hr => pot.eligiblePlayers.includes(hr.playerId));
              if (eligibleResults.length === 0) continue;

              // Sort by hand strength
              eligibleResults.sort((a, b) => compareHands(b, a));
              const bestRank = eligibleResults[0].handRank;
              const bestKickers = eligibleResults[0].kickers;

              // Find all players with the winning hand
              const potWinners = eligibleResults.filter(hr => 
                hr.handRank === bestRank && compareKickers(hr.kickers, bestKickers) === 0
              );

              const winAmount = Math.floor(pot.amount / potWinners.length);
              const remainder = pot.amount % potWinners.length;

              potWinners.forEach((winner, index) => {
                const extra = index === 0 ? remainder : 0;
                const total = winAmount + extra;
                winnings.set(winner.playerId, (winnings.get(winner.playerId) || 0) + total);
                winnersInfo.push({
                  playerId: winner.playerId,
                  amount: total,
                  handName: winner.handName,
                  potType: i === 0 ? 'main' : `side-${i}`
                });
              });
            }

            // Update player stacks
            for (const [winnerId, amount] of winnings) {
              const winnerTablePlayer = (tablePlayers || []).find(p => p.player_id === winnerId);
              await supabase
                .from('poker_table_players')
                .update({ stack: (winnerTablePlayer?.stack || 0) + amount })
                .eq('player_id', winnerId)
                .eq('table_id', tableId);
            }

            // Update hand players with final results
            for (const hr of handResults) {
              await supabase
                .from('poker_hand_players')
                .update({
                  hand_rank: hr.handName,
                  won_amount: winnings.get(hr.playerId) || 0
                })
                .eq('hand_id', currentHand.id)
                .eq('player_id', hr.playerId);
            }

            await supabase
              .from('poker_hands')
              .update({
                pot: 0,
                phase: 'showdown',
                community_cards: newCommunityCards,
                completed_at: new Date().toISOString(),
                winners: JSON.stringify(winnersInfo),
                side_pots: JSON.stringify(allPots)
              })
              .eq('id', currentHand.id);

            await supabase
              .from('poker_tables')
              .update({ current_hand_id: null, status: 'waiting' })
              .eq('id', tableId);

            result = {
              success: true,
              action,
              amount: actionAmount,
              handComplete: true,
              winners: winnersInfo,
              communityCards: newCommunityCards,
              sidePots: allPots,
              handResults: handResults.map(hr => ({
                playerId: hr.playerId,
                handName: hr.handName,
                bestCards: hr.bestCards
              }))
            };
            break;
          }
        }

        // Update hand
        await supabase
          .from('poker_hands')
          .update({
            pot: newPot,
            current_bet: newPhase !== currentHand.phase ? 0 : newCurrentBet,
            current_player_seat: nextPlayer?.seat_number,
            phase: newPhase,
            community_cards: newCommunityCards,
          })
          .eq('id', currentHand.id);

        result = {
          success: true,
          action,
          amount: actionAmount,
          pot: newPot,
          currentBet: newPhase !== currentHand.phase ? 0 : newCurrentBet,
          nextPlayerSeat: nextPlayer?.seat_number,
          phase: newPhase,
          communityCards: newCommunityCards,
        };
        break;
      }

      default:
        result = { success: false, error: 'Unknown action' };
    }

    console.log(`[Poker Engine] Result:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Poker Engine] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
