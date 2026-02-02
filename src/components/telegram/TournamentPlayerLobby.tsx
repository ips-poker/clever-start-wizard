import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MapPin, 
  Users, 
  Trophy, 
  Clock, 
  Zap, 
  Plus, 
  Timer,
  Coins,
  TrendingUp,
  BarChart3,
  Coffee,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GlitchText } from '@/components/ui/glitch-text';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  calculateTableNumber, 
  calculateSeatAtTable, 
  detectPlayersPerTable,
  DEFAULT_PLAYERS_PER_TABLE 
} from '@/utils/tournamentSeating';

interface Tournament {
  id: string;
  name: string;
  start_time: string;
  status: string;
  starting_chips: number;
  current_level?: number;
  timer_remaining?: number;
  timer_duration?: number;
  current_small_blind?: number;
  current_big_blind?: number;
  break_start_level?: number;
  participation_fee?: number;
  reentry_fee?: number;
  reentry_chips?: number;
  additional_fee?: number;
  additional_chips?: number;
  additional_level?: number;
  reentry_end_level?: number;
  max_players?: number;
  participant_count?: number;
  total_reentries?: number;
  total_additional_sets?: number;
  total_rps_pool?: number;
}

interface TournamentRegistration {
  id: string;
  tournament_id: string;
  player_id: string;
  status: string;
  seat_number?: number;
  chips?: number;
  reentries?: number;
  additional_sets?: number;
  pending_reentry?: boolean;
  pending_addon?: boolean;
  tournament: Tournament;
}

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante?: number;
  duration: number;
  is_break?: boolean;
}

interface TournamentPlayerLobbyProps {
  registration: TournamentRegistration;
  onClose: () => void;
  onUpdate: () => void;
}

export function TournamentPlayerLobby({ registration: initialRegistration, onClose, onUpdate }: TournamentPlayerLobbyProps) {
  const [registration, setRegistration] = useState(initialRegistration);
  const [tournament, setTournament] = useState<Tournament>(initialRegistration.tournament);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<'reentry' | 'addon' | null>(null);
  const [averageStack, setAverageStack] = useState(0);
  const [playersRemaining, setPlayersRemaining] = useState(0);
  const [playersPerTable, setPlayersPerTable] = useState(9);
  
  // Timer sync: use server anchor time for accurate countdown
  const [timerAnchor, setTimerAnchor] = useState<{
    serverRemaining: number;
    anchorTime: number; // local timestamp when we received server data
  }>({ serverRemaining: tournament.timer_remaining || 0, anchorTime: Date.now() });
  
  // Calculated timer remaining based on anchor (single source of truth)
  const [displayTimer, setDisplayTimer] = useState(tournament.timer_remaining || 0);
  
  // Load players per table by analyzing actual seating pattern
  useEffect(() => {
    const detectTableSize = async () => {
      const { data } = await supabase
        .from('tournament_registrations')
        .select('seat_number')
        .eq('tournament_id', tournament.id)
        .not('seat_number', 'is', null)
        .order('seat_number', { ascending: true });
      
      if (data && data.length >= 2) {
        const seatNumbers = data.map(d => d.seat_number as number);
        const detected = detectPlayersPerTable(seatNumbers);
        setPlayersPerTable(detected);
        console.log(`[Seat Sync] Detected ${detected} players per table`);
      }
    };
    
    detectTableSize();
  }, [tournament.id]);
  
  // Calculate table and seat using consistent formula with admin panel
  const tableNumber = registration.seat_number ? calculateTableNumber(registration.seat_number, playersPerTable) : null;
  const seatNumber = registration.seat_number ? calculateSeatAtTable(registration.seat_number, playersPerTable) : null;
  
  // Update anchor when receiving new server data
  const updateTimerAnchor = useCallback((serverRemaining: number) => {
    console.log('[Timer] Anchor update:', serverRemaining);
    setTimerAnchor({
      serverRemaining,
      anchorTime: Date.now()
    });
  }, []);
  
  // Load blind levels
  useEffect(() => {
    const loadBlindLevels = async () => {
      const { data } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('level');
      
      if (data) setBlindLevels(data);
    };
    
    loadBlindLevels();
  }, [tournament.id]);
  
  // Load player stats
  useEffect(() => {
    const loadStats = async () => {
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('chips, status')
        .eq('tournament_id', tournament.id)
        .in('status', ['playing', 'confirmed']);
      
      if (registrations) {
        const activePlayers = registrations.filter(r => r.status === 'playing');
        setPlayersRemaining(activePlayers.length);
        
        const totalChips = activePlayers.reduce((sum, r) => sum + (r.chips || 0), 0);
        setAverageStack(activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0);
      }
    };
    
    loadStats();
  }, [tournament.id]);
  
  // Polling for tournament data (single source, no realtime conflicts)
  useEffect(() => {
    let pollTimeoutId: NodeJS.Timeout;
    let isActive = true;
    
    const pollTournamentData = async () => {
      if (!isActive) return;
      
      try {
        const { data } = await supabase
          .from('tournaments')
          .select('timer_remaining, timer_duration, current_level, current_small_blind, current_big_blind, status')
          .eq('id', tournament.id)
          .single();
        
        if (data && isActive) {
          setTournament(prev => ({
            ...prev,
            timer_remaining: data.timer_remaining,
            timer_duration: data.timer_duration,
            current_level: data.current_level,
            current_small_blind: data.current_small_blind,
            current_big_blind: data.current_big_blind,
            status: data.status,
          }));
          
          // Update anchor only - display timer will be calculated from this
          updateTimerAnchor(data.timer_remaining || 0);
        }
      } catch (error) {
        console.error('Timer polling error:', error);
      }
      
      // Fixed 2 second polling for accurate timer sync
      if (isActive) {
        pollTimeoutId = setTimeout(pollTournamentData, 2000);
      }
    };
    
    // Initial poll
    pollTournamentData();
    
    return () => {
      isActive = false;
      clearTimeout(pollTimeoutId);
    };
  }, [tournament.id, updateTimerAnchor]);
  
  // Registration updates via realtime (separate from timer)
  useEffect(() => {
    const channel = supabase
      .channel(`player_lobby_reg_${registration.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
          filter: `id=eq.${registration.id}`
        },
        (payload) => {
          console.log('Registration updated (realtime):', payload);
          if (payload.new) {
            const newData = payload.new as any;
            setRegistration(prev => ({
              ...prev,
              chips: newData.chips ?? prev.chips,
              pending_reentry: newData.pending_reentry ?? prev.pending_reentry,
              pending_addon: newData.pending_addon ?? prev.pending_addon,
              reentries: newData.reentries ?? prev.reentries,
              additional_sets: newData.additional_sets ?? prev.additional_sets,
              status: newData.status ?? prev.status,
              seat_number: newData.seat_number ?? prev.seat_number,
            }));
          }
          onUpdate();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [registration.id, onUpdate]);
  
  // Local timer countdown from anchor (requestAnimationFrame for smooth updates)
  useEffect(() => {
    if (tournament.status !== 'running') return;
    
    let animationFrameId: number;
    let lastSecond = -1;
    
    const tick = () => {
      const elapsed = Math.floor((Date.now() - timerAnchor.anchorTime) / 1000);
      const remaining = Math.max(0, timerAnchor.serverRemaining - elapsed);
      
      // Only update state when second changes to avoid excessive re-renders
      if (remaining !== lastSecond) {
        lastSecond = remaining;
        setDisplayTimer(remaining);
      }
      
      animationFrameId = requestAnimationFrame(tick);
    };
    
    animationFrameId = requestAnimationFrame(tick);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [tournament.status, timerAnchor]);
  
  // Format timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get current and next level info
  const currentLevel = blindLevels.find(l => l.level === tournament.current_level);
  const nextLevel = blindLevels.find(l => l.level === (tournament.current_level || 0) + 1);
  const breakLevel = blindLevels.find(l => l.level === tournament.break_start_level && l.is_break);
  
  // Check if can request re-entry/addon
  const canRequestReentry = tournament.status === 'running' && 
    tournament.reentry_end_level && 
    (tournament.current_level || 1) <= tournament.reentry_end_level &&
    !registration.pending_reentry;
    
  const canRequestAddon = tournament.status === 'running' && 
    tournament.additional_level && 
    (tournament.current_level || 1) <= tournament.additional_level &&
    !registration.pending_addon;
  
  // Request handlers
  const handleReentryRequest = async () => {
    setIsSubmitting('reentry');
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          pending_reentry: true, 
          pending_reentry_at: new Date().toISOString() 
        })
        .eq('id', registration.id);
      
      if (error) throw error;
      
      toast.success('Запрос на Re-entry отправлен!');
      onUpdate();
    } catch (error) {
      console.error('Error requesting reentry:', error);
      toast.error('Ошибка отправки запроса');
    } finally {
      setIsSubmitting(null);
    }
  };
  
  const handleAddonRequest = async () => {
    setIsSubmitting('addon');
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          pending_addon: true, 
          pending_addon_at: new Date().toISOString() 
        })
        .eq('id', registration.id);
      
      if (error) throw error;
      
      toast.success('Запрос на Доп. набор отправлен!');
      onUpdate();
    } catch (error) {
      console.error('Error requesting addon:', error);
      toast.error('Ошибка отправки запроса');
    } finally {
      setIsSubmitting(null);
    }
  };
  
  // Timer progress percentage
  const timerProgress = tournament.timer_duration 
    ? (displayTimer / tournament.timer_duration) * 100 
    : 0;
  
  // Check if timer is low
  const isTimerLow = displayTimer <= 60;
  const isTimerCritical = displayTimer <= 30;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl"
      >
        {/* Header - increased top padding for Telegram fullscreen buttons */}
        <div className="relative p-4 pt-20 bg-gradient-to-b from-syndikate-metal/90 to-transparent">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-20 right-4 w-10 h-10 brutal-border bg-syndikate-metal/50 hover:bg-syndikate-red/20"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-syndikate-orange to-syndikate-red brutal-border flex items-center justify-center shadow-neon-orange animate-pulse">
              <Trophy className="h-6 w-6 text-background" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-display font-bold tracking-wider uppercase text-foreground">
                <GlitchText text={tournament.name} glitchIntensity="low" />
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn(
                  "text-xs uppercase font-bold tracking-wider brutal-border",
                  tournament.status === 'running' 
                    ? "bg-syndikate-red/20 text-syndikate-red border-syndikate-red/50 animate-pulse"
                    : "bg-syndikate-orange/20 text-syndikate-orange border-syndikate-orange/50"
                )}>
                  {tournament.status === 'running' ? '● LIVE' : tournament.status.toUpperCase()}
                </Badge>
                {tournament.current_level && (
                  <Badge className="bg-syndikate-metal/50 text-muted-foreground brutal-border text-xs">
                    Уровень {tournament.current_level}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content - extended bottom padding for control panel */}
        <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-4">
          {/* Seat Assignment - Hero Card */}
          {tableNumber && seatNumber && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-purple-900/40 brutal-border p-6"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/15 rounded-full blur-2xl" />
              
              {/* Corner brackets */}
              <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-blue-400" />
              <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-blue-400" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-blue-400" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-blue-400" />
              
              <div className="relative z-10 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <MapPin className="h-6 w-6 text-blue-400" />
                  <span className="text-sm text-blue-300 uppercase tracking-widest font-bold">Ваше место</span>
                </div>
                
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="text-5xl font-display font-black text-white tracking-tight">
                      {tableNumber}
                    </div>
                    <div className="text-xs text-blue-300 uppercase tracking-wider mt-1">Стол</div>
                  </div>
                  
                  <div className="w-1 h-16 bg-gradient-to-b from-transparent via-blue-400 to-transparent" />
                  
                  <div className="text-center">
                    <div className="text-5xl font-display font-black text-blue-400 tracking-tight">
                      {seatNumber}
                    </div>
                    <div className="text-xs text-blue-300 uppercase tracking-wider mt-1">Место</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Timer Card */}
          {tournament.status === 'running' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className={cn(
                "relative overflow-hidden brutal-border p-5",
                isTimerCritical 
                  ? "bg-gradient-to-br from-red-900/50 via-red-800/40 to-orange-900/40 animate-pulse" 
                  : isTimerLow
                    ? "bg-gradient-to-br from-orange-900/40 via-amber-800/30 to-yellow-900/30"
                    : "bg-gradient-to-br from-syndikate-metal/60 via-syndikate-metal/40 to-syndikate-concrete/50"
              )}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-syndikate-orange/10 rounded-full blur-2xl" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Timer className={cn(
                      "h-5 w-5",
                      isTimerCritical ? "text-red-400 animate-pulse" : "text-syndikate-orange"
                    )} />
                    <span className="text-sm text-muted-foreground uppercase tracking-wider font-bold">
                      До конца уровня
                    </span>
                  </div>
                  <Badge className="bg-syndikate-orange/20 text-syndikate-orange brutal-border text-xs">
                    LVL {tournament.current_level}
                  </Badge>
                </div>
                
                <div className={cn(
                  "text-5xl font-display font-black text-center mb-3 tracking-wider",
                  isTimerCritical ? "text-red-400" : isTimerLow ? "text-amber-400" : "text-syndikate-orange"
                )}>
                  {formatTimer(displayTimer)}
                </div>
                
                <Progress 
                  value={timerProgress} 
                  className={cn(
                    "h-2 brutal-border",
                    isTimerCritical 
                      ? "[&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-orange-500" 
                      : "[&>div]:bg-gradient-to-r [&>div]:from-syndikate-orange [&>div]:to-syndikate-red"
                  )}
                />
                
                {/* Blinds info */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-syndikate-metal/30 brutal-border p-3 text-center">
                    <div className="text-xs text-muted-foreground uppercase mb-1">Блайнды</div>
                    <div className="text-lg font-bold text-foreground">
                      {tournament.current_small_blind?.toLocaleString()} / {tournament.current_big_blind?.toLocaleString()}
                    </div>
                  </div>
                  {nextLevel && !nextLevel.is_break && (
                    <div className="bg-syndikate-metal/30 brutal-border p-3 text-center">
                      <div className="text-xs text-muted-foreground uppercase mb-1">Следующий</div>
                      <div className="text-lg font-bold text-syndikate-orange">
                        {nextLevel.small_blind.toLocaleString()} / {nextLevel.big_blind.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {nextLevel?.is_break && (
                    <div className="bg-emerald-500/10 brutal-border border-emerald-500/30 p-3 text-center">
                      <div className="text-xs text-emerald-400 uppercase mb-1 flex items-center justify-center gap-1">
                        <Coffee className="h-3 w-3" />
                        Перерыв
                      </div>
                      <div className="text-lg font-bold text-emerald-400">
                        {nextLevel.duration} мин
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Stats Grid */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            {/* My Stack */}
            <div className="bg-syndikate-metal/50 brutal-border p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-syndikate-orange/10 rounded-full blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 brutal-border flex items-center justify-center">
                    <Coins className="h-4 w-4 text-background" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Мой стек</span>
                </div>
                <div className="text-2xl font-display font-black text-syndikate-orange">
                  {(registration.chips || 0).toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* Average Stack */}
            <div className="bg-syndikate-metal/50 brutal-border p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 brutal-border flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-background" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Ср. стек</span>
                </div>
                <div className="text-2xl font-display font-black text-blue-400">
                  {averageStack.toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* Players Remaining */}
            <div className="bg-syndikate-metal/50 brutal-border p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 brutal-border flex items-center justify-center">
                    <Users className="h-4 w-4 text-background" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Игроков</span>
                </div>
                <div className="text-2xl font-display font-black text-purple-400">
                  {playersRemaining}
                </div>
              </div>
            </div>
            
            {/* RPS Pool */}
            <div className="bg-syndikate-metal/50 brutal-border p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 brutal-border flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-background" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Призовой</span>
                </div>
                <div className="text-2xl font-display font-black text-emerald-400">
                  {tournament.total_rps_pool || 0}
                </div>
                <div className="text-xs text-muted-foreground">RPS</div>
              </div>
            </div>
          </motion.div>
          
          {/* Action Buttons */}
          {tournament.status === 'running' && (canRequestReentry || canRequestAddon) && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-syndikate-orange" />
                <span className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Действия</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Re-entry Button */}
                <Button
                  onClick={handleReentryRequest}
                  disabled={!canRequestReentry || isSubmitting === 'reentry' || registration.pending_reentry}
                  className={cn(
                    "h-auto py-5 brutal-border flex flex-col items-center gap-2 transition-all duration-300",
                    registration.pending_reentry
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30"
                      : canRequestReentry
                        ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50 text-green-400 hover:from-green-500/30 hover:to-emerald-500/30 hover:shadow-lg hover:shadow-green-500/20"
                        : "bg-syndikate-metal/30 border-border text-muted-foreground opacity-50"
                  )}
                >
                  {isSubmitting === 'reentry' ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : registration.pending_reentry ? (
                    <Clock className="h-8 w-8 animate-pulse" />
                  ) : (
                    <RefreshCw className="h-8 w-8" />
                  )}
                  <span className="text-sm font-bold uppercase tracking-wider">
                    {registration.pending_reentry ? 'Ожидание...' : 'Re-entry'}
                  </span>
                  {tournament.reentry_fee && (
                    <span className="text-xs opacity-70">
                      {tournament.reentry_fee.toLocaleString()}₽ • +{((tournament.reentry_chips || 0) / 1000).toFixed(0)}K
                    </span>
                  )}
                </Button>
                
                {/* Addon Button */}
                <Button
                  onClick={handleAddonRequest}
                  disabled={!canRequestAddon || isSubmitting === 'addon' || registration.pending_addon}
                  className={cn(
                    "h-auto py-5 brutal-border flex flex-col items-center gap-2 transition-all duration-300",
                    registration.pending_addon
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30"
                      : canRequestAddon
                        ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50 text-blue-400 hover:from-blue-500/30 hover:to-purple-500/30 hover:shadow-lg hover:shadow-blue-500/20"
                        : "bg-syndikate-metal/30 border-border text-muted-foreground opacity-50"
                  )}
                >
                  {isSubmitting === 'addon' ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : registration.pending_addon ? (
                    <Clock className="h-8 w-8 animate-pulse" />
                  ) : (
                    <Plus className="h-8 w-8" />
                  )}
                  <span className="text-sm font-bold uppercase tracking-wider">
                    {registration.pending_addon ? 'Ожидание...' : 'Доп. Набор'}
                  </span>
                  {tournament.additional_fee && (
                    <span className="text-xs opacity-70">
                      {tournament.additional_fee.toLocaleString()}₽ • +{((tournament.additional_chips || 0) / 1000).toFixed(0)}K
                    </span>
                  )}
                </Button>
              </div>
              
              {/* Info about levels */}
              <div className="bg-syndikate-metal/30 brutal-border p-3 text-center">
                <div className="text-xs text-muted-foreground">
                  {tournament.reentry_end_level && (
                    <span>Re-entry до LVL {tournament.reentry_end_level}</span>
                  )}
                  {tournament.reentry_end_level && tournament.additional_level && (
                    <span className="mx-2">•</span>
                  )}
                  {tournament.additional_level && (
                    <span>Addon до LVL {tournament.additional_level}</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Pending Request Status */}
          {(registration.pending_reentry || registration.pending_addon) && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-yellow-500/10 border border-yellow-500/30 brutal-border p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 brutal-border flex items-center justify-center animate-pulse">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
                    Ожидание подтверждения
                  </div>
                  <div className="text-xs text-yellow-400/70">
                    {registration.pending_reentry && 'Re-entry'} 
                    {registration.pending_reentry && registration.pending_addon && ' и '}
                    {registration.pending_addon && 'Доп. набор'}
                    {' '}на рассмотрении у директора
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Tournament Info */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="bg-syndikate-metal/30 brutal-border p-4"
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-3">
              Информация о турнире
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Взнос:</span>
                <span className="font-bold text-foreground">{tournament.participation_fee?.toLocaleString()}₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Стартовый:</span>
                <span className="font-bold text-foreground">{tournament.starting_chips?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Мои re-entry:</span>
                <span className="font-bold text-syndikate-orange">{registration.reentries || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Мои доп.:</span>
                <span className="font-bold text-blue-400">{registration.additional_sets || 0}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
