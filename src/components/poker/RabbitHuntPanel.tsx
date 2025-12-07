/**
 * Rabbit Hunt & Run It Twice Panel
 * Professional poker feature component
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rabbit, 
  Shuffle, 
  Eye, 
  EyeOff,
  Coins,
  CheckCircle,
  XCircle,
  Repeat,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card as CardType, formatCard, parseCards } from '@/utils/pokerEngine';
import { 
  rabbitHunt, 
  runItTwice, 
  canRunItTwice,
  calculateRabbitHuntCost,
  RabbitHuntResult,
  RunItTwiceResult 
} from '@/utils/rabbitHunt';
import { PokerCard } from './PokerCard';

interface RabbitHuntPanelProps {
  foldedPlayerCards: string[];
  communityCards: string[];
  usedCards: string[]; // All cards dealt to remaining players
  potSize: number;
  onPurchase?: (cost: number) => void;
  className?: string;
}

export function RabbitHuntPanel({
  foldedPlayerCards,
  communityCards,
  usedCards,
  potSize,
  onPurchase,
  className = ''
}: RabbitHuntPanelProps) {
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<RabbitHuntResult | null>(null);
  
  const cardsToReveal = 5 - communityCards.length;
  const cost = calculateRabbitHuntCost(potSize, communityCards.length <= 3 ? 'flop' : 'turn');
  
  const handleReveal = () => {
    const foldedCards = parseCards(foldedPlayerCards.join(','));
    const community = parseCards(communityCards.join(','));
    const used = parseCards(usedCards.join(','));
    
    const rabbitResult = rabbitHunt(foldedCards, community, used, cardsToReveal);
    setResult(rabbitResult);
    setRevealed(true);
    onPurchase?.(cost);
  };
  
  if (communityCards.length === 5) {
    return null; // No rabbit hunt on the river
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        ${className}
        bg-gradient-to-br from-purple-900/40 to-indigo-900/40
        backdrop-blur-md rounded-xl
        border border-purple-500/30
        p-4 space-y-4
      `}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-purple-500/20">
          <Rabbit className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Rabbit Hunt</h3>
          <p className="text-xs text-muted-foreground">
            Посмотреть что было бы дальше
          </p>
        </div>
      </div>
      
      {!revealed ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Карт к раскрытию:</span>
            <span className="font-mono text-foreground">{cardsToReveal}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Стоимость:</span>
            <span className="font-mono text-amber-400">{cost} фишек</span>
          </div>
          
          <Button
            onClick={handleReveal}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
          >
            <Eye className="w-4 h-4 mr-2" />
            Раскрыть за {cost}
          </Button>
        </div>
      ) : result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Revealed Cards */}
          <div className="flex items-center justify-center gap-2">
            {result.remainingCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, rotateY: 180 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ delay: index * 0.3 }}
              >
                <PokerCard card={formatCard(card)} size="sm" />
              </motion.div>
            ))}
          </div>
          
          {/* Result */}
          <div className={`
            p-3 rounded-lg text-center
            ${result.wouldHaveWon 
              ? 'bg-green-500/20 border border-green-500/30' 
              : 'bg-red-500/20 border border-red-500/30'}
          `}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {result.wouldHaveWon ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <span className={result.wouldHaveWon ? 'text-green-400' : 'text-red-400'}>
                {result.wouldHaveWon ? 'Вы бы выиграли!' : 'Правильный фолд'}
              </span>
            </div>
            <div className="text-sm text-foreground font-medium">
              {result.bestHand}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {result.description}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

interface RunItTwicePanelProps {
  playersCards: Map<string, string[]>;
  communityCards: string[];
  pot: number;
  activePlayers: number;
  allInPlayers: number;
  onAccept?: () => void;
  onDecline?: () => void;
  result?: RunItTwiceResult;
  className?: string;
}

export function RunItTwicePanel({
  playersCards,
  communityCards,
  pot,
  activePlayers,
  allInPlayers,
  onAccept,
  onDecline,
  result,
  className = ''
}: RunItTwicePanelProps) {
  
  const canRun = canRunItTwice(
    parseCards(communityCards.join(',')),
    activePlayers,
    allInPlayers
  );
  
  if (!canRun && !result) {
    return null;
  }
  
  const halfPot = Math.floor(pot / 2);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        ${className}
        bg-gradient-to-br from-blue-900/40 to-cyan-900/40
        backdrop-blur-md rounded-xl
        border border-blue-500/30
        p-4 space-y-4
      `}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-blue-500/20">
          <Repeat className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Run It Twice</h3>
          <p className="text-xs text-muted-foreground">
            Разделить банк на два розыгрыша
          </p>
        </div>
      </div>
      
      {!result ? (
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Общий банк:</span>
              <span className="font-mono text-foreground">{pot.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Каждый ран:</span>
              <span className="font-mono text-blue-400">{halfPot.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Снижение дисперсии:</span>
              <span className="text-green-400">~50%</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={onDecline}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Один раз
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
              onClick={onAccept}
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Run It Twice
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Run 1 */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-blue-400">RUN 1</span>
              <span className="text-xs text-muted-foreground">• {halfPot.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 mb-2">
              {result.run1.communityCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <PokerCard card={formatCard(card)} size="sm" />
                </motion.div>
              ))}
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Победитель: </span>
              <span className="text-green-400">{result.run1.winners.join(', ')}</span>
              <span className="text-muted-foreground ml-2">({result.run1.bestHand})</span>
            </div>
          </div>
          
          {/* Run 2 */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-cyan-400">RUN 2</span>
              <span className="text-xs text-muted-foreground">• {halfPot.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 mb-2">
              {result.run2.communityCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <PokerCard card={formatCard(card)} size="sm" />
                </motion.div>
              ))}
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Победитель: </span>
              <span className="text-green-400">{result.run2.winners.join(', ')}</span>
              <span className="text-muted-foreground ml-2">({result.run2.bestHand})</span>
            </div>
          </div>
          
          {/* Combined Result */}
          <div className={`
            p-3 rounded-lg text-center
            ${result.combinedResult.splitPot 
              ? 'bg-yellow-500/20 border border-yellow-500/30' 
              : 'bg-green-500/20 border border-green-500/30'}
          `}>
            {result.combinedResult.splitPot ? (
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400">Банк разделён!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400">
                  {result.combinedResult.run1Winner} забирает оба рана!
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Compact run it twice indicator
 */
export function RunItTwiceIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 rounded-full border border-blue-500/30"
    >
      <Repeat className="w-3 h-3 text-blue-400" />
      <span className="text-xs text-blue-400 font-medium">RIT</span>
    </motion.div>
  );
}
