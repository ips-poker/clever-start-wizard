// =====================================================
// PPPOKER-STYLE TOURNAMENT INFO PANEL
// =====================================================
// Shows tournament status, blinds, players, prizes

import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Trophy, Clock, TrendingUp, 
  ChevronDown, ChevronUp, Award, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TournamentInfoProps {
  // Basic info
  name?: string;
  status?: 'registering' | 'running' | 'break' | 'final_table' | 'finished';
  
  // Blind info
  currentLevel?: number;
  smallBlind?: number;
  bigBlind?: number;
  ante?: number;
  nextSmallBlind?: number;
  nextBigBlind?: number;
  levelDuration?: number; // seconds
  timeToNextLevel?: number; // seconds
  
  // Player info
  totalPlayers?: number;
  remainingPlayers?: number;
  averageStack?: number;
  
  // Prize info
  prizePool?: number;
  buyIn?: number;
  
  // Display options
  isMobile?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

// Mini info bar shown at top of table
export const TournamentInfoBar = memo(function TournamentInfoBar({
  currentLevel = 1,
  smallBlind = 10,
  bigBlind = 20,
  ante,
  timeToNextLevel = 0,
  remainingPlayers = 0,
  totalPlayers = 0,
  isMobile = false,
  onExpand
}: TournamentInfoProps & { onExpand?: () => void }) {
  const isLowTime = timeToNextLevel > 0 && timeToNextLevel <= 60;
  
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "flex items-center justify-between rounded-full cursor-pointer",
        isMobile ? "px-3 py-1.5 gap-2" : "px-4 py-2 gap-4"
      )}
      style={{
        background: 'linear-gradient(180deg, rgba(15,20,25,0.95) 0%, rgba(5,10,15,0.98) 100%)',
        border: '1px solid rgba(34,197,94,0.3)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}
      onClick={onExpand}
    >
      {/* Level */}
      <div className="flex items-center gap-1.5">
        <div 
          className={cn("rounded-full flex items-center justify-center font-bold text-white",
            isMobile ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]"
          )}
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
        >
          {currentLevel}
        </div>
        <div className="flex flex-col leading-none">
          <span className={cn("text-emerald-400 font-bold", isMobile ? "text-[10px]" : "text-xs")}>
            {smallBlind}/{bigBlind}
          </span>
          {ante && ante > 0 && (
            <span className={cn("text-white/50", isMobile ? "text-[8px]" : "text-[9px]")}>
              ante {ante}
            </span>
          )}
        </div>
      </div>
      
      {/* Timer */}
      <div className={cn(
        "flex items-center gap-1 font-mono font-bold",
        isMobile ? "text-xs" : "text-sm",
        isLowTime ? "text-red-400" : "text-white"
      )}>
        <Clock className={cn(isMobile ? "w-3 h-3" : "w-3.5 h-3.5", isLowTime && "animate-pulse")} />
        {formatTime(timeToNextLevel)}
      </div>
      
      {/* Players */}
      <div className="flex items-center gap-1">
        <Users className={cn("text-blue-400", isMobile ? "w-3 h-3" : "w-3.5 h-3.5")} />
        <span className={cn("text-white font-medium", isMobile ? "text-[10px]" : "text-xs")}>
          {remainingPlayers}/{totalPlayers}
        </span>
      </div>
      
      {/* Expand icon */}
      <ChevronDown className={cn("text-white/50", isMobile ? "w-3 h-3" : "w-4 h-4")} />
    </motion.div>
  );
});

// Full expanded tournament info panel
export const TournamentInfoPanel = memo(function TournamentInfoPanel({
  name = 'Tournament',
  status = 'running',
  currentLevel = 1,
  smallBlind = 10,
  bigBlind = 20,
  ante,
  nextSmallBlind,
  nextBigBlind,
  levelDuration = 600,
  timeToNextLevel = 0,
  totalPlayers = 0,
  remainingPlayers = 0,
  averageStack = 0,
  prizePool = 0,
  buyIn = 0,
  isMobile = false,
  onToggle
}: TournamentInfoProps) {
  const isLowTime = timeToNextLevel > 0 && timeToNextLevel <= 60;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "rounded-xl overflow-hidden",
        isMobile ? "w-[280px]" : "w-[320px]"
      )}
      style={{
        background: 'linear-gradient(180deg, rgba(15,20,25,0.98) 0%, rgba(5,10,15,0.99) 100%)',
        border: '1px solid rgba(34,197,94,0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer"
        style={{ background: 'linear-gradient(90deg, rgba(34,197,94,0.2) 0%, transparent 100%)' }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Trophy className={cn("text-amber-400", isMobile ? "w-4 h-4" : "w-5 h-5")} />
          <span className={cn("text-white font-bold truncate max-w-[150px]", isMobile ? "text-sm" : "text-base")}>
            {name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase",
            status === 'running' && "bg-emerald-500/20 text-emerald-400",
            status === 'break' && "bg-amber-500/20 text-amber-400",
            status === 'final_table' && "bg-purple-500/20 text-purple-400",
            status === 'finished' && "bg-gray-500/20 text-gray-400"
          )}>
            {status === 'running' ? 'Live' : 
             status === 'break' ? 'Break' : 
             status === 'final_table' ? 'Final' : 
             status === 'finished' ? 'Ended' : 'Reg'}
          </span>
          <ChevronUp className="w-4 h-4 text-white/50" />
        </div>
      </div>
      
      {/* Blinds section */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/50 text-xs">Уровень {currentLevel}</span>
          <div className={cn(
            "flex items-center gap-1 font-mono font-bold",
            isMobile ? "text-sm" : "text-base",
            isLowTime ? "text-red-400" : "text-white"
          )}>
            <Clock className={cn("w-4 h-4", isLowTime && "animate-pulse")} />
            {formatTime(timeToNextLevel)}
          </div>
        </div>
        
        {/* Current blinds */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="text-center">
            <div className="text-emerald-400 font-bold text-xl">{formatNumber(smallBlind)}/{formatNumber(bigBlind)}</div>
            <div className="text-white/40 text-[10px]">Блайнды</div>
          </div>
          {ante && ante > 0 && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-amber-400 font-bold text-xl">{formatNumber(ante)}</div>
                <div className="text-white/40 text-[10px]">Анте</div>
              </div>
            </>
          )}
        </div>
        
        {/* Next level */}
        {nextSmallBlind && nextBigBlind && (
          <div className="flex items-center justify-center gap-1 text-white/40 text-xs">
            <TrendingUp className="w-3 h-3" />
            <span>Далее: {formatNumber(nextSmallBlind)}/{formatNumber(nextBigBlind)}</span>
          </div>
        )}
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-white/5">
        {/* Players */}
        <div className="bg-[#0a0d10] px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-white/50 text-xs">Игроки</span>
          </div>
          <div className="text-white font-bold text-lg">
            {remainingPlayers}<span className="text-white/40 text-sm">/{totalPlayers}</span>
          </div>
        </div>
        
        {/* Average stack */}
        <div className="bg-[#0a0d10] px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-white/50 text-xs">Средний стек</span>
          </div>
          <div className="text-white font-bold text-lg">{formatNumber(averageStack)}</div>
        </div>
        
        {/* Prize pool */}
        <div className="bg-[#0a0d10] px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-white/50 text-xs">Призовой фонд</span>
          </div>
          <div className="text-amber-400 font-bold text-lg">{formatNumber(prizePool)}</div>
        </div>
        
        {/* Buy-in */}
        <div className="bg-[#0a0d10] px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span className="text-white/50 text-xs">Бай-ин</span>
          </div>
          <div className="text-emerald-400 font-bold text-lg">{formatNumber(buyIn)}</div>
        </div>
      </div>
    </motion.div>
  );
});

// Main component with toggle
export const PPPokerTournamentInfo = memo(function PPPokerTournamentInfo(
  props: TournamentInfoProps
) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {expanded ? (
          <TournamentInfoPanel 
            key="panel"
            {...props} 
            onToggle={() => setExpanded(false)} 
          />
        ) : (
          <TournamentInfoBar 
            key="bar"
            {...props} 
            onExpand={() => setExpanded(true)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
});

export default PPPokerTournamentInfo;