import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Ticket, Calendar, Trophy, Gift, Clock, CheckCircle, 
  DoorOpen, Layers, RefreshCw, Filter
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { usePlayerTickets } from '@/hooks/usePlayerTickets';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedPlayerTicketsProps {
  playerId: string;
}

export function EnhancedPlayerTickets({ playerId }: EnhancedPlayerTicketsProps) {
  const { tickets, activeTickets, totalEntries, loading, refresh } = usePlayerTickets(playerId);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const usedTickets = tickets.filter(t => 
    t.status === 'used' || t.entry_count <= 0
  );

  const expiredTickets = tickets.filter(t => 
    t.status === 'expired' || 
    (t.expires_at && new Date(t.expires_at) < new Date() && t.status !== 'used')
  );

  const getStatusBadge = (ticket: any) => {
    if (ticket.status === 'used' || ticket.entry_count <= 0) {
      return <Badge variant="secondary" className="bg-green-500/20 text-green-500">Использован</Badge>;
    }
    if (ticket.status === 'expired' || (ticket.expires_at && new Date(ticket.expires_at) < new Date())) {
      return <Badge variant="secondary" className="bg-red-500/20 text-red-500">Истёк</Badge>;
    }
    return <Badge className="bg-amber-500">Активен</Badge>;
  };

  const renderTicket = (ticket: any, index: number) => (
    <motion.div
      key={ticket.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
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
              ) : ticket.entry_count === 1 ? (
                '1 вход на офлайн турнир'
              ) : (
                'Использованный билет'
              )}
            </span>
          </div>
          
          {ticket.tournament_name && (
            <p className="text-sm text-muted-foreground mb-1">
              Выигран в: {ticket.tournament_name}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
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
          {getStatusBadge(ticket)}
          <div className="text-xs text-muted-foreground font-mono">
            #{ticket.id.slice(-8).toUpperCase()}
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
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
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {totalEntries > 0 && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-1">
                <DoorOpen className="h-3 w-3" />
                {totalEntries} {totalEntries === 1 ? 'вход' : totalEntries < 5 ? 'входа' : 'входов'}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {totalEntries > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-500/20">
                <DoorOpen className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-2xl">{totalEntries}</p>
                <p className="text-sm text-muted-foreground">
                  доступных входов на офлайн турниры
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" className="gap-1">
              Активные
              {activeTickets.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeTickets.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="used" className="gap-1">
              Использованные
              {usedTickets.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {usedTickets.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expired" className="gap-1">
              Истёкшие
              {expiredTickets.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {expiredTickets.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-4">
            <AnimatePresence>
              {activeTickets.length > 0 ? (
                activeTickets.map((ticket, index) => renderTicket(ticket, index))
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Ticket className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Нет активных билетов
                </div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="used" className="space-y-3 mt-4">
            <AnimatePresence>
              {usedTickets.length > 0 ? (
                usedTickets.map((ticket, index) => renderTicket(ticket, index))
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Нет использованных билетов
                </div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="expired" className="space-y-3 mt-4">
            <AnimatePresence>
              {expiredTickets.length > 0 ? (
                expiredTickets.map((ticket, index) => renderTicket(ticket, index))
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Нет истёкших билетов
                </div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
