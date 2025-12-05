import React from 'react';
import { motion } from 'framer-motion';
import { getEmblemById, getSealById } from '@/utils/clanEmblems';
import { ClanEmblemSVG, ClanSealSVG } from './ClanEmblemSVG';
import { cn } from '@/lib/utils';

interface ClanEmblemDisplayProps {
  emblemId: number;
  sealId: number;
  clanName: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const sizeValues = {
  sm: 64,
  md: 96,
  lg: 128
};

const sealSizes = {
  sm: 24,
  md: 32,
  lg: 40
};

const fontSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base'
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

  if (!emblem) return null;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Герб SVG */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <ClanEmblemSVG 
          emblemId={emblemId} 
          size={sizeValues[size]}
          primaryColor={emblem.colors.primary}
          secondaryColor={emblem.colors.secondary}
          accentColor={emblem.colors.accent}
        />

        {/* Печать в углу */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute -bottom-1 -right-1"
        >
          <ClanSealSVG 
            sealId={sealId} 
            size={sealSizes[size]}
          />
        </motion.div>

        {/* Анимированное свечение */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
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

  if (!emblem) return null;

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
      <ClanEmblemSVG emblemId={emblemId} size={20} />
      <span
        className="text-xs font-semibold"
        style={{ color: emblem.colors.primary }}
      >
        {clanName}
      </span>
      <ClanSealSVG sealId={sealId} size={16} />
    </motion.div>
  );
}
