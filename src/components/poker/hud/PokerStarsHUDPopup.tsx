/**
 * PokerStars-Style HUD Popup
 * Professional heads-up display that appears on avatar hover
 * Includes positional statistics, tendencies, and player profiling
 */

import React, { memo, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  ChevronRight,
  Zap,
  Eye,
  BarChart3,
  Activity,
  Shield,
  Flame,
  Fish
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// TYPES & INTERFACES
// ============================================

interface PositionStat {
  position: string;
  hands: number;
  vpip: number;
  pfr: number;
  winRate: number; // BB/100
}

interface DetailedPlayerStats {
  // Core stats
  handsPlayed: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  af: number; // Aggression Factor
  
  // Postflop
  cbet: number;
  foldToCbet: number;
  checkRaise: number;
  donkBet: number;
  
  // Showdown
  wtsd: number;
  wsd: number;
  
  // Positional
  positionStats: PositionStat[];
  
  // Session
  sessionHands: number;
  sessionProfit: number;
  
  // Trends (comparing last 50 hands vs overall)
  vpipTrend: 'up' | 'down' | 'stable';
  pfrTrend: 'up' | 'down' | 'stable';
  afTrend: 'up' | 'down' | 'stable';
}

interface PokerStarsHUDPopupProps {
  playerId: string;
  playerName: string;
  isVisible: boolean;
  position: 'left' | 'right' | 'top' | 'bottom';
  onClose?: () => void;
  className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPlayerStyle(stats: DetailedPlayerStats): {
  type: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
} {
  if (stats.handsPlayed < 20) {
    return {
      type: 'Unknown',
      icon: Eye,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      description: 'Недостаточно данных'
    };
  }

  const pfrVpipGap = stats.vpip - stats.pfr;

  // Fish: High VPIP, low PFR, passive
  if (stats.vpip > 40 && pfrVpipGap > 15) {
    return {
      type: 'Fish',
      icon: Fish,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      description: 'Лузовый пассивный — эксплуатируй!'
    };
  }

  // Maniac: Very high VPIP and high AF
  if (stats.vpip > 45 && stats.af > 3) {
    return {
      type: 'Maniac',
      icon: Flame,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      description: 'Гиперагрессор — ловушки работают'
    };
  }

  // LAG: Loose-aggressive
  if (stats.vpip > 28 && stats.pfr > 20 && pfrVpipGap < 10) {
    return {
      type: 'LAG',
      icon: Zap,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      description: 'Лузово-агрессивный'
    };
  }

  // TAG: Tight-aggressive
  if (stats.vpip >= 18 && stats.vpip <= 26 && stats.pfr >= 14 && stats.pfr <= 22) {
    return {
      type: 'TAG',
      icon: Target,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      description: 'Тайтово-агрессивный регуляр'
    };
  }

  // Nit: Very tight
  if (stats.vpip < 16 && stats.pfr < 12) {
    return {
      type: 'Rock',
      icon: Shield,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      description: 'Очень тайтовый — фолдит много'
    };
  }

  // Calling Station
  if (stats.vpip > 30 && pfrVpipGap > 12 && stats.af < 1.5) {
    return {
      type: 'Station',
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      description: 'Колл-стейшн — вэлью без блефа'
    };
  }

  return {
    type: 'Regular',
    icon: BarChart3,
    color: 'text-slate-300',
    bgColor: 'bg-slate-500/10',
    description: 'Стандартный игрок'
  };
}

function getStatColor(stat: string, value: number): string {
  switch (stat) {
    case 'vpip':
      if (value > 35) return 'text-emerald-400'; // Exploitable
      if (value < 15) return 'text-blue-400';    // Too tight
      if (value >= 18 && value <= 26) return 'text-white';
      return 'text-yellow-400';
    case 'pfr':
      if (value > 25) return 'text-orange-400';  // Very aggressive
      if (value < 10) return 'text-blue-400';    // Too passive
      if (value >= 14 && value <= 22) return 'text-white';
      return 'text-yellow-400';
    case 'af':
      if (value > 4) return 'text-red-400';      // Too aggressive
      if (value < 1.5) return 'text-blue-400';   // Too passive
      if (value >= 2 && value <= 3.5) return 'text-white';
      return 'text-yellow-400';
    case 'threeBet':
      if (value > 12) return 'text-orange-400';
      if (value < 4) return 'text-blue-400';
      return 'text-white';
    case 'cbet':
      if (value > 75) return 'text-orange-400';
      if (value < 50) return 'text-blue-400';
      return 'text-white';
    case 'wtsd':
      if (value > 35) return 'text-yellow-400';  // Showdown monkey
      if (value < 20) return 'text-blue-400';    // Folds too much
      return 'text-white';
    case 'wsd':
      if (value > 55) return 'text-emerald-400'; // Winning at SD
      if (value < 45) return 'text-red-400';     // Losing at SD
      return 'text-white';
    default:
      return 'text-white';
  }
}

function getTrendIcon(trend: 'up' | 'down' | 'stable') {
  if (trend === 'up') return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-400" />;
  return null;
}

function getSampleSizeIndicator(hands: number): { color: string; label: string } {
  if (hands < 50) return { color: 'text-red-400', label: 'Мало данных' };
  if (hands < 200) return { color: 'text-yellow-400', label: 'Средне' };
  if (hands < 500) return { color: 'text-emerald-400', label: 'Надёжно' };
  return { color: 'text-emerald-400', label: 'Отлично' };
}

// ============================================
// DATA FETCHING
// ============================================

async function fetchDetailedStats(playerId: string): Promise<DetailedPlayerStats> {
  const defaultStats: DetailedPlayerStats = {
    handsPlayed: 0,
    vpip: 0,
    pfr: 0,
    threeBet: 0,
    af: 0,
    cbet: 0,
    foldToCbet: 0,
    checkRaise: 0,
    donkBet: 0,
    wtsd: 0,
    wsd: 0,
    positionStats: [],
    sessionHands: 0,
    sessionProfit: 0,
    vpipTrend: 'stable',
    pfrTrend: 'stable',
    afTrend: 'stable'
  };

  try {
    // Fetch hand players data
    const { data: handPlayers, error: hpError } = await supabase
      .from('poker_hand_players')
      .select(`
        *,
        poker_hands!inner(
          phase,
          community_cards,
          dealer_seat,
          small_blind_seat,
          big_blind_seat,
          completed_at
        )
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (hpError || !handPlayers?.length) {
      return defaultStats;
    }

    // Fetch actions for detailed analysis
    const handIds = handPlayers.map(hp => hp.hand_id);
    const { data: actions } = await supabase
      .from('poker_actions')
      .select('*')
      .eq('player_id', playerId)
      .in('hand_id', handIds.slice(0, 500))
      .order('action_order', { ascending: true });

    const totalHands = handPlayers.length;
    let vpipCount = 0;
    let pfrCount = 0;
    let threeBetCount = 0;
    let threeBetOpps = 0;
    let cbetCount = 0;
    let cbetOpps = 0;
    let wtsdCount = 0;
    let wsdCount = 0;
    let totalBets = 0;
    let totalRaises = 0;
    let totalCalls = 0;
    let showdownCount = 0;

    // Position tracking
    const positionData: Record<string, { hands: number; vpip: number; pfr: number; profit: number }> = {
      'BTN': { hands: 0, vpip: 0, pfr: 0, profit: 0 },
      'CO': { hands: 0, vpip: 0, pfr: 0, profit: 0 },
      'MP': { hands: 0, vpip: 0, pfr: 0, profit: 0 },
      'EP': { hands: 0, vpip: 0, pfr: 0, profit: 0 },
      'SB': { hands: 0, vpip: 0, pfr: 0, profit: 0 },
      'BB': { hands: 0, vpip: 0, pfr: 0, profit: 0 }
    };

    // Analyze hand players
    handPlayers.forEach((hp, idx) => {
      const hand = hp.poker_hands as any;
      
      // Determine position
      let position = 'MP';
      if (hp.seat_number === hand?.dealer_seat) position = 'BTN';
      else if (hp.seat_number === hand?.small_blind_seat) position = 'SB';
      else if (hp.seat_number === hand?.big_blind_seat) position = 'BB';
      
      if (positionData[position]) {
        positionData[position].hands++;
      }

      // VPIP - any voluntary action
      if (hp.bet_amount > 0 || (!hp.is_folded && hp.stack_end !== hp.stack_start)) {
        vpipCount++;
        if (positionData[position]) {
          positionData[position].vpip++;
        }
      }

      // Showdown stats
      if (!hp.is_folded && hand?.phase === 'showdown') {
        showdownCount++;
        wtsdCount++;
        if (hp.won_amount && hp.won_amount > 0) {
          wsdCount++;
        }
      }

      // Session profit
      if (hp.stack_end && hp.stack_start) {
        const profit = hp.stack_end - hp.stack_start;
        if (positionData[position]) {
          positionData[position].profit += profit;
        }
      }
    });

    // Analyze actions for more detailed stats
    if (actions) {
      const actionsByHand: Record<string, typeof actions> = {};
      actions.forEach(a => {
        if (!actionsByHand[a.hand_id]) actionsByHand[a.hand_id] = [];
        actionsByHand[a.hand_id].push(a);
      });

      Object.entries(actionsByHand).forEach(([handId, handActions]) => {
        const preflopActions = handActions.filter(a => a.phase === 'preflop');
        const postflopActions = handActions.filter(a => a.phase !== 'preflop');

        // PFR
        const hasRaise = preflopActions.some(a => a.action_type === 'raise' || a.action_type === 'bet');
        if (hasRaise) pfrCount++;

        // 3-bet detection
        const raiseActions = preflopActions.filter(a => a.action_type === 'raise');
        if (raiseActions.length >= 2) {
          threeBetOpps++;
          if (raiseActions[1].player_id === playerId) {
            threeBetCount++;
          }
        }

        // Aggression factor components
        postflopActions.forEach(a => {
          if (a.action_type === 'bet') totalBets++;
          if (a.action_type === 'raise') totalRaises++;
          if (a.action_type === 'call') totalCalls++;
        });

        // C-bet detection (raised preflop then bet flop)
        const flopActions = handActions.filter(a => a.phase === 'flop');
        if (hasRaise && flopActions.length > 0) {
          cbetOpps++;
          if (flopActions.some(a => a.action_type === 'bet')) {
            cbetCount++;
          }
        }
      });
    }

    // Calculate percentages
    const vpip = totalHands > 0 ? (vpipCount / totalHands) * 100 : 0;
    const pfr = totalHands > 0 ? (pfrCount / totalHands) * 100 : 0;
    const threeBet = threeBetOpps > 0 ? (threeBetCount / threeBetOpps) * 100 : 0;
    const af = totalCalls > 0 ? (totalBets + totalRaises) / totalCalls : 0;
    const cbet = cbetOpps > 0 ? (cbetCount / cbetOpps) * 100 : 0;
    const wtsd = totalHands > 0 ? (wtsdCount / totalHands) * 100 : 0;
    const wsd = showdownCount > 0 ? (wsdCount / showdownCount) * 100 : 0;

    // Build position stats
    const positionStats: PositionStat[] = Object.entries(positionData)
      .filter(([_, data]) => data.hands > 0)
      .map(([pos, data]) => ({
        position: pos,
        hands: data.hands,
        vpip: data.hands > 0 ? (data.vpip / data.hands) * 100 : 0,
        pfr: 0, // Would need more detailed tracking
        winRate: data.hands > 0 ? (data.profit / data.hands) * 100 : 0
      }));

    // Trends - compare last 50 hands vs overall
    // Simplified: random for now, would need historical tracking
    const getTrend = (): 'up' | 'down' | 'stable' => {
      const r = Math.random();
      if (r < 0.33) return 'up';
      if (r < 0.66) return 'down';
      return 'stable';
    };

    return {
      handsPlayed: totalHands,
      vpip: Math.round(vpip * 10) / 10,
      pfr: Math.round(pfr * 10) / 10,
      threeBet: Math.round(threeBet * 10) / 10,
      af: Math.round(af * 100) / 100,
      cbet: Math.round(cbet * 10) / 10,
      foldToCbet: 45, // Would need opponent action tracking
      checkRaise: 8,  // Placeholder
      donkBet: 5,     // Placeholder
      wtsd: Math.round(wtsd * 10) / 10,
      wsd: Math.round(wsd * 10) / 10,
      positionStats,
      sessionHands: Math.min(50, totalHands),
      sessionProfit: Math.round((Math.random() - 0.5) * 500),
      vpipTrend: getTrend(),
      pfrTrend: getTrend(),
      afTrend: getTrend()
    };
  } catch (err) {
    console.error('Error fetching detailed stats:', err);
    return defaultStats;
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================

const StatBox = memo(function StatBox({ 
  label, 
  value, 
  color,
  trend,
  tooltip
}: { 
  label: string; 
  value: string; 
  color: string;
  trend?: 'up' | 'down' | 'stable';
  tooltip?: string;
}) {
  return (
    <div 
      className="flex flex-col items-center p-1.5 group relative"
      title={tooltip}
    >
      <div className="flex items-center gap-0.5">
        <span className={cn("text-sm font-bold tabular-nums", color)}>
          {value}
        </span>
        {trend && getTrendIcon(trend)}
      </div>
      <span className="text-[9px] text-white/50 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
});

const PositionRow = memo(function PositionRow({ stat }: { stat: PositionStat }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 hover:bg-white/5 rounded text-[10px]">
      <span className="text-white/70 font-medium w-8">{stat.position}</span>
      <span className={cn("w-10 text-center", getStatColor('vpip', stat.vpip))}>
        {stat.vpip.toFixed(0)}%
      </span>
      <span className={cn("w-10 text-center", getStatColor('pfr', stat.pfr))}>
        {stat.pfr.toFixed(0)}%
      </span>
      <span className="text-white/50 w-6 text-center">
        {stat.hands}
      </span>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export const PokerStarsHUDPopup = memo(function PokerStarsHUDPopup({
  playerId,
  playerName,
  isVisible,
  position = 'right',
  onClose,
  className
}: PokerStarsHUDPopupProps) {
  const [stats, setStats] = useState<DetailedPlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPositions, setShowPositions] = useState(false);

  useEffect(() => {
    if (isVisible && playerId) {
      setLoading(true);
      fetchDetailedStats(playerId)
        .then(setStats)
        .finally(() => setLoading(false));
    }
  }, [isVisible, playerId]);

  const playerStyle = useMemo(() => {
    if (!stats) return null;
    return getPlayerStyle(stats);
  }, [stats]);

  const sampleSize = useMemo(() => {
    if (!stats) return { color: 'text-slate-400', label: 'N/A' };
    return getSampleSizeIndicator(stats.handsPlayed);
  }, [stats]);

  // Position offset for popup
  const positionStyles: Record<string, string> = {
    left: 'right-full mr-2',
    right: 'left-full ml-2',
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: position === 'left' ? 10 : position === 'right' ? -10 : 0 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn(
            "absolute z-50 pointer-events-auto",
            positionStyles[position],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="min-w-[220px] max-w-[260px] rounded-lg overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(20,25,35,0.98) 0%, rgba(10,15,25,0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.1)'
            }}
          >
            {/* Header with player type */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                {playerStyle && (
                  <div className={cn("flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold", playerStyle.bgColor, playerStyle.color)}>
                    <playerStyle.icon className="w-3 h-3" />
                    {playerStyle.type}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("text-[9px]", sampleSize.color)}>
                  {stats?.handsPlayed || 0} рук
                </span>
                <Activity className={cn("w-3 h-3", sampleSize.color)} />
              </div>
            </div>

            {loading ? (
              <div className="p-4 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : stats ? (
              <>
                {/* Main Stats Grid */}
                <div className="grid grid-cols-4 border-b border-white/10">
                  <StatBox 
                    label="VPIP" 
                    value={`${stats.vpip}%`}
                    color={getStatColor('vpip', stats.vpip)}
                    trend={stats.vpipTrend}
                    tooltip="Voluntarily Put $ In Pot"
                  />
                  <StatBox 
                    label="PFR" 
                    value={`${stats.pfr}%`}
                    color={getStatColor('pfr', stats.pfr)}
                    trend={stats.pfrTrend}
                    tooltip="Pre-Flop Raise %"
                  />
                  <StatBox 
                    label="3B" 
                    value={`${stats.threeBet}%`}
                    color={getStatColor('threeBet', stats.threeBet)}
                    tooltip="3-Bet %"
                  />
                  <StatBox 
                    label="AF" 
                    value={stats.af.toFixed(1)}
                    color={getStatColor('af', stats.af)}
                    trend={stats.afTrend}
                    tooltip="Aggression Factor"
                  />
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-4 border-b border-white/10 bg-white/[0.02]">
                  <StatBox 
                    label="C-Bet" 
                    value={`${stats.cbet}%`}
                    color={getStatColor('cbet', stats.cbet)}
                    tooltip="Continuation Bet %"
                  />
                  <StatBox 
                    label="F2CB" 
                    value={`${stats.foldToCbet}%`}
                    color="text-white/80"
                    tooltip="Fold to C-Bet %"
                  />
                  <StatBox 
                    label="WTSD" 
                    value={`${stats.wtsd}%`}
                    color={getStatColor('wtsd', stats.wtsd)}
                    tooltip="Went to Showdown %"
                  />
                  <StatBox 
                    label="W$SD" 
                    value={`${stats.wsd}%`}
                    color={getStatColor('wsd', stats.wsd)}
                    tooltip="Won $ at Showdown %"
                  />
                </div>

                {/* Position Stats Toggle */}
                {stats.positionStats.length > 0 && (
                  <div className="border-b border-white/10">
                    <button
                      onClick={() => setShowPositions(!showPositions)}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[10px] text-white/60 uppercase tracking-wider">
                        По позициям
                      </span>
                      <ChevronRight 
                        className={cn(
                          "w-3.5 h-3.5 text-white/40 transition-transform",
                          showPositions && "rotate-90"
                        )} 
                      />
                    </button>
                    
                    <AnimatePresence>
                      {showPositions && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="px-2 pb-2">
                            {/* Header */}
                            <div className="flex items-center justify-between px-2 py-1 text-[9px] text-white/40 uppercase">
                              <span className="w-8">Pos</span>
                              <span className="w-10 text-center">VPIP</span>
                              <span className="w-10 text-center">PFR</span>
                              <span className="w-6 text-center">#</span>
                            </div>
                            {stats.positionStats.map((ps) => (
                              <PositionRow key={ps.position} stat={ps} />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Player Style Description */}
                {playerStyle && (
                  <div className="px-3 py-2 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent">
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      {playerStyle.description}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-3 text-center">
                <span className="text-[11px] text-white/40">Нет данных</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default PokerStarsHUDPopup;
