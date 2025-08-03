import React, { useState, useEffect, useRef } from "react";
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
import { Trophy, Users, Clock, Settings, Plus, Play, Pause, Square, RotateCcw, CheckCircle, UserPlus, Volume2, Maximize, StopCircle, ChevronLeft, ChevronRight, Activity, TrendingUp, AlertCircle, DollarSign, Target, BarChart3, Edit, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/auth/AuthGuard";

// Import components
import PlayerRegistration from "@/components/PlayerRegistration";
import TournamentOverview from "@/components/TournamentOverview";
import BlindStructure from "@/components/BlindStructure";
import PayoutStructure from "@/components/PayoutStructure";
import TournamentSyncManager from "@/components/TournamentSyncManager";
import RatingManagement from "@/components/RatingManagement";
import TournamentResults from "@/components/TournamentResults";
import RatingSystemTest from "@/components/RatingSystemTest";

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
  is_published: boolean;
  is_archived: boolean;
  finished_at?: string;
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

const EnhancedTournamentDirector = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [tournamentResults, setTournamentResults] = useState<{[key: string]: number}>({});
  const [activeTab, setActiveTab] = useState("overview");
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
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

  // Load functions
  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Tournament loading error:', error);
        toast({ title: "Ошибка", description: "Не удалось загрузить турниры", variant: "destructive" });
      } else {
        setTournaments(data || []);
        
        // Restore selected tournament after loading
        const savedTournamentId = localStorage.getItem('selectedTournamentId');
        if (savedTournamentId && data) {
          const savedTournament = data.find(t => t.id === savedTournamentId);
          if (savedTournament) {
            setSelectedTournament(savedTournament);
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error loading tournaments:', err);
      toast({ title: "Ошибка", description: "Неожиданная ошибка при загрузке турниров", variant: "destructive" });
    }
  };

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('elo_rating', { ascending: false });

      if (error) {
        toast({ title: "Ошибка", description: "Не удалось загрузить игроков", variant: "destructive" });
      } else {
        setPlayers(data || []);
      }
    } catch (error) {
      console.error('Unexpected error loading players:', error);
    }
  };

  const loadRegistrations = async (tournamentId: string) => {
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`
          *,
          player:players(*)
        `)
        .eq('tournament_id', tournamentId);

      if (error) {
        console.error('Registration loading error:', error);
        toast({ title: "Ошибка", description: "Не удалось загрузить регистрации", variant: "destructive" });
      } else {
        setRegistrations(data || []);
      }
    } catch (error) {
      console.error('Unexpected error loading registrations:', error);
      toast({ title: "Ошибка", description: "Неожиданная ошибка при загрузке регистраций", variant: "destructive" });
    }
  };

  // Simple data loading without real-time subscriptions
  useEffect(() => {
    const initData = async () => {
      try {
        await Promise.all([loadTournaments(), loadPlayers()]);
      } catch (error) {
        console.warn('Error loading initial data:', error);
      }
    };
    
    initData();
  }, []);

  // Load tournament data when selected
  useEffect(() => {
    if (selectedTournament?.id) {
      loadRegistrations(selectedTournament.id);
      setCurrentTime(selectedTournament.timer_remaining || 0);
      localStorage.setItem('selectedTournamentId', selectedTournament.id);
    }
  }, [selectedTournament?.id]);

  // Simplified timer without automatic DB updates
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (timerActive && currentTime > 0 && selectedTournament) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev - 1;
          
          // Sync with database every 30 seconds to reduce load
          if (newTime % 30 === 0 && selectedTournament) {
            syncTimerWithDatabase(selectedTournament.id, newTime).catch(console.warn);
          }
          
          if (newTime <= 0) {
            setTimerActive(false);
            toast({
              title: "Время истекло!",
              description: "Уровень блайндов автоматически повышен",
            });
            // Use setTimeout to avoid state updates during render
            setTimeout(() => {
              nextBlindLevel().catch(console.warn);
            }, 100);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive, selectedTournament?.id]);

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
      // Manually reload data
      setTimeout(() => {
        loadTournaments();
      }, 500);
      
      // Create default blind levels
      if (data) {
        await createDefaultBlindLevels(data.id);
      }
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
      // Manually reload data
      setTimeout(() => {
        loadPlayers();
      }, 500);
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
      // Manually reload data
      setTimeout(() => {
        loadTournaments();
      }, 500);
    }
  };

  const nextBlindLevel = async () => {
    if (!selectedTournament) return;

    // Get next level from blind structure
    const { data: nextLevel, error: fetchError } = await supabase
      .from('blind_levels')
      .select('*')
      .eq('tournament_id', selectedTournament.id)
      .eq('level', selectedTournament.current_level + 1)
      .maybeSingle();

    let newLevel, newSmallBlind, newBigBlind, newTimerTime;

    if (fetchError || !nextLevel) {
      // Fallback to simple multiplication if structure not found
      newLevel = selectedTournament.current_level + 1;
      newSmallBlind = Math.round(selectedTournament.current_small_blind * 1.5);
      newBigBlind = Math.round(selectedTournament.current_big_blind * 1.5);
      newTimerTime = selectedTournament.timer_duration;
    } else {
      // Use data from blind structure
      newLevel = nextLevel.level;
      newSmallBlind = nextLevel.small_blind;
      newBigBlind = nextLevel.big_blind;
      newTimerTime = nextLevel.duration;
    }

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
      const levelType = nextLevel?.is_break ? "перерыв" : "уровень";
      toast({ title: "Успех", description: `${levelType.charAt(0).toUpperCase() + levelType.slice(1)} ${newLevel} начат` });
      setCurrentTime(newTimerTime);
      setSelectedTournament({
        ...selectedTournament,
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind,
        timer_remaining: newTimerTime
      });
      // Manually reload data
      setTimeout(() => {
        loadTournaments();
      }, 500);
    }
  };

  const prevBlindLevel = async () => {
    if (!selectedTournament || selectedTournament.current_level <= 1) return;

    // Get previous level from blind structure
    const { data: prevLevel, error: fetchError } = await supabase
      .from('blind_levels')
      .select('*')
      .eq('tournament_id', selectedTournament.id)
      .eq('level', selectedTournament.current_level - 1)
      .maybeSingle();

    let newLevel, newSmallBlind, newBigBlind, newTimerTime;

    if (fetchError || !prevLevel) {
      // Fallback to simple division if structure not found
      newLevel = selectedTournament.current_level - 1;
      newSmallBlind = Math.round(selectedTournament.current_small_blind / 1.5);
      newBigBlind = Math.round(selectedTournament.current_big_blind / 1.5);
      newTimerTime = selectedTournament.timer_duration;
    } else {
      // Use data from blind structure
      newLevel = prevLevel.level;
      newSmallBlind = prevLevel.small_blind;
      newBigBlind = prevLevel.big_blind;
      newTimerTime = prevLevel.duration;
    }

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
      const levelType = prevLevel?.is_break ? "перерыв" : "уровень";
      toast({ title: "Успех", description: `Возврат к ${levelType} ${newLevel}` });
      setCurrentTime(newTimerTime);
      setSelectedTournament({
        ...selectedTournament,
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind,
        timer_remaining: newTimerTime
      });
      // Manually reload data
      setTimeout(() => {
        loadTournaments();
      }, 500);
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
      // Manually reload data
      setTimeout(() => {
        loadTournaments();
      }, 500);
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

  const syncTimerWithDatabase = async (tournamentId: string, timeRemaining: number) => {
    try {
      await supabase.rpc('update_tournament_timer', {
        tournament_id_param: tournamentId,
        new_timer_remaining: timeRemaining
      });
    } catch (error) {
      console.error('Error syncing timer:', error);
    }
  };

  const adjustTimer = async (seconds: number) => {
    if (!selectedTournament) return;
    
    const newTime = Math.max(0, currentTime + seconds);
    setCurrentTime(newTime);
    
    // Immediately sync with database
    await syncTimerWithDatabase(selectedTournament.id, newTime);
    
    toast({ 
      title: "Таймер изменен", 
      description: `${seconds > 0 ? 'Добавлено' : 'Убрано'} ${Math.abs(seconds)} секунд`
    });
  };

  const finishTournament = async () => {
    if (!selectedTournament || Object.keys(tournamentResults).length === 0) {
      toast({ title: "Ошибка", description: "Укажите места игроков", variant: "destructive" });
      return;
    }

    try {
      console.log('Начинаем завершение турнира:', selectedTournament.id);
      
      // Prepare results for ELO calculation with rebuys/addons
      const results = Object.entries(tournamentResults).map(([playerId, position]) => {
        const registration = registrations.find(reg => reg.player_id === playerId);
        return {
          player_id: playerId,
          position: position,
          rebuys: registration?.rebuys || 0,
          addons: registration?.addons || 0
        };
      });
      
      console.log('Подготовленные результаты для ELO:', results);

      // Call ELO calculation function
      const { data, error } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: selectedTournament.id,
          results: results
        }
      });

      console.log('Ответ от calculate-elo:', { data, error });

      if (error) {
        console.error('Ошибка при расчете ELO:', error);
        throw error;
      }

      toast({ 
        title: "Турнир завершен", 
        description: "Рейтинг игроков обновлен",
      });

      setIsFinishDialogOpen(false);
      setTournamentResults({});
      // Manually reload data
      setTimeout(() => {
        loadTournaments();
        loadPlayers();
      }, 500);

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
    <AuthGuard requireAdmin={true}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100/50">
        <div className="container mx-auto py-8 px-4">
        <div className="mb-12 flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-elegant border border-gray-200/30">
              <img 
                src="/lovable-uploads/c77304bf-5309-4bdc-afcc-a81c8d3ff6c2.png" 
                alt="IPS Logo" 
                className="w-12 h-12 object-contain"
              />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-light mb-2 text-gray-800 tracking-wide">
                IPS Tournament Manager
              </h1>
              <p className="text-gray-600 text-base font-light leading-relaxed">
                Профессиональная система управления покерными турнирами с расширенной аналитикой
              </p>
            </div>
          </div>
          {selectedTournament && (
            <div className="mt-8 inline-flex items-center gap-4 px-6 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-minimal">
              <Trophy className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-800 text-base">{selectedTournament.name}</span>
              {getStatusBadge(selectedTournament.status)}
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
          <TabsList className="grid w-full grid-cols-8 bg-poker-surface-elevated border border-poker-border shadow-card rounded-2xl p-2 h-16">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-button data-[state=active]:text-white data-[state=active]:shadow-accent transition-all duration-300 rounded-xl font-medium"
            >
              <Activity className="w-5 h-5 mr-2" />
              Управление
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
              Структура
            </TabsTrigger>
            <TabsTrigger 
              value="players" 
              className="data-[state=active]:bg-gradient-button data-[state=active]:text-white data-[state=active]:shadow-accent transition-all duration-300 rounded-xl font-medium"
            >
              <Users className="w-5 h-5 mr-2" />
              Игроки
            </TabsTrigger>
            <TabsTrigger 
              value="sync" 
              className="data-[state=active]:bg-gradient-button data-[state=active]:text-white data-[state=active]:shadow-accent transition-all duration-300 rounded-xl font-medium"
            >
              <Settings className="w-5 h-5 mr-2" />
              Синхронизация
            </TabsTrigger>
            <TabsTrigger 
              value="ratings" 
              className="data-[state=active]:bg-gradient-button data-[state=active]:text-white data-[state=active]:shadow-accent transition-all duration-300 rounded-xl font-medium"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Рейтинги
            </TabsTrigger>
            <TabsTrigger 
              value="results" 
              className="data-[state=active]:bg-gradient-button data-[state=active]:text-white data-[state=active]:shadow-accent transition-all duration-300 rounded-xl font-medium"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Результаты
            </TabsTrigger>
            <TabsTrigger 
              value="rating-test" 
              className="data-[state=active]:bg-gradient-button data-[state=active]:text-white data-[state=active]:shadow-accent transition-all duration-300 rounded-xl font-medium"
            >
              <Calculator className="w-5 h-5 mr-2" />
              Тест
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
                  onTimerAdjust={adjustTimer}
                  onFinishTournament={() => setIsFinishDialogOpen(true)}
                  onRefresh={() => {
                    setTimeout(() => {
                      loadTournaments();
                      loadPlayers();
                      if (selectedTournament?.id) {
                        loadRegistrations(selectedTournament.id);
                      }
                    }, 300);
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
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rebuy_cost" className="text-gray-700 font-normal text-sm">Стоимость ребая</Label>
                    <Input
                      id="rebuy_cost"
                      type="number"
                      value={newTournament.rebuy_cost}
                      onChange={(e) => setNewTournament({ ...newTournament, rebuy_cost: parseInt(e.target.value) })}
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addon_cost" className="text-gray-700 font-normal text-sm">Стоимость аддона</Label>
                    <Input
                      id="addon_cost"
                      type="number"
                      value={newTournament.addon_cost}
                      onChange={(e) => setNewTournament({ ...newTournament, addon_cost: parseInt(e.target.value) })}
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
                  <div className="space-y-2">
                    <Label htmlFor="addon_chips" className="text-gray-700 font-normal text-sm">Фишки за аддон</Label>
                    <Input
                      id="addon_chips"
                      type="number"
                      value={newTournament.addon_chips}
                      onChange={(e) => setNewTournament({ ...newTournament, addon_chips: parseInt(e.target.value) })}
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rebuy_end_level" className="text-gray-700 font-normal text-sm">Конец ребаев (уровень)</Label>
                    <Input
                      id="rebuy_end_level"
                      type="number"
                      value={newTournament.rebuy_end_level}
                      onChange={(e) => setNewTournament({ ...newTournament, rebuy_end_level: parseInt(e.target.value) })}
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addon_level" className="text-gray-700 font-normal text-sm">Аддон (уровень)</Label>
                    <Input
                      id="addon_level"
                      type="number"
                      value={newTournament.addon_level}
                      onChange={(e) => setNewTournament({ ...newTournament, addon_level: parseInt(e.target.value) })}
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tournament_format" className="text-gray-700 font-normal text-sm">Формат турнира</Label>
                    <Select value={newTournament.tournament_format} onValueChange={(value) => setNewTournament({ ...newTournament, tournament_format: value })}>
                      <SelectTrigger className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10">
                        <SelectValue placeholder="Выберите формат" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freezeout">Freezeout</SelectItem>
                        <SelectItem value="rebuy">Rebuy</SelectItem>
                        <SelectItem value="turbo">Turbo</SelectItem>
                        <SelectItem value="hyper-turbo">Hyper Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={createTournament}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg px-8 py-3"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Создать турнир
                </Button>
              </CardContent>
            </Card>

            {/* Tournament List */}
            <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-gray-800 text-lg font-light">
                  <Trophy className="w-5 h-5 text-gray-600" />
                  Список турниров
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {tournaments.map((tournament) => (
                    <div key={tournament.id} className="p-4 border rounded-lg bg-white/50 hover:bg-white/70 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-800">{tournament.name}</h4>
                            {getStatusBadge(tournament.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{tournament.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Buy-in: {tournament.buy_in} EP</span>
                            <span>Макс. игроков: {tournament.max_players}</span>
                            <span>Уровень: {tournament.current_level}</span>
                            <span>Блайнды: {tournament.current_small_blind}/{tournament.current_big_blind}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant={selectedTournament?.id === tournament.id ? "default" : "outline"}
                            onClick={() => setSelectedTournament(tournament)}
                          >
                            {selectedTournament?.id === tournament.id ? "Выбран" : "Выбрать"}
                          </Button>
                          {tournament.status === 'registration' && (
                            <Button
                              size="sm"
                              onClick={() => startTournament(tournament)}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Запустить
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="control" className="space-y-8 animate-fade-in">
            {selectedTournament ? (
              <BlindStructure 
                tournamentId={selectedTournament.id} 
              />
            ) : (
              <Card className="bg-gradient-card border border-poker-border shadow-elevated rounded-2xl">
                <CardContent className="text-center py-20">
                  <Settings className="w-20 h-20 mx-auto mb-8 text-poker-text-muted" />
                  <h3 className="text-3xl font-bold mb-4 text-poker-text-primary">Выберите турнир</h3>
                  <p className="text-poker-text-secondary text-lg">Выберите турнир для настройки структуры блайндов</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="players" className="space-y-8 animate-fade-in">
            {/* Add Player */}
            <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal hover:shadow-subtle transition-all duration-300 rounded-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-gray-800 text-lg font-light">
                  <div className="p-2 bg-gray-100/80 rounded-lg">
                    <UserPlus className="w-5 h-5 text-gray-600" />
                  </div>
                  Добавить игрока
                </CardTitle>
                <CardDescription className="text-gray-600 text-sm">Зарегистрируйте нового игрока в системе</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="player_name" className="text-gray-700 font-normal text-sm">Имя игрока</Label>
                    <Input
                      id="player_name"
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                      placeholder="Введите имя игрока"
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="player_email" className="text-gray-700 font-normal text-sm">Email</Label>
                    <Input
                      id="player_email"
                      type="email"
                      value={newPlayer.email}
                      onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                      placeholder="email@example.com"
                      className="bg-white/50 border-gray-200/50 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 transition-all duration-200 rounded-lg h-10"
                    />
                  </div>
                </div>
                <Button 
                  onClick={addPlayer}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg px-8 py-3"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Добавить игрока
                </Button>
              </CardContent>
            </Card>

            {/* Players List */}
            <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-gray-800 text-lg font-light">
                  <Users className="w-5 h-5 text-gray-600" />
                  Список игроков ({players.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Рейтинг ELO</TableHead>
                      <TableHead>Игр сыграно</TableHead>
                      <TableHead>Побед</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell>{player.email}</TableCell>
                        <TableCell>
                          <Badge variant={player.elo_rating >= 1400 ? "default" : "secondary"}>
                            {player.elo_rating}
                          </Badge>
                        </TableCell>
                        <TableCell>{player.games_played}</TableCell>
                        <TableCell>{player.wins}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync" className="space-y-8 animate-fade-in">
            <TournamentSyncManager 
              tournaments={tournaments}
              onRefresh={loadTournaments}
            />
          </TabsContent>

          <TabsContent value="ratings" className="space-y-8 animate-fade-in">
            <RatingManagement 
              tournaments={tournaments}
              selectedTournament={selectedTournament}
              onRefresh={loadTournaments}
            />
          </TabsContent>

          <TabsContent value="results" className="space-y-8 animate-fade-in">
            {selectedTournament ? (
              <TournamentResults selectedTournament={selectedTournament} />
            ) : (
              <Card className="bg-gradient-card border border-poker-border shadow-elevated rounded-2xl">
                <CardContent className="text-center py-20">
                  <Trophy className="w-20 h-20 mx-auto mb-8 text-poker-text-muted" />
                  <h3 className="text-3xl font-bold mb-4 text-poker-text-primary">Выберите турнир</h3>
                  <p className="text-poker-text-secondary text-lg">Выберите турнир для просмотра результатов</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rating-test" className="space-y-8 animate-fade-in">
            <RatingSystemTest />
          </TabsContent>
        </Tabs>

        {/* Finish Tournament Dialog */}
        <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Завершить турнир</DialogTitle>
              <DialogDescription>
                Укажите места игроков для расчета рейтинга
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {registrations.map((reg, index) => (
                <div key={reg.id} className="flex items-center justify-between p-3 border rounded">
                  <span className="font-medium">{reg.player.name}</span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`position-${reg.player_id}`}>Место:</Label>
                    <Input
                      id={`position-${reg.player_id}`}
                      type="number"
                      min="1"
                      max={registrations.length}
                      value={tournamentResults[reg.player_id] || ""}
                      onChange={(e) => setTournamentResults({
                        ...tournamentResults,
                        [reg.player_id]: parseInt(e.target.value)
                      })}
                      className="w-20"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsFinishDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={finishTournament}>
                Завершить турнир
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </AuthGuard>
  );
};

export default EnhancedTournamentDirector;