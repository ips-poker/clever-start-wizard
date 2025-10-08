import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TableSeating from "@/components/TableSeating";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  UserPlus, 
  Trash2, 
  Trophy, 
  Plus, 
  Minus, 
  RotateCcw, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Upload,
  X
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  status: string;
  max_players: number;
  buy_in: number;
  rebuy_cost: number;
  addon_cost: number;
  rebuy_chips: number;
  addon_chips: number;
  starting_chips: number;
  tournament_format: string;
  current_level: number;
  addon_level: number;
  participation_fee?: number;
  reentry_fee?: number;
  additional_fee?: number;
  reentry_chips?: number;
  additional_chips?: number;
}

interface Player {
  id: string;
  name: string;
  email: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
}

interface Registration {
  id: string;
  player: Player;
  seat_number: number;
  chips: number;
  status: string;
  reentries: number;
  additional_sets: number;
  position?: number;
  rebuys?: number;
  addons?: number;
}

interface PlayerManagementProps {
  tournament: Tournament;
  players: Player[];
  registrations: Registration[];
  onRegistrationUpdate: () => void;
}

const PlayerManagement = ({ tournament, players, registrations, onRegistrationUpdate }: PlayerManagementProps) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [playerTelegram, setPlayerTelegram] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [startingChips, setStartingChips] = useState(tournament.starting_chips || 10000);
  const [bulkPlayersList, setBulkPlayersList] = useState("");
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [eliminationOrder, setEliminationOrder] = useState<{[key: string]: number}>({});
  const { toast } = useToast();
  const isMountedRef = useRef(true);

  // Голосовые объявления
  const voiceAnnouncements = useVoiceAnnouncements({ enabled: true });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Set starting chips from tournament
    setStartingChips(tournament.starting_chips || 10000);
  }, [tournament.starting_chips]);

  useEffect(() => {
    // Initialize elimination order for eliminated players
    const eliminated = registrations.filter(r => r.status === 'eliminated');
    const order = {};
    eliminated.forEach((reg, index) => {
      if (reg.position) {
        order[reg.id] = reg.position;
      }
    });
    setEliminationOrder(order);
  }, [registrations]);

  const getPlayerAvatar = (playerId: string) => {
    const player = registrations.find(r => r.player.id === playerId);
    if (player?.player.avatar_url) {
      return player.player.avatar_url;
    }
    
    const avatarIndex = Math.abs(playerId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 6 + 1;
    return `/src/assets/avatars/poker-avatar-${avatarIndex}.png`;
  };

  const registerPlayer = async () => {
    if (!playerName.trim()) {
      toast({ title: "Ошибка", description: "Введите имя игрока", variant: "destructive" });
      return;
    }

    if (registrations.length >= tournament.max_players) {
      toast({ title: "Ошибка", description: "Достигнуто максимальное количество игроков", variant: "destructive" });
      return;
    }

    try {
      // Проверяем, есть ли игрок с таким именем
      let { data: existingPlayer, error: playerSearchError } = await supabase
        .from('players')
        .select('*')
        .eq('name', playerName.trim())
        .single();

      let playerId;

      if (playerSearchError && playerSearchError.code === 'PGRST116') {
        // Игрок не найден, создаем нового
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert([{
            name: playerName.trim(),
            email: `${playerName.trim().toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
            phone: playerPhone.trim() || null,
            telegram: playerTelegram.trim() || null,
            elo_rating: 100
          }])
          .select()
          .single();

        if (createError) {
          toast({ title: "Ошибка", description: "Не удалось создать игрока", variant: "destructive" });
          return;
        }
        playerId = newPlayer.id;
      } else if (existingPlayer) {
        // Проверяем, не зарегистрирован ли уже игрок
        const existingRegistration = registrations.find(reg => reg.player.id === existingPlayer.id);
        if (existingRegistration) {
          toast({ title: "Ошибка", description: "Игрок уже зарегистрирован", variant: "destructive" });
          return;
        }
        playerId = existingPlayer.id;
      } else {
        toast({ title: "Ошибка", description: "Ошибка при поиске игрока", variant: "destructive" });
        return;
      }

      // Регистрируем игрока на турнир
      const { error: registrationError } = await supabase
        .from('tournament_registrations')
        .insert([{
          tournament_id: tournament.id,
          player_id: playerId,
          seat_number: seatNumber ? parseInt(seatNumber) : null,
          chips: startingChips,
          status: 'registered'
        }]);

      if (registrationError) {
        toast({ title: "Ошибка", description: "Не удалось зарегистрировать игрока", variant: "destructive" });
      } else {
        toast({ title: "Успех", description: "Игрок зарегистрирован на турнир" });
        setPlayerName("");
        setPlayerPhone("");
        setPlayerTelegram("");
        setSeatNumber("");
        onRegistrationUpdate();
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Произошла ошибка при регистрации", variant: "destructive" });
    }
  };

  const bulkRegisterPlayers = async () => {
    if (!bulkPlayersList.trim()) {
      toast({ title: "Ошибка", description: "Введите список игроков", variant: "destructive" });
      return;
    }

    const playerNames = bulkPlayersList.trim().split('\n').filter(name => name.trim());
    let registered = 0;
    let failed = 0;

    for (const playerNameInput of playerNames) {
      const name = playerNameInput.trim();
      
      if (!name) continue;

      try {
        // Проверяем, есть ли игрок с таким именем
        let { data: existingPlayer, error: playerSearchError } = await supabase
          .from('players')
          .select('*')
          .eq('name', name)
          .single();

        let playerId;

        if (playerSearchError && playerSearchError.code === 'PGRST116') {
          // Игрок не найден, создаем нового
          const { data: newPlayer, error: createError } = await supabase
            .from('players')
            .insert([{
              name: name,
              email: `${name.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
              phone: null, // При массовой регистрации контакты не заполняем
              telegram: null,
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
          // Проверяем, не зарегистрирован ли уже игрок
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

        // Регистрируем игрока на турнир
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

  const redistributeChips = async (eliminatedChips: number, remainingPlayerIds: string[]) => {
    if (remainingPlayerIds.length === 0 || eliminatedChips <= 0) return;

    // Получаем актуальные данные о фишках из БД
    const { data: freshPlayers, error: fetchError } = await supabase
      .from('tournament_registrations')
      .select('id, chips')
      .in('id', remainingPlayerIds);

    if (fetchError || !freshPlayers) {
      console.error('Ошибка получения данных игроков:', fetchError);
      return;
    }

    // Равномерное распределение фишек для правильного подсчета среднего стека
    const chipsPerPlayer = Math.floor(eliminatedChips / freshPlayers.length);
    const remainderChips = eliminatedChips % freshPlayers.length;

    console.log('🔄 Распределение фишек:', {
      eliminatedChips,
      playersCount: freshPlayers.length,
      chipsPerPlayer,
      remainderChips
    });

    // Обновляем фишки каждого игрока
    const updatePromises = freshPlayers.map((player, index) => {
      const additionalChips = chipsPerPlayer + (index < remainderChips ? 1 : 0);
      const newChips = player.chips + additionalChips;
      
      console.log(`  Игрок ${player.id}: ${player.chips} + ${additionalChips} = ${newChips}`);
      
      return supabase
        .from('tournament_registrations')
        .update({ chips: newChips })
        .eq('id', player.id);
    });

    const results = await Promise.all(updatePromises);
    const hasError = results.some(result => result.error);

    if (hasError) {
      console.error('Ошибки при обновлении фишек:', results.filter(r => r.error));
    } else {
      console.log('✅ Фишки распределены равномерно между игроками');
    }
  };

  const updateRebuys = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    // Используем новые поля с fallback на старые
    const reentryChips = tournament.reentry_chips || tournament.rebuy_chips || 0;
    
    // Определяем какое поле использовать
    const useNewFields = tournament.participation_fee !== undefined;
    const currentCount = useNewFields ? (registration.reentries || 0) : (registration.rebuys || 0);
    const newCount = Math.max(0, currentCount + change);
    const newChips = registration.chips + (change > 0 ? reentryChips : -reentryChips);

    const updateData = useNewFields 
      ? { reentries: newCount, chips: Math.max(0, newChips) }
      : { rebuys: newCount, chips: Math.max(0, newChips) };

    const { error } = await supabase
      .from('tournament_registrations')
      .update(updateData)
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить ребаи", variant: "destructive" });
    } else {
      toast({ 
        title: change > 0 ? "Ребай добавлен" : "Ребай удален", 
        description: `Игрок получил ${change > 0 ? '+' : ''}${change > 0 ? reentryChips : -reentryChips} фишек` 
      });
      onRegistrationUpdate();
    }
  };

  const updateAddons = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    // Используем новые поля с fallback на старые
    const additionalChips = tournament.additional_chips || tournament.addon_chips || 0;
    
    // Определяем какое поле использовать
    const useNewFields = tournament.participation_fee !== undefined;
    const currentCount = useNewFields ? (registration.additional_sets || 0) : (registration.addons || 0);
    const newCount = Math.max(0, currentCount + change);
    const newChips = registration.chips + (change > 0 ? additionalChips : -additionalChips);

    const updateData = useNewFields 
      ? { additional_sets: newCount, chips: Math.max(0, newChips) }
      : { addons: newCount, chips: Math.max(0, newChips) };

    const { error } = await supabase
      .from('tournament_registrations')
      .update(updateData)
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить аддоны", variant: "destructive" });
    } else {
      toast({ 
        title: change > 0 ? "Аддон добавлен" : "Аддон удален", 
        description: `Игрок получил ${change > 0 ? '+' : ''}${change > 0 ? additionalChips : -additionalChips} фишек` 
      });
      onRegistrationUpdate();
    }
  };

  const eliminatePlayer = async (registrationId: string, position: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    console.log('🎯 Исключение игрока:', {
      name: registration.player.name,
      playerId: registration.player.id
    });

    // Используем RPC функцию для корректного удаления с перераспределением фишек и очисткой seat_number
    const { error } = await supabase.rpc('redistribute_chips_on_elimination', {
      eliminated_player_id: registration.player.id,
      tournament_id_param: tournament.id
    });

    if (error) {
      console.error('Ошибка исключения игрока:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось исключить игрока", 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "Игрок исключен", 
        description: `${registration.player.name} выбыл из турнира` 
      });
      
      // Голосовое объявление об исключении игрока
      await voiceAnnouncements.announcePlayerElimination(registration.player.name, position);
      
      // Проверяем необходимость балансировки столов с задержкой 15 секунд
      const remainingPlayers = registrations.filter(r => r.status !== 'eliminated' && r.id !== registrationId);
      if (remainingPlayers.length > 1) {
        setTimeout(async () => {
          await announceTableBalancing(remainingPlayers);
        }, 15000);
      }
      
      onRegistrationUpdate();
      
      // Check if tournament should finish
      const activePlayers = registrations.filter(r => r.status !== 'eliminated').length;
      if (activePlayers <= 1) {
        toast({ title: "Турнир готов к завершению", description: "Остался один игрок" });
        await voiceAnnouncements.playAnnouncement('Внимание! Остался последний игрок. Турнир готов к завершению!');
      }
    }
  };

  // Функция для объявления балансировки столов
  const announceTableBalancing = async (remainingPlayers: Registration[]) => {
    const playersPerTable = 9; // Максимум игроков за столом
    const totalTables = Math.ceil(remainingPlayers.length / playersPerTable);
    
    if (totalTables > 1) {
      // Если нужна пересадка
      const unbalancedTables = remainingPlayers.reduce((acc, player) => {
        const tableNum = Math.floor((player.seat_number || 0 - 1) / playersPerTable) + 1;
        acc[tableNum] = (acc[tableNum] || 0) + 1;
        return acc;
      }, {} as {[key: number]: number});
      
      // Проверяем, есть ли столы с малым количеством игроков
      const smallTables = Object.entries(unbalancedTables).filter(([_, count]) => count < 6);
      
      if (smallTables.length > 0) {
        await voiceAnnouncements.playAnnouncement(
          `Внимание! Требуется балансировка столов. Игроки со стола ${smallTables[0][0]}, пересядьте за основной стол для продолжения игры.`
        );
      }
    }
  };

  const finishTournament = async () => {
    try {
      // Обновляем статус турнира
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ status: 'finished' })
        .eq('id', tournament.id);

      if (tournamentError) throw tournamentError;

      // Получаем свежие данные регистраций с final_position
      const { data: freshRegistrations, error: regError } = await supabase
        .from('tournament_registrations')
        .select('id, player_id, position, final_position, reentries, rebuys, additional_sets, addons, status')
        .eq('tournament_id', tournament.id);

      if (regError) throw regError;

      // Формируем результаты используя final_position для выбывших и position для активных
      const results = freshRegistrations.map(reg => ({
        player_id: reg.player_id,
        position: reg.final_position || reg.position || null,
        rebuys: reg.reentries || reg.rebuys || 0,
        addons: reg.additional_sets || reg.addons || 0
      })).filter(r => r.position !== null);

      if (results.length === 0) {
        throw new Error('Нет участников с корректными позициями');
      }

      console.log('Завершение турнира - отправка результатов с final_position:', results);

      // Вызываем функцию расчета RPS рейтингов
      const { error: rpsError } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: tournament.id,
          results: results
        }
      });

      if (rpsError) {
        console.error('Ошибка расчета RPS:', rpsError);
        throw rpsError;
      }

      toast({ 
        title: "Турнир завершен", 
        description: "Рейтинги обновлены с правильными позициями и призовыми местами",
      });

      setIsFinishDialogOpen(false);
      onRegistrationUpdate();

    } catch (error) {
      console.error('Error finishing tournament:', error);
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось завершить турнир", 
        variant: "destructive" 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      registered: "default",
      playing: "destructive", 
      eliminated: "secondary",
      finished: "outline"
    } as const;

    const labels = {
      registered: "Зарегистрирован",
      playing: "Играет",
      eliminated: "Выбыл", 
      finished: "Завершил"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const availablePlayers = players.filter(player => 
    !registrations.some(reg => reg.player.id === player.id)
  );

  const activePlayers = registrations.filter(r => r.status !== 'eliminated');
  const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated').sort((a, b) => {
    const posA = (a as any).final_position || a.position || 999;
    const posB = (b as any).final_position || b.position || 999;
    return posA - posB; // От меньшего к большему (1 место первым)
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white/60 border border-gray-200/50">
          <TabsTrigger value="register">Регистрация</TabsTrigger>
          <TabsTrigger value="active">Активные ({activePlayers.length})</TabsTrigger>
          <TabsTrigger value="eliminated">Выбывшие ({eliminatedPlayers.length})</TabsTrigger>
          <TabsTrigger value="seating">Рассадка</TabsTrigger>
          <TabsTrigger value="finish">Завершение</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
                <CardTitle className="flex items-center gap-3 text-slate-800 font-light text-xl">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                  </div>
                  Добавить игрока
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-light text-sm">Имя игрока</Label>
                    <Input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Введите имя игрока"
                      className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl h-11 font-light"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-light text-sm">Телефон</Label>
                      <Input
                        value={playerPhone}
                        onChange={(e) => setPlayerPhone(e.target.value)}
                        placeholder="+7 (999) 123-45-67"
                        className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl h-11 font-light"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-light text-sm">Telegram</Label>
                      <Input
                        value={playerTelegram}
                        onChange={(e) => setPlayerTelegram(e.target.value)}
                        placeholder="@username"
                        className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl h-11 font-light"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-light text-sm">Место</Label>
                    <Input
                      type="number"
                      min="1"
                      max={tournament.max_players}
                      value={seatNumber}
                      onChange={(e) => setSeatNumber(e.target.value)}
                      placeholder="Опционально"
                      className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl h-11 font-light"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-light text-sm">Стартовые фишки</Label>
                  <Input
                    type="number"
                    min="100"
                    value={startingChips}
                    onChange={(e) => setStartingChips(parseInt(e.target.value))}
                    className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl h-11 font-light"
                  />
                </div>
                <Button 
                  onClick={registerPlayer} 
                  className="w-full h-11 bg-slate-600 hover:bg-slate-700 text-white font-light rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
                  disabled={!playerName.trim() || registrations.length >= tournament.max_players}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Зарегистрировать
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
                <CardTitle className="flex items-center gap-3 text-slate-800 font-light text-xl">
                  <div className="p-2 bg-green-500/10 rounded-xl">
                    <Upload className="w-5 h-5 text-green-600" />
                  </div>
                  Массовая регистрация
                </CardTitle>
                <CardDescription className="text-slate-500 font-light mt-2">Введите имена игроков, каждое с новой строки</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-slate-600 font-light text-sm">Список игроков</Label>
                  <Textarea
                    placeholder="Иван Петров&#10;Мария Сидорова&#10;Алексей Иванов"
                    value={bulkPlayersList}
                    onChange={(e) => setBulkPlayersList(e.target.value)}
                    rows={6}
                    className="border-slate-200 focus:border-green-400 focus:ring-green-400/20 rounded-xl font-light resize-none"
                  />
                </div>
                <Button 
                  onClick={bulkRegisterPlayers} 
                  className="w-full h-11 bg-slate-600 hover:bg-slate-700 text-white font-light rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
                  disabled={!bulkPlayersList.trim()}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Зарегистрировать всех
                </Button>
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
                          <div className="text-sm text-slate-500 font-light">Re-entry + Доп. наборы</div>
                          <div className="text-lg font-light text-slate-800">{(registration.reentries || 0) + (registration.additional_sets || 0)}</div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRebuys(registration.id, 1)}
                            className="h-8 w-8 p-0 border-green-200 text-green-600 hover:bg-green-50"
                            title="Добавить re-entry"
                          >
                            <span className="text-xs font-medium">R</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRebuys(registration.id, -1)}
                            disabled={(registration.reentries || 0) === 0}
                            className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                            title="Убрать re-entry"
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
                                title="Добавить доп. набор"
                              >
                                <span className="text-xs font-medium">A</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAddons(registration.id, -1)}
                                disabled={(registration.additional_sets || 0) === 0}
                                className="h-8 w-8 p-0 border-orange-200 text-orange-600 hover:bg-orange-50"
                                title="Убрать доп. набор"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => eliminatePlayer(registration.id, activePlayers.length)}
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
                            ((registration as any).final_position || registration.position || 0) <= 3 
                              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' 
                              : 'bg-gradient-to-br from-slate-400 to-slate-600'
                          }`}>
                            {(registration as any).final_position || registration.position}
                          </div>
                          {((registration as any).final_position || registration.position || 0) <= 3 && (
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
                            <span>Re-entry {registration.reentries || 0}</span>
                            <span>•</span>
                            <span>Доп. наборы {registration.additional_sets || 0}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-light text-slate-800">{(registration as any).final_position || registration.position} место</div>
                        <div className="text-sm text-slate-500 font-light">
                          {((registration as any).final_position || registration.position || 0) <= 3 ? (
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
                <p className="text-slate-500 font-light">Автоматический расчет рейтингов и призовых мест</p>
              </div>
            </div>
            
            <div className="w-full h-px bg-slate-200 mb-6"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-green-600" />
                <p className="text-3xl font-light text-green-600 mb-1">{activePlayers.length}</p>
                <p className="text-sm text-slate-500 font-light">Активных игроков</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-3 text-yellow-600" />
                <p className="text-3xl font-light text-yellow-600 mb-1">{eliminatedPlayers.length}</p>
                <p className="text-sm text-slate-500 font-light">Выбыло</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                <p className="text-3xl font-light text-blue-600 mb-1">{registrations.length}</p>
                <p className="text-sm text-slate-500 font-light">Всего участников</p>
              </div>
            </div>

            {activePlayers.length <= 1 ? (
              <div className="space-y-4">
                <div className="bg-green-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 text-green-800 mb-2">
                    <CheckCircle className="w-6 h-6" />
                    <span className="text-lg font-light">Турнир готов к завершению</span>
                  </div>
                  <p className="text-green-700 font-light">
                    Остался {activePlayers.length === 0 ? 'ноль' : 'один'} активный игрок. 
                    Нажмите кнопку для автоматического расчета рейтингов.
                  </p>
                </div>
                <Button 
                  onClick={finishTournament} 
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-light"
                  size="lg"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  Завершить турнир и рассчитать рейтинги
                </Button>
              </div>
            ) : (
              <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 text-amber-800 mb-2">
                  <AlertTriangle className="w-6 h-6" />
                  <span className="text-lg font-light">Турнир не готов к завершению</span>
                </div>
                <p className="text-amber-700 font-light">
                  Осталось {activePlayers.length} активных игроков. 
                  Для завершения должен остаться максимум один игрок.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

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
              Повторные входы и доп наборы
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-green-50/50 rounded-xl">
                <div className="text-2xl font-light text-green-600">
                  {registrations.reduce((sum, reg) => sum + (reg.reentries || reg.rebuys || 0), 0)}
                </div>
                <div className="text-sm text-slate-500 font-light">Повторных входов</div>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-xl">
                <div className="text-2xl font-light text-blue-600">
                  {registrations.reduce((sum, reg) => sum + (reg.additional_sets || reg.addons || 0), 0)}
                </div>
                <div className="text-sm text-slate-500 font-light">Доп наборов</div>
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
                <span className="text-sm text-slate-600 font-light">Орг взносы</span>
                <span className="text-lg font-light text-slate-800">
                  {((tournament.participation_fee || tournament.buy_in || 0) * registrations.length).toLocaleString()} ₽
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-xl">
                <span className="text-sm text-slate-600 font-light">Повторные входы</span>
                <span className="text-lg font-light text-green-600">
                  {((tournament.reentry_fee || tournament.rebuy_cost || 0) * registrations.reduce((sum, reg) => {
                    const reentries = reg.reentries || 0;
                    const rebuys = reg.rebuys || 0;
                    return sum + reentries + rebuys;
                  }, 0)).toLocaleString()} ₽
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-xl">
                <span className="text-sm text-slate-600 font-light">Доп наборы</span>
                <span className="text-lg font-light text-blue-600">
                  {((tournament.additional_fee || tournament.addon_cost || 0) * registrations.reduce((sum, reg) => {
                    const additionalSets = reg.additional_sets || 0;
                    const addons = reg.addons || 0;
                    return sum + additionalSets + addons;
                  }, 0)).toLocaleString()} ₽
                </span>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-xl">
                  <span className="text-base text-slate-800 font-medium">Общий призовой фонд</span>
                  <span className="text-xl font-light text-emerald-600">
                    {(() => {
                      const participationFee = tournament.participation_fee || tournament.buy_in || 0;
                      const reentryFee = tournament.reentry_fee || tournament.rebuy_cost || 0;
                      const additionalFee = tournament.additional_fee || tournament.addon_cost || 0;
                      
                      const mainTotal = participationFee * registrations.length;
                      const reentryTotal = reentryFee * registrations.reduce((sum, reg) => {
                        const reentries = reg.reentries || 0;
                        const rebuys = reg.rebuys || 0;
                        return sum + reentries + rebuys;
                      }, 0);
                      const additionalTotal = additionalFee * registrations.reduce((sum, reg) => {
                        const additionalSets = reg.additional_sets || 0;
                        const addons = reg.addons || 0;
                        return sum + additionalSets + addons;
                      }, 0);
                      
                      const totalInRubles = mainTotal + reentryTotal + additionalTotal;
                      const totalRPS = Math.floor(totalInRubles / 10);
                      
                      return (
                        <div className="flex flex-col items-end">
                          <div>{totalInRubles.toLocaleString()} ₽</div>
                          <div className="text-sm text-emerald-500">{totalRPS.toLocaleString()} RPS</div>
                        </div>
                      );
                    })()}
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
                <>
                  <div className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-xl">
                    <span className="text-sm text-slate-600 font-light">Средний стек</span>
                    <span className="text-lg font-light text-indigo-600">
                      {Math.round(activePlayers.reduce((sum, player) => sum + player.chips, 0) / activePlayers.length).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-xl">
                    <span className="text-sm text-slate-600 font-light">Лидер по фишкам</span>
                    <span className="text-lg font-light text-blue-600">
                      {Math.max(...activePlayers.map(p => p.chips)).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
              <div className="border-t border-slate-200 pt-3 mt-3">
                <div className="text-xs text-slate-500 font-medium mb-2 uppercase">Конфигурация турнира</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-green-50/30 rounded-lg">
                    <span className="text-xs text-slate-600">Стартовые фишки</span>
                    <span className="text-sm font-medium text-green-600">
                      {tournament.starting_chips.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-50/30 rounded-lg">
                    <span className="text-xs text-slate-600">Фишки за повторный вход</span>
                    <span className="text-sm font-medium text-purple-600">
                      {(tournament.reentry_chips || tournament.rebuy_chips || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-amber-50/30 rounded-lg">
                    <span className="text-xs text-slate-600">Фишки за доп набор</span>
                    <span className="text-sm font-medium text-amber-600">
                      {(tournament.additional_chips || tournament.addon_chips || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlayerManagement;
