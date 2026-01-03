import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Ticket, Trophy, Calendar, Clock, DoorOpen, Sparkles, CreditCard } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface AvailableTicket {
  id: string;
  entry_count: number;
  finish_position: number;
  issued_at: string;
  expires_at: string | null;
  tournament_name?: string;
}

interface TicketSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  tournamentId: string;
  tournamentName: string;
  buyIn: number;
  onSelect: (ticketId: string | null) => void;
}

export function TicketSelector({
  open,
  onOpenChange,
  playerId,
  tournamentId,
  tournamentName,
  buyIn,
  onSelect,
}: TicketSelectorProps) {
  const [tickets, setTickets] = useState<AvailableTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    if (open && playerId) {
      loadTickets();
    }
  }, [open, playerId]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      // Get available tickets
      const { data, error } = await supabase
        .from('tournament_tickets')
        .select(`
          id,
          entry_count,
          finish_position,
          issued_at,
          expires_at,
          online_poker_tournaments!won_from_tournament_id(name)
        `)
        .eq('player_id', playerId)
        .eq('status', 'active')
        .gt('entry_count', 0)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      const ticketsWithNames = (data || []).map(t => ({
        ...t,
        tournament_name: (t.online_poker_tournaments as any)?.name,
      }));

      setTickets(ticketsWithNames);

      // Get total entries
      const { data: entriesData } = await supabase
        .rpc('get_player_available_entries', { p_player_id: playerId });

      setTotalEntries(entriesData || 0);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Ошибка загрузки билетов');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedTicket);
    onOpenChange(false);
  };

  const handlePayWithDiamonds = () => {
    onSelect(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-amber-500" />
            Выбор способа оплаты
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tournament info */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="font-medium">{tournamentName}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Buy-in: {buyIn} 💎
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Загрузка билетов...
            </div>
          ) : (
            <RadioGroup
              value={selectedTicket || 'diamonds'}
              onValueChange={(value) => setSelectedTicket(value === 'diamonds' ? null : value)}
            >
              {/* Pay with diamonds option */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  selectedTicket === null 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedTicket(null)}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="diamonds" id="diamonds" />
                  <Label htmlFor="diamonds" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-500" />
                        <span className="font-medium">Оплатить алмазами</span>
                      </div>
                      <Badge variant="outline" className="text-blue-500">
                        {buyIn} 💎
                      </Badge>
                    </div>
                  </Label>
                </div>
              </motion.div>

              {/* Available tickets */}
              {totalEntries > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DoorOpen className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">
                      Доступно входов: {totalEntries}
                    </span>
                  </div>

                  <AnimatePresence>
                    {tickets.map((ticket, index) => (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all mb-2 ${
                          selectedTicket === ticket.id
                            ? 'border-amber-500 bg-amber-500/5'
                            : 'border-border hover:border-amber-500/50'
                        }`}
                        onClick={() => setSelectedTicket(ticket.id)}
                      >
                        {/* Ticket perforations */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-4 bg-background rounded-r-full -ml-1" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-4 bg-background rounded-l-full -mr-1" />

                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={ticket.id} id={ticket.id} />
                          <Label htmlFor={ticket.id} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 font-medium">
                                  <Ticket className="h-4 w-4 text-amber-500" />
                                  <span>
                                    {ticket.entry_count} {ticket.entry_count === 1 ? 'вход' : ticket.entry_count < 5 ? 'входа' : 'входов'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1">
                                    <Trophy className="h-3 w-3" />
                                    {ticket.finish_position} место
                                  </span>
                                  {ticket.tournament_name && (
                                    <span className="truncate max-w-[120px]">
                                      {ticket.tournament_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className="bg-amber-500">Бесплатно</Badge>
                                {ticket.expires_at && (
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(ticket.expires_at), { locale: ru, addSuffix: true })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Label>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </RadioGroup>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button
              className={`flex-1 ${
                selectedTicket
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
              }`}
              onClick={handleConfirm}
            >
              {selectedTicket ? (
                <>
                  <Ticket className="h-4 w-4 mr-2" />
                  Использовать вход
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Оплатить {buyIn} 💎
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
