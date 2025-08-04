import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserX, Trophy, Clock, TrendingUp, TrendingDown, Shuffle } from 'lucide-react';
import TableSeating from './TableSeating';

interface Tournament {
  id: string;
  name: string;
  buy_in: number;
  starting_chips: number;
  rebuy_chips: number;
  addon_chips: number;
  rebuy_cost: number;
  addon_cost: number;
  max_players: number;
  current_level: number;
  rebuy_end_level?: number;
  addon_level?: number;
}

interface Player {
  id: string;
  name: string;
  email?: string;
  elo_rating: number;
  avatar_url?: string;
}

interface Registration {
  id: string;
  player: Player;
  chips: number;
  rebuys: number;
  addons: number;
  status: string;
  position?: number;
  seat_number?: number;
}

interface ImprovedPlayerManagementProps {
  tournament: Tournament;
  players: Player[];
  registrations: Registration[];
  onRegistrationUpdate: () => void;
}

const ImprovedPlayerManagement = ({ tournament, players, registrations, onRegistrationUpdate }: ImprovedPlayerManagementProps) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [startingChips, setStartingChips] = useState(tournament.starting_chips);
  const [seatNumber, setSeatNumber] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [isEliminateDialogOpen, setIsEliminateDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [bulkPlayersList, setBulkPlayersList] = useState('');
  const [eliminationOrder, setEliminationOrder] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setStartingChips(tournament.starting_chips);
  }, [tournament]);

  const availablePlayers = players.filter(p => 
    !registrations.find(r => r.player.id === p.id)
  );

  const activePlayers = registrations.filter(r => 
    r.status === 'registered' || r.status === 'playing'
  );

  const eliminatedPlayers = registrations
    .filter(r => r.status === 'eliminated')
    .sort((a, b) => (b.position || 0) - (a.position || 0));

  const registerPlayer = async () => {
    if (!selectedPlayerId) {
      toast({ title: "Ошибка", description: "Выберите игрока", variant: "destructive" });
      return;
    }

    if (registrations.length >= tournament.max_players) {
      toast({ title: "Ошибка", description: "Достигнуто максимальное количество игроков", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('tournament_registrations')
      .insert([{
        tournament_id: tournament.id,
        player_id: selectedPlayerId,
        chips: startingChips,
        seat_number: seatNumber ? parseInt(seatNumber) : null,
        status: 'registered'
      }]);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось зарегистрировать игрока", variant: "destructive" });
    } else {
      toast({ title: "Игрок зарегистрирован" });
      setSelectedPlayerId('');
      setSeatNumber('');
      setIsDialogOpen(false);
      onRegistrationUpdate();
    }
  };

  const bulkRegisterPlayers = async () => {
    const playerNames = bulkPlayersList
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (playerNames.length === 0) {
      toast({ title: "Ошибка", description: "Введите имена игроков", variant: "destructive" });
      return;
    }

    let registered = 0;
    let failed = 0;

    for (const name of playerNames) {
      try {
        const { data: existingPlayer, error: playerSearchError } = await supabase
          .from('players')
          .select('*')
          .eq('name', name)
          .single();

        let playerId;

        if (playerSearchError && playerSearchError.code === 'PGRST116') {
          const { data: newPlayer, error: createError } = await supabase
            .from('players')
            .insert([{
              name: name,
              email: `${name.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
              elo_rating: 1200
            }])
            .select()
            .single();

          if (createError) {
            failed++;
            continue;
          }
          playerId = newPlayer.id;
        } else if (existingPlayer) {
          const existingRegistration = registrations.find(reg => reg.player.id === existingPlayer.id);
          if (existingRegistration) {
            failed++;
            continue;
          }
          playerId = existingPlayer.id;
        } else {
          failed++;
          continue;
        }

        if (registrations.length + registered >= tournament.max_players) {
          break;
        }

        const { error: registrationError } = await supabase
          .from('tournament_registrations')
          .insert([{
            tournament_id: tournament.id,
            player_id: playerId,
            chips: startingChips,
            status: 'registered'
          }]);

        if (!registrationError) {
          registered++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    toast({ 
      title: "Массовая регистрация завершена", 
      description: `Зарегистрировано: ${registered}, Ошибок: ${failed}` 
    });
    setBulkPlayersList("");
    onRegistrationUpdate();
  };

  const updateRebuys = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const newRebuys = Math.max(0, registration.rebuys + change);
    const chipsChange = change > 0 ? tournament.rebuy_chips : -tournament.rebuy_chips;
    const newChips = Math.max(0, registration.chips + chipsChange);

    const { error } = await supabase
      .from('tournament_registrations')
      .update({ 
        rebuys: newRebuys,
        chips: newChips
      })
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить ребаи", variant: "destructive" });
    } else {
      toast({ 
        title: change > 0 ? "Ребай добавлен" : "Ребай удален", 
        description: `Фишки: ${change > 0 ? '+' : ''}${chipsChange.toLocaleString()}` 
      });
      onRegistrationUpdate();
    }
  };

  const updateAddons = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const newAddons = Math.max(0, registration.addons + change);
    const chipsChange = change > 0 ? tournament.addon_chips : -tournament.addon_chips;
    const newChips = Math.max(0, registration.chips + chipsChange);

    const { error } = await supabase
      .from('tournament_registrations')
      .update({ 
        addons: newAddons,
        chips: newChips
      })
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить аддоны", variant: "destructive" });
    } else {
      toast({ 
        title: change > 0 ? "Аддон добавлен" : "Аддон удален", 
        description: `Фишки: ${change > 0 ? '+' : ''}${chipsChange.toLocaleString()}` 
      });
      onRegistrationUpdate();
    }
  };

  const redistributeChips = async (eliminatedChips: number, remainingPlayers: Registration[]) => {
    if (remainingPlayers.length === 0 || eliminatedChips <= 0) return;

    // ВСЕГДА равное распределение фишек для правильного подсчета среднего стека
    const chipsPerPlayer = Math.floor(eliminatedChips / remainingPlayers.length);
    const remainderChips = eliminatedChips % remainingPlayers.length;

    // Создаем обновления для каждого игрока
    const updates = remainingPlayers.map((player, index) => ({
      id: player.id,
      chips: player.chips + chipsPerPlayer + (index < remainderChips ? 1 : 0),
      additionalChips: chipsPerPlayer + (index < remainderChips ? 1 : 0)
    }));

    // Обновляем фишки в базе данных
    const updatePromises = updates.map(update => 
      supabase
        .from('tournament_registrations')
        .update({ chips: update.chips })
        .eq('id', update.id)
    );

    const results = await Promise.all(updatePromises);
    const hasError = results.some(result => result.error);

    if (hasError) {
      toast({
        title: "Ошибка",
        description: "Не удалось перераспределить все фишки",
        variant: "destructive"
      });
      return;
    }

    // Проверяем правильность распределения
    const totalDistributed = updates.reduce((sum, u) => sum + u.additionalChips, 0);
    
    toast({
      title: "Фишки перераспределены равномерно",
      description: `${eliminatedChips.toLocaleString()} фишек распределено поровну между ${remainingPlayers.length} игроками (по ${chipsPerPlayer.toLocaleString()}${remainderChips > 0 ? '+1 некоторым' : ''})`
    });

    console.log('Перераспределение фишек:', {
      eliminatedChips,
      playersCount: remainingPlayers.length,
      chipsPerPlayer,
      remainderChips,
      totalDistributed,
      updates: updates.map(u => ({ playerId: u.id, added: u.additionalChips, newTotal: u.chips }))
    });
  };

  const eliminatePlayer = async (registrationId: string, position: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const remainingActive = activePlayers.filter(r => r.id !== registrationId);
    const eliminatedChips = registration.chips;

    // Исключаем игрока
    const { error } = await supabase
      .from('tournament_registrations')
      .update({ 
        status: 'eliminated',
        position: position,
        chips: 0 // Обнуляем фишки у выбывшего игрока
      })
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось исключить игрока", variant: "destructive" });
      return;
    }

    // Перераспределяем фишки
    if (eliminatedChips > 0 && remainingActive.length > 0) {
      await redistributeChips(eliminatedChips, remainingActive);
    }

    toast({ 
      title: "Игрок исключен", 
      description: `${registration.player.name} - место ${position}` 
    });
    onRegistrationUpdate();
    
    if (remainingActive.length <= 1) {
      toast({ 
        title: "Турнир готов к завершению", 
        description: "Остался один игрок или меньше" 
      });
    }
  };

  const finishTournament = async () => {
    try {
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ 
          status: 'finished',
          finished_at: new Date().toISOString()
        })
        .eq('id', tournament.id);

      if (tournamentError) throw tournamentError;

      // Присваиваем первое место всем активным игрокам
      const activePlayerUpdates = activePlayers.map(async (reg) => {
        return supabase
          .from('tournament_registrations')
          .update({ position: 1 })
          .eq('id', reg.id);
      });

      await Promise.all(activePlayerUpdates);

      // Подготавливаем результаты для расчета ELO
      const results = registrations.map((reg) => ({
        player_id: reg.player.id,
        position: reg.position || 1,
        rebuys: reg.rebuys || 0,
        addons: reg.addons || 0
      }));

      // Вызываем функцию расчета ELO
      const { error: eloError } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: tournament.id,
          results: results
        }
      });

      if (eloError) {
        console.error('Ошибка расчета ELO:', eloError);
        toast({ 
          title: "Предупреждение", 
          description: "Турнир завершен, но возникла ошибка при расчете рейтингов",
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Турнир завершен", 
          description: "Рейтинги обновлены, призовые места определены"
        });
      }

      setIsFinishDialogOpen(false);
      onRegistrationUpdate();

    } catch (error) {
      console.error('Error finishing tournament:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось завершить турнир", 
        variant: "destructive" 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      registered: "default",
      playing: "destructive", 
      eliminated: "secondary"
    } as const;

    const labels = {
      registered: "Зарегистрирован",
      playing: "Играет",
      eliminated: "Выбыл"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="registration" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="registration">Регистрация</TabsTrigger>
          <TabsTrigger value="active">Активные</TabsTrigger>
          <TabsTrigger value="eliminated">Выбывшие</TabsTrigger>
          <TabsTrigger value="seating">Рассадка</TabsTrigger>
          <TabsTrigger value="finish">Завершение</TabsTrigger>
        </TabsList>

        <TabsContent value="registration" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Single Player Registration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Регистрация игрока
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="player">Игрок</Label>
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите игрока" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers.map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} (ELO: {player.elo_rating})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="seat">Место (опционально)</Label>
                  <Input
                    id="seat"
                    type="number"
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                    placeholder="Номер места"
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="chips">Стартовые фишки</Label>
                  <Input
                    id="chips"
                    type="number"
                    value={startingChips}
                    onChange={(e) => setStartingChips(Number(e.target.value))}
                    min="1"
                  />
                </div>
                <Button 
                  onClick={registerPlayer}
                  disabled={!selectedPlayerId || registrations.length >= tournament.max_players}
                  className="w-full"
                >
                  Зарегистрировать игрока
                </Button>
              </CardContent>
            </Card>

            {/* Bulk Registration */}
            <Card>
              <CardHeader>
                <CardTitle>Массовая регистрация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bulk-players">Список игроков (по одному в строке)</Label>
                  <Textarea
                    id="bulk-players"
                    value={bulkPlayersList}
                    onChange={(e) => setBulkPlayersList(e.target.value)}
                    placeholder="Иван Петров&#10;Анна Сидорова&#10;Михаил Иванов"
                    rows={6}
                  />
                </div>
                <Button 
                  onClick={bulkRegisterPlayers}
                  disabled={!bulkPlayersList.trim()}
                  className="w-full"
                >
                  Зарегистрировать всех
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Статистика регистрации</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{registrations.length}</div>
                  <div className="text-sm text-muted-foreground">Всего</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{activePlayers.length}</div>
                  <div className="text-sm text-muted-foreground">Активных</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-500">{tournament.max_players - registrations.length}</div>
                  <div className="text-sm text-muted-foreground">Свободных мест</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Активные игроки ({activePlayers.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activePlayers.map(registration => (
                  <div key={registration.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{registration.player.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Место: {registration.seat_number || 'Не назначено'} | 
                          ELO: {registration.player.elo_rating}
                        </div>
                      </div>
                      {getStatusBadge(registration.status)}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">{registration.chips.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">фишек</div>
                      </div>
                      
                      {/* Rebuys */}
                      {tournament.current_level <= (tournament.rebuy_end_level || 6) && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRebuys(registration.id, -1)}
                            disabled={registration.rebuys <= 0}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center text-sm">{registration.rebuys}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRebuys(registration.id, 1)}
                          >
                            +
                          </Button>
                          <span className="text-xs text-muted-foreground ml-1">R</span>
                        </div>
                      )}
                      
                      {/* Addons */}
                      {tournament.current_level >= (tournament.addon_level || 7) && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAddons(registration.id, -1)}
                            disabled={registration.addons <= 0}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center text-sm">{registration.addons}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAddons(registration.id, 1)}
                          >
                            +
                          </Button>
                          <span className="text-xs text-muted-foreground ml-1">A</span>
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedRegistration(registration);
                          setIsEliminateDialogOpen(true);
                        }}
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eliminated" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Выбывшие игроки ({eliminatedPlayers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {eliminatedPlayers.map(registration => (
                  <div key={registration.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[60px]">
                        <div className="text-lg font-bold">#{registration.position}</div>
                        {(registration.position || 0) <= 3 && (
                          <Trophy className="w-4 h-4 mx-auto text-yellow-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{registration.player.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ELO: {registration.player.elo_rating} | 
                          Ребаи: {registration.rebuys} | 
                          Аддоны: {registration.addons}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(registration.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seating">
          <TableSeating 
            tournamentId={tournament.id}
            registrations={registrations}
            onSeatingUpdate={onRegistrationUpdate}
          />
        </TabsContent>

        <TabsContent value="finish" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Завершение турнира
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{activePlayers.length}</div>
                  <div className="text-sm text-muted-foreground">Активных игроков</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{eliminatedPlayers.length}</div>
                  <div className="text-sm text-muted-foreground">Выбывших игроков</div>
                </div>
              </div>
              
              <AlertDialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full"
                    variant={activePlayers.length <= 1 ? "default" : "destructive"}
                    disabled={activePlayers.length > 3}
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Завершить турнир
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Завершить турнир?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие нельзя отменить. Все активные игроки получат 1-е место, 
                      будут рассчитаны рейтинги ELO и турнир будет закрыт.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={finishTournament}>
                      Завершить турнир
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              {activePlayers.length > 1 && (
                <p className="text-sm text-muted-foreground text-center">
                  Рекомендуется завершать турнир когда остается 1 игрок
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Elimination Dialog */}
      <AlertDialog open={isEliminateDialogOpen} onOpenChange={setIsEliminateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Исключить игрока</AlertDialogTitle>
            <AlertDialogDescription>
              Исключить {selectedRegistration?.player.name} из турнира? 
              {selectedRegistration?.chips && selectedRegistration.chips > 0 && (
                <div className="mt-2 p-2 bg-blue-50 rounded border">
                  <strong>Информация:</strong> {selectedRegistration.chips.toLocaleString()} фишек будут 
                  распределены <strong>поровну</strong> между всеми оставшимися игроками для корректного подсчета среднего стека.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (selectedRegistration) {
                  eliminatePlayer(selectedRegistration.id, activePlayers.length);
                  setIsEliminateDialogOpen(false);
                  setSelectedRegistration(null);
                }
              }}
            >
              Исключить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ImprovedPlayerManagement;