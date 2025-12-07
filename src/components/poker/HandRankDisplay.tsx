import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Crown, Trophy, Star, Award } from 'lucide-react';

interface HandRankDisplayProps {
  handRank: string;
  handValue?: number;
  cards?: string[];
  isWinner?: boolean;
  showCards?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Map hand rank names to tier for styling
function getHandTier(handRank: string): 'legendary' | 'epic' | 'rare' | 'common' {
  const legendaryHands = ['Royal Flush', 'Роял-флеш'];
  const epicHands = ['Straight Flush', 'Стрит-флеш', 'Four of a Kind', 'Каре'];
  const rareHands = ['Full House', 'Фулл-хаус', 'Flush', 'Флеш', 'Straight', 'Стрит'];
  
  if (legendaryHands.some(h => handRank.includes(h))) return 'legendary';
  if (epicHands.some(h => handRank.includes(h))) return 'epic';
  if (rareHands.some(h => handRank.includes(h))) return 'rare';
  return 'common';
}

// Format card for display
function formatCardDisplay(card: string): { rank: string; suit: string; color: string } {
  if (!card || card.length < 2) return { rank: '?', suit: '?', color: 'text-muted-foreground' };
  
  const rankMap: Record<string, string> = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
  };
  
  const suitMap: Record<string, { symbol: string; color: string }> = {
    'h': { symbol: '♥', color: 'text-red-500' },
    'd': { symbol: '♦', color: 'text-red-500' },
    'c': { symbol: '♣', color: 'text-foreground' },
    's': { symbol: '♠', color: 'text-foreground' }
  };
  
  const rank = rankMap[card[0].toUpperCase()] || card[0];
  const suitInfo = suitMap[card[1].toLowerCase()] || { symbol: card[1], color: 'text-muted-foreground' };
  
  return { rank, suit: suitInfo.symbol, color: suitInfo.color };
}

export function HandRankDisplay({ 
  handRank, 
  handValue,
  cards, 
  isWinner = false,
  showCards = true,
  className,
  size = 'md'
}: HandRankDisplayProps) {
  const tier = getHandTier(handRank);
  
  const tierStyles = {
    legendary: {
      bg: 'bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20',
      border: 'border-yellow-500/50',
      text: 'text-yellow-400',
      glow: 'shadow-yellow-500/30 shadow-lg',
      icon: Crown
    },
    epic: {
      bg: 'bg-gradient-to-r from-purple-500/20 via-violet-500/20 to-purple-500/20',
      border: 'border-purple-500/50',
      text: 'text-purple-400',
      glow: 'shadow-purple-500/20 shadow-lg',
      icon: Trophy
    },
    rare: {
      bg: 'bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20',
      border: 'border-blue-500/50',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/20 shadow-md',
      icon: Star
    },
    common: {
      bg: 'bg-muted/50',
      border: 'border-muted',
      text: 'text-muted-foreground',
      glow: '',
      icon: Award
    }
  };
  
  const style = tierStyles[tier];
  const Icon = style.icon;
  
  const sizeStyles = {
    sm: { container: 'p-1.5 gap-1', text: 'text-xs', icon: 'h-3 w-3', card: 'h-6 w-5 text-[10px]' },
    md: { container: 'p-2 gap-2', text: 'text-sm', icon: 'h-4 w-4', card: 'h-8 w-6 text-xs' },
    lg: { container: 'p-3 gap-3', text: 'text-base', icon: 'h-5 w-5', card: 'h-10 w-8 text-sm' }
  };
  
  const sizeStyle = sizeStyles[size];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-lg border",
        style.bg,
        style.border,
        style.glow,
        sizeStyle.container,
        isWinner && "ring-2 ring-green-500/50",
        className
      )}
    >
      {/* Hand Rank */}
      <div className="flex items-center gap-2">
        <Icon className={cn(sizeStyle.icon, style.text)} />
        <span className={cn("font-semibold", sizeStyle.text, style.text)}>
          {handRank}
        </span>
        {isWinner && (
          <Badge variant="default" className="ml-auto bg-green-500 text-[10px] px-1.5">
            ПОБЕДА
          </Badge>
        )}
      </div>
      
      {/* Cards */}
      {showCards && cards && cards.length > 0 && (
        <div className="flex gap-1 mt-1">
          {cards.map((card, idx) => {
            const { rank, suit, color } = formatCardDisplay(card);
            return (
              <motion.div
                key={idx}
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "rounded bg-white dark:bg-slate-100 border border-gray-200 flex flex-col items-center justify-center font-bold",
                  sizeStyle.card
                )}
              >
                <span className={cn("leading-none", color)}>{rank}</span>
                <span className={cn("leading-none", color)}>{suit}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// Compact version for inline display
export function HandRankBadge({ 
  handRank, 
  isWinner = false 
}: { 
  handRank: string; 
  isWinner?: boolean;
}) {
  const tier = getHandTier(handRank);
  
  const tierColors = {
    legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    common: 'bg-muted text-muted-foreground border-muted'
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs font-medium",
        tierColors[tier],
        isWinner && "ring-1 ring-green-500"
      )}
    >
      {handRank}
    </Badge>
  );
}

// Animated reveal for showdown
export function ShowdownHandReveal({
  playerName,
  handRank,
  cards,
  amount,
  isWinner,
  delay = 0
}: {
  playerName: string;
  handRank: string;
  cards: string[];
  amount: number;
  isWinner: boolean;
  delay?: number;
}) {
  const tier = getHandTier(handRank);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, type: "spring" }}
      className={cn(
        "relative p-4 rounded-xl border-2",
        isWinner 
          ? "bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/50" 
          : "bg-card/80 border-border/50"
      )}
    >
      {isWinner && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.3, type: "spring" }}
          className="absolute -top-3 -right-3"
        >
          <div className="bg-green-500 rounded-full p-2">
            <Trophy className="h-4 w-4 text-white" />
          </div>
        </motion.div>
      )}
      
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="font-semibold text-lg">{playerName}</p>
          <HandRankDisplay 
            handRank={handRank} 
            cards={cards}
            isWinner={isWinner}
            size="md"
          />
        </div>
        
        {isWinner && amount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.5 }}
            className="text-right"
          >
            <p className="text-xs text-muted-foreground">Выигрыш</p>
            <p className="text-2xl font-bold text-green-500">
              +{amount.toLocaleString()}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
