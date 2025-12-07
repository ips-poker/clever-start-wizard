import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ThumbsUp, ThumbsDown, Heart, Laugh, Angry, 
  Skull, Trophy, Flame, Zap, Star,
  PartyPopper, Ghost, Crown, Diamond, Sparkles
} from 'lucide-react';

// Emoji/reaction types
export interface TableReaction {
  id: string;
  playerId: string;
  playerName?: string;
  seatNumber: number;
  type: ReactionType;
  timestamp: number;
}

export type ReactionType = 
  | 'thumbsUp' | 'thumbsDown' | 'heart' | 'laugh' | 'angry'
  | 'skull' | 'trophy' | 'flame' | 'zap' | 'star'
  | 'party' | 'ghost' | 'crown' | 'diamond' | 'sparkles'
  | 'gg' | 'nh' | 'wp' | 'ty' | 'gl';

interface ReactionConfig {
  icon?: React.ComponentType<any>;
  emoji?: string;
  text?: string;
  color: string;
  bgColor: string;
  animation?: 'bounce' | 'pulse' | 'shake' | 'spin' | 'float';
}

const REACTIONS: Record<ReactionType, ReactionConfig> = {
  thumbsUp: { icon: ThumbsUp, color: 'text-green-400', bgColor: 'bg-green-500/20', animation: 'bounce' },
  thumbsDown: { icon: ThumbsDown, color: 'text-red-400', bgColor: 'bg-red-500/20', animation: 'shake' },
  heart: { icon: Heart, color: 'text-pink-400', bgColor: 'bg-pink-500/20', animation: 'pulse' },
  laugh: { icon: Laugh, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', animation: 'bounce' },
  angry: { icon: Angry, color: 'text-red-500', bgColor: 'bg-red-500/20', animation: 'shake' },
  skull: { icon: Skull, color: 'text-slate-300', bgColor: 'bg-slate-500/20', animation: 'float' },
  trophy: { icon: Trophy, color: 'text-amber-400', bgColor: 'bg-amber-500/20', animation: 'bounce' },
  flame: { icon: Flame, color: 'text-orange-400', bgColor: 'bg-orange-500/20', animation: 'pulse' },
  zap: { icon: Zap, color: 'text-yellow-300', bgColor: 'bg-yellow-500/20', animation: 'shake' },
  star: { icon: Star, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', animation: 'spin' },
  party: { icon: PartyPopper, color: 'text-purple-400', bgColor: 'bg-purple-500/20', animation: 'bounce' },
  ghost: { icon: Ghost, color: 'text-slate-400', bgColor: 'bg-slate-500/20', animation: 'float' },
  crown: { icon: Crown, color: 'text-amber-400', bgColor: 'bg-amber-500/20', animation: 'pulse' },
  diamond: { icon: Diamond, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', animation: 'spin' },
  sparkles: { icon: Sparkles, color: 'text-purple-300', bgColor: 'bg-purple-500/20', animation: 'pulse' },
  gg: { text: 'GG', color: 'text-green-400', bgColor: 'bg-green-500/20', animation: 'bounce' },
  nh: { text: 'NH', color: 'text-blue-400', bgColor: 'bg-blue-500/20', animation: 'bounce' },
  wp: { text: 'WP', color: 'text-purple-400', bgColor: 'bg-purple-500/20', animation: 'bounce' },
  ty: { text: 'TY', color: 'text-pink-400', bgColor: 'bg-pink-500/20', animation: 'bounce' },
  gl: { text: 'GL', color: 'text-amber-400', bgColor: 'bg-amber-500/20', animation: 'bounce' },
};

// Animation variants
const animationVariants = {
  bounce: {
    initial: { y: 0, scale: 0 },
    animate: { 
      y: [0, -20, 0, -10, 0], 
      scale: [0, 1.2, 1, 1.1, 1],
      transition: { duration: 0.6 }
    },
    exit: { y: -30, opacity: 0, scale: 0.5 }
  },
  pulse: {
    initial: { scale: 0 },
    animate: { 
      scale: [0, 1.3, 1, 1.2, 1],
      transition: { duration: 0.5 }
    },
    exit: { scale: 0, opacity: 0 }
  },
  shake: {
    initial: { scale: 0, rotate: 0 },
    animate: { 
      scale: 1,
      rotate: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.5 }
    },
    exit: { scale: 0, opacity: 0 }
  },
  spin: {
    initial: { scale: 0, rotate: 0 },
    animate: { 
      scale: 1,
      rotate: 360,
      transition: { duration: 0.6 }
    },
    exit: { scale: 0, opacity: 0, rotate: 720 }
  },
  float: {
    initial: { y: 20, opacity: 0, scale: 0 },
    animate: { 
      y: [0, -10, 0],
      opacity: 1,
      scale: 1,
      transition: { 
        y: { repeat: Infinity, duration: 2 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 }
      }
    },
    exit: { y: -40, opacity: 0, scale: 0.5 }
  }
};

// Single reaction bubble component
interface ReactionBubbleProps {
  reaction: TableReaction;
  position: { x: number; y: number };
  onComplete?: () => void;
}

export function ReactionBubble({ reaction, position, onComplete }: ReactionBubbleProps) {
  const config = REACTIONS[reaction.type];
  const Icon = config.icon;
  const variant = animationVariants[config.animation || 'bounce'];

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="absolute z-50 pointer-events-none"
      style={{ left: position.x, top: position.y }}
      initial={variant.initial}
      animate={variant.animate}
      exit={variant.exit}
    >
      <div className={cn(
        "flex items-center justify-center rounded-full shadow-lg",
        "w-12 h-12 backdrop-blur-sm border border-white/20",
        config.bgColor
      )}>
        {Icon ? (
          <Icon className={cn("w-6 h-6", config.color)} />
        ) : (
          <span className={cn("font-bold text-sm", config.color)}>
            {config.text}
          </span>
        )}
      </div>
      
      {/* Player name tooltip */}
      {reaction.playerName && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[10px] text-white/60 bg-black/40 px-2 py-0.5 rounded">
            {reaction.playerName}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// Emoji picker panel
interface EmojiPickerProps {
  onSelect: (type: ReactionType) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function EmojiPicker({ onSelect, onClose, isOpen }: EmojiPickerProps) {
  const categories = [
    {
      name: 'Эмоции',
      items: ['thumbsUp', 'thumbsDown', 'heart', 'laugh', 'angry'] as ReactionType[]
    },
    {
      name: 'Особые',
      items: ['trophy', 'flame', 'crown', 'diamond', 'sparkles'] as ReactionType[]
    },
    {
      name: 'Покер',
      items: ['gg', 'nh', 'wp', 'ty', 'gl'] as ReactionType[]
    },
    {
      name: 'Фан',
      items: ['skull', 'ghost', 'party', 'zap', 'star'] as ReactionType[]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          {/* Picker panel */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={cn(
              "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50",
              "bg-slate-900/95 backdrop-blur-lg rounded-xl border border-white/10",
              "shadow-2xl p-3 min-w-[280px]"
            )}
          >
            {categories.map((category, idx) => (
              <div key={category.name} className={cn(idx > 0 && "mt-3")}>
                <p className="text-[10px] uppercase text-white/40 font-medium mb-1.5 px-1">
                  {category.name}
                </p>
                <div className="flex gap-1">
                  {category.items.map((type) => {
                    const config = REACTIONS[type];
                    const Icon = config.icon;
                    
                    return (
                      <motion.button
                        key={type}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          onSelect(type);
                          onClose();
                        }}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          "hover:bg-white/10 transition-colors",
                          config.bgColor
                        )}
                      >
                        {Icon ? (
                          <Icon className={cn("w-5 h-5", config.color)} />
                        ) : (
                          <span className={cn("font-bold text-xs", config.color)}>
                            {config.text}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Reactions manager - displays all active reactions on table
interface TableReactionsProps {
  reactions: TableReaction[];
  seatPositions: Array<{ x: number; y: number }>;
  onReactionComplete: (id: string) => void;
}

export function TableReactions({ 
  reactions, 
  seatPositions, 
  onReactionComplete 
}: TableReactionsProps) {
  return (
    <AnimatePresence>
      {reactions.map((reaction) => {
        const seatPos = seatPositions[reaction.seatNumber - 1];
        if (!seatPos) return null;
        
        // Offset position above player
        const position = {
          x: seatPos.x - 24, // Center the 48px bubble
          y: seatPos.y - 60  // Above player avatar
        };
        
        return (
          <ReactionBubble
            key={reaction.id}
            reaction={reaction}
            position={position}
            onComplete={() => onReactionComplete(reaction.id)}
          />
        );
      })}
    </AnimatePresence>
  );
}

// Quick reaction button for player seat
interface QuickReactionButtonProps {
  onReact: (type: ReactionType) => void;
  disabled?: boolean;
}

export function QuickReactionButton({ onReact, disabled }: QuickReactionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          "bg-white/10 hover:bg-white/20 transition-colors",
          "border border-white/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Sparkles className="w-4 h-4 text-amber-400" />
      </motion.button>
      
      <EmojiPicker
        isOpen={isOpen}
        onSelect={onReact}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

// Hook for managing reactions
export function useTableReactions() {
  const [reactions, setReactions] = useState<TableReaction[]>([]);

  const addReaction = useCallback((
    playerId: string,
    playerName: string | undefined,
    seatNumber: number,
    type: ReactionType
  ) => {
    const newReaction: TableReaction = {
      id: `${playerId}-${Date.now()}`,
      playerId,
      playerName,
      seatNumber,
      type,
      timestamp: Date.now()
    };
    
    setReactions(prev => [...prev, newReaction]);
  }, []);

  const removeReaction = useCallback((id: string) => {
    setReactions(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearReactions = useCallback(() => {
    setReactions([]);
  }, []);

  return {
    reactions,
    addReaction,
    removeReaction,
    clearReactions
  };
}
