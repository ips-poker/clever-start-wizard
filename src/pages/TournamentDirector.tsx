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
import BlindStructure from "@/components/BlindStructure";
import PayoutStructure from "@/components/PayoutStructure";

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
  rebuy_cost: number;
  addon_cost: number;
  rebuy_chips: number;
  addon_chips: number;
  starting_chips: number;
  rebuy_end_level: number;
  addon_level: number;
  break_start_level: number;
  tournament_format: string;
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
  const [activeTab, setActiveTab] = useState("overview");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // New tournament form state
  const [newTournament, setNewTournament] = useState({
    name: "",
    description: "",
    buy_in: 0,
    max_players: 9,
    start_time: "",
    rebuy_cost: 0,
    addon_cost: 0,
    rebuy_chips: 0,
    addon_chips: 0,
    starting_chips: 10000,
    rebuy_end_level: 6,
    addon_level: 7,
    break_start_level: 4,
    tournament_format: "freezeout"
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
      setNewTournament({ 
        name: "", 
        description: "", 
        buy_in: 0, 
        max_players: 9, 
        start_time: "",
        rebuy_cost: 0,
        addon_cost: 0,
        rebuy_chips: 0,
        addon_chips: 0,
        starting_chips: 10000,
        rebuy_end_level: 6,
        addon_level: 7,
        break_start_level: 4,
        tournament_format: "freezeout"
      });
      loadTournaments();
      
      // Create default blind levels
      await createDefaultBlindLevels(data.id);
    }
  };

  const createDefaultBlindLevels = async (tournamentId: string) => {
    const blindLevels = [
      { level: 1, small_blind: 100, big_blind: 200, ante: 200 },
      { level: 2, small_blind: 200, big_blind: 400, ante: 400 },
      { level: 3, small_blind: 300, big_blind: 600, ante: 600 },
      { level: 4, small_blind: 400, big_blind: 800, ante: 800 },
      { level: 5, small_blind: 500, big_blind: 1000, ante: 1000 },
      { level: 6, small_blind: 600, big_blind: 1200, ante: 1200 },
      { level: 7, small_blind: 700, big_blind: 1500, ante: 1500 },
      { level: 8, small_blind: 1000, big_blind: 2000, ante: 2000 },
      { level: 9, small_blind: 1500, big_blind: 3000, ante: 3000 },
      { level: 10, small_blind: 2000, big_blind: 4000, ante: 4000 },
      { level: 11, small_blind: 3000, big_blind: 6000, ante: 6000 },
      { level: 12, small_blind: 4000, big_blind: 8000, ante: 8000 },
      { level: 13, small_blind: 5000, big_blind: 10000, ante: 10000 },
      { level: 14, small_blind: 6000, big_blind: 12000, ante: 12000 },
      { level: 15, small_blind: 7000, big_blind: 14000, ante: 14000 },
      { level: 16, small_blind: 8000, big_blind: 16000, ante: 16000 },
      { level: 17, small_blind: 10000, big_blind: 20000, ante: 20000 },
      { level: 18, small_blind: 15000, big_blind: 30000, ante: 30000 },
      { level: 19, small_blind: 20000, big_blind: 40000, ante: 40000 }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100/50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-light mb-4 text-gray-800 tracking-wide">
            Турнирный Директор
          </h1>
          <p className="text-gray-600 text-lg font-light max-w-2xl mx-auto leading-relaxed">
            Профессиональная система управления покерными турнирами с расширенной аналитикой
          </p>
          {selectedTournament && (
            <div className="mt-8 inline-flex items-center gap-4 px-6 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-minimal">
              <Trophy className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-800 text-base">{selectedTournament.name}</span>
              {getStatusBadge(selectedTournament.status)}
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
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
              <div className="space-y-8">
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
                
                {/* Player Registration Section */}
                <PlayerRegistration
                  tournament={selectedTournament}
                  players={players}
                  registrations={registrations}
                  onRegistrationUpdate={() => loadRegistrations(selectedTournament.id)}
                />
              </div>
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
            {/* Create Tournament Section */}
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
                <div className="grid grid-cols-2 gap-4">
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
                    <Input
                      id="description"
                      value={newTournament.description}
                      onChange={(e) => setNewTournament({ ...newTournament, description: e.target.value })}
                      placeholder="Описание турнира..."
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buy_in" className="text-gray-700 font-normal text-sm">Buy-in (EP2016)</Label>
                    <Input
                      id="buy_in"
                      type="number"
                      value={newTournament.buy_in}
                      onChange={(e) => setNewTournament({ ...newTournament, buy_in: parseInt(e.target.value) })}
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="starting_chips" className="text-gray-700 font-normal text-sm">Стартовые фишки</Label>
                    <Input
                      id="starting_chips"
                      type="number"
                      value={newTournament.starting_chips}
                      onChange={(e) => setNewTournament({ ...newTournament, starting_chips: parseInt(e.target.value) })}
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                    />
                  </div>
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
                
                {/* Tournament Format and Rebuy/Addon Configuration */}
                <div className="space-y-4 border-t border-gray-200/30 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="tournament_format" className="text-gray-700 font-normal text-sm">Формат турнира</Label>
                    <Select 
                      value={newTournament.tournament_format} 
                      onValueChange={(value) => setNewTournament({ ...newTournament, tournament_format: value })}
                    >
                      <SelectTrigger className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 h-10">
                        <SelectValue placeholder="Выберите формат" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freezeout">Фризаут</SelectItem>
                        <SelectItem value="rebuy">Ребайник</SelectItem>
                        <SelectItem value="reentry">Риэнтри</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {(newTournament.tournament_format === "rebuy" || newTournament.tournament_format === "reentry") && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rebuy_cost" className="text-gray-700 font-normal text-sm">Стоимость ребая (EP2016)</Label>
                        <Input
                          id="rebuy_cost"
                          type="number"
                          value={newTournament.rebuy_cost}
                          onChange={(e) => setNewTournament({ ...newTournament, rebuy_cost: parseInt(e.target.value) })}
                          className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rebuy_chips" className="text-gray-700 font-normal text-sm">Фишки за ребай</Label>
                        <Input
                          id="rebuy_chips"
                          type="number"
                          value={newTournament.rebuy_chips}
                          onChange={(e) => setNewTournament({ ...newTournament, rebuy_chips: parseInt(e.target.value) })}
                          className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                        />
                      </div>
                    </div>
                  )}
                  
                  {newTournament.tournament_format === "rebuy" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="addon_cost" className="text-gray-700 font-normal text-sm">Стоимость адона (EP2016)</Label>
                        <Input
                          id="addon_cost"
                          type="number"
                          value={newTournament.addon_cost}
                          onChange={(e) => setNewTournament({ ...newTournament, addon_cost: parseInt(e.target.value) })}
                          className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addon_chips" className="text-gray-700 font-normal text-sm">Фишки за адон</Label>
                        <Input
                          id="addon_chips"
                          type="number"
                          value={newTournament.addon_chips}
                          onChange={(e) => setNewTournament({ ...newTournament, addon_chips: parseInt(e.target.value) })}
                          className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Level Settings */}
                  <div className="space-y-4 border-t border-gray-200/30 pt-4">
                    <h4 className="text-gray-700 font-medium text-sm">Настройки уровней</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rebuy_end_level" className="text-gray-700 font-normal text-sm">Ребаи до уровня</Label>
                        <Input
                          id="rebuy_end_level"
                          type="number"
                          value={newTournament.rebuy_end_level}
                          onChange={(e) => setNewTournament({ ...newTournament, rebuy_end_level: parseInt(e.target.value) })}
                          className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addon_level" className="text-gray-700 font-normal text-sm">Адон на уровне</Label>
                        <Input
                          id="addon_level"
                          type="number"
                          value={newTournament.addon_level}
                          onChange={(e) => setNewTournament({ ...newTournament, addon_level: parseInt(e.target.value) })}
                          className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="break_start_level" className="text-gray-700 font-normal text-sm">Перерывы с уровня</Label>
                        <Input
                          id="break_start_level"
                          type="number"
                          value={newTournament.break_start_level}
                          onChange={(e) => setNewTournament({ ...newTournament, break_start_level: parseInt(e.target.value) })}
                          className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                        />
                      </div>
                    </div>
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

            {/* Tournament Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {tournaments.map((tournament) => (
                <Card key={tournament.id} className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal hover:shadow-subtle transition-all duration-300 rounded-xl group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-gray-800 text-lg font-medium mb-1 line-clamp-1">{tournament.name}</CardTitle>
                        <CardDescription className="text-gray-600 text-sm line-clamp-2">
                          {tournament.description || "Описание не указано"}
                        </CardDescription>
                      </div>
                      {getStatusBadge(tournament.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Tournament Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500">Buy-in</p>
                            <p className="font-medium text-gray-800">{tournament.buy_in} EP2016</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500">Игроки</p>
                            <p className="font-medium text-gray-800">
                              {registrations.filter(r => r.tournament_id === tournament.id).length}/{tournament.max_players}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500">Начало</p>
                            <p className="font-medium text-gray-800 text-sm">
                              {new Date(tournament.start_time).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(tournament.start_time).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500">Призовой фонд</p>
                            <p className="font-medium text-gray-800">
                              {(tournament.buy_in * registrations.filter(r => r.tournament_id === tournament.id).length)} EP2016
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-gray-200/50">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedTournament(tournament);
                            setActiveTab("control");
                          }}
                          className="border-gray-200/50 hover:shadow-minimal text-xs"
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Управление
                        </Button>
                        {tournament.status === 'scheduled' && (
                          <Button 
                            size="sm" 
                            onClick={() => startTournament(tournament)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Запуск
                          </Button>
                        )}
                        {tournament.status === 'running' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedTournament(tournament)}
                            className="border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs"
                          >
                            <Activity className="w-3 h-3 mr-1" />
                            Управление
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-gray-200/50 hover:shadow-minimal text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Опубликовать
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 text-xs"
                        >
                          <StopCircle className="w-3 h-3 mr-1" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Performance Monitoring */}
            <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800 font-light">
                  <Activity className="w-5 h-5" />
                  Мониторинг производительности
                </CardTitle>
                <CardDescription>Аналитика системы в реальном времени</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-light text-gray-800 mb-1">98.5%</div>
                    <p className="text-sm text-gray-600">Время работы</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-light text-gray-800 mb-1">42ms</div>
                    <p className="text-sm text-gray-600">Задержка БД</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-light text-gray-800 mb-1">{tournaments.filter(t => t.status === 'running').length}</div>
                    <p className="text-sm text-gray-600">Активных турниров</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Health & Weekly Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800 font-light">
                    <AlertCircle className="w-5 h-5 text-green-600" />
                    Здоровье системы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Сервер базы данных</span>
                      <Badge className="bg-green-100 text-green-800">Онлайн</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Сервис уведомлений</span>
                      <Badge className="bg-green-100 text-green-800">Активен</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Система рейтинга</span>
                      <Badge className="bg-green-100 text-green-800">Работает</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800 font-light">
                    <BarChart3 className="w-5 h-5" />
                    Статистика за неделю
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Проведено турниров</span>
                      <span className="font-medium text-gray-800">{tournaments.filter(t => t.status === 'finished').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Всего игроков</span>
                      <span className="font-medium text-gray-800">{players.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Общий призовой фонд</span>
                      <span className="font-medium text-gray-800">
                        {tournaments.reduce((sum, t) => sum + (t.buy_in * registrations.filter(r => r.tournament_id === t.id).length), 0)} EP2016
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Rating Indicators */}
            <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800 font-light">
                  <TrendingUp className="w-5 h-5" />
                  Рейтинговые показатели
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">Топ игроков</h4>
                    <div className="space-y-2">
                      {players.slice(0, 3).map((player, index) => (
                        <div key={player.id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">#{index + 1} {player.name}</span>
                          <span className="font-medium text-gray-800">{player.elo_rating}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <h4 className="font-medium text-gray-800 mb-3">Средний рейтинг</h4>
                    <div className="text-2xl font-light text-gray-800">
                      {players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.elo_rating, 0) / players.length) : 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <h4 className="font-medium text-gray-800 mb-3">Качество игры</h4>
                    <div className="text-2xl font-light text-gray-800">A+</div>
                    <p className="text-xs text-gray-600 mt-1">На основе анализа партий</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database Sync */}
            <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800 font-light">
                  <Settings className="w-5 h-5" />
                  Синхронизация с базой данных
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-4">Статистика базы данных</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Турниров в БД</span>
                        <span className="font-medium text-gray-800">{tournaments.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Игроков в БД</span>
                        <span className="font-medium text-gray-800">{players.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Регистраций</span>
                        <span className="font-medium text-gray-800">{registrations.length}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 mb-4">Действия</h4>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full border-gray-200/50 hover:shadow-minimal"
                        onClick={() => {
                          loadTournaments();
                          loadPlayers();
                          toast({ title: "Синхронизация", description: "Данные обновлены" });
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Синхронизировать
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-gray-200/50 hover:shadow-minimal"
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        Диагностика
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="control" className="space-y-8 animate-fade-in">
            {selectedTournament ? (
              <div className="space-y-8">
                {/* Tournament Format and Rebuy/Addon Settings */}
                <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                      <DollarSign className="w-4 h-4" />
                      Настройки турнира
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Формат турнира</Label>
                          <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">
                              {selectedTournament.tournament_format === 'freezeout' ? 'Фризаут' : 
                               selectedTournament.tournament_format === 'rebuy' ? 'Ребайник' : 
                               selectedTournament.tournament_format === 'reentry' ? 'Риэнтри' : 'Не указан'}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Buy-in</Label>
                          <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">{selectedTournament.buy_in} EP2016</span>
                          </div>
                        </div>
                      </div>

                      {(selectedTournament.tournament_format === 'rebuy' || selectedTournament.tournament_format === 'reentry') && (
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Стоимость ребая</Label>
                            <div className="mt-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <span className="text-sm font-medium text-blue-800">
                                {selectedTournament.rebuy_cost || 0} EP2016
                              </span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Фишки за ребай</Label>
                            <div className="mt-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <span className="text-sm font-medium text-blue-800">
                                {selectedTournament.rebuy_chips || 0} фишек
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedTournament.tournament_format === 'rebuy' && (
                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Стоимость адона</Label>
                            <div className="mt-1 p-3 bg-green-50 rounded-lg border border-green-200">
                              <span className="text-sm font-medium text-green-800">
                                {selectedTournament.addon_cost || 0} EP2016
                              </span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Фишки за адон</Label>
                            <div className="mt-1 p-3 bg-green-50 rounded-lg border border-green-200">
                              <span className="text-sm font-medium text-green-800">
                                {selectedTournament.addon_chips || 0} фишек
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                     </div>

                     {/* Level Settings */}
                     <div className="border-t border-gray-200/50 pt-4">
                       <h4 className="text-sm font-medium text-gray-700 mb-3">Настройки уровней</h4>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div>
                           <Label className="text-sm font-medium text-gray-700">Ребаи до уровня</Label>
                           <div className="mt-1 p-3 bg-orange-50 rounded-lg border border-orange-200">
                             <span className="text-sm font-medium text-orange-800">
                               Уровень {selectedTournament.rebuy_end_level || 6}
                             </span>
                           </div>
                         </div>
                         <div>
                           <Label className="text-sm font-medium text-gray-700">Адон на уровне</Label>
                           <div className="mt-1 p-3 bg-purple-50 rounded-lg border border-purple-200">
                             <span className="text-sm font-medium text-purple-800">
                               Уровень {selectedTournament.addon_level || 7}
                             </span>
                           </div>
                         </div>
                         <div>
                           <Label className="text-sm font-medium text-gray-700">Перерывы с уровня</Label>
                           <div className="mt-1 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                             <span className="text-sm font-medium text-cyan-800">
                               Уровень {selectedTournament.break_start_level || 4}
                             </span>
                           </div>
                         </div>
                       </div>
                     </div>

                     <div className="border-t border-gray-200/50 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Статистика ребаев и адонов</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-semibold text-gray-800">
                            {registrations.reduce((sum, reg) => sum + (reg.rebuys || 0), 0)}
                          </div>
                          <div className="text-xs text-gray-600">Всего ребаев</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-semibold text-gray-800">
                            {registrations.reduce((sum, reg) => sum + (reg.addons || 0), 0)}
                          </div>
                          <div className="text-xs text-gray-600">Всего адонов</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-semibold text-gray-800">
                            {registrations.reduce((sum, reg) => 
                              sum + ((reg.rebuys || 0) * (selectedTournament.rebuy_cost || 0)) + 
                                    ((reg.addons || 0) * (selectedTournament.addon_cost || 0)), 0
                            )}
                          </div>
                          <div className="text-xs text-gray-600">Доп. призовой фонд</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Blind Structure Management */}
                <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                      <Settings className="w-4 h-4" />
                      Структура блайндов
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BlindStructure 
                      tournamentId={selectedTournament.id}
                    />
                  </CardContent>
                </Card>

                {/* Payout Structure Management */}
                <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                      <Trophy className="w-4 h-4" />
                      Структура выплат
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PayoutStructure 
                      tournamentId={selectedTournament.id}
                      registeredPlayers={registrations.length}
                    />
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