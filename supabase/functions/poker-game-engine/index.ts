import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Типы карт
const SUITS = ['h', 'd', 'c', 's'] as const; // hearts, diamonds, clubs, spades
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;

interface GameState {
  tableId: string;
  handId: string | null;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  currentBet: number;
  communityCards: string[];
  dealerSeat: number;
  currentPlayerSeat: number | null;
  players: PlayerState[];
  deck: string[];
  sidePots: SidePot[];
}

interface PlayerState {
  oderId: string;
  oderId: string;
  oderId: string;
  oderId: string;
  playerId: string;
  oderId: string;
  oderId: string;
  oderId: string;
  seatNumber: number;
  stack: number;
  holeCards: string[];
  currentBet: number;
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
}

interface ActionRequest {
  action: 'join' | 'leave' | 'start_hand' | 'fold' | 'check' | 'call' | 'raise' | 'all_in';
  tableId: string;
  playerId: string;
  amount?: number;
  seatNumber?: number;
}

// Создание и перемешивание колоды
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

// Получение следующего активного игрока
function getNextActivePlayer(players: PlayerState[], currentSeat: number): PlayerState | null {
  const activePlayers = players.filter(p => !p.isFolded && !p.isAllIn);
  if (activePlayers.length === 0) return null;
  
  const sortedPlayers = [...activePlayers].sort((a, b) => a.seatNumber - b.seatNumber);
  const nextPlayer = sortedPlayers.find(p => p.seatNumber > currentSeat) || sortedPlayers[0];
  return nextPlayer;
}

// Проверка завершения раунда ставок
function isBettingRoundComplete(players: PlayerState[], currentBet: number): boolean {
  const activePlayers = players.filter(p => !p.isFolded && !p.isAllIn);
  return activePlayers.every(p => p.hasActed && p.currentBet === currentBet);
}

// Расчет силы руки (упрощенный)
function evaluateHand(holeCards: string[], communityCards: string[]): { rank: number; name: string } {
  const allCards = [...holeCards, ...communityCards];
  const ranks = allCards.map(c => c[0]);
  const suits = allCards.map(c => c[1]);
  
  // Подсчет рангов
  const rankCount: Record<string, number> = {};
  ranks.forEach(r => rankCount[r] = (rankCount[r] || 0) + 1);
  const counts = Object.values(rankCount).sort((a, b) => b - a);
  
  // Подсчет мастей
  const suitCount: Record<string, number> = {};
  suits.forEach(s => suitCount[s] = (suitCount[s] || 0) + 1);
  const isFlush = Object.values(suitCount).some(c => c >= 5);
  
  // Проверка стрита
  const rankOrder = '23456789TJQKA';
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => rankOrder.indexOf(a) - rankOrder.indexOf(b));
  let isStraight = false;
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    const slice = uniqueRanks.slice(i, i + 5);
    const indices = slice.map(r => rankOrder.indexOf(r));
    if (indices[4] - indices[0] === 4) {
      isStraight = true;
      break;
    }
  }
  // Wheel straight (A-2-3-4-5)
  if (uniqueRanks.includes('A') && uniqueRanks.includes('2') && uniqueRanks.includes('3') && 
      uniqueRanks.includes('4') && uniqueRanks.includes('5')) {
    isStraight = true;
  }
  
  // Определение комбинации
  if (isFlush && isStraight) return { rank: 8, name: 'Straight Flush' };
  if (counts[0] === 4) return { rank: 7, name: 'Four of a Kind' };
  if (counts[0] === 3 && counts[1] >= 2) return { rank: 6, name: 'Full House' };
  if (isFlush) return { rank: 5, name: 'Flush' };
  if (isStraight) return { rank: 4, name: 'Straight' };
  if (counts[0] === 3) return { rank: 3, name: 'Three of a Kind' };
  if (counts[0] === 2 && counts[1] === 2) return { rank: 2, name: 'Two Pair' };
  if (counts[0] === 2) return { rank: 1, name: 'One Pair' };
  return { rank: 0, name: 'High Card' };
}

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

    // Получаем текущее состояние стола
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

    // Получаем игроков за столом
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
        // Проверяем, есть ли свободное место
        const occupiedSeats = (tablePlayers || []).map(p => p.seat_number);
        const availableSeat = seatNumber || 
          Array.from({ length: table.max_players }, (_, i) => i + 1)
            .find(s => !occupiedSeats.includes(s));

        if (!availableSeat) {
          result = { success: false, error: 'No available seats' };
          break;
        }

        // Получаем баланс игрока
        const { data: balance } = await supabase
          .from('player_balances')
          .select('balance')
          .eq('player_id', playerId)
          .single();

        const buyIn = Math.min(balance?.balance || table.min_buy_in, table.max_buy_in);

        // Добавляем игрока
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

        // Создаем новую колоду
        const deck = createDeck();
        
        // Определяем позиции
        const sortedPlayers = [...activePlayers].sort((a, b) => a.seat_number - b.seat_number);
        const dealerIndex = (table.current_dealer_seat 
          ? sortedPlayers.findIndex(p => p.seat_number > table.current_dealer_seat) 
          : 0) % sortedPlayers.length;
        
        const dealerSeat = sortedPlayers[dealerIndex].seat_number;
        const sbIndex = (dealerIndex + 1) % sortedPlayers.length;
        const bbIndex = (dealerIndex + 2) % sortedPlayers.length;
        
        const sbPlayer = sortedPlayers[sbIndex];
        const bbPlayer = sortedPlayers[bbIndex];
        
        // Создаем запись раздачи
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
          })
          .select()
          .single();

        if (handError) {
          console.error('Hand creation error:', handError);
          result = { success: false, error: handError.message };
          break;
        }

        // Раздаем карты и снимаем блайнды
        const playerUpdates = [];
        const handPlayers = [];
        let deckIndex = 0;

        for (const player of sortedPlayers) {
          const holeCards = [deck[deckIndex++], deck[deckIndex++]];
          const isDealer = player.seat_number === dealerSeat;
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

        // Сохраняем игроков раздачи
        await supabase.from('poker_hand_players').insert(handPlayers);
        await Promise.all(playerUpdates);

        // Определяем первого игрока (после BB)
        const firstToActIndex = (bbIndex + 1) % sortedPlayers.length;
        const firstToAct = sortedPlayers[firstToActIndex];

        // Обновляем стол
        await supabase
          .from('poker_tables')
          .update({
            current_hand_id: hand.id,
            current_dealer_seat: dealerSeat,
            status: 'playing'
          })
          .eq('id', tableId);

        // Обновляем раздачу с текущим игроком
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
        // Получаем текущую раздачу
        const { data: currentHand } = await supabase
          .from('poker_hands')
          .select('*')
          .eq('id', table.current_hand_id)
          .single();

        if (!currentHand) {
          result = { success: false, error: 'No active hand' };
          break;
        }

        // Получаем игрока раздачи
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

        // Получаем игрока стола
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

        // Обновляем игрока раздачи
        await supabase
          .from('poker_hand_players')
          .update({
            bet_amount: newBet,
            is_folded: isFolded,
            is_all_in: isAllIn,
          })
          .eq('id', handPlayer.id);

        // Обновляем стек
        await supabase
          .from('poker_table_players')
          .update({ stack: newStack })
          .eq('id', tablePlayer.id);

        // Записываем действие
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

        // Обновляем пот и текущую ставку
        const newPot = currentHand.pot + actionAmount;
        const newCurrentBet = Math.max(currentHand.current_bet, newBet);

        // Получаем всех игроков раздачи для определения следующего
        const { data: allHandPlayers } = await supabase
          .from('poker_hand_players')
          .select('*')
          .eq('hand_id', currentHand.id);

        const activePlayers = (allHandPlayers || []).filter(p => !p.is_folded && !p.is_all_in);
        
        // Проверяем, остался ли один игрок
        const remainingPlayers = (allHandPlayers || []).filter(p => !p.is_folded);
        if (remainingPlayers.length === 1) {
          // Победитель определен
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

        // Находим следующего игрока
        const currentSeat = tablePlayer.seat_number;
        const sortedActive = [...activePlayers].sort((a, b) => a.seat_number - b.seat_number);
        let nextPlayer = sortedActive.find(p => p.seat_number > currentSeat) || sortedActive[0];

        // Проверяем, завершен ли раунд ставок
        const allActed = activePlayers.every(p => {
          if (p.player_id === playerId) return true;
          return p.bet_amount === newCurrentBet;
        });

        let newPhase = currentHand.phase;
        let newCommunityCards = currentHand.community_cards || [];
        const deck = JSON.parse(currentHand.deck_state || '[]');

        if (allActed && activePlayers.length > 0) {
          // Переход к следующей улице
          const phases = ['preflop', 'flop', 'turn', 'river', 'showdown'];
          const currentPhaseIndex = phases.indexOf(currentHand.phase);
          
          if (currentPhaseIndex < phases.length - 1) {
            newPhase = phases[currentPhaseIndex + 1];
            
            // Добавляем карты на стол
            const usedCards = (allHandPlayers?.length || 0) * 2;
            if (newPhase === 'flop') {
              newCommunityCards = [deck[usedCards], deck[usedCards + 1], deck[usedCards + 2]];
            } else if (newPhase === 'turn') {
              newCommunityCards = [...(currentHand.community_cards || []), deck[usedCards + 3]];
            } else if (newPhase === 'river') {
              newCommunityCards = [...(currentHand.community_cards || []), deck[usedCards + 4]];
            }

            // Сбрасываем ставки для новой улицы
            for (const hp of (allHandPlayers || [])) {
              if (!hp.is_folded) {
                await supabase
                  .from('poker_hand_players')
                  .update({ bet_amount: 0 })
                  .eq('id', hp.id);
              }
            }

            // Первым ходит игрок после дилера
            const dealerIndex = sortedActive.findIndex(p => p.seat_number >= currentHand.dealer_seat);
            nextPlayer = sortedActive[(dealerIndex + 1) % sortedActive.length] || sortedActive[0];
          }

          // Showdown
          if (newPhase === 'showdown') {
            // Определяем победителя
            let bestRank = -1;
            let winners: { playerId: string; rank: number; name: string }[] = [];

            for (const hp of remainingPlayers) {
              const hand = evaluateHand(hp.hole_cards || [], newCommunityCards);
              if (hand.rank > bestRank) {
                bestRank = hand.rank;
                winners = [{ playerId: hp.player_id, ...hand }];
              } else if (hand.rank === bestRank) {
                winners.push({ playerId: hp.player_id, ...hand });
              }
            }

            const winAmount = Math.floor(newPot / winners.length);
            for (const winner of winners) {
              const winnerTablePlayer = (tablePlayers || []).find(p => p.player_id === winner.playerId);
              await supabase
                .from('poker_table_players')
                .update({ stack: (winnerTablePlayer?.stack || 0) + winAmount })
                .eq('player_id', winner.playerId)
                .eq('table_id', tableId);
            }

            await supabase
              .from('poker_hands')
              .update({
                pot: 0,
                phase: 'showdown',
                community_cards: newCommunityCards,
                completed_at: new Date().toISOString(),
                winners: JSON.stringify(winners.map(w => ({ playerId: w.playerId, amount: winAmount }))),
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
              winners: winners.map(w => ({ playerId: w.playerId, amount: winAmount, handName: w.name })),
              communityCards: newCommunityCards,
            };
            break;
          }
        }

        // Обновляем раздачу
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
