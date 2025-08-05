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
  Upload
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
    <div className="min-h-screen bg-slate-50 space-y-6">
      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white border border-slate-200 shadow-sm">
          <TabsTrigger value="register" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">Регистрация</TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">Активные ({activePlayers.length})</TabsTrigger>
          <TabsTrigger value="eliminated" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">Выбывшие ({eliminatedPlayers.length})</TabsTrigger>
          <TabsTrigger value="seating" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">Рассадка</TabsTrigger>
          <TabsTrigger value="finish" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">Завершение</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="w-full bg-white border border-slate-200 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
              style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)' }}
            >
              <CardContent className="p-0">
                <div className="relative p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg tracking-tight text-slate-900">ADD PLAYER</div>
                      <div className="text-xs text-slate-500 font-medium">Single Registration</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-700 text-sm font-medium">Имя игрока</Label>
                        <Input
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          placeholder="Введите имя игрока"
                          className="bg-white border-slate-200"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700 text-sm font-medium">Место</Label>
                        <Input
                          type="number"
                          min="1"
                          max={tournament.max_players}
                          value={seatNumber}
                          onChange={(e) => setSeatNumber(e.target.value)}
                          placeholder="Опционально"
                          className="bg-white border-slate-200"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-700 text-sm font-medium">Стартовые фишки</Label>
                      <Input
                        type="number"
                        min="100"
                        value={startingChips}
                        onChange={(e) => setStartingChips(parseInt(e.target.value))}
                        className="bg-white border-slate-200"
                      />
                    </div>
                    <Button 
                      onClick={registerPlayer} 
                      className="w-full bg-slate-900 text-white hover:bg-slate-700 px-6 py-3 rounded-lg font-medium text-sm tracking-wide transition-all"
                      disabled={!playerName.trim() || registrations.length >= tournament.max_players}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      REGISTER PLAYER
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="w-full bg-white border border-slate-200 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
              style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)' }}
            >
              <CardContent className="p-0">
                <div className="relative p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg tracking-tight text-slate-900">BULK REGISTRATION</div>
                      <div className="text-xs text-slate-500 font-medium">Multiple Players at Once</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Иван Петров&#10;Мария Сидорова&#10;Алексей Иванов"
                      value={bulkPlayersList}
                      onChange={(e) => setBulkPlayersList(e.target.value)}
                      rows={6}
                      className="bg-white border-slate-200"
                    />
                    <Button 
                      onClick={bulkRegisterPlayers} 
                      className="w-full bg-slate-900 text-white hover:bg-slate-700 px-6 py-3 rounded-lg font-medium text-sm tracking-wide transition-all"
                      disabled={!bulkPlayersList.trim()}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      REGISTER ALL
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card className="w-full bg-white border border-slate-200 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
            style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)' }}
          >
            <CardContent className="p-0">
              <div className="relative p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg tracking-tight text-slate-900">ACTIVE PLAYERS</div>
                    <div className="text-xs text-slate-500 font-medium">Manage Rebuys, Add-ons & Eliminations</div>
                  </div>
                </div>

                {/* Статистические блоки */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center py-4">
                      <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Active</div>
                      <div className="text-3xl font-light text-slate-900">{activePlayers.length}</div>
                    </div>
                    <div className="text-center py-4">
                      <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">In Tournament</div>
                      <div className="text-3xl font-light text-slate-900">{registrations.length}</div>
                    </div>
                  </div>
                  
                  <div className="w-full h-px bg-slate-200 my-4"></div>
                  
                  <div className="space-y-3">
                    {activePlayers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <div className="text-slate-500 text-sm font-medium">No active players</div>
                      </div>
                    ) : (
                      activePlayers.map((registration) => (
                        <div
                          key={registration.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all duration-300"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {registration.seat_number || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{registration.player.name}</div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>ELO: {registration.player.elo_rating}</span>
                                <span>Chips: {registration.chips.toLocaleString()}</span>
                                <span>Rebuys: {registration.rebuys}</span>
                                <span>Add-ons: {registration.addons}</span>
                                {getStatusBadge(registration.status)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {tournament.tournament_format !== 'freezeout' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateRebuys(registration.id, -1)}
                                  disabled={registration.rebuys <= 0}
                                  className="bg-white border-slate-200 hover:bg-slate-50"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateRebuys(registration.id, 1)}
                                  className="bg-white border-slate-200 hover:bg-slate-50"
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
                                      className="bg-white border-slate-200 hover:bg-slate-50"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateAddons(registration.id, 1)}
                                      className="bg-white border-slate-200 hover:bg-slate-50"
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
                              className="bg-white border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eliminated" className="space-y-4">
          <Card className="w-full bg-white border border-slate-200 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
            style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)' }}
          >
            <CardContent className="p-0">
              <div className="relative p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg tracking-tight text-slate-900">ELIMINATED PLAYERS</div>
                    <div className="text-xs text-slate-500 font-medium">Elimination Order & Prize Places</div>
                  </div>
                </div>

                {/* Статистические блоки */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center py-4">
                      <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Eliminated</div>
                      <div className="text-3xl font-light text-slate-900">{eliminatedPlayers.length}</div>
                    </div>
                    <div className="text-center py-4">
                      <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Prize Places</div>
                      <div className="text-3xl font-light text-slate-900">{eliminatedPlayers.filter(p => (p.position || 0) <= 3).length}</div>
                    </div>
                  </div>
                  
                  <div className="w-full h-px bg-slate-200 my-4"></div>
                  
                  <div className="space-y-3">
                    {eliminatedPlayers.length === 0 ? (
                      <div className="text-center py-8">
                        <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <div className="text-slate-500 text-sm font-medium">No eliminated players yet</div>
                      </div>
                    ) : (
                      eliminatedPlayers.map((registration) => (
                        <div
                          key={registration.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              (registration.position || 0) <= 3 ? 'bg-yellow-500' : 'bg-slate-500'
                            }`}>
                              {registration.position}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{registration.player.name}</div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>ELO: {registration.player.elo_rating}</span>
                                <span>Rebuys: {registration.rebuys}</span>
                                <span>Add-ons: {registration.addons}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-slate-900">{registration.position} место</div>
                            <div className="text-xs text-slate-500">
                              {(registration.position || 0) <= 3 ? 'Prize Place' : 'Eliminated'}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
          <Card className="w-full bg-white border border-slate-200 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
            style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)' }}
          >
            <CardContent className="p-0">
              <div className="relative p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg tracking-tight text-slate-900">TOURNAMENT FINISH</div>
                    <div className="text-xs text-slate-500 font-medium">Automatic Rating Calculation & Prize Places</div>
                  </div>
                </div>

                {/* Статистические блоки */}
                <div className="mb-6">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center py-4">
                      <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Active</div>
                      <div className="text-3xl font-light text-green-600">{activePlayers.length}</div>
                    </div>
                    <div className="text-center py-4">
                      <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Eliminated</div>
                      <div className="text-3xl font-light text-yellow-600">{eliminatedPlayers.length}</div>
                    </div>
                    <div className="text-center py-4">
                      <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Total</div>
                      <div className="text-3xl font-light text-slate-900">{registrations.length}</div>
                    </div>
                  </div>
                  
                  <div className="w-full h-px bg-slate-200 my-6"></div>

                  {activePlayers.length <= 1 ? (
                    <div className="space-y-4">
                      <div className="text-center py-6 bg-green-50 rounded-xl border border-green-200">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" />
                        <div className="font-medium text-green-800 mb-1">Tournament Ready to Finish</div>
                        <div className="text-sm text-green-700">
                          {activePlayers.length === 0 ? 'No' : 'One'} active player remaining. 
                          Ready for automatic rating calculation.
                        </div>
                      </div>
                      <Button 
                        onClick={finishTournament} 
                        className="w-full bg-slate-900 text-white hover:bg-slate-700 px-6 py-4 rounded-lg font-medium text-sm tracking-wide transition-all"
                        size="lg"
                      >
                        <Trophy className="w-5 h-5 mr-2" />
                        FINISH TOURNAMENT & CALCULATE RATINGS
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-amber-50 rounded-xl border border-amber-200">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-amber-600" />
                      <div className="font-medium text-amber-800 mb-1">Tournament Not Ready</div>
                      <div className="text-sm text-amber-700">
                        {activePlayers.length} active players remaining. 
                        Must have maximum one player to finish.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlayerManagement;