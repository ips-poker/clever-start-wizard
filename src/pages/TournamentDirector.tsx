import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Users, Clock, Settings, Plus, Play, Pause, Square, RotateCcw, CheckCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PlayerRegistration from "@/components/PlayerRegistration";

interface Tournament {
  id: string;
  name: string;
  description: string;
  buy_in: number;
  max_players: number;
  start_time: string;
  status: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number;
  timer_remaining: number;
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
  tournament_id: string;
  player_id: string;
  seat_number: number;
  chips: number;
  status: string;
  position: number;
  rebuys: number;
  addons: number;
  player: Player;
}

const TournamentDirector = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [tournamentResults, setTournamentResults] = useState<{[key: string]: number}>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // New tournament form state
  const [newTournament, setNewTournament] = useState({
    name: "",
    description: "",
    buy_in: 0,
    max_players: 9,
    start_time: ""
  });

  // New player form state
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    email: ""
  });

  useEffect(() => {
    loadTournaments();
    loadPlayers();
    
    // Set up real-time subscriptions
    const tournamentsChannel = supabase
      .channel('tournaments-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tournaments' },
        () => { loadTournaments(); }
      )
      .subscribe();

    const playersChannel = supabase
      .channel('players-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => { loadPlayers(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tournamentsChannel);
      supabase.removeChannel(playersChannel);
    };
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadRegistrations(selectedTournament.id);
      setCurrentTime(selectedTournament.timer_remaining);
    }
  }, [selectedTournament]);

  // Timer effect
  useEffect(() => {
    if (timerActive && currentTime > 0) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            setTimerActive(false);
            toast({
              title: "Время истекло!",
              description: "Уровень блайндов автоматически повышен",
            });
            nextBlindLevel();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive, currentTime]);

  const loadTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось загрузить турниры", variant: "destructive" });
    } else {
      setTournaments(data || []);
    }
  };

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('elo_rating', { ascending: false });

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось загрузить игроков", variant: "destructive" });
    } else {
      setPlayers(data || []);
    }
  };

  const loadRegistrations = async (tournamentId: string) => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        player:players(*)
      `)
      .eq('tournament_id', tournamentId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось загрузить регистрации", variant: "destructive" });
    } else {
      setRegistrations(data || []);
    }
  };

  const createTournament = async () => {
    if (!newTournament.name || !newTournament.start_time) {
      toast({ title: "Ошибка", description: "Заполните обязательные поля", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from('tournaments')
      .insert([{
        ...newTournament,
        start_time: new Date(newTournament.start_time).toISOString()
      }])
      .select()
      .single();

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось создать турнир", variant: "destructive" });
    } else {
      toast({ title: "Успех", description: "Турнир создан" });
      setNewTournament({ name: "", description: "", buy_in: 0, max_players: 9, start_time: "" });
      loadTournaments();
      
      // Create default blind levels
      await createDefaultBlindLevels(data.id);
    }
  };

  const createDefaultBlindLevels = async (tournamentId: string) => {
    const blindLevels = [
      { level: 1, small_blind: 10, big_blind: 20, ante: 0 },
      { level: 2, small_blind: 20, big_blind: 40, ante: 0 },
      { level: 3, small_blind: 30, big_blind: 60, ante: 0 },
      { level: 4, small_blind: 50, big_blind: 100, ante: 10 },
      { level: 5, small_blind: 75, big_blind: 150, ante: 15 },
      { level: 6, small_blind: 100, big_blind: 200, ante: 20 },
      { level: 7, small_blind: 150, big_blind: 300, ante: 30 },
      { level: 8, small_blind: 200, big_blind: 400, ante: 40 }
    ];

    for (const level of blindLevels) {
      await supabase.from('blind_levels').insert({
        tournament_id: tournamentId,
        ...level
      });
    }
  };

  const addPlayer = async () => {
    if (!newPlayer.name) {
      toast({ title: "Ошибка", description: "Введите имя игрока", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('players')
      .insert([newPlayer]);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось добавить игрока", variant: "destructive" });
    } else {
      toast({ title: "Успех", description: "Игрок добавлен" });
      setNewPlayer({ name: "", email: "" });
      loadPlayers();
    }
  };

  const startTournament = async (tournament: Tournament) => {
    const { error } = await supabase
      .from('tournaments')
      .update({ status: 'running' })
      .eq('id', tournament.id);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось запустить турнир", variant: "destructive" });
    } else {
      toast({ title: "Успех", description: "Турнир запущен" });
      loadTournaments();
    }
  };

  const nextBlindLevel = async () => {
    if (!selectedTournament) return;

    const newLevel = selectedTournament.current_level + 1;
    const newTimerTime = selectedTournament.timer_duration;

    const { error } = await supabase
      .from('tournaments')
      .update({ 
        current_level: newLevel,
        timer_remaining: newTimerTime
      })
      .eq('id', selectedTournament.id);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось повысить уровень блайндов", variant: "destructive" });
    } else {
      toast({ title: "Успех", description: `Уровень блайндов повышен до ${newLevel}` });
      setCurrentTime(newTimerTime);
      setSelectedTournament({
        ...selectedTournament,
        current_level: newLevel,
        timer_remaining: newTimerTime
      });
      loadTournaments();
    }
  };

  const resetTimer = async () => {
    if (!selectedTournament) return;

    const { error } = await supabase
      .from('tournaments')
      .update({ timer_remaining: selectedTournament.timer_duration })
      .eq('id', selectedTournament.id);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось сбросить таймер", variant: "destructive" });
    } else {
      setCurrentTime(selectedTournament.timer_duration);
      setTimerActive(false);
      toast({ title: "Таймер сброшен" });
    }
  };

  const finishTournament = async () => {
    if (!selectedTournament || Object.keys(tournamentResults).length === 0) {
      toast({ title: "Ошибка", description: "Укажите места игроков", variant: "destructive" });
      return;
    }

    try {
      // Prepare results for ELO calculation
      const results = Object.entries(tournamentResults).map(([playerId, position]) => ({
        player_id: playerId,
        position: position
      }));

      // Call ELO calculation function
      const { data, error } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: selectedTournament.id,
          results: results
        }
      });

      if (error) {
        throw error;
      }

      toast({ 
        title: "Турнир завершен", 
        description: "Рейтинг игроков обновлен",
      });

      setIsFinishDialogOpen(false);
      setTournamentResults({});
      loadTournaments();
      loadPlayers();

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
      scheduled: "secondary",
      registration: "default",
      running: "destructive",
      finished: "outline",
      cancelled: "secondary"
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || "default"}>{status}</Badge>;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setTimerActive(!timerActive);
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-charcoal bg-clip-text text-transparent animate-fade-in">
            Турнирный Директор
          </h1>
          <p className="text-poker-silver text-lg animate-slide-up">
            Профессиональная система управления покерными турнирами
          </p>
          {selectedTournament && (
            <div className="mt-6 inline-flex items-center gap-4 px-6 py-3 bg-gradient-glass backdrop-blur-sm rounded-xl border border-white/10 shadow-glass">
              <Trophy className="w-5 h-5 text-poker-charcoal" />
              <span className="font-semibold text-poker-charcoal">{selectedTournament.name}</span>
              {getStatusBadge(selectedTournament.status)}
            </div>
          )}
        </div>

        <Tabs defaultValue="tournaments" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-card">
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-poker-charcoal data-[state=active]:text-white transition-all duration-300">
              <Trophy className="w-4 h-4 mr-2" />
              Турниры
            </TabsTrigger>
            <TabsTrigger value="control" className="data-[state=active]:bg-poker-charcoal data-[state=active]:text-white transition-all duration-300">
              <Settings className="w-4 h-4 mr-2" />
              Управление
            </TabsTrigger>
            <TabsTrigger value="players" className="data-[state=active]:bg-poker-charcoal data-[state=active]:text-white transition-all duration-300">
              <Users className="w-4 h-4 mr-2" />
              Игроки
            </TabsTrigger>
            <TabsTrigger value="ratings" className="data-[state=active]:bg-poker-charcoal data-[state=active]:text-white transition-all duration-300">
              <CheckCircle className="w-4 h-4 mr-2" />
              Рейтинг
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments" className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant hover:shadow-floating transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-poker-charcoal">
                    <Plus className="w-5 h-5" />
                    Создать новый турнир
                  </CardTitle>
                  <CardDescription className="text-poker-silver">Настройте параметры нового турнира</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Название турнира</Label>
                    <Input
                      id="name"
                      value={newTournament.name}
                      onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                      placeholder="Еженедельный турнир"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Описание</Label>
                    <Textarea
                      id="description"
                      value={newTournament.description}
                      onChange={(e) => setNewTournament({ ...newTournament, description: e.target.value })}
                      placeholder="Описание турнира..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="max_players">Макс. игроков</Label>
                      <Input
                        id="max_players"
                        type="number"
                        value={newTournament.max_players}
                        onChange={(e) => setNewTournament({ ...newTournament, max_players: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="start_time">Время начала</Label>
                      <Input
                        id="start_time"
                        type="datetime-local"
                        value={newTournament.start_time}
                        onChange={(e) => setNewTournament({ ...newTournament, start_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={createTournament} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать турнир
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant hover:shadow-floating transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-poker-charcoal">
                    <Trophy className="w-5 h-5" />
                    Список турниров
                  </CardTitle>
                  <CardDescription className="text-poker-silver">Все созданные турниры</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tournaments.map((tournament) => (
                      <div
                        key={tournament.id}
                        className={`group flex items-center justify-between p-4 border border-white/10 rounded-xl cursor-pointer transition-all duration-300 ${
                          selectedTournament?.id === tournament.id 
                            ? 'bg-poker-charcoal text-white shadow-charcoal' 
                            : 'hover:bg-gradient-glass backdrop-blur-sm hover:shadow-card'
                        }`}
                        onClick={() => setSelectedTournament(tournament)}
                      >
                        <div>
                          <h3 className="font-semibold">{tournament.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tournament.start_time).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(tournament.status)}
                          {tournament.status === 'scheduled' && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); startTournament(tournament); }}>
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="control" className="space-y-8 animate-fade-in">
            {selectedTournament ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-poker-charcoal">
                      <Clock className="w-5 h-5" />
                      Таймер уровня
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className={`text-7xl font-mono font-bold transition-all duration-500 ${
                        currentTime <= 60 ? 'text-red-500 animate-pulse' : 
                        currentTime <= 300 ? 'text-yellow-500' : 
                        'text-poker-charcoal'
                      }`}>
                        {formatTime(currentTime)}
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-lg font-semibold text-poker-charcoal">Уровень {selectedTournament.current_level}</p>
                        <div className="flex items-center justify-center gap-4 text-sm text-poker-silver">
                          <span>SB: {selectedTournament.current_small_blind}</span>
                          <span>BB: {selectedTournament.current_big_blind}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={toggleTimer}
                        className={`flex-1 h-12 ${timerActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'} border-0 transition-all duration-300 shadow-card`}
                      >
                        {timerActive ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                        {timerActive ? 'Пауза' : 'Старт'}
                      </Button>
                      <Button variant="outline" onClick={resetTimer}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" onClick={nextBlindLevel}>
                        Следующий уровень
                      </Button>
                      {selectedTournament.status === 'running' && (
                        <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="ml-auto">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Завершить турнир
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Завершение турнира</DialogTitle>
                              <DialogDescription>
                                Укажите финальные места игроков для расчета ELO рейтинга
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {registrations
                                .filter(reg => reg.status === 'playing')
                                .map((reg) => (
                                <div key={reg.id} className="flex items-center justify-between p-4 border rounded">
                                  <span>{reg.player.name}</span>
                                  <Select
                                    value={tournamentResults[reg.player_id]?.toString() || ""}
                                    onValueChange={(value) => setTournamentResults(prev => ({
                                      ...prev,
                                      [reg.player_id]: parseInt(value)
                                    }))}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue placeholder="Место" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: registrations.filter(r => r.status === 'playing').length }, (_, i) => (
                                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                                          {i + 1} место
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ))}
                              <Button onClick={finishTournament} className="w-full">
                                Завершить турнир и обновить рейтинги
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>

                  <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-poker-charcoal">
                        <Settings className="w-5 h-5" />
                        Текущие блайнды
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-6 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
                            <p className="text-sm text-poker-silver">Малый блайнд</p>
                            <p className="text-3xl font-bold text-poker-charcoal">{selectedTournament.current_small_blind}</p>
                          </div>
                          <div className="text-center p-6 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
                            <p className="text-sm text-poker-silver">Большой блайнд</p>
                            <p className="text-3xl font-bold text-poker-charcoal">{selectedTournament.current_big_blind}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Player Registration Section */}
                <PlayerRegistration
                  tournament={selectedTournament}
                  players={players}
                  registrations={registrations}
                  onRegistrationUpdate={() => loadRegistrations(selectedTournament.id)}
                />

                <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-poker-charcoal">
                      <Users className="w-5 h-5" />
                      Участники турнира
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-4 text-poker-charcoal">Игрок</th>
                            <th className="text-left py-3 px-4 text-poker-charcoal">Место</th>
                            <th className="text-left py-3 px-4 text-poker-charcoal">Фишки</th>
                            <th className="text-left py-3 px-4 text-poker-charcoal">Статус</th>
                            <th className="text-left py-3 px-4 text-poker-charcoal">ELO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg, index) => (
                            <tr key={reg.id} className={`border-b border-white/10 ${index % 2 === 0 ? 'bg-white/5' : ''}`}>
                              <td className="py-3 px-4 font-medium text-poker-charcoal">{reg.player.name}</td>
                              <td className="py-3 px-4 text-poker-silver">{reg.seat_number || '-'}</td>
                              <td className="py-3 px-4 text-poker-silver">{reg.chips.toLocaleString()}</td>
                              <td className="py-3 px-4">{getStatusBadge(reg.status)}</td>
                              <td className="py-3 px-4 font-semibold text-poker-charcoal">{reg.player.elo_rating}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

              </div>
            ) : (
              <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
                <CardContent className="text-center py-16">
                  <Trophy className="w-16 h-16 mx-auto mb-6 text-poker-silver opacity-50" />
                  <h3 className="text-2xl font-semibold mb-3 text-poker-charcoal">Выберите турнир</h3>
                  <p className="text-poker-silver">Выберите турнир на вкладке "Турниры" для управления</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="players" className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant hover:shadow-floating transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-poker-charcoal">
                    <UserPlus className="w-5 h-5" />
                    Добавить игрока
                  </CardTitle>
                  <CardDescription className="text-poker-silver">Зарегистрировать нового игрока в системе</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="player_name">Имя игрока</Label>
                    <Input
                      id="player_name"
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                      placeholder="Иван Петров"
                    />
                  </div>
                  <div>
                    <Label htmlFor="player_email">Email (опционально)</Label>
                    <Input
                      id="player_email"
                      type="email"
                      value={newPlayer.email}
                      onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                      placeholder="ivan@example.com"
                    />
                  </div>
                  <Button onClick={addPlayer} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить игрока
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant hover:shadow-floating transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-poker-charcoal">
                    <Trophy className="w-5 h-5" />
                    Статистика игроков
                  </CardTitle>
                  <CardDescription className="text-poker-silver">Общая информация о зарегистрированных игроках</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-6 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
                        <p className="text-3xl font-bold text-poker-charcoal">{players.length}</p>
                        <p className="text-sm text-poker-silver">Всего игроков</p>
                      </div>
                      <div className="text-center p-6 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm">
                        <p className="text-3xl font-bold text-poker-charcoal">
                          {players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.elo_rating, 0) / players.length) : 0}
                        </p>
                        <p className="text-sm text-poker-silver">Средний рейтинг</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ratings" className="space-y-8 animate-fade-in">
            <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-poker-charcoal">
                  <Trophy className="w-5 h-5" />
                  Рейтинг игроков (ELO)
                </CardTitle>
                <CardDescription className="text-poker-silver">Текущий рейтинг всех игроков</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Место</TableHead>
                      <TableHead>Игрок</TableHead>
                      <TableHead>Рейтинг ELO</TableHead>
                      <TableHead>Игр сыграно</TableHead>
                      <TableHead>Побед</TableHead>
                      <TableHead>Винрейт</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((player, index) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{player.name}</TableCell>
                        <TableCell className="font-bold">{player.elo_rating}</TableCell>
                        <TableCell>{player.games_played}</TableCell>
                        <TableCell>{player.wins}</TableCell>
                        <TableCell>
                          {player.games_played > 0 ? 
                            `${Math.round((player.wins / player.games_played) * 100)}%` : 
                            '0%'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TournamentDirector;