import React from 'react';
import { cn } from '@/lib/utils';

interface MiniPokerCardProps {
  card: string;
  size?: 'xs' | 'sm' | 'md';
  highlighted?: boolean;
  dimmed?: boolean;
  className?: string;
}

const SUIT_SYMBOLS: Record<string, string> = {
  h: '♥',
  d: '♦', 
  c: '♣',
  s: '♠'
};

const SUIT_COLORS: Record<string, string> = {
  h: 'text-red-500',
  d: 'text-blue-500',
  c: 'text-emerald-500',
  s: 'text-slate-800 dark:text-slate-200'
};

const SIZE_CLASSES = {
  xs: 'w-5 h-7 text-[9px]',
  sm: 'w-7 h-10 text-xs',
  md: 'w-9 h-13 text-sm'
};

export function MiniPokerCard({ card, size = 'sm', highlighted, dimmed, className }: MiniPokerCardProps) {
  if (!card || card.length < 2) return null;
  
  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();
  const suitSymbol = SUIT_SYMBOLS[suit] || suit;
  const suitColor = SUIT_COLORS[suit] || 'text-foreground';
  
  return (
    <div 
      className={cn(
        'relative rounded-sm bg-white dark:bg-slate-100 shadow-sm',
        'flex flex-col items-center justify-center font-bold',
        'border border-slate-200 dark:border-slate-300',
        SIZE_CLASSES[size],
        highlighted && 'ring-2 ring-amber-400 shadow-amber-400/30',
        dimmed && 'opacity-50',
        className
      )}
    >
      <span className={cn('leading-none', suitColor)}>{rank}</span>
      <span className={cn('leading-none', suitColor)}>{suitSymbol}</span>
    </div>
  );
}

interface MiniCardGroupProps {
  cards: string[];
  size?: 'xs' | 'sm' | 'md';
  overlap?: boolean;
  highlightedCards?: string[];
  className?: string;
}

export function MiniCardGroup({ cards, size = 'sm', overlap = true, highlightedCards = [], className }: MiniCardGroupProps) {
  if (!cards || cards.length === 0) return null;
  
  return (
    <div className={cn('flex', overlap ? '-space-x-1' : 'gap-0.5', className)}>
      {cards.map((card, i) => (
        <MiniPokerCard 
          key={`${card}-${i}`}
          card={card}
          size={size}
          highlighted={highlightedCards.includes(card)}
          className={overlap ? 'shadow-md' : ''}
        />
      ))}
    </div>
  );
}
