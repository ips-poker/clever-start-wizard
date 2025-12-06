import React from 'react';
import { motion } from 'framer-motion';
import { getEmblemImageById, getSealImageById } from '@/utils/clanEmblemsImages';
import { cn } from '@/lib/utils';

interface ClanEmblemDisplayProps {
  emblemId: number;
  sealId: number;
  clanName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
}

const sizeValues = {
  sm: 48,
  md: 72,
  lg: 96,
  xl: 128
};

const sealSizes = {
  sm: 20,
  md: 28,
  lg: 36,
  xl: 48
};

const fontSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg'
};

export function ClanEmblemDisplay({
  emblemId,
  sealId,
  clanName,
  size = 'md',
  showName = true,
  className
}: ClanEmblemDisplayProps) {
  const emblem = getEmblemImageById(emblemId);
  const seal = getSealImageById(sealId);

  if (!emblem) return null;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Герб PNG */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <motion.img
          src={emblem.image}
          alt={emblem.nameRu}
          className="rounded-lg object-cover drop-shadow-2xl"
          style={{ 
            width: sizeValues[size], 
            height: sizeValues[size],
            filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.3))'
          }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        />

        {/* Печать в углу */}
        {seal && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute -bottom-1 -right-1"
          >
            <img
              src={seal.image}
              alt={seal.nameRu}
              className="rounded-full object-cover drop-shadow-lg"
              style={{ 
                width: sealSizes[size], 
                height: sealSizes[size] 
              }}
            />
          </motion.div>
        )}

        {/* Анимированное свечение */}
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 10px rgba(255, 215, 0, 0.2)',
              '0 0 25px rgba(255, 215, 0, 0.4)',
              '0 0 10px rgba(255, 215, 0, 0.2)'
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
            'font-bold text-center text-amber-400',
            fontSizes[size]
          )}
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
  const emblem = getEmblemImageById(emblemId);
  const seal = getSealImageById(sealId);

  if (!emblem) return null;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm',
        'bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-500/40',
        className
      )}
    >
      <img 
        src={emblem.image} 
        alt={emblem.nameRu}
        className="w-5 h-5 rounded object-cover"
      />
      <span className="text-xs font-semibold text-amber-400">
        {clanName}
      </span>
      {seal && (
        <img 
          src={seal.image} 
          alt={seal.nameRu}
          className="w-4 h-4 rounded-full object-cover"
        />
      )}
    </motion.div>
  );
}

// Большой компонент для отображения герба с деталями
export function ClanEmblemLarge({
  emblemId,
  sealId,
  clanName,
  className
}: Omit<ClanEmblemDisplayProps, 'size' | 'showName'>) {
  const emblem = getEmblemImageById(emblemId);
  const seal = getSealImageById(sealId);

  if (!emblem) return null;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn('flex flex-col items-center gap-4', className)}
    >
      <div className="relative">
        {/* Основной герб */}
        <motion.img
          src={emblem.image}
          alt={emblem.nameRu}
          className="w-32 h-32 rounded-xl object-cover"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.4))'
          }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        />

        {/* Печать */}
        {seal && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="absolute -bottom-3 -right-3"
          >
            <img
              src={seal.image}
              alt={seal.nameRu}
              className="w-12 h-12 rounded-full object-cover drop-shadow-xl"
            />
          </motion.div>
        )}

        {/* Свечение */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 20px rgba(255, 215, 0, 0.2)',
              '0 0 40px rgba(255, 215, 0, 0.5)',
              '0 0 20px rgba(255, 215, 0, 0.2)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      {/* Название и описание */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-amber-400">{clanName}</h3>
        <p className="text-sm text-muted-foreground mt-1">{emblem.description}</p>
      </div>
    </motion.div>
  );
}
