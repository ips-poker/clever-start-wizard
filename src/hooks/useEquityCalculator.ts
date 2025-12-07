import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  calculateEquityFast, 
  EquityResult, 
  isAllInSituation 
} from '@/utils/equityCalculator';
import { PokerPlayer } from './usePokerTable';

interface UseEquityCalculatorOptions {
  players: PokerPlayer[];
  communityCards: string[];
  phase: string;
  enabled?: boolean;
  autoCalculate?: boolean; // Автоматически рассчитывать при all-in
}

interface UseEquityCalculatorResult {
  equityResult: EquityResult | null;
  isCalculating: boolean;
  isAllIn: boolean;
  shouldShowEquity: boolean;
  recalculate: () => void;
  getPlayerEquity: (playerId: string) => number | null;
}

export function useEquityCalculator({
  players,
  communityCards,
  phase,
  enabled = true,
  autoCalculate = true
}: UseEquityCalculatorOptions): UseEquityCalculatorResult {
  const [equityResult, setEquityResult] = useState<EquityResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Фильтруем активных игроков с известными картами
  const activePlayers = useMemo(() => {
    return players.filter(p => !p.isFolded && p.holeCards && p.holeCards.length >= 2);
  }, [players]);

  // Проверяем all-in ситуацию
  const isAllIn = useMemo(() => {
    return isAllInSituation(players);
  }, [players]);

  // Определяем нужно ли показывать эквити
  const shouldShowEquity = useMemo(() => {
    if (!enabled) return false;
    if (phase === 'waiting') return false;
    if (activePlayers.length < 2) return false;
    return isAllIn;
  }, [enabled, phase, activePlayers.length, isAllIn]);

  // Функция расчёта эквити
  const calculateEquityHandler = useCallback(() => {
    if (activePlayers.length < 2) {
      setEquityResult(null);
      return;
    }

    // Use correct property name 'playerId' consistently
    const playerHands = activePlayers.map(p => ({
      playerId: p.playerId || (p as any).oderId || `player-${p.seatNumber}`,
      cards: p.holeCards || []
    }));

    // Проверяем что у всех игроков есть карты
    if (playerHands.some(ph => ph.cards.length < 2)) {
      return;
    }

    setIsCalculating(true);

    // Используем Web Worker или setTimeout для не-блокирующего расчёта
    setTimeout(() => {
      try {
        const result = calculateEquityFast(playerHands, communityCards);
        setEquityResult(result);
      } catch (error) {
        console.error('Equity calculation error:', error);
        setEquityResult(null);
      } finally {
        setIsCalculating(false);
      }
    }, 0);
  }, [activePlayers, communityCards]);

  // Автоматический расчёт при изменении ситуации
  useEffect(() => {
    if (!autoCalculate || !shouldShowEquity) {
      if (!shouldShowEquity) {
        setEquityResult(null);
      }
      return;
    }

    calculateEquityHandler();
  }, [autoCalculate, shouldShowEquity, calculateEquityHandler]);

  // Пересчёт при изменении community cards
  useEffect(() => {
    if (shouldShowEquity && equityResult) {
      calculateEquityHandler();
    }
  }, [communityCards.length]);

  // Получить эквити конкретного игрока
  const getPlayerEquity = useCallback((playerId: string): number | null => {
    if (!equityResult) return null;
    const playerEquity = equityResult.players.find(p => p.playerId === playerId);
    return playerEquity?.equity ?? null;
  }, [equityResult]);

  return {
    equityResult,
    isCalculating,
    isAllIn,
    shouldShowEquity,
    recalculate: calculateEquityHandler,
    getPlayerEquity
  };
}
