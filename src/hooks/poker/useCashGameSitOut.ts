/**
 * Cash Game Sit-Out Hook
 * Professional sit-out, waiting list, and session management for cash games
 * Based on PokerStars/GGPoker logic
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ==========================================
// TYPES
// ==========================================
export type PlayerTableStatus = 
  | 'active' 
  | 'sitting_out' 
  | 'disconnected' 
  | 'leaving';

export type SitOutReason = 
  | 'manual' 
  | 'timeout' 
  | 'disconnect' 
  | 'away' 
  | 'leave_next_bb';

export interface SitOutInfo {
  status: PlayerTableStatus;
  sitOutAt: Date | null;
  sitOutReason: SitOutReason | null;
  missedBlinds: number;
  autoPostBlinds: boolean;
  leaveNextBB: boolean;
  timeUntilRemoval: number | null; // seconds until auto-removal
  returnWarningActive: boolean;
}

export interface WaitingListEntry {
  id: string;
  playerId: string;
  playerName: string;
  position: number;
  joinedAt: Date;
  expiresAt: Date;
}

export interface SessionStats {
  handsPlayed: number;
  buyInAmount: number;
  currentStack: number;
  peakStack: number;
  lowestStack: number;
  profitLoss: number;
  sessionDuration: number; // seconds
}

// ==========================================
// CONSTANTS
// ==========================================
const SIT_OUT_NO_QUEUE_SECONDS = 2 * 60 * 60;      // 2 hours
const SIT_OUT_WITH_QUEUE_SECONDS = 15 * 60;        // 15 minutes
const WARNING_BEFORE_REMOVAL_SECONDS = 2 * 60;     // 2 minutes

// ==========================================
// HOOK
// ==========================================
export function useCashGameSitOut(tableId: string, playerId: string) {
  const { toast } = useToast();
  
  // State
  const [sitOutInfo, setSitOutInfo] = useState<SitOutInfo>({
    status: 'active',
    sitOutAt: null,
    sitOutReason: null,
    missedBlinds: 0,
    autoPostBlinds: true,
    leaveNextBB: false,
    timeUntilRemoval: null,
    returnWarningActive: false,
  });
  
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [myWaitingPosition, setMyWaitingPosition] = useState<number | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // ==========================================
  // LOAD DATA
  // ==========================================
  const loadSitOutInfo = useCallback(async () => {
    if (!tableId || !playerId) return;
    
    const { data, error } = await supabase
      .from('poker_table_players')
      .select('status, sit_out_at, sit_out_reason, missed_blinds, auto_post_blinds, leave_next_bb, return_warning_sent_at')
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .maybeSingle();
    
    if (error || !data) return;
    
    const sitOutAt = data.sit_out_at ? new Date(data.sit_out_at) : null;
    let timeUntilRemoval: number | null = null;
    let returnWarningActive = false;
    
    if (sitOutAt && data.status === 'sitting_out') {
      // Check if there's a waiting list
      const { count } = await supabase
        .from('poker_waiting_list')
        .select('id', { count: 'exact', head: true })
        .eq('table_id', tableId)
        .eq('status', 'waiting');
      
      const hasQueue = (count || 0) > 0;
      const maxSeconds = hasQueue ? SIT_OUT_WITH_QUEUE_SECONDS : SIT_OUT_NO_QUEUE_SECONDS;
      const elapsedSeconds = Math.floor((Date.now() - sitOutAt.getTime()) / 1000);
      timeUntilRemoval = Math.max(0, maxSeconds - elapsedSeconds);
      
      // Check if warning was sent
      if (data.return_warning_sent_at) {
        returnWarningActive = true;
      } else if (timeUntilRemoval <= WARNING_BEFORE_REMOVAL_SECONDS) {
        returnWarningActive = true;
      }
    }
    
    setSitOutInfo({
      status: data.status as PlayerTableStatus,
      sitOutAt,
      sitOutReason: data.sit_out_reason as SitOutReason | null,
      missedBlinds: data.missed_blinds || 0,
      autoPostBlinds: data.auto_post_blinds ?? true,
      leaveNextBB: data.leave_next_bb || false,
      timeUntilRemoval,
      returnWarningActive,
    });
  }, [tableId, playerId]);
  
  const loadWaitingList = useCallback(async () => {
    if (!tableId) return;
    
    const { data, error } = await supabase
      .from('poker_waiting_list')
      .select(`
        id,
        player_id,
        joined_at,
        expires_at,
        players(name)
      `)
      .eq('table_id', tableId)
      .eq('status', 'waiting')
      .order('priority', { ascending: false })
      .order('joined_at', { ascending: true });
    
    if (error || !data) {
      setWaitingList([]);
      return;
    }
    
    const entries: WaitingListEntry[] = data.map((entry, index) => ({
      id: entry.id,
      playerId: entry.player_id,
      playerName: (entry.players as any)?.name || 'Player',
      position: index + 1,
      joinedAt: new Date(entry.joined_at),
      expiresAt: new Date(entry.expires_at),
    }));
    
    setWaitingList(entries);
    
    // Check my position
    const myEntry = entries.find(e => e.playerId === playerId);
    setMyWaitingPosition(myEntry?.position || null);
  }, [tableId, playerId]);
  
  const loadSessionStats = useCallback(async () => {
    if (!tableId || !playerId) return;
    
    const { data: session } = await supabase
      .from('poker_player_sessions')
      .select('*')
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .is('ended_at', null)
      .maybeSingle();
    
    if (!session) {
      setSessionStats(null);
      return;
    }
    
    // Get current stack
    const { data: player } = await supabase
      .from('poker_table_players')
      .select('stack')
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .single();
    
    const currentStack = player?.stack || 0;
    const sessionDuration = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);
    
    setSessionStats({
      handsPlayed: session.hands_played || 0,
      buyInAmount: session.buy_in_amount,
      currentStack,
      peakStack: session.peak_stack || currentStack,
      lowestStack: session.lowest_stack || currentStack,
      profitLoss: currentStack - session.buy_in_amount,
      sessionDuration,
    });
  }, [tableId, playerId]);
  
  // ==========================================
  // ACTIONS
  // ==========================================
  const sitOut = useCallback(async (reason: SitOutReason = 'manual') => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('poker_table_players')
        .update({
          status: 'sitting_out',
          sit_out_at: new Date().toISOString(),
          sit_out_reason: reason,
        })
        .eq('table_id', tableId)
        .eq('player_id', playerId);
      
      if (error) throw error;
      
      await loadSitOutInfo();
      
      toast({
        title: "Sitting Out",
        description: "You are now sitting out. Click 'I'm Back' to return to play.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to sit out",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [tableId, playerId, loadSitOutInfo, toast]);
  
  const sitIn = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('poker_table_players')
        .update({
          status: 'active',
          sit_out_at: null,
          sit_out_reason: null,
          missed_blinds: 0,
          return_warning_sent_at: null,
        })
        .eq('table_id', tableId)
        .eq('player_id', playerId);
      
      if (error) throw error;
      
      await loadSitOutInfo();
      
      toast({
        title: "Welcome Back!",
        description: "You are now active and will be dealt into the next hand.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to return to play",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [tableId, playerId, loadSitOutInfo, toast]);
  
  const setLeaveNextBB = useCallback(async (leave: boolean) => {
    const { error } = await supabase
      .from('poker_table_players')
      .update({ leave_next_bb: leave })
      .eq('table_id', tableId)
      .eq('player_id', playerId);
    
    if (!error) {
      setSitOutInfo(prev => ({ ...prev, leaveNextBB: leave }));
      
      if (leave) {
        toast({
          title: "Leave Next Big Blind",
          description: "You will leave the table after posting your big blind.",
        });
      }
    }
  }, [tableId, playerId, toast]);
  
  const setAutoPostBlinds = useCallback(async (auto: boolean) => {
    const { error } = await supabase
      .from('poker_table_players')
      .update({ auto_post_blinds: auto })
      .eq('table_id', tableId)
      .eq('player_id', playerId);
    
    if (!error) {
      setSitOutInfo(prev => ({ ...prev, autoPostBlinds: auto }));
    }
  }, [tableId, playerId]);
  
  const joinWaitingList = useCallback(async (minBuyIn: number, maxBuyIn: number) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('poker_waiting_list')
        .insert({
          table_id: tableId,
          player_id: playerId,
          min_buy_in: minBuyIn,
          max_buy_in: maxBuyIn,
        });
      
      if (error) throw error;
      
      await loadWaitingList();
      
      toast({
        title: "Joined Waiting List",
        description: `You are #${myWaitingPosition || 1} in the queue.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to join waiting list",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [tableId, playerId, loadWaitingList, myWaitingPosition, toast]);
  
  const leaveWaitingList = useCallback(async () => {
    const { error } = await supabase
      .from('poker_waiting_list')
      .update({ status: 'cancelled' })
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .eq('status', 'waiting');
    
    if (!error) {
      setMyWaitingPosition(null);
      await loadWaitingList();
    }
  }, [tableId, playerId, loadWaitingList]);
  
  // ==========================================
  // EFFECTS
  // ==========================================
  
  // Initial load
  useEffect(() => {
    loadSitOutInfo();
    loadWaitingList();
    loadSessionStats();
  }, [loadSitOutInfo, loadWaitingList, loadSessionStats]);
  
  // Subscribe to realtime updates
  useEffect(() => {
    if (!tableId) return;
    
    const channel = supabase
      .channel(`sit-out-${tableId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_table_players',
        filter: `table_id=eq.${tableId}`,
      }, () => {
        loadSitOutInfo();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_waiting_list',
        filter: `table_id=eq.${tableId}`,
      }, () => {
        loadWaitingList();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId, loadSitOutInfo, loadWaitingList]);
  
  // Timer for countdown
  useEffect(() => {
    if (sitOutInfo.status !== 'sitting_out' || sitOutInfo.timeUntilRemoval === null) {
      return;
    }
    
    const interval = setInterval(() => {
      setSitOutInfo(prev => {
        if (prev.timeUntilRemoval === null || prev.timeUntilRemoval <= 0) {
          return prev;
        }
        
        const newTime = prev.timeUntilRemoval - 1;
        const warningActive = newTime <= WARNING_BEFORE_REMOVAL_SECONDS;
        
        return {
          ...prev,
          timeUntilRemoval: newTime,
          returnWarningActive: warningActive,
        };
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sitOutInfo.status, sitOutInfo.timeUntilRemoval !== null]);
  
  // ==========================================
  // COMPUTED
  // ==========================================
  const isSittingOut = sitOutInfo.status === 'sitting_out';
  const isActive = sitOutInfo.status === 'active';
  const hasQueue = waitingList.length > 0;
  const isInQueue = myWaitingPosition !== null;
  
  const formattedTimeRemaining = useMemo(() => {
    if (sitOutInfo.timeUntilRemoval === null) return null;
    
    const minutes = Math.floor(sitOutInfo.timeUntilRemoval / 60);
    const seconds = sitOutInfo.timeUntilRemoval % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [sitOutInfo.timeUntilRemoval]);
  
  return {
    // State
    sitOutInfo,
    waitingList,
    myWaitingPosition,
    sessionStats,
    isLoading,
    
    // Computed
    isSittingOut,
    isActive,
    hasQueue,
    isInQueue,
    formattedTimeRemaining,
    
    // Actions
    sitOut,
    sitIn,
    setLeaveNextBB,
    setAutoPostBlinds,
    joinWaitingList,
    leaveWaitingList,
    
    // Refresh
    refresh: loadSitOutInfo,
  };
}