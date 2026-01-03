import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  player_id: string;
  won_from_tournament_id: string | null;
  offline_tournament_id: string | null;
  finish_position: number;
  ticket_value: number;
  entry_count: number;
  entry_type: string;
  status: string;
  issued_at: string;
  used_at: string | null;
  expires_at: string | null;
  tournament_name?: string;
}

interface UsePlayerTicketsReturn {
  tickets: Ticket[];
  activeTickets: Ticket[];
  totalEntries: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  useTicket: (ticketId: string, offlineTournamentId?: string) => Promise<boolean>;
}

export function usePlayerTickets(playerId: string | null): UsePlayerTicketsReturn {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTickets = useCallback(async () => {
    if (!playerId) {
      setTickets([]);
      setTotalEntries(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load tickets
      const { data, error: ticketsError } = await supabase
        .from('tournament_tickets')
        .select(`
          *,
          online_poker_tournaments!won_from_tournament_id(name)
        `)
        .eq('player_id', playerId)
        .order('issued_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      const ticketsWithNames = (data || []).map(t => ({
        ...t,
        tournament_name: (t.online_poker_tournaments as any)?.name,
        entry_count: t.entry_count || 1,
        entry_type: t.entry_type || 'offline_entry',
      }));

      setTickets(ticketsWithNames);

      // Load total entries
      const { data: entriesData, error: entriesError } = await supabase
        .rpc('get_player_available_entries', { p_player_id: playerId });

      if (!entriesError && entriesData !== null) {
        setTotalEntries(entriesData);
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  const useTicket = useCallback(async (ticketId: string, offlineTournamentId?: string): Promise<boolean> => {
    if (!playerId) return false;

    try {
      // Get current ticket
      const { data: ticket, error: fetchError } = await supabase
        .from('tournament_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticket) {
        toast.error('Билет не найден');
        return false;
      }

      if (ticket.status !== 'active' || ticket.entry_count <= 0) {
        toast.error('Билет недоступен');
        return false;
      }

      if (ticket.expires_at && new Date(ticket.expires_at) < new Date()) {
        toast.error('Срок действия билета истёк');
        return false;
      }

      // Decrement entry count
      const newEntryCount = ticket.entry_count - 1;
      const updateData: any = {
        entry_count: newEntryCount,
        updated_at: new Date().toISOString(),
      };

      // If last entry, mark as used
      if (newEntryCount <= 0) {
        updateData.status = 'used';
        updateData.used_at = new Date().toISOString();
      }

      // If offline tournament specified, link it
      if (offlineTournamentId) {
        updateData.offline_tournament_id = offlineTournamentId;
      }

      const { error: updateError } = await supabase
        .from('tournament_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (updateError) throw updateError;

      toast.success('Вход использован!');
      await loadTickets();
      return true;
    } catch (err) {
      console.error('Error using ticket:', err);
      toast.error('Ошибка при использовании билета');
      return false;
    }
  }, [playerId, loadTickets]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Subscribe to ticket changes
  useEffect(() => {
    if (!playerId) return;

    const channel = supabase
      .channel(`tickets-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_tickets',
          filter: `player_id=eq.${playerId}`,
        },
        () => {
          loadTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, loadTickets]);

  const activeTickets = tickets.filter(t =>
    t.status === 'active' &&
    t.entry_count > 0 &&
    (!t.expires_at || new Date(t.expires_at) > new Date())
  );

  return {
    tickets,
    activeTickets,
    totalEntries,
    loading,
    error,
    refresh: loadTickets,
    useTicket,
  };
}
