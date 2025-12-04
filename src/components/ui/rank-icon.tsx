import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type RankLevel = 'rookie' | 'soldier' | 'capo' | 'consigliere' | 'don';

interface RankIconProps {
  rank: RankLevel;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};

// Associate - Cards icon
const AssociateIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="4" width="12" height="16" rx="1" fill="currentColor" opacity="0.3"/>
    <rect x="9" y="4" width="12" height="16" rx="1" fill="currentColor"/>
    <path d="M15 10L17 12L15 14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="15" cy="8" r="1" fill="white"/>
    <circle cx="15" cy="16" r="1" fill="white"/>
  </svg>
);

// Soldier - Gun icon
const SoldierIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 12H16L20 8V12H22V14H20V18L16 14H4V12Z" fill="currentColor"/>
    <rect x="2" y="11" width="6" height="4" rx="0.5" fill="currentColor"/>
    <path d="M8 13H16" stroke="white" strokeWidth="1" opacity="0.5"/>
    <circle cx="18" cy="12" r="1" fill="white"/>
  </svg>
);

// Capo - Hat icon
const CapoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <ellipse cx="12" cy="18" rx="9" ry="2" fill="currentColor"/>
    <path d="M5 18C5 14 8 8 12 8C16 8 19 14 19 18" fill="currentColor"/>
    <rect x="10" y="4" width="4" height="5" rx="0.5" fill="currentColor"/>
    <path d="M7 16C7 14 9 11 12 11C15 11 17 14 17 16" stroke="white" strokeWidth="1" opacity="0.3"/>
    <rect x="11" y="5" width="2" height="2" fill="white" opacity="0.5"/>
  </svg>
);

// Consigliere - Scroll/Book icon
const ConsigliereIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6 4C6 3 7 2 8 2H18C19 2 20 3 20 4V20C20 21 19 22 18 22H8C7 22 6 21 6 20V4Z" fill="currentColor"/>
    <path d="M4 6C4 5 5 4 6 4V20C5 20 4 19 4 18V6Z" fill="currentColor" opacity="0.5"/>
    <path d="M9 7H17M9 10H17M9 13H14" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
    <circle cx="16" cy="17" r="2" fill="white" opacity="0.3"/>
  </svg>
);

// Boss - Crown icon
const BossIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 17L2 8L7 12L12 6L17 12L22 8L20 17H4Z" fill="currentColor"/>
    <rect x="4" y="17" width="16" height="3" fill="currentColor"/>
    <circle cx="6" cy="19" r="1" fill="white" opacity="0.5"/>
    <circle cx="12" cy="19" r="1" fill="white" opacity="0.5"/>
    <circle cx="18" cy="19" r="1" fill="white" opacity="0.5"/>
    <circle cx="12" cy="9" r="1.5" fill="white"/>
    <circle cx="7" cy="12" r="1" fill="white" opacity="0.7"/>
    <circle cx="17" cy="12" r="1" fill="white" opacity="0.7"/>
  </svg>
);

const rankIcons: Record<RankLevel, React.FC<{ className?: string }>> = {
  rookie: AssociateIcon,
  soldier: SoldierIcon,
  capo: CapoIcon,
  consigliere: ConsigliereIcon,
  don: BossIcon
};

const rankColors: Record<RankLevel, string> = {
  rookie: 'text-zinc-400',
  soldier: 'text-emerald-500',
  capo: 'text-blue-500',
  consigliere: 'text-purple-500',
  don: 'text-amber-400'
};

const rankGlows: Record<RankLevel, string> = {
  rookie: '',
  soldier: 'drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]',
  capo: 'drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]',
  consigliere: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]',
  don: 'drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]'
};

export const RankIcon: React.FC<RankIconProps> = ({ 
  rank, 
  size = 'md', 
  animated = false,
  className 
}) => {
  const IconComponent = rankIcons[rank];
  const colorClass = rankColors[rank];
  const glowClass = rankGlows[rank];
  
  const icon = (
    <IconComponent 
      className={cn(
        sizeMap[size], 
        colorClass, 
        glowClass,
        'transition-all duration-300',
        className
      )} 
    />
  );

  if (animated && rank === 'don') {
    return (
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {icon}
      </motion.div>
    );
  }

  if (animated) {
    return (
      <motion.div
        whileHover={{ scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 400 }}
      >
        {icon}
      </motion.div>
    );
  }

  return icon;
};

// Badge component with rank icon
interface RankBadgeProps {
  rank: RankLevel;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const badgeBgColors: Record<RankLevel, string> = {
  rookie: 'bg-gradient-to-r from-zinc-600 to-zinc-700',
  soldier: 'bg-gradient-to-r from-emerald-600 to-emerald-700',
  capo: 'bg-gradient-to-r from-blue-600 to-blue-700',
  consigliere: 'bg-gradient-to-r from-purple-600 to-purple-700',
  don: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600'
};

const badgeSizes = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-3 py-1 text-sm gap-1.5',
  lg: 'px-4 py-1.5 text-base gap-2'
};

export const RankBadge: React.FC<RankBadgeProps> = ({
  rank,
  name,
  size = 'md',
  showName = true,
  className
}) => {
  const iconSize = size === 'sm' ? 'sm' : size === 'lg' ? 'md' : 'sm';
  
  return (
    <motion.div
      className={cn(
        'inline-flex items-center font-bold text-white border border-white/20 shadow-lg',
        badgeBgColors[rank],
        badgeSizes[size],
        className
      )}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <RankIcon rank={rank} size={iconSize} className="text-white" />
      {showName && <span className="uppercase tracking-wide">{name}</span>}
      
      {rank === 'don' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        />
      )}
    </motion.div>
  );
};
