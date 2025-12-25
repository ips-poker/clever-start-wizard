import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, Calendar, Trophy, Gift, Clock, CheckCircle, DoorOpen, Layers } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TournamentTicket {
  id: string;
  player_id: string;
  offline_tournament_id: string | null;
  won_from_tournament_id: string | null;
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

interface PlayerTicketsProps {
  playerId: string;
}

export function PlayerTickets({ playerId }: PlayerTicketsProps) {
  const [tickets, setTickets] = useState<TournamentTicket[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
    loadTotalEntries();
  }, [playerId]);

  const loadTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tournament_tickets')
      .select(`
        *,
        online_poker_tournaments!won_from_tournament_id(name)
      `)
      .eq('player_id', playerId)
      .order('issued_at', { ascending: false });

    if (error) {
      console.error('Error loading tickets:', error);
      setLoading(false);
      return;
    }

    const ticketsWithNames = (data || []).map(t => ({
      ...t,
      tournament_name: (t.online_poker_tournaments as any)?.name,
      entry_count: t.entry_count || 1,
      entry_type: t.entry_type || 'offline_entry'
    }));

    setTickets(ticketsWithNames);
    setLoading(false);
  };

  const loadTotalEntries = async () => {
    const { data, error } = await supabase
      .rpc('get_player_available_entries', { p_player_id: playerId });

    if (!error && data !== null) {
      setTotalEntries(data);
    }
  };

  const getStatusBadge = (status: string, expiresAt: string | null, entryCount: number) => {
    if (status === 'used' || entryCount <= 0) {
      return <Badge variant="secondary" className="bg-green-500/20 text-green-500">Использован</Badge>;
    }
    if (status === 'expired' || (expiresAt && new Date(expiresAt) < new Date())) {
      return <Badge variant="secondary" className="bg-red-500/20 text-red-500">Истёк</Badge>;
    }
    return <Badge className="bg-amber-500">Активен</Badge>;
  };

  const activeTickets = tickets.filter(t => 
    t.status === 'active' && 
    t.entry_count > 0 &&
    (!t.expires_at || new Date(t.expires_at) > new Date())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Загрузка билетов...
        </CardContent>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ticket className="h-5 w-5 text-amber-500" />
            Мои входы на офлайн турниры
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Gift className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>У вас пока нет входов на офлайн турниры</p>
          <p className="text-xs mt-1">Выигрывайте в онлайн турнирах, чтобы получить входы!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <Ticket className="h-5 w-5 text-amber-500" />
            Мои входы на офлайн
          </span>
          <div className="flex items-center gap-2">
            {totalEntries > 0 && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-1">
                <DoorOpen className="h-3 w-3" />
                {totalEntries} {totalEntries === 1 ? 'вход' : totalEntries < 5 ? 'входа' : 'входов'}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Сводка по входам */}
        {totalEntries > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/20">
                  <DoorOpen className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Доступно входов: {totalEntries}</p>
                  <p className="text-sm text-muted-foreground">
                    Используйте для участия в любых офлайн турнирах
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className={`relative overflow-hidden rounded-lg border p-4 ${
              ticket.status === 'active' && ticket.entry_count > 0 && (!ticket.expires_at || new Date(ticket.expires_at) > new Date())
                ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent'
                : 'border-border/50 opacity-60'
            }`}
          >
            {/* Ticket perforations */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-background rounded-r-full -ml-1.5" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-background rounded-l-full -mr-1.5" />
            
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold">
                    {ticket.entry_count > 1 ? (
                      <span className="flex items-center gap-1">
                        <Layers className="h-4 w-4" />
                        {ticket.entry_count} входов на офлайн
                      </span>
                    ) : (
                      '1 вход на офлайн турнир'
                    )}
                  </span>
                </div>
                
                {ticket.tournament_name && (
                  <p className="text-sm text-muted-foreground mb-1">
                    Выигран в: {ticket.tournament_name}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    {ticket.finish_position} место
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(ticket.issued_at), 'd MMM yyyy', { locale: ru })}
                  </span>
                  {ticket.expires_at && ticket.status === 'active' && ticket.entry_count > 0 && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Clock className="h-3 w-3" />
                      Истекает {formatDistanceToNow(new Date(ticket.expires_at), { locale: ru, addSuffix: true })}
                    </span>
                  )}
                  {(ticket.status === 'used' || ticket.entry_count <= 0) && ticket.used_at && (
                    <span className="flex items-center gap-1 text-green-500">
                      <CheckCircle className="h-3 w-3" />
                      Использован {format(new Date(ticket.used_at), 'd MMM yyyy', { locale: ru })}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(ticket.status, ticket.expires_at, ticket.entry_count)}
                <div className="text-xs text-muted-foreground">
                  #{ticket.id.slice(-8).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
