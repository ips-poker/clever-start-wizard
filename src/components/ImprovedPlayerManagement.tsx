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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserX, Trophy, Clock, TrendingUp, TrendingDown, Shuffle, Upload, Plus, Minus, X } from 'lucide-react';
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

  const getPlayerAvatar = (playerId: string) => {
    const player = registrations.find(r => r.player.id === playerId);
    if (player?.player.avatar_url) {
      return player.player.avatar_url;
    }
    
    const avatarIndex = Math.abs(playerId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 6 + 1;
    return `/src/assets/avatars/poker-avatar-${avatarIndex}.png`;
  };

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
              elo_rating: 100
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

  const eliminatePlayer = async (registrationId: string) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const remainingActive = activePlayers.filter(r => r.id !== registrationId);
    const eliminatedChips = registration.chips;
    
    // Позиция = количество оставшихся игроков + 1 (тот кто исключается занимает следующее место)
    const position = remainingActive.length + 1;

    // Логируем начальное состояние для диагностики
    console.log('🔍 ИСКЛЮЧЕНИЕ ИГРОКА - начальные данные:', {
      eliminatedPlayer: registration.player.name,
      eliminatedChips,
      position: position,
      remainingPlayersCount: remainingActive.length,
      remainingPlayersChips: remainingActive.map(p => ({ name: p.player.name, chips: p.chips })),
      totalChipsBefore: remainingActive.reduce((sum, p) => sum + p.chips, 0) + eliminatedChips
    });

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
    } else if (eliminatedChips <= 0) {
      console.log('⚠️ ПРЕДУПРЕЖДЕНИЕ: У исключенного игрока 0 фишек, нечего распределять');
    } else if (remainingActive.length === 0) {
      console.log('⚠️ ПРЕДУПРЕЖДЕНИЕ: Нет активных игроков для распределения фишек');
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

      // Определяем финальные позиции для оставшихся игроков
      // В офлайн турнире позиции определяются исключительно по порядку исключения
      // Оставшиеся активные игроки получают места с 1-го по количество активных игроков
      // Порядок среди активных игроков определяется случайно или по желанию директора
      
      const activePlayerUpdates = activePlayers.map(async (reg, index) => {
        const finalPosition = index + 1; // 1-е, 2-е, 3-е место и т.д.
        return supabase
          .from('tournament_registrations')
          .update({ position: finalPosition })
          .eq('id', reg.id);
      });

      await Promise.all(activePlayerUpdates);

      // Получаем обновленные регистрации с позициями после обновления
      const { data: updatedRegistrations, error: regError } = await supabase
        .from('tournament_registrations')
        .select('player_id, position, rebuys, addons')
        .eq('tournament_id', tournament.id)
        .not('position', 'is', null);

      if (regError) throw regError;

      // Подготавливаем результаты для расчета ELO
      const results = updatedRegistrations.map((reg) => ({
        player_id: reg.player_id,
        position: reg.position,
        rebuys: reg.rebuys || 0,
        addons: reg.addons || 0
      }));

      console.log('🏆 ОТПРАВКА РЕЗУЛЬТАТОВ В CALCULATE-ELO:', {
        tournament_id: tournament.id,
        results: results.map(r => `Player ${r.player_id}: position ${r.position}`),
        total_players: results.length
      });

      // Вызываем функцию расчета ELO
      const { error: eloError } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: tournament.id,
          results: results
        }
      });

      if (eloError) {
        console.error('Ошибка расчета RPS:', eloError);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Single Player Registration */}
            <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
                <CardTitle className="flex items-center gap-3 text-slate-800 font-light text-xl">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  Регистрация игрока
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="player" className="text-slate-600 font-light text-sm">Игрок</Label>
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl h-11 font-light">
                      <SelectValue placeholder="Выберите игрока" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers.map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} (RPS: {player.elo_rating})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seat" className="text-slate-600 font-light text-sm">Место (опционально)</Label>
                  <Input
                    id="seat"
                    type="number"
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                    placeholder="Номер места"
                    min="1"
                    className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl h-11 font-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chips" className="text-slate-600 font-light text-sm">Стартовые фишки</Label>
                  <Input
                    id="chips"
                    type="number"
                    value={startingChips}
                    onChange={(e) => setStartingChips(Number(e.target.value))}
                    min="1"
                    className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl h-11 font-light"
                  />
                </div>
                <Button 
                  onClick={registerPlayer}
                  disabled={!selectedPlayerId || registrations.length >= tournament.max_players}
                  className="w-full h-11 bg-slate-600 hover:bg-slate-700 text-white font-light rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Зарегистрировать игрока
                </Button>
              </CardContent>
            </Card>

            {/* Bulk Registration */}
            <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
                <CardTitle className="flex items-center gap-3 text-slate-800 font-light text-xl">
                  <div className="p-2 bg-green-500/10 rounded-xl">
                    <Upload className="w-5 h-5 text-green-600" />
                  </div>
                  Массовая регистрация
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="bulk-players" className="text-slate-600 font-light text-sm">Список игроков (по одному в строке)</Label>
                  <Textarea
                    id="bulk-players"
                    value={bulkPlayersList}
                    onChange={(e) => setBulkPlayersList(e.target.value)}
                    placeholder="Иван Петров&#10;Анна Сидорова&#10;Михаил Иванов"
                    rows={6}
                    className="border-slate-200 focus:border-green-400 focus:ring-green-400/20 rounded-xl font-light resize-none"
                  />
                </div>
                <Button 
                  onClick={bulkRegisterPlayers}
                  disabled={!bulkPlayersList.trim()}
                  className="w-full h-11 bg-slate-600 hover:bg-slate-700 text-white font-light rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Зарегистрировать всех
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Расширенная статистика турнира */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Статистика регистрации */}
            <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 border-b border-purple-100">
                <CardTitle className="flex items-center gap-3 text-slate-800 font-light text-xl">
                  <div className="p-2 bg-purple-500/10 rounded-xl">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  Статистика игроков
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-slate-50/50 rounded-xl">
                    <div className="text-2xl font-light text-slate-800">{registrations.length}</div>
                    <div className="text-sm text-slate-500 font-light">Всего</div>
                  </div>
                  <div className="p-4 bg-green-50/50 rounded-xl">
                    <div className="text-2xl font-light text-green-600">{activePlayers.length}</div>
                    <div className="text-sm text-slate-500 font-light">Активных</div>
                  </div>
                  <div className="p-4 bg-blue-50/50 rounded-xl">
                    <div className="text-2xl font-light text-blue-600">{tournament.max_players - registrations.length}</div>
                    <div className="text-sm text-slate-500 font-light">Свободных мест</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Статистика ребаев и аддонов */}
            <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100/50 border-b border-amber-100">
                <CardTitle className="flex items-center gap-3 text-slate-800 font-light text-xl">
                  <div className="p-2 bg-amber-500/10 rounded-xl">
                    <Plus className="w-5 h-5 text-amber-600" />
                  </div>
                  Ребаи и аддоны
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-green-50/50 rounded-xl">
                    <div className="text-2xl font-light text-green-600">
                      {registrations.reduce((sum, reg) => sum + reg.rebuys, 0)}
                    </div>
                    <div className="text-sm text-slate-500 font-light">Ребаев</div>
                  </div>
                  <div className="p-4 bg-blue-50/50 rounded-xl">
                    <div className="text-2xl font-light text-blue-600">
                      {registrations.reduce((sum, reg) => sum + reg.addons, 0)}
                    </div>
                    <div className="text-sm text-slate-500 font-light">Аддонов</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Финансовая статистика */}
            <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-b border-emerald-100">
                <CardTitle className="flex items-center gap-3 text-slate-800 font-light text-xl">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  Призовой фонд
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl">
                    <span className="text-sm text-slate-600 font-light">Основные взносы</span>
                    <span className="text-lg font-light text-slate-800">
                      {(tournament.buy_in * registrations.length).toLocaleString()} ₽
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-xl">
                    <span className="text-sm text-slate-600 font-light">Ребаи</span>
                    <span className="text-lg font-light text-green-600">
                      {(tournament.rebuy_cost * registrations.reduce((sum, reg) => sum + reg.rebuys, 0)).toLocaleString()} ₽
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-xl">
                    <span className="text-sm text-slate-600 font-light">Аддоны</span>
                    <span className="text-lg font-light text-blue-600">
                      {(tournament.addon_cost * registrations.reduce((sum, reg) => sum + reg.addons, 0)).toLocaleString()} ₽
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-xl">
                      <span className="text-base text-slate-800 font-medium">Общий призовой фонд</span>
                      <span className="text-xl font-light text-emerald-600">
                        {(
                          tournament.buy_in * registrations.length +
                          tournament.rebuy_cost * registrations.reduce((sum, reg) => sum + reg.rebuys, 0) +
                          tournament.addon_cost * registrations.reduce((sum, reg) => sum + reg.addons, 0)
                        ).toLocaleString()} ₽
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Статистика фишек */}
            <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b border-indigo-100">
                <CardTitle className="flex items-center gap-3 text-slate-800 font-light text-xl">
                  <div className="p-2 bg-indigo-500/10 rounded-xl">
                    <Trophy className="w-5 h-5 text-indigo-600" />
                  </div>
                  Статистика фишек
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl">
                    <span className="text-sm text-slate-600 font-light">Всего фишек в игре</span>
                    <span className="text-lg font-light text-slate-800">
                      {activePlayers.reduce((sum, player) => sum + player.chips, 0).toLocaleString()}
                    </span>
                  </div>
                  {activePlayers.length > 0 && (
                    <div className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-xl">
                      <span className="text-sm text-slate-600 font-light">Средний стек</span>
                      <span className="text-lg font-light text-indigo-600">
                        {Math.round(activePlayers.reduce((sum, player) => sum + player.chips, 0) / activePlayers.length).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-xl">
                    <span className="text-sm text-slate-600 font-light">Стартовые фишки</span>
                    <span className="text-lg font-light text-green-600">
                      {tournament.starting_chips.toLocaleString()}
                    </span>
                  </div>
                  {activePlayers.length > 0 && (
                    <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-xl">
                      <span className="text-sm text-slate-600 font-light">Лидер по фишкам</span>
                      <span className="text-lg font-light text-blue-600">
                        {Math.max(...activePlayers.map(p => p.chips)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <div className="space-y-6">
            <div>
              <div className="text-slate-500 text-xs font-light mb-1 tracking-wide uppercase">Активные участники</div>
              <div className="text-lg font-light text-slate-900">{activePlayers.length} игроков в турнире</div>
            </div>
            
            <div className="w-full h-px bg-slate-200 mb-6"></div>
            
            {activePlayers.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-light">Нет активных игроков</p>
                <p className="text-sm font-light">Зарегистрируйте участников в турнире</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activePlayers.map((registration) => (
                  <div
                    key={registration.id}
                    className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={getPlayerAvatar(registration.player.id)} alt={registration.player.name} />
                          <AvatarFallback className="bg-slate-200 text-slate-700 font-light">
                            {registration.player.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-lg font-light text-slate-900">{registration.player.name}</h4>
                          <div className="flex items-center gap-3 text-sm text-slate-500 font-light">
                            <span>Место {registration.seat_number || '—'}</span>
                            <span>•</span>
                            <span>RPS {registration.player.elo_rating}</span>
                            <span>•</span>
                            <span>{registration.chips.toLocaleString()} фишек</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-slate-500 font-light">Ребаи + Аддоны</div>
                          <div className="text-lg font-light text-slate-800">{registration.rebuys + registration.addons}</div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRebuys(registration.id, 1)}
                            className="h-8 w-8 p-0 border-green-200 text-green-600 hover:bg-green-50"
                            title="Добавить ребай"
                          >
                            <span className="text-xs font-medium">R</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRebuys(registration.id, -1)}
                            disabled={registration.rebuys === 0}
                            className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                            title="Убрать ребай"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          {tournament.current_level === tournament.addon_level && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAddons(registration.id, 1)}
                                className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                                title="Добавить аддон"
                              >
                                <span className="text-xs font-medium">A</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAddons(registration.id, -1)}
                                disabled={registration.addons === 0}
                                className="h-8 w-8 p-0 border-orange-200 text-orange-600 hover:bg-orange-50"
                                title="Убрать аддон"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => eliminatePlayer(registration.id)}
                            className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                            title="Исключить игрока"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="eliminated" className="space-y-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-light text-slate-900">Выбывшие игроки</h3>
                <p className="text-slate-500 font-light">Порядок выбывания и призовые места</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-light text-slate-600">{eliminatedPlayers.length}</div>
                <div className="text-sm text-slate-500 font-light">выбыло</div>
              </div>
            </div>
            
            <div className="w-full h-px bg-slate-200 mb-6"></div>
            
            {eliminatedPlayers.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-light">Никто еще не выбыл</p>
                <p className="text-sm font-light">Все игроки все еще в игре</p>
              </div>
            ) : (
              <div className="space-y-3">
                {eliminatedPlayers.map((registration) => (
                  <div
                    key={registration.id}
                    className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={getPlayerAvatar(registration.player.id)} alt={registration.player.name} />
                            <AvatarFallback className="bg-slate-200 text-slate-700 font-light">
                              {registration.player.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white shadow-sm ${
                            (registration.position || 0) <= 3 
                              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' 
                              : 'bg-gradient-to-br from-slate-400 to-slate-600'
                          }`}>
                            {registration.position}
                          </div>
                          {(registration.position || 0) <= 3 && (
                            <div className="absolute -top-2 -left-2">
                              <Trophy className="w-5 h-5 text-yellow-500 drop-shadow-sm" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-lg font-light text-slate-900">{registration.player.name}</h4>
                          <div className="flex items-center gap-3 text-sm text-slate-500 font-light">
                            <span>RPS {registration.player.elo_rating}</span>
                            <span>•</span>
                            <span>Ребаи {registration.rebuys}</span>
                            <span>•</span>
                            <span>Аддоны {registration.addons}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-light text-slate-800">{registration.position} место</div>
                        <div className="text-sm text-slate-500 font-light">
                          {(registration.position || 0) <= 3 ? (
                            <span className="text-yellow-600">Призовое место</span>
                          ) : (
                            'Выбыл'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="seating">
          <TableSeating 
            tournamentId={tournament.id}
            registrations={registrations}
            onSeatingUpdate={onRegistrationUpdate}
          />
        </TabsContent>

        <TabsContent value="finish" className="space-y-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-light text-slate-900">Завершение турнира</h3>
                <p className="text-slate-500 font-light">Автоматический расчет RPS рейтингов и призовых мест</p>
              </div>
            </div>
            
            <div className="w-full h-px bg-slate-200 mb-6"></div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 text-center">
                <div className="text-3xl font-light text-green-600 mb-1">{activePlayers.length}</div>
                <div className="text-sm text-slate-500 font-light">Активных игроков</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 text-center">
                <div className="text-3xl font-light text-slate-600 mb-1">{eliminatedPlayers.length}</div>
                <div className="text-sm text-slate-500 font-light">Выбывших игроков</div>
              </div>
            </div>
            
            <AlertDialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  className={`w-full h-12 text-base font-light ${
                    activePlayers.length <= 1 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
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
                    Это действие нельзя отменить. Активные игроки получат места по порядку исключения, 
                    будут рассчитаны рейтинги RPS и турнир будет закрыт.
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
              <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-2xl p-6 text-center">
                <p className="text-amber-700 font-light">
                  Рекомендуется завершать турнир когда остается 1 игрок
                </p>
              </div>
            )}
          </div>
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
                  eliminatePlayer(selectedRegistration.id);
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