// =====================================================
// PPPOKER-STYLE PLAYER STATISTICS MODAL
// =====================================================
// Complete player profile with real-time stats display

import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, Copy, Heart, Crown, Lock, Trophy, Target, Flame, TrendingUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveAvatarUrl } from '@/utils/avatarResolver';
import { supabase } from '@/integrations/supabase/client';

interface PlayerStats {
  vpip: number;        // Voluntarily Put $ In Pot
  pfr: number;         // Pre-Flop Raise
  threeBet: number;    // 3-Bet percentage
  cBet: number;        // Continuation Bet
  wtsd: number;        // Went to Showdown
  wsd: number;         // Won at Showdown
  totalHands: number;
  totalGames: number;
  winCount: number;
  fishIndicator: number; // 0-100, higher = more fish
  afq: number;         // Aggression Frequency
  foldToCBet: number;  // Fold to C-Bet percentage
}

interface PlayerInfo {
  playerId: string;
  name?: string;
  avatarUrl?: string;
  stack?: number;
  level?: number;
}

interface PPPokerPlayerStatsProps {
  player: PlayerInfo;
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

// Fetch real player stats from database
async function fetchPlayerStats(playerId: string): Promise<PlayerStats> {
  try {
    // Get player's poker hand history
    const { data: handPlayers, error } = await supabase
      .from('poker_hand_players')
      .select(`
        *,
        poker_hands!inner(phase, community_cards)
      `)
      .eq('player_id', playerId)
      .limit(1000);

    if (error || !handPlayers || handPlayers.length === 0) {
      return getDefaultStats();
    }

    // Get player actions for more detailed stats
    const { data: actions } = await supabase
      .from('poker_actions')
      .select('*')
      .eq('player_id', playerId)
      .limit(5000);

    // Calculate stats
    const totalHands = handPlayers.length;
    let vpipCount = 0;
    let pfrCount = 0;
    let threeBetCount = 0;
    let cBetOpportunities = 0;
    let cBetCount = 0;
    let showdownCount = 0;
    let showdownWins = 0;

    // Calculate from hand players
    handPlayers.forEach(hp => {
      if (hp.bet_amount > 0 || !hp.is_folded) {
        vpipCount++;
      }
      if (hp.won_amount && hp.won_amount > 0) {
        showdownWins++;
      }
    });

    // Calculate from actions
    if (actions) {
      const preflopRaises = actions.filter(a => a.phase === 'preflop' && (a.action_type === 'raise' || a.action_type === 'bet'));
      pfrCount = preflopRaises.length;

      const threeBets = actions.filter(a => 
        a.phase === 'preflop' && 
        a.action_type === 'raise' && 
        a.action_order > 1
      );
      threeBetCount = threeBets.length;
    }

    const vpip = totalHands > 0 ? (vpipCount / totalHands) * 100 : 0;
    const pfr = totalHands > 0 ? (pfrCount / totalHands) * 100 : 0;
    const threeBet = totalHands > 0 ? (threeBetCount / totalHands) * 100 : 0;

    // Fish indicator: high VPIP + low PFR = fish
    const fishIndicator = Math.min(100, Math.max(0, vpip - pfr + (vpip > 40 ? 20 : 0)));

    return {
      vpip: Math.round(vpip),
      pfr: Math.round(pfr),
      threeBet: Math.round(threeBet),
      cBet: cBetOpportunities > 0 ? Math.round((cBetCount / cBetOpportunities) * 100) : 0,
      wtsd: totalHands > 0 ? Math.round((showdownCount / totalHands) * 100) : 0,
      wsd: showdownCount > 0 ? Math.round((showdownWins / showdownCount) * 100) : 0,
      totalHands,
      totalGames: Math.ceil(totalHands / 20),
      winCount: showdownWins,
      fishIndicator: Math.round(fishIndicator),
      afq: Math.round(pfr * 1.2),
      foldToCBet: 45
    };
  } catch (err) {
    console.error('Error fetching player stats:', err);
    return getDefaultStats();
  }
}

function getDefaultStats(): PlayerStats {
  return {
    vpip: 0,
    pfr: 0,
    threeBet: 0,
    cBet: 0,
    wtsd: 0,
    wsd: 0,
    totalHands: 0,
    totalGames: 0,
    winCount: 0,
    fishIndicator: 0,
    afq: 0,
    foldToCBet: 0
  };
}

// Player type indicator based on stats
function getPlayerType(stats: PlayerStats): { type: string; color: string; icon: React.ElementType } {
  if (stats.totalHands < 10) {
    return { type: 'Новичок', color: '#94a3b8', icon: HelpCircle };
  }
  
  if (stats.vpip > 40 && stats.pfr < 15) {
    return { type: 'Рыба', color: '#22c55e', icon: Target };
  }
  
  if (stats.vpip > 30 && stats.pfr > 20) {
    return { type: 'LAG', color: '#f97316', icon: Flame };
  }
  
  if (stats.vpip < 20 && stats.pfr < 15) {
    return { type: 'Nit', color: '#3b82f6', icon: Lock };
  }
  
  if (stats.vpip >= 18 && stats.vpip <= 26 && stats.pfr >= 15 && stats.pfr <= 22) {
    return { type: 'TAG', color: '#8b5cf6', icon: Crown };
  }
  
  return { type: 'Regular', color: '#64748b', icon: BarChart3 };
}

// Stat color based on value
function getStatColor(stat: string, value: number): string {
  switch (stat) {
    case 'vpip':
      if (value > 35) return '#22c55e'; // Good to exploit
      if (value < 15) return '#3b82f6'; // Tight
      return '#f8fafc';
    case 'pfr':
      if (value > 25) return '#f97316'; // Aggressive
      if (value < 10) return '#3b82f6'; // Passive
      return '#f8fafc';
    case 'threeBet':
      if (value > 10) return '#f97316';
      if (value < 4) return '#3b82f6';
      return '#f8fafc';
    case 'wsd':
      if (value > 55) return '#22c55e';
      if (value < 40) return '#ef4444';
      return '#f8fafc';
    default:
      return '#f8fafc';
  }
}

export const PPPokerPlayerStats = memo(function PPPokerPlayerStats({
  player,
  isOpen,
  onClose,
  isMobile = false
}: PPPokerPlayerStatsProps) {
  const [stats, setStats] = useState<PlayerStats>(getDefaultStats());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'notes' | 'emoji'>('stats');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && player.playerId) {
      setLoading(true);
      fetchPlayerStats(player.playerId)
        .then(setStats)
        .finally(() => setLoading(false));
    }
  }, [isOpen, player.playerId]);

  const playerType = getPlayerType(stats);

  const handleCopyId = () => {
    navigator.clipboard.writeText(player.playerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full bg-gradient-to-b from-[#1a1f26] to-[#0d1117] rounded-2xl overflow-hidden shadow-2xl",
              isMobile ? "max-w-sm" : "max-w-md"
            )}
            style={{
              border: '1px solid rgba(34,197,94,0.2)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 40px rgba(34,197,94,0.1)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                <HelpCircle className="h-5 w-5 text-emerald-500"/>
              </button>
              <span className="text-white font-bold text-lg tracking-wide">Профиль</span>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                <X className="h-5 w-5 text-emerald-500"/>
              </button>
            </div>
            
            {/* Player info banner */}
            <div 
              className="p-5 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,185,129,0.1) 50%, rgba(5,150,105,0.05) 100%)'
              }}
            >
              {/* Decorative gradient */}
              <div className="absolute inset-0 opacity-30"
                style={{
                  background: 'radial-gradient(ellipse at 80% 20%, rgba(34,197,94,0.3) 0%, transparent 50%)'
                }}
              />
              
              <div className="relative flex items-center gap-4">
                {/* Avatar with level ring */}
                <div className="relative">
                  <div 
                    className="w-[72px] h-[72px] rounded-full overflow-hidden"
                    style={{
                      border: '3px solid rgba(34,197,94,0.6)',
                      boxShadow: '0 0 20px rgba(34,197,94,0.3)'
                    }}
                  >
                    <img 
                      src={resolveAvatarUrl(player.avatarUrl, player.playerId)} 
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Level badge */}
                  <div 
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      border: '2px solid #1a1f26'
                    }}
                  >
                    {player.level || 1}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xl">{player.name || 'Игрок'}</span>
                    <span className="text-lg">🇷🇺</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white/50 text-xs">ID: {player.playerId.slice(0, 8)}</span>
                    <button 
                      onClick={handleCopyId}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <Copy className="h-3 w-3 text-white/40"/>
                    </button>
                    {copied && <span className="text-emerald-400 text-[10px]">Скопировано!</span>}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <div 
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: `${playerType.color}20`, color: playerType.color }}
                    >
                      <playerType.icon className="h-3 w-3"/>
                      {playerType.type}
                    </div>
                    <span className="text-emerald-400 text-xs font-medium">Lvl. {player.level || 1}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main stats grid - PPPoker style */}
            <div className="grid grid-cols-4 gap-px bg-white/5 border-b border-white/10">
              {[
                { key: 'vpip', label: 'VPIP', value: `${stats.vpip}%` },
                { key: 'pfr', label: 'PFR', value: `${stats.pfr}%` },
                { key: 'threeBet', label: '3-Bet', value: `${stats.threeBet}%` },
                { key: 'cBet', label: 'C-Bet', value: `${stats.cBet}%` },
              ].map((stat) => (
                <div key={stat.key} className="bg-[#1a1f26] p-4 text-center">
                  <div 
                    className="text-xl font-black"
                    style={{ color: getStatColor(stat.key, stats[stat.key as keyof PlayerStats] as number) }}
                  >
                    {loading ? '...' : stat.value}
                  </div>
                  <div className="text-white/50 text-[10px] font-medium tracking-wider mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
            
            {/* Secondary stats */}
            <div className="grid grid-cols-4 gap-px bg-white/5 border-b border-white/10">
              {[
                { label: 'Всего раздач', value: stats.totalHands.toLocaleString() },
                { label: 'Всего игр', value: stats.totalGames.toLocaleString() },
                { label: 'Победитель', value: stats.winCount.toLocaleString() },
                { label: 'Рыба', value: `${stats.fishIndicator}%` },
              ].map((stat, idx) => (
                <div key={idx} className="bg-[#1a1f26] p-3 text-center">
                  <div className="text-white font-bold text-sm">{loading ? '...' : stat.value}</div>
                  <div className="text-white/40 text-[9px] mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
            
            {/* Advanced stats row */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-amber-500 font-black text-lg">{loading ? '...' : `${stats.wtsd}%`}</span>
                <span className="text-white/50 text-xs">WTSD</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-xs">W$SD</span>
                <span 
                  className="font-black text-lg"
                  style={{ color: stats.wsd > 50 ? '#22c55e' : stats.wsd > 40 ? '#f8fafc' : '#ef4444' }}
                >
                  {loading ? '...' : `${stats.wsd}%`}
                </span>
              </div>
            </div>
            
            {/* Tab bar for emojis - PPPoker style */}
            <div className="flex items-center gap-1 p-3 border-b border-white/10 overflow-x-auto">
              {[
                { emoji: '⭐', active: false },
                { emoji: '🎭', active: true },
                { emoji: '💚', active: false },
                { emoji: '👑', locked: true },
                { emoji: '😀', locked: true },
                { emoji: '🎲', locked: true },
              ].map((item, idx) => (
                <button
                  key={idx}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all relative",
                    item.active 
                      ? "bg-emerald-500/20 ring-2 ring-emerald-500" 
                      : "bg-white/5 hover:bg-white/10",
                    item.locked && "opacity-50"
                  )}
                >
                  {item.emoji}
                  {item.locked && (
                    <Lock className="absolute bottom-0.5 right-0.5 h-3 w-3 text-amber-500"/>
                  )}
                </button>
              ))}
            </div>
            
            {/* Emoji grid */}
            <div className="p-3">
              <div className="text-white/40 text-[10px] mb-2 px-1">1 алмаз за эмодзи</div>
              <div className="grid grid-cols-6 gap-2">
                {['😎', '🤔', '😤', '😏', '😂', '😡', '💪', '🙏', '👍', '🔥', '❤️', '⚡'].map((emoji, idx) => (
                  <button
                    key={idx}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-xl transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default PPPokerPlayerStats;
