import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  calculateEquityFast, 
  EquityResult, 
  formatEquity, 
  getEquityColor,
  getEquityBarColor,
  isAllInSituation 
} from '@/utils/equityCalculator';
import { PokerPlayer } from '@/hooks/usePokerTable';
import { TrendingUp, Percent } from 'lucide-react';

interface EquityDisplayProps {
  players: PokerPlayer[];
  communityCards: string[];
  phase: string;
  showAlways?: boolean; // Показывать всегда или только при all-in
}

export function EquityDisplay({ 
  players, 
  communityCards, 
  phase,
  showAlways = false 
}: EquityDisplayProps) {
  const [equityResult, setEquityResult] = useState<EquityResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Фильтруем активных игроков с картами
  const activePlayers = useMemo(() => {
    return players.filter(p => !p.isFolded && p.holeCards && p.holeCards.length >= 2);
  }, [players]);

  // Проверяем all-in ситуацию
  const isAllIn = useMemo(() => {
    return isAllInSituation(players);
  }, [players]);

  // Определяем нужно ли показывать эквити
  const shouldShow = useMemo(() => {
    if (phase === 'waiting' || phase === 'preflop') return false;
    if (activePlayers.length < 2) return false;
    return showAlways || isAllIn;
  }, [phase, activePlayers.length, showAlways, isAllIn]);

  // Рассчитываем эквити при изменении ситуации
  useEffect(() => {
    if (!shouldShow) {
      setEquityResult(null);
      return;
    }

    const playerHands = activePlayers.map(p => ({
      playerId: p.oderId,
      cards: p.holeCards || []
    }));

    if (playerHands.some(ph => ph.cards.length < 2)) {
      return;
    }

    setIsCalculating(true);

    // Используем setTimeout для не-блокирующего расчёта
    const timer = setTimeout(() => {
      try {
        const result = calculateEquityFast(playerHands, communityCards);
        setEquityResult(result);
      } catch (error) {
        console.error('Equity calculation error:', error);
      } finally {
        setIsCalculating(false);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [shouldShow, activePlayers, communityCards]);

  if (!shouldShow || !equityResult) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute top-4 right-4 z-50"
      >
        <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-white/20 p-3 min-w-48">
          <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-white">Equity</span>
            {isAllIn && (
              <span className="ml-auto px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                ALL-IN
              </span>
            )}
          </div>

          <div className="space-y-2">
            {equityResult.players.map((playerEquity, index) => {
              const player = activePlayers.find(p => p.oderId === playerEquity.playerId);
              if (!player) return null;

              return (
                <motion.div
                  key={playerEquity.playerId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/70 truncate max-w-20">
                      {player.name || `Seat ${player.seatNumber}`}
                    </span>
                    <span className={`text-sm font-bold ${getEquityColor(playerEquity.equity)}`}>
                      {formatEquity(playerEquity.equity)}
                    </span>
                  </div>
                  
                  {/* Equity bar */}
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${playerEquity.equity}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${getEquityBarColor(playerEquity.equity)}`}
                    />
                  </div>

                  {/* Hand strength */}
                  {playerEquity.handStrength && (
                    <span className="text-[10px] text-white/50">
                      {playerEquity.handStrength}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Calculation info */}
          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-white/40">
              {equityResult.simulationsRun.toLocaleString()} симуляций
            </span>
            <span className="text-[10px] text-white/40">
              {equityResult.calculationTimeMs}ms
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Компактный вариант для отображения рядом с игроком
 */
export function PlayerEquityBadge({ 
  equity, 
  isAllIn = false 
}: { 
  equity: number; 
  isAllIn?: boolean;
}) {
  if (!isAllIn) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -bottom-6 left-1/2 -translate-x-1/2"
    >
      <div className={`
        px-2 py-0.5 rounded-full 
        bg-black/80 backdrop-blur-sm border border-white/20
        flex items-center gap-1
      `}>
        <Percent className="w-3 h-3 text-white/60" />
        <span className={`text-xs font-bold ${getEquityColor(equity)}`}>
          {formatEquity(equity)}
        </span>
      </div>
    </motion.div>
  );
}
