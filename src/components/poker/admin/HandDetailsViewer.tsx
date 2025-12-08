import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Play, Eye, Users, Coins, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface HandDetail {
  id: string;
  hand_number: number;
  table_name: string;
  phase: string;
  pot: number;
  community_cards: string[] | null;
  dealer_seat: number;
  small_blind_seat: number;
  big_blind_seat: number;
  current_bet: number;
  created_at: string;
  completed_at: string | null;
  winners: any;
}

interface HandPlayer {
  id: string;
  player_name: string;
  seat_number: number;
  hole_cards: string[] | null;
  stack_start: number;
  stack_end: number | null;
  bet_amount: number;
  is_folded: boolean;
  is_all_in: boolean;
  won_amount: number | null;
  hand_rank: string | null;
}

interface HandAction {
  id: string;
  player_name: string;
  action_type: string;
  amount: number | null;
  phase: string;
  action_order: number;
  created_at: string;
}

const CARD_SUIT_EMOJI: { [key: string]: string } = {
  's': '♠',
  'h': '♥',
  'd': '♦',
  'c': '♣',
};

export function HandDetailsViewer() {
  const [hands, setHands] = useState<HandDetail[]>([]);
  const [selectedHand, setSelectedHand] = useState<HandDetail | null>(null);
  const [handPlayers, setHandPlayers] = useState<HandPlayer[]>([]);
  const [handActions, setHandActions] = useState<HandAction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadHands();
  }, []);

  const loadHands = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('poker_hands')
      .select(`
        id,
        hand_number,
        phase,
        pot,
        community_cards,
        dealer_seat,
        small_blind_seat,
        big_blind_seat,
        current_bet,
        created_at,
        completed_at,
        winners,
        poker_tables!inner(name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setHands(data.map(h => ({
        ...h,
        table_name: (h.poker_tables as any)?.name || 'Unknown'
      })));
    }
    setLoading(false);
  };

  const loadHandDetails = async (handId: string) => {
    // Load players
    const { data: players } = await supabase
      .from('poker_hand_players')
      .select(`
        id,
        seat_number,
        hole_cards,
        stack_start,
        stack_end,
        bet_amount,
        is_folded,
        is_all_in,
        won_amount,
        hand_rank,
        players!inner(name)
      `)
      .eq('hand_id', handId)
      .order('seat_number');

    if (players) {
      setHandPlayers(players.map(p => ({
        ...p,
        player_name: (p.players as any)?.name || 'Unknown'
      })));
    }

    // Load actions
    const { data: actions } = await supabase
      .from('poker_actions')
      .select(`
        id,
        action_type,
        amount,
        phase,
        action_order,
        created_at,
        players!inner(name)
      `)
      .eq('hand_id', handId)
      .order('action_order');

    if (actions) {
      setHandActions(actions.map(a => ({
        ...a,
        player_name: (a.players as any)?.name || 'Unknown'
      })));
    }
  };

  const handleViewHand = async (hand: HandDetail) => {
    setSelectedHand(hand);
    await loadHandDetails(hand.id);
    setShowDetails(true);
  };

  const formatCard = (card: string) => {
    if (!card || card.length < 2) return card;
    const rank = card.slice(0, -1).toUpperCase();
    const suit = card.slice(-1).toLowerCase();
    const suitEmoji = CARD_SUIT_EMOJI[suit] || suit;
    const isRed = suit === 'h' || suit === 'd';
    return (
      <span className={`font-mono ${isRed ? 'text-red-500' : ''}`}>
        {rank}{suitEmoji}
      </span>
    );
  };

  const getActionLabel = (action: string) => {
    switch (action.toLowerCase()) {
      case 'fold': return 'Фолд';
      case 'check': return 'Чек';
      case 'call': return 'Колл';
      case 'bet': return 'Бет';
      case 'raise': return 'Рейз';
      case 'allin': return 'Олл-ин';
      case 'post_sb': return 'SB';
      case 'post_bb': return 'BB';
      default: return action;
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase.toLowerCase()) {
      case 'preflop': return 'Префлоп';
      case 'flop': return 'Флоп';
      case 'turn': return 'Тёрн';
      case 'river': return 'Ривер';
      case 'showdown': return 'Шоудаун';
      default: return phase;
    }
  };

  const filteredHands = hands.filter(h =>
    h.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.hand_number.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Просмотр раздач
          </CardTitle>
          <CardDescription>
            Детальный анализ каждой раздачи
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Поиск по столу или номеру руки..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={loadHands} variant="outline">
              Обновить
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Стол</TableHead>
                    <TableHead>Фаза</TableHead>
                    <TableHead>Борд</TableHead>
                    <TableHead className="text-right">Банк</TableHead>
                    <TableHead>Время</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHands.map((hand) => (
                    <TableRow key={hand.id}>
                      <TableCell className="font-mono">{hand.hand_number}</TableCell>
                      <TableCell>{hand.table_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getPhaseLabel(hand.phase)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {hand.community_cards?.slice(0, 5).map((card, i) => (
                            <span key={i} className="px-1 py-0.5 bg-muted rounded text-sm">
                              {formatCard(card)}
                            </span>
                          ))}
                          {(!hand.community_cards || hand.community_cards.length === 0) && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{hand.pot}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(hand.created_at).toLocaleTimeString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        {hand.completed_at ? (
                          <Badge className="bg-green-500">Завершена</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                            <Clock className="h-3 w-3 mr-1" />
                            В игре
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewHand(hand)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Hand Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4">
              Рука #{selectedHand?.hand_number}
              <Badge variant="outline">{selectedHand?.table_name}</Badge>
              <Badge>{getPhaseLabel(selectedHand?.phase || '')}</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedHand && (
            <div className="space-y-6">
              {/* Board & Pot */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Общие карты</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {selectedHand.community_cards?.map((card, i) => (
                        <div key={i} className="px-3 py-2 bg-muted rounded-lg text-lg font-bold">
                          {formatCard(card)}
                        </div>
                      ))}
                      {(!selectedHand.community_cards || selectedHand.community_cards.length === 0) && (
                        <span className="text-muted-foreground">Карты не раскрыты</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Банк</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Coins className="h-8 w-8 text-yellow-500" />
                      <span className="text-3xl font-bold">{selectedHand.pot}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Players */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Игроки ({handPlayers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Место</TableHead>
                          <TableHead>Игрок</TableHead>
                          <TableHead>Карты</TableHead>
                          <TableHead>Комбинация</TableHead>
                          <TableHead className="text-right">Стек</TableHead>
                          <TableHead className="text-right">Ставка</TableHead>
                          <TableHead className="text-right">Выигрыш</TableHead>
                          <TableHead>Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {handPlayers.map((player) => (
                          <TableRow key={player.id} className={player.won_amount && player.won_amount > 0 ? 'bg-green-500/5' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {player.seat_number}
                                {player.seat_number === selectedHand.dealer_seat && (
                                  <Badge className="bg-white text-black text-xs">D</Badge>
                                )}
                                {player.seat_number === selectedHand.small_blind_seat && (
                                  <Badge variant="outline" className="text-xs">SB</Badge>
                                )}
                                {player.seat_number === selectedHand.big_blind_seat && (
                                  <Badge variant="outline" className="text-xs">BB</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{player.player_name}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {player.hole_cards?.map((card, i) => (
                                  <span key={i} className="px-1 py-0.5 bg-muted rounded">
                                    {formatCard(card)}
                                  </span>
                                ))}
                                {(!player.hole_cards || player.hole_cards.length === 0) && (
                                  <span className="text-muted-foreground">🂠🂠</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {player.hand_rank || '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {player.stack_start} → {player.stack_end || '?'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-500">
                              {player.bet_amount > 0 ? `-${player.bet_amount}` : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-500">
                              {player.won_amount && player.won_amount > 0 ? `+${player.won_amount}` : '—'}
                            </TableCell>
                            <TableCell>
                              {player.is_folded ? (
                                <Badge variant="secondary">Фолд</Badge>
                              ) : player.is_all_in ? (
                                <Badge className="bg-red-500">Олл-ин</Badge>
                              ) : (
                                <Badge variant="outline">В игре</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Actions Timeline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Действия ({handActions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {handActions.map((action, index) => (
                        <div
                          key={action.id}
                          className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                        >
                          <span className="text-muted-foreground font-mono text-sm w-8">
                            {index + 1}.
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getPhaseLabel(action.phase)}
                          </Badge>
                          <span className="font-medium">{action.player_name}</span>
                          <Badge>
                            {getActionLabel(action.action_type)}
                            {action.amount && action.amount > 0 ? ` ${action.amount}` : ''}
                          </Badge>
                        </div>
                      ))}
                      {handActions.length === 0 && (
                        <div className="text-center text-muted-foreground py-4">
                          Нет записанных действий
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
