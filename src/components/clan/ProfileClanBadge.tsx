import React from 'react';
import { motion } from 'framer-motion';
import { ClanEmblemDisplay, ClanBadge } from './ClanEmblemDisplay';
import { CLAN_HIERARCHY, ClanRole } from '@/utils/clanEmblems';
import { Crown, Users } from 'lucide-react';

interface ProfileClanBadgeProps {
  clan: {
    name: string;
    emblem_id: number;
    seal_id: number;
    total_rating?: number;
  };
  role: string;
  variant?: 'full' | 'compact' | 'badge';
}

export function ProfileClanBadge({ clan, role, variant = 'full' }: ProfileClanBadgeProps) {
  const roleInfo = CLAN_HIERARCHY[role as ClanRole] || CLAN_HIERARCHY.soldier;

  if (variant === 'badge') {
    return (
      <ClanBadge
        emblemId={clan.emblem_id}
        sealId={clan.seal_id}
        clanName={clan.name}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2"
      >
        <ClanEmblemDisplay
          emblemId={clan.emblem_id}
          sealId={clan.seal_id}
          clanName={clan.name}
          size="sm"
          showName={false}
        />
        <div className="text-left">
          <div className="font-semibold text-sm">{clan.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {role === 'don' && <Crown className="w-3 h-3 text-yellow-500" />}
            {roleInfo.name}
          </div>
        </div>
      </motion.div>
    );
  }

  // Full variant
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative p-4 rounded-xl bg-gradient-to-br from-card via-card to-muted/50 border border-border/50 overflow-hidden"
    >
      {/* Декоративный фон */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_var(--primary)_0%,_transparent_50%)]" />
      </div>

      <div className="relative flex items-center gap-4">
        <ClanEmblemDisplay
          emblemId={clan.emblem_id}
          sealId={clan.seal_id}
          clanName={clan.name}
          size="md"
          showName={false}
        />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg">{clan.name}</h3>
            {role === 'don' && (
              <Crown className="w-5 h-5 text-yellow-500" />
            )}
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              {roleInfo.name}
            </span>
            
            {clan.total_rating !== undefined && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-4 h-4" />
                {clan.total_rating} RPS
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            {roleInfo.description}
          </p>
        </div>
      </div>

      {/* Анимированная граница */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
        animate={{
          opacity: [0.3, 0.8, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </motion.div>
  );
}
