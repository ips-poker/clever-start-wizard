import React from 'react';
import { motion } from 'framer-motion';
import { ClanEmblemDisplay } from './ClanEmblemDisplay';
import { Clan } from '@/hooks/useClanSystem';
import { getEmblemById } from '@/utils/clanEmblems';
import { Crown, Users, Trophy, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClanCardProps {
  clan: Clan;
  onClick?: () => void;
  className?: string;
  isLeader?: boolean;
}

export function ClanCard({ clan, onClick, className, isLeader }: ClanCardProps) {
  const emblem = getEmblemById(clan.emblem_id);
  const primaryColor = emblem?.colors.primary || '#FFD700';
  
  // Вычисляем "силу" клана (условно)
  const clanStrength = Math.min(100, Math.round((clan.total_rating || 0) / 50));
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-lg',
        'bg-gradient-to-br from-card via-secondary/50 to-card',
        'border border-border/50 backdrop-blur-sm',
        'transition-all duration-300',
        className
      )}
      style={{
        boxShadow: `0 0 20px ${primaryColor}20, inset 0 1px 0 ${primaryColor}20`
      }}
    >
      {/* Фоновый паттерн */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 20%, ${primaryColor} 0%, transparent 50%),
                           radial-gradient(circle at 70% 80%, ${primaryColor} 0%, transparent 50%)`
        }}
      />
      
      {/* Анимированная линия сверху */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)` }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      <div className="relative p-4 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Герб клана */}
          <div className="flex-shrink-0">
            <ClanEmblemDisplay
              emblemId={clan.emblem_id}
              sealId={clan.seal_id}
              clanName=""
              size="lg"
              showName={false}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Заголовок и бейдж лидера */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 
                  className="font-bold text-xl sm:text-2xl truncate"
                  style={{ color: primaryColor }}
                >
                  {clan.name}
                </h3>
                {isLeader && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 mt-1"
                  >
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-yellow-500 font-semibold uppercase tracking-wider">
                      Вы — Дон
                    </span>
                  </motion.div>
                )}
              </div>
              
              {/* Индикатор силы клана */}
              <motion.div
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/50 backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
              >
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold" style={{ color: primaryColor }}>
                  {clanStrength}%
                </span>
              </motion.div>
            </div>
            
            {/* Описание */}
            {clan.description && (
              <p className="text-sm text-muted-foreground italic line-clamp-2 mb-3">
                "{clan.description}"
              </p>
            )}
            
            {/* Статистика */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <StatItem
                icon={<Users className="w-4 h-4" />}
                value={`${clan.members_count || 0}/20`}
                label="Членов"
                color={primaryColor}
              />
              <StatItem
                icon={<Trophy className="w-4 h-4" />}
                value={`${clan.total_rating || 0}`}
                label="RPS"
                color="#FFD700"
              />
              <StatItem
                icon={<Star className="w-4 h-4" />}
                value={emblem?.nameRu || 'Герб'}
                label="Герб"
                color={primaryColor}
              />
            </div>
          </div>
        </div>
        
        {/* Подсказка нажать */}
        <motion.div
          className="absolute bottom-2 right-2 text-xs text-muted-foreground/50"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Нажмите для управления →
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatItem({ 
  icon, 
  value, 
  label, 
  color 
}: { 
  icon: React.ReactNode; 
  value: string; 
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div style={{ color }}>{icon}</div>
      <div className="flex flex-col">
        <span className="text-sm font-bold leading-tight" style={{ color }}>{value}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}
