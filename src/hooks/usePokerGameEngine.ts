import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GameState {
  tableId: string;
  handId: string | null;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  currentBet: number;
  communityCards: string[];
  dealerSeat: number | null;
  currentPlayerSeat: number | null;
  players: PlayerState[];
}

export interface PlayerState {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  seatNumber: number;
  stack: number;
  holeCards: string[];
  currentBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

interface ActionResult {
  success: boolean;
  error?: string;
  action?: string;
  amount?: number;
  pot?: number;
  currentBet?: number;
  nextPlayerSeat?: number;
  phase?: string;
  communityCards?: string[];
  handComplete?: boolean;
  winner?: string;
  winners?: { playerId: string; amount: number; handName?: string }[];
  winAmount?: number;
}

export function usePokerGameEngine(tableId: string, playerId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<ActionResult | null>(null);

  // Вызов Edge Function
  const callEngine = useCallback(async (action: string, amount?: number, seatNumber?: number): Promise<ActionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke('poker-game-engine', {
        body: {
          action,
          tableId,
          playerId,
          amount,
          seatNumber,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data as ActionResult;
      setLastAction(result);
      
      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [tableId, playerId]);

  // Загрузка состояния игры
  const loadGameState = useCallback(async () => {
    try {
      // Получаем стол
      const { data: table } = await supabase
        .from('poker_tables')
        .select('*')
        .eq('id', tableId)
        .single();

      if (!table) return;

      // Получаем игроков
      const { data: tablePlayers } = await supabase
        .from('poker_table_players')
        .select('*, players(name, avatar_url)')
        .eq('table_id', tableId);

      // Получаем текущую раздачу
      let handData = null;
      let handPlayers: any[] = [];
      
      if (table.current_hand_id) {
        const { data: hand } = await supabase
          .from('poker_hands')
          .select('*')
          .eq('id', table.current_hand_id)
          .single();
        
        handData = hand;

        if (hand) {
          const { data: hp } = await supabase
            .from('poker_hand_players')
            .select('*')
            .eq('hand_id', hand.id);
          
          handPlayers = hp || [];
        }
      }

      // Формируем состояние
      const players: PlayerState[] = (tablePlayers || []).map(tp => {
        const hp = handPlayers.find(h => h.player_id === tp.player_id);
        const playerInfo = tp.players as any;
        
        return {
          playerId: tp.player_id,
          playerName: playerInfo?.name || 'Player',
          avatarUrl: playerInfo?.avatar_url,
          seatNumber: tp.seat_number,
          stack: tp.stack,
          holeCards: hp?.player_id === playerId ? (hp?.hole_cards || []) : [],
          currentBet: hp?.bet_amount || 0,
          isFolded: hp?.is_folded || false,
          isAllIn: hp?.is_all_in || false,
          isDealer: tp.seat_number === table.current_dealer_seat,
          isSmallBlind: handData ? tp.seat_number === handData.small_blind_seat : false,
          isBigBlind: handData ? tp.seat_number === handData.big_blind_seat : false,
        };
      });

      // Мои карты
      const myHandPlayer = handPlayers.find(hp => hp.player_id === playerId);
      if (myHandPlayer?.hole_cards) {
        setMyCards(myHandPlayer.hole_cards);
      }

      setGameState({
        tableId,
        handId: table.current_hand_id,
        phase: handData?.phase || 'waiting',
        pot: handData?.pot || 0,
        currentBet: handData?.current_bet || 0,
        communityCards: handData?.community_cards || [],
        dealerSeat: table.current_dealer_seat,
        currentPlayerSeat: handData?.current_player_seat,
        players,
      });
    } catch (err) {
      console.error('Error loading game state:', err);
    }
  }, [tableId, playerId]);

  // Подписка на обновления
  useEffect(() => {
    loadGameState();

    // Подписка на изменения стола
    const tableChannel = supabase
      .channel(`poker-table-${tableId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_tables',
        filter: `id=eq.${tableId}`,
      }, () => {
        loadGameState();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_table_players',
        filter: `table_id=eq.${tableId}`,
      }, () => {
        loadGameState();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_hands',
      }, () => {
        loadGameState();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_hand_players',
      }, () => {
        loadGameState();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tableChannel);
    };
  }, [tableId, loadGameState]);

  // Действия
  const join = useCallback((seatNumber?: number) => callEngine('join', undefined, seatNumber), [callEngine]);
  const leave = useCallback(() => callEngine('leave'), [callEngine]);
  const startHand = useCallback(() => callEngine('start_hand'), [callEngine]);
  const fold = useCallback(() => callEngine('fold'), [callEngine]);
  const check = useCallback(() => callEngine('check'), [callEngine]);
  const call = useCallback(() => callEngine('call'), [callEngine]);
  const raise = useCallback((amount: number) => callEngine('raise', amount), [callEngine]);
  const allIn = useCallback(() => callEngine('all_in'), [callEngine]);

  // Вычисляемые значения
  const myPlayer = gameState?.players.find(p => p.playerId === playerId);
  const isMyTurn = gameState?.currentPlayerSeat === myPlayer?.seatNumber;
  const canCheck = isMyTurn && (gameState?.currentBet || 0) <= (myPlayer?.currentBet || 0);
  const callAmount = Math.max(0, (gameState?.currentBet || 0) - (myPlayer?.currentBet || 0));
  const minRaise = (gameState?.currentBet || 0) * 2;

  return {
    gameState,
    myCards,
    myPlayer,
    isMyTurn,
    canCheck,
    callAmount,
    minRaise,
    isLoading,
    error,
    lastAction,
    
    // Действия
    join,
    leave,
    startHand,
    fold,
    check,
    call,
    raise,
    allIn,
    
    // Перезагрузка
    refresh: loadGameState,
  };
}
