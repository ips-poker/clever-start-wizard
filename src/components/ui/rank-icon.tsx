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

// Associate - Spade card suit (новичок)
const AssociateIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path 
      d="M12 2L8 10C6 10 4 12 4 14C4 16 6 18 8 18C9 18 10 17.5 11 17V20H9V22H15V20H13V17C14 17.5 15 18 16 18C18 18 20 16 20 14C20 12 18 10 16 10L12 2Z" 
      fill="currentColor"
    />
    <path 
      d="M12 5L9.5 10H14.5L12 5Z" 
      fill="white" 
      opacity="0.3"
    />
  </svg>
);

// Soldier - Bullet/ammo
const SoldierIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="8" y="3" width="8" height="18" rx="1" fill="currentColor"/>
    <rect x="9" y="4" width="6" height="4" rx="0.5" fill="currentColor" opacity="0.6"/>
    <ellipse cx="12" cy="8" rx="3" ry="1" fill="white" opacity="0.4"/>
    <path d="M9 8H15V19C15 20 14 21 12 21C10 21 9 20 9 19V8Z" fill="currentColor"/>
    <path d="M10 10H14V12H10V10Z" fill="white" opacity="0.2"/>
    <circle cx="12" cy="15" r="1.5" fill="white" opacity="0.3"/>
  </svg>
);

// Capo - Fedora hat
const CapoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <ellipse cx="12" cy="19" rx="10" ry="3" fill="currentColor"/>
    <path d="M3 19C3 14 7 8 12 8C17 8 21 14 21 19" fill="currentColor"/>
    <path d="M5 17C5 14 8 10 12 10C16 10 19 14 19 17" fill="white" opacity="0.15"/>
    <rect x="9" y="4" width="6" height="5" rx="1" fill="currentColor"/>
    <rect x="10" y="5" width="4" height="3" fill="white" opacity="0.2"/>
    <path d="M3 18.5C3 18.5 6 17 12 17C18 17 21 18.5 21 18.5" stroke="white" strokeWidth="0.75" opacity="0.4"/>
  </svg>
);

// Consigliere - Book with seal
const ConsigliereIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M5 3C5 2 6 1 7 1H19C20 1 21 2 21 3V21C21 22 20 23 19 23H7C6 23 5 22 5 21V3Z" fill="currentColor"/>
    <path d="M3 5C3 4 4 3 5 3V21C4 21 3 20 3 19V5Z" fill="currentColor" opacity="0.5"/>
    <path d="M8 6H18" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <path d="M8 9H18" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <path d="M8 12H14" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <circle cx="16" cy="18" r="3.5" fill="white" opacity="0.25"/>
    <circle cx="16" cy="18" r="2" fill="currentColor"/>
    <circle cx="16" cy="18" r="1" fill="white" opacity="0.5"/>
  </svg>
);

// Boss - Crown
const BossIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M2 18L0 6L6 11L12 3L18 11L24 6L22 18H2Z" fill="currentColor"/>
    <rect x="2" y="18" width="20" height="4" rx="0.5" fill="currentColor"/>
    <circle cx="5" cy="20" r="1.5" fill="white" opacity="0.7"/>
    <circle cx="12" cy="20" r="2" fill="white" opacity="0.9"/>
    <circle cx="19" cy="20" r="1.5" fill="white" opacity="0.7"/>
    <circle cx="12" cy="7" r="2.5" fill="white"/>
    <circle cx="6" cy="11" r="1.5" fill="white" opacity="0.8"/>
    <circle cx="18" cy="11" r="1.5" fill="white" opacity="0.8"/>
    <path d="M4 17L12 14L20 17" stroke="white" strokeWidth="0.5" opacity="0.3"/>
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
  soldier: 'drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]',
  capo: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]',
  consigliere: 'drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]',
  don: 'drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]'
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
        }}
        transition={{ 
          duration: 2, 
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
        whileHover={{ scale: 1.15 }}
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
        'inline-flex items-center font-bold text-white border border-white/20 shadow-lg relative overflow-hidden',
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
