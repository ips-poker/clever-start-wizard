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
import { Trophy, Users, Clock, Settings, Plus, Play, Pause, Square, RotateCcw, CheckCircle, UserPlus, Volume2, Maximize, StopCircle, ChevronLeft, ChevronRight, Activity, TrendingUp, AlertCircle, DollarSign, Target, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PlayerRegistration from "@/components/PlayerRegistration";
import TournamentOverview from "@/components/TournamentOverview";

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
    const newSmallBlind = Math.round(selectedTournament.current_small_blind * 1.5);
    const newBigBlind = Math.round(selectedTournament.current_big_blind * 1.5);

    const { error } = await supabase
      .from('tournaments')
      .update({ 
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind,
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
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind,
        timer_remaining: newTimerTime
      });
      loadTournaments();
    }
  };

  const prevBlindLevel = async () => {
    if (!selectedTournament || selectedTournament.current_level <= 1) return;

    const newLevel = selectedTournament.current_level - 1;
    const newTimerTime = selectedTournament.timer_duration;
    const newSmallBlind = Math.round(selectedTournament.current_small_blind / 1.5);
    const newBigBlind = Math.round(selectedTournament.current_big_blind / 1.5);

    const { error } = await supabase
      .from('tournaments')
      .update({ 
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind,
        timer_remaining: newTimerTime
      })
      .eq('id', selectedTournament.id);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось понизить уровень блайндов", variant: "destructive" });
    } else {
      toast({ title: "Успех", description: `Уровень блайндов понижен до ${newLevel}` });
      setCurrentTime(newTimerTime);
      setSelectedTournament({
        ...selectedTournament,
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind,
        timer_remaining: newTimerTime
      });
      loadTournaments();
    }
  };

  const stopTournament = async () => {
    if (!selectedTournament) return;

    const { error } = await supabase
      .from('tournaments')
      .update({ status: 'cancelled' })
      .eq('id', selectedTournament.id);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось остановить турнир", variant: "destructive" });
    } else {
      toast({ title: "Турнир остановлен", description: "Турнир был принудительно остановлен" });
      setTimerActive(false);
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
      <div className="container mx-auto py-8 px-4">
        <div className="mb-12 text-center">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-button bg-clip-text text-transparent animate-fade-in tracking-tight">
            Турнирный Директор
          </h1>
          <p className="text-poker-text-secondary text-xl font-medium animate-slide-up max-w-2xl mx-auto">
            Профессиональная система управления покерными турнирами с расширенной аналитикой
          </p>
          {selectedTournament && (
            <div className="mt-8 inline-flex items-center gap-4 px-8 py-4 bg-gradient-card backdrop-blur-sm rounded-2xl border border-poker-border shadow-card">
              <Trophy className="w-6 h-6 text-poker-accent" />
              <span className="font-semibold text-poker-text-primary text-lg">{selectedTournament.name}</span>
              {getStatusBadge(selectedTournament.status)}
            </div>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-10">
          <TabsList className="grid w-full grid-cols-5 bg-poker-surface-elevated border border-poker-border shadow-card rounded-2xl p-2 h-16">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-button data-[state=active]:text-white data-[state=active]:shadow-accent transition-all duration-300 rounded-xl font-medium"
            >
              <Activity className="w-5 h-5 mr-2" />
              Обзор
            </TabsTrigger>
            <TabsTrigger 
              value="tournaments" 
              className="data-[state=active]:bg-gradient-button data-[state=active]:text-white data-[state=active]:shadow-accent transition-all duration-300 rounded-xl font-medium"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Турниры
            </TabsTrigger>
            <TabsTrigger 
              value="control" 
              className="data-[state=active]:bg-gradient-button data-[state=active]:text-white data-[state=active]:shadow-accent transition-all duration-300 rounded-xl font-medium"
            >
              <Settings className="w-5 h-5 mr-2" />
              Управление
            </TabsTrigger>
            <TabsTrigger 
              value="players" 
              className="data-[state=active]:bg-gradient-button data-[state=active]:text-white data-[state=active]:shadow-accent transition-all duration-300 rounded-xl font-medium"
            >
              <Users className="w-5 h-5 mr-2" />
              Игроки
            </TabsTrigger>
            <TabsTrigger 
              value="ratings" 
              className="data-[state=active]:bg-gradient-button data-[state=active]:text-white data-[state=active]:shadow-accent transition-all duration-300 rounded-xl font-medium"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Рейтинг
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 animate-fade-in">
            {selectedTournament ? (
              <TournamentOverview
                tournament={selectedTournament}
                players={players}
                registrations={registrations}
                currentTime={currentTime}
                timerActive={timerActive}
                onToggleTimer={toggleTimer}
                onResetTimer={resetTimer}
                onNextLevel={nextBlindLevel}
                onPrevLevel={prevBlindLevel}
                onStopTournament={stopTournament}
                onRefresh={() => {
                  loadTournaments();
                  loadPlayers();
                  loadRegistrations(selectedTournament.id);
                }}
              />
            ) : (
              <Card className="bg-gradient-card border border-poker-border shadow-elevated rounded-2xl">
                <CardContent className="text-center py-20">
                  <Trophy className="w-20 h-20 mx-auto mb-8 text-poker-text-muted" />
                  <h3 className="text-3xl font-bold mb-4 text-poker-text-primary">Выберите турнир для мониторинга</h3>
                  <p className="text-poker-text-secondary text-lg">Выберите активный турнир на вкладке "Турниры" для отображения обзора</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-10 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal hover:shadow-subtle transition-all duration-300 rounded-xl group">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-gray-800 text-lg font-light">
                    <div className="p-2 bg-gray-100/80 rounded-lg">
                      <Plus className="w-5 h-5 text-gray-600" />
                    </div>
                    Создать новый турнир
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-sm">Настройте параметры нового турнира с профессиональными настройками</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-normal text-sm">Название турнира</Label>
                    <Input
                      id="name"
                      value={newTournament.name}
                      onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                      placeholder="Еженедельный турнир"
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-700 font-normal text-sm">Описание</Label>
                    <Textarea
                      id="description"
                      value={newTournament.description}
                      onChange={(e) => setNewTournament({ ...newTournament, description: e.target.value })}
                      placeholder="Описание турнира..."
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_players" className="text-gray-700 font-normal text-sm">Макс. игроков</Label>
                      <Input
                        id="max_players"
                        type="number"
                        value={newTournament.max_players}
                        onChange={(e) => setNewTournament({ ...newTournament, max_players: parseInt(e.target.value) })}
                        className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start_time" className="text-gray-700 font-normal text-sm">Время начала</Label>
                      <Input
                        id="start_time"
                        type="datetime-local"
                        value={newTournament.start_time}
                        onChange={(e) => setNewTournament({ ...newTournament, start_time: e.target.value })}
                        className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={createTournament} 
                    className="w-full h-12 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-normal text-sm transition-all duration-300 border-0"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать турнир
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal hover:shadow-subtle transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                    <Trophy className="w-4 h-4" />
                    Список турниров
                  </CardTitle>
                  <CardDescription className="text-gray-600">Все созданные турниры</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tournaments.map((tournament) => (
                      <div
                        key={tournament.id}
                        className={`group flex items-center justify-between p-3 border border-gray-200/30 rounded-lg cursor-pointer transition-all duration-300 ${
                          selectedTournament?.id === tournament.id 
                            ? 'bg-gray-100 border-gray-300 shadow-subtle' 
                            : 'hover:bg-white/60 hover:border-gray-300/50 hover:shadow-minimal'
                        }`}
                        onClick={() => setSelectedTournament(tournament)}
                      >
                        <div>
                          <h3 className="font-medium text-gray-800">{tournament.name}</h3>
                          <p className="text-sm text-gray-500">
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
                  <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                        <Clock className="w-4 h-4" />
                        Таймер уровня
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className={`text-5xl font-mono font-light transition-all duration-300 ${
                          currentTime <= 60 ? 'text-red-500' : 
                          currentTime <= 300 ? 'text-amber-500' : 
                          'text-gray-800'
                        }`}>
                          {formatTime(currentTime)}
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-base font-light text-gray-800">Уровень {selectedTournament.current_level}</p>
                          <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
                            <span>SB: {selectedTournament.current_small_blind}</span>
                            <span>BB: {selectedTournament.current_big_blind}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={toggleTimer}
                          className={`flex-1 h-10 border-gray-200/50 ${timerActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} transition-all duration-300`}
                        >
                          {timerActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                          {timerActive ? 'Пауза' : 'Старт'}
                        </Button>
                        <Button variant="outline" onClick={resetTimer} className="border-gray-200/50 hover:shadow-minimal">
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" onClick={nextBlindLevel} className="border-gray-200/50 hover:shadow-minimal">
                          Следующий уровень
                        </Button>
                        {selectedTournament.status === 'running' && (
                          <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="ml-auto border-gray-200/50 hover:shadow-minimal">
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
                  <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                        <Settings className="w-4 h-4" />
                        Текущие блайнды
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-4 border border-gray-200/30 rounded-lg bg-white/30">
                            <p className="text-xs text-gray-500">Малый блайнд</p>
                            <p className="text-2xl font-light text-gray-800">{selectedTournament.current_small_blind}</p>
                          </div>
                          <div className="text-center p-4 border border-gray-200/30 rounded-lg bg-white/30">
                            <p className="text-xs text-gray-500">Большой блайнд</p>
                            <p className="text-2xl font-light text-gray-800">{selectedTournament.current_big_blind}</p>
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

                <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                      <Users className="w-4 h-4" />
                      Участники турнира
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200/30">
                            <th className="text-left py-2 px-3 text-gray-700 font-normal text-sm">Игрок</th>
                            <th className="text-left py-2 px-3 text-gray-700 font-normal text-sm">Место</th>
                            <th className="text-left py-2 px-3 text-gray-700 font-normal text-sm">Фишки</th>
                            <th className="text-left py-2 px-3 text-gray-700 font-normal text-sm">Статус</th>
                            <th className="text-left py-2 px-3 text-gray-700 font-normal text-sm">ELO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg, index) => (
                            <tr key={reg.id} className={`border-b border-gray-200/20 ${index % 2 === 0 ? 'bg-white/20' : ''}`}>
                              <td className="py-2 px-3 font-medium text-gray-800 text-sm">{reg.player.name}</td>
                              <td className="py-2 px-3 text-gray-600 text-sm">{reg.seat_number || '-'}</td>
                              <td className="py-2 px-3 text-gray-600 text-sm">{reg.chips.toLocaleString()}</td>
                              <td className="py-2 px-3 text-sm">{getStatusBadge(reg.status)}</td>
                              <td className="py-2 px-3 font-medium text-gray-800 text-sm">{reg.player.elo_rating}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

              </div>
            ) : (
              <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
                <CardContent className="text-center py-12">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-light mb-2 text-gray-700">Выберите турнир</h3>
                  <p className="text-gray-600 text-sm">Выберите турнир на вкладке "Турниры" для управления</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="players" className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal hover:shadow-subtle transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                    <UserPlus className="w-4 h-4" />
                    Добавить игрока
                  </CardTitle>
                  <CardDescription className="text-gray-600">Зарегистрировать нового игрока в системе</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="player_name" className="text-gray-700 font-normal text-sm">Имя игрока</Label>
                    <Input
                      id="player_name"
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                      placeholder="Иван Петров"
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="player_email" className="text-gray-700 font-normal text-sm">Email (опционально)</Label>
                    <Input
                      id="player_email"
                      type="email"
                      value={newPlayer.email}
                      onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                      placeholder="ivan@example.com"
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                    />
                  </div>
                  <Button onClick={addPlayer} className="w-full h-10 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-normal text-sm transition-all duration-300 border-0">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить игрока
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal hover:shadow-subtle transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                    <Trophy className="w-4 h-4" />
                    Статистика игроков
                  </CardTitle>
                  <CardDescription className="text-gray-600">Общая информация о зарегистрированных игроках</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-4 border border-gray-200/30 rounded-lg bg-white/30">
                        <p className="text-xl font-light text-gray-800">{players.length}</p>
                        <p className="text-xs text-gray-500">Всего игроков</p>
                      </div>
                      <div className="text-center p-4 border border-gray-200/30 rounded-lg bg-white/30">
                        <p className="text-xl font-light text-gray-800">
                          {players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.elo_rating, 0) / players.length) : 0}
                        </p>
                        <p className="text-xs text-gray-500">Средний рейтинг</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ratings" className="space-y-8 animate-fade-in">
            <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                  <Trophy className="w-4 h-4" />
                  Рейтинг игроков (ELO)
                </CardTitle>
                <CardDescription className="text-gray-600">Текущий рейтинг всех игроков</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-700 font-normal text-sm">Место</TableHead>
                      <TableHead className="text-gray-700 font-normal text-sm">Игрок</TableHead>
                      <TableHead className="text-gray-700 font-normal text-sm">Рейтинг ELO</TableHead>
                      <TableHead className="text-gray-700 font-normal text-sm">Игр сыграно</TableHead>
                      <TableHead className="text-gray-700 font-normal text-sm">Побед</TableHead>
                      <TableHead className="text-gray-700 font-normal text-sm">Винрейт</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((player, index) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium text-gray-800 text-sm">{index + 1}</TableCell>
                        <TableCell className="text-gray-800 text-sm">{player.name}</TableCell>
                        <TableCell className="font-medium text-gray-800 text-sm">{player.elo_rating}</TableCell>
                        <TableCell className="text-gray-600 text-sm">{player.games_played}</TableCell>
                        <TableCell className="text-gray-600 text-sm">{player.wins}</TableCell>
                        <TableCell className="text-gray-600 text-sm">
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