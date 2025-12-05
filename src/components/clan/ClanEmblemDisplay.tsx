import React from 'react';
import { motion } from 'framer-motion';
import { getEmblemById, getSealById } from '@/utils/clanEmblems';
import { cn } from '@/lib/utils';

interface ClanEmblemDisplayProps {
  emblemId: number;
  sealId: number;
  clanName: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32'
};

const fontSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base'
};

const iconSizes = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-5xl'
};

export function ClanEmblemDisplay({
  emblemId,
  sealId,
  clanName,
  size = 'md',
  showName = true,
  className
}: ClanEmblemDisplayProps) {
  const emblem = getEmblemById(emblemId);
  const seal = getSealById(sealId);

  if (!emblem || !seal) return null;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Герб */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          'relative rounded-full flex items-center justify-center',
          sizeClasses[size]
        )}
        style={{
          background: `linear-gradient(135deg, ${emblem.colors.primary}, ${emblem.colors.secondary})`,
          boxShadow: `0 0 20px ${emblem.colors.primary}40, inset 0 0 20px ${emblem.colors.accent}20`
        }}
      >
        {/* Внутреннее кольцо */}
        <div
          className="absolute inset-2 rounded-full border-2"
          style={{ borderColor: emblem.colors.accent }}
        />
        
        {/* Иконка */}
        <span className={cn(iconSizes[size], 'drop-shadow-lg')}>
          {emblem.icon}
        </span>

        {/* Печать в углу */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute -bottom-1 -right-1 w-1/3 h-1/3 rounded-full flex items-center justify-center text-xs"
          style={{
            background: `linear-gradient(135deg, ${seal.colors.primary}, ${seal.colors.secondary})`,
            boxShadow: `0 0 10px ${seal.colors.primary}60`
          }}
        >
          <span className="text-[0.6em]">{seal.icon}</span>
        </motion.div>

        {/* Анимированное свечение */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              `0 0 10px ${emblem.colors.primary}40`,
              `0 0 25px ${emblem.colors.primary}60`,
              `0 0 10px ${emblem.colors.primary}40`
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* Название клана */}
      {showName && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={cn(
            'font-bold text-center',
            fontSizes[size]
          )}
          style={{ color: emblem.colors.primary }}
        >
          {clanName}
        </motion.div>
      )}
    </div>
  );
}

// Компактный бейдж для профиля
export function ClanBadge({
  emblemId,
  sealId,
  clanName,
  className
}: Omit<ClanEmblemDisplayProps, 'size' | 'showName'>) {
  const emblem = getEmblemById(emblemId);
  const seal = getSealById(sealId);

  if (!emblem || !seal) return null;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm',
        className
      )}
      style={{
        background: `linear-gradient(90deg, ${emblem.colors.primary}20, ${emblem.colors.secondary}20)`,
        border: `1px solid ${emblem.colors.primary}40`
      }}
    >
      <span className="text-sm">{emblem.icon}</span>
      <span
        className="text-xs font-semibold"
        style={{ color: emblem.colors.primary }}
      >
        {clanName}
      </span>
      <span className="text-xs">{seal.icon}</span>
    </motion.div>
  );
}
