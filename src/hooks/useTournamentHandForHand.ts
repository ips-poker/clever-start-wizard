/**
 * Hook for managing Hand-for-Hand mode
 * Syncs H-f-H status across tables via database
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TableHfHStatus {
  tableId: string;
  tableName: string;
  isWaiting: boolean;
  currentHand: number;
  playersRemaining: number;
}

export function useTournamentHandForHand(tournamentId: string | null) {
  const [isActive, setIsActive] = useState(false);
  const [tables, setTables] = useState<TableHfHStatus[]>([]);
  const [loading, setLoading] = useState(false);

  // Toggle Hand-for-Hand mode
  const toggleHandForHand = useCallback(async (enabled: boolean) => {
    if (!tournamentId) return;
    
    setLoading(true);
    try {
      const newStatus = enabled ? 'hand_for_hand' : 'running';
      
      const { error } = await supabase
        .from('online_poker_tournaments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId);

      if (error) throw error;

      setIsActive(enabled);
      
      if (enabled) {
        toast.success('Hand-for-Hand активирован - все столы синхронизированы', {
          description: 'Следующая раздача начнётся когда все столы будут готовы'
        });
      } else {
        toast.success('Hand-for-Hand отключён');
      }

      // Notify all tables via a tournament update
      // This will be picked up by real-time subscriptions
    } catch (error) {
      console.error('Error toggling H-f-H:', error);
      toast.error('Ошибка при переключении Hand-for-Hand');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  // Mark table as waiting (hand completed)
  const markTableWaiting = useCallback(async (tableId: string) => {
    if (!tournamentId) return;

    try {
      await supabase
        .from('poker_tables')
        .update({ 
          status: 'waiting',
          updated_at: new Date().toISOString()
        })
        .eq('id', tableId);

      setTables(prev => prev.map(t => 
        t.tableId === tableId ? { ...t, isWaiting: true } : t
      ));
    } catch (error) {
      console.error('Error marking table waiting:', error);
    }
  }, [tournamentId]);

  // Mark table as playing (hand started)
  const markTablePlaying = useCallback(async (tableId: string) => {
    if (!tournamentId) return;

    try {
      await supabase
        .from('poker_tables')
        .update({ 
          status: 'playing',
          updated_at: new Date().toISOString()
        })
        .eq('id', tableId);

      setTables(prev => prev.map(t => 
        t.tableId === tableId ? { ...t, isWaiting: false } : t
      ));
    } catch (error) {
      console.error('Error marking table playing:', error);
    }
  }, [tournamentId]);

  // Check if all tables are waiting (ready for next hand)
  const allTablesReady = tables.length > 0 && tables.every(t => t.isWaiting);

  // Start next hand on all tables simultaneously
  const startNextHand = useCallback(async () => {
    if (!tournamentId || !allTablesReady) return;

    try {
      // Update all tables to playing
      const tableIds = tables.map(t => t.tableId);
      
      await supabase
        .from('poker_tables')
        .update({ 
          status: 'playing',
          updated_at: new Date().toISOString()
        })
        .in('id', tableIds);

      setTables(prev => prev.map(t => ({ ...t, isWaiting: false })));
      
      toast.success('Новая раздача началась на всех столах!');
    } catch (error) {
      console.error('Error starting next hand:', error);
      toast.error('Ошибка при запуске раздачи');
    }
  }, [tournamentId, tables, allTablesReady]);

  // Fetch current table statuses
  const fetchTableStatuses = useCallback(async () => {
    if (!tournamentId) return;

    try {
      const { data: tournament } = await supabase
        .from('online_poker_tournaments')
        .select('status')
        .eq('id', tournamentId)
        .single();

      setIsActive(tournament?.status === 'hand_for_hand');

      const { data: tablesData } = await supabase
        .from('poker_tables')
        .select('id, name, status')
        .eq('tournament_id', tournamentId)
        .in('status', ['active', 'playing', 'waiting']);

      if (tablesData) {
        const tableStatuses: TableHfHStatus[] = [];
        
        for (const table of tablesData) {
          const { count } = await supabase
            .from('poker_table_players')
            .select('*', { count: 'exact', head: true })
            .eq('table_id', table.id)
            .eq('status', 'active');

          tableStatuses.push({
            tableId: table.id,
            tableName: table.name,
            isWaiting: table.status === 'waiting',
            currentHand: 0,
            playersRemaining: count || 0
          });
        }
        
        setTables(tableStatuses);
      }
    } catch (error) {
      console.error('Error fetching table statuses:', error);
    }
  }, [tournamentId]);

  return {
    isActive,
    tables,
    loading,
    allTablesReady,
    toggleHandForHand,
    markTableWaiting,
    markTablePlaying,
    startNextHand,
    fetchTableStatuses
  };
}
