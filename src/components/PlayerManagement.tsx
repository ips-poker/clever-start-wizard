import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TableSeating from "@/components/TableSeating";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";
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
  MoveRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  rebuys: number;
  addons: number;
  position?: number;
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
    console.log('PlayerManagement mounted');
    return () => {
      console.log('PlayerManagement unmounting');
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
            elo_rating: 1200
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

  const updateRebuys = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const newRebuys = Math.max(0, registration.rebuys + change);
    const newChips = registration.chips + (change > 0 ? tournament.rebuy_chips : -tournament.rebuy_chips);

    const { error } = await supabase
      .from('tournament_registrations')
      .update({ 
        rebuys: newRebuys,
        chips: Math.max(0, newChips)
      })
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить ребаи", variant: "destructive" });
    } else {
      toast({ 
        title: change > 0 ? "Ребай добавлен" : "Ребай удален", 
        description: `Игрок получил ${change > 0 ? '+' : ''}${change > 0 ? tournament.rebuy_chips : -tournament.rebuy_chips} фишек` 
      });
      onRegistrationUpdate();
    }
  };

  const updateAddons = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const newAddons = Math.max(0, registration.addons + change);
    const newChips = registration.chips + (change > 0 ? tournament.addon_chips : -tournament.addon_chips);

    const { error } = await supabase
      .from('tournament_registrations')
      .update({ 
        addons: newAddons,
        chips: Math.max(0, newChips)
      })
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить аддоны", variant: "destructive" });
    } else {
      toast({ 
        title: change > 0 ? "Аддон добавлен" : "Аддон удален", 
        description: `Игрок получил ${change > 0 ? '+' : ''}${change > 0 ? tournament.addon_chips : -tournament.addon_chips} фишек` 
      });
      onRegistrationUpdate();
    }
  };

  const eliminatePlayer = async (registrationId: string, position: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const { error } = await supabase
      .from('tournament_registrations')
      .update({ 
        status: 'eliminated',
        position: position
      })
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось исключить игрока", variant: "destructive" });
    } else {
      toast({ title: "Игрок исключен", description: `${registration.player.name} - место ${position}` });
      
      // Голосовое объявление об исключении игрока
      await voiceAnnouncements.announcePlayerElimination(registration.player.name, position);
      
      // Проверяем необходимость балансировки столов с задержкой 30 секунд
      const remainingPlayers = registrations.filter(r => r.status !== 'eliminated' && r.id !== registrationId);
      if (remainingPlayers.length > 1) {
        setTimeout(async () => {
          await announceTableBalancing(remainingPlayers);
        }, 15000); // 15 секунд задержки
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
      // Update tournament status to finished first
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ status: 'finished' })
        .eq('id', tournament.id);

      if (tournamentError) throw tournamentError;

      // Ensure all active players get position 1 (winner/tie)
      const activePlayerUpdates = registrations
        .filter(r => r.status !== 'eliminated')
        .map(async (reg) => {
          return supabase
            .from('tournament_registrations')
            .update({ position: 1 })
            .eq('id', reg.id);
        });

      await Promise.all(activePlayerUpdates);

      // Prepare results for ELO calculation - make sure all players have positions
      const results = registrations.map((reg) => ({
        player_id: reg.player.id,
        position: reg.position || 1, // Active players get 1st place
        rebuys: reg.rebuys || 0,
        addons: reg.addons || 0
      }));

      console.log('Завершение турнира - отправка результатов:', results);

      // Call ELO calculation function
      const { error: eloError } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: tournament.id,
          results: results
        }
      });

      if (eloError) {
        console.error('Ошибка расчета ELO:', eloError);
        throw eloError;
      }

      toast({ 
        title: "Турнир завершен", 
        description: "Рейтинги обновлены, призовые места определены",
      });

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
  const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated').sort((a, b) => (b.position || 0) - (a.position || 0));

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
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Добавить игрока
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Имя игрока</Label>
                    <Input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Введите имя игрока"
                    />
                  </div>
                  <div>
                    <Label>Место</Label>
                    <Input
                      type="number"
                      min="1"
                      max={tournament.max_players}
                      value={seatNumber}
                      onChange={(e) => setSeatNumber(e.target.value)}
                      placeholder="Опционально"
                    />
                  </div>
                </div>
                <div>
                  <Label>Стартовые фишки</Label>
                  <Input
                    type="number"
                    min="100"
                    value={startingChips}
                    onChange={(e) => setStartingChips(parseInt(e.target.value))}
                  />
                </div>
                <Button 
                  onClick={registerPlayer} 
                  className="w-full"
                  disabled={!playerName.trim() || registrations.length >= tournament.max_players}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Зарегистрировать
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Массовая регистрация
                </CardTitle>
                <CardDescription>Введите имена игроков, каждое с новой строки</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Иван Петров&#10;Мария Сидорова&#10;Алексей Иванов"
                  value={bulkPlayersList}
                  onChange={(e) => setBulkPlayersList(e.target.value)}
                  rows={6}
                />
                <Button 
                  onClick={bulkRegisterPlayers} 
                  className="w-full"
                  disabled={!bulkPlayersList.trim()}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Зарегистрировать всех
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activePlayers.length === 0 ? (
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle">
              <CardContent className="text-center py-12 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Нет активных игроков</p>
                <p className="text-sm">Зарегистрируйте игроков в разделе "Регистрация"</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Группировка игроков по столам из актуальной рассадки */}
              {(() => {
                const maxPlayersPerTable = 9;
                const tableGroups: { [key: number]: Registration[] } = {};
                
                // Загружаем актуальную рассадку из localStorage
                const savedSeating = localStorage.getItem(`seating_${tournament.id}`);
                let currentSeating: any[] = [];
                
                if (savedSeating) {
                  try {
                    currentSeating = JSON.parse(savedSeating);
                  } catch (e) {
                    console.error('Ошибка парсинга рассадки:', e);
                  }
                }
                
                // Группируем игроков на основе актуальной рассадки
                activePlayers.forEach(player => {
                  let tableNumber = 0; // По умолчанию "без стола"
                  
                  // Ищем игрока в актуальной рассадке
                  if (currentSeating.length > 0) {
                    for (const table of currentSeating) {
                      const seat = table.seats?.find((s: any) => s.player_id === player.player.id);
                      if (seat) {
                        tableNumber = table.table_number;
                        break;
                      }
                    }
                  }
                  
                  if (!tableGroups[tableNumber]) {
                    tableGroups[tableNumber] = [];
                  }
                  tableGroups[tableNumber].push(player);
                });
                
                return Object.entries(tableGroups)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([tableNum, players]) => (
                    <Card key={tableNum} className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border border-blue-200/50 rounded-lg flex items-center justify-center font-bold shadow-sm">
                              {tableNum === '0' ? '?' : tableNum}
                            </div>
                            <span className="text-lg font-light text-gray-800">
                              {tableNum === '0' ? 'Игроки без места' : `Стол ${tableNum}`}
                            </span>
                          </div>
                          <Badge className="text-sm px-3 py-1 font-light border bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200/70">
                            {players.length} игроков
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent className="space-y-3 p-6 bg-white/40 backdrop-blur-sm">
                        {/* Сетка игроков в стиле рассадки */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {players.map((registration) => (
                            <div
                              key={registration.id}
                              className="relative p-4 rounded-xl border bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
                            >
                              {/* Номер места */}
                              <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300/50 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 shadow-sm">
                                {registration.seat_number || '?'}
                              </div>
                              
                              <div className="space-y-3">
                                {/* Игрок с аватаром */}
                                <div className="text-center">
                                  <Avatar className="w-14 h-14 mx-auto border-2 border-white/70 shadow-md">
                                    <AvatarImage 
                                      src={registration.player.avatar_url || ''} 
                                      alt={registration.player.name || ''} 
                                    />
                                    <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border border-blue-200/50">
                                      {registration.player.name?.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="mt-2">
                                    <div className="text-sm font-medium text-gray-800 truncate px-1" title={registration.player.name}>
                                      {registration.player.name}
                                    </div>
                                    <div className="text-xs text-gray-500 font-light flex items-center justify-center gap-1 mt-1">
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm"></span>
                                      ELO {registration.player.elo_rating}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Статистика игрока */}
                                <div className="space-y-2 text-xs text-gray-600">
                                  <div className="flex justify-between">
                                    <span>Фишки:</span>
                                    <span className="font-medium">{registration.chips.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Ребаи:</span>
                                    <span className="font-medium">{registration.rebuys}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Аддоны:</span>
                                    <span className="font-medium">{registration.addons}</span>
                                  </div>
                                </div>
                                
                                {/* Статус */}
                                <div className="flex justify-center">
                                  {getStatusBadge(registration.status)}
                                </div>
                                
                                {/* Кнопки управления */}
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {tournament.tournament_format !== 'freezeout' && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateRebuys(registration.id, -1)}
                                        disabled={registration.rebuys <= 0}
                                        className="text-xs px-2 py-1 h-6"
                                        title="Убрать ребай"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateRebuys(registration.id, 1)}
                                        className="text-xs px-2 py-1 h-6"
                                        title="Добавить ребай"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                      </Button>
                                      {tournament.current_level >= tournament.addon_level && (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateAddons(registration.id, -1)}
                                            disabled={registration.addons <= 0}
                                            className="text-xs px-2 py-1 h-6"
                                            title="Убрать аддон"
                                          >
                                            <Minus className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateAddons(registration.id, 1)}
                                            className="text-xs px-2 py-1 h-6"
                                            title="Добавить аддон"
                                          >
                                            <Plus className="w-3 h-3" />
                                          </Button>
                                        </>
                                      )}
                                    </>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => eliminatePlayer(registration.id, registrations.length - eliminatedPlayers.length)}
                                    className="text-xs px-2 py-1 h-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    title="Исключить игрока"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ));
              })()}
            </div>
          )}
        </TabsContent>

        <TabsContent value="eliminated" className="space-y-4">
          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Выбывшие игроки
              </CardTitle>
              <CardDescription>Порядок выбывания и призовые места</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {eliminatedPlayers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Никто еще не выбыл</p>
                  </div>
                ) : (
                  eliminatedPlayers.map((registration) => (
                    <div
                      key={registration.id}
                      className="flex items-center justify-between p-4 border border-gray-200/30 rounded-xl bg-gray-50/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          (registration.position || 0) <= 3 ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}>
                          {registration.position}
                        </div>
                        <div>
                          <h4 className="font-semibold">{registration.player.name}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>ELO: {registration.player.elo_rating}</span>
                            <span>Ребаи: {registration.rebuys}</span>
                            <span>Аддоны: {registration.addons}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{registration.position} место</p>
                        <p className="text-sm text-gray-600">
                          {(registration.position || 0) <= 3 ? 'Призовое место' : 'Выбыл'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seating">
          <TableSeating 
            tournamentId={tournament.id}
            registrations={registrations}
            tournamentStatus={tournament.status}
            onSeatingUpdate={onRegistrationUpdate}
          />
        </TabsContent>

        <TabsContent value="finish" className="space-y-4">
          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Завершение турнира
              </CardTitle>
              <CardDescription>Автоматический расчет рейтингов и призовых мест</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border border-gray-200/30 rounded-lg bg-white/30">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold text-green-600">{activePlayers.length}</p>
                  <p className="text-sm text-gray-600">Активных игроков</p>
                </div>
                <div className="text-center p-4 border border-gray-200/30 rounded-lg bg-white/30">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                  <p className="text-2xl font-bold text-yellow-600">{eliminatedPlayers.length}</p>
                  <p className="text-sm text-gray-600">Выбыло</p>
                </div>
                <div className="text-center p-4 border border-gray-200/30 rounded-lg bg-white/30">
                  <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold text-blue-600">{registrations.length}</p>
                  <p className="text-sm text-gray-600">Всего участников</p>
                </div>
              </div>

              {activePlayers.length <= 1 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Турнир готов к завершению</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Остался {activePlayers.length === 0 ? 'ноль' : 'один'} активный игрок. 
                      Нажмите кнопку для автоматического расчета рейтингов.
                    </p>
                  </div>
                  <Button 
                    onClick={finishTournament} 
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    Завершить турнир и рассчитать рейтинги
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">Турнир не готов к завершению</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    Осталось {activePlayers.length} активных игроков. 
                    Для завершения должен остаться максимум один игрок.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlayerManagement;