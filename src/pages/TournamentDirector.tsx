import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Users, 
  Settings, 
  BarChart3, 
  TrendingUp, 
  Target, 
  CheckCircle, 
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Square,
  Timer,
  AlertTriangle
} from "lucide-react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { TournamentCreationModal } from "@/components/TournamentCreationModal";
import TournamentOverview from "@/components/TournamentOverview";
import PlayerManagement from "@/components/PlayerManagement";
import BlindStructure from "@/components/BlindStructure";
import PayoutStructure from "@/components/PayoutStructure";
import ManualAdjustments from "@/components/ManualAdjustments";
import RatingManagement from "@/components/RatingManagement";
import TournamentResults from "@/components/TournamentResults";
import TournamentSyncManager from "@/components/TournamentSyncManager";
import RatingSystemTest from "@/components/RatingSystemTest";

// Используем типы из базы данных
type Tournament = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  buy_in: number;
  max_players: number;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number | null;
  timer_remaining: number | null;
  rebuy_cost: number | null;
  addon_cost: number | null;
  rebuy_chips: number | null;
  addon_chips: number | null;
  starting_chips: number;
  tournament_format: string | null;
  addon_level: number | null;
  break_start_level: number | null;
  rebuy_end_level: number | null;
  start_time: string;
  created_at: string;
  finished_at: string | null;
  is_published: boolean | null;
  is_archived: boolean | null;
  updated_at: string;
};

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

const TournamentDirector = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadTournaments();
    loadPlayers();
  }, []);

  // Auto-select tournament logic
  useEffect(() => {
    if (tournaments.length > 0 && !selectedTournament) {
      const savedTournamentId = localStorage.getItem('selectedTournamentId');
      
      let tournamentToSelect = null;
      
      if (savedTournamentId) {
        tournamentToSelect = tournaments.find(t => t.id === savedTournamentId);
      }
      
      if (!tournamentToSelect) {
        tournamentToSelect = tournaments.find(t => t.status === 'running') || tournaments[0];
      }
      
      if (tournamentToSelect) {
        setSelectedTournament(tournamentToSelect);
        localStorage.setItem('selectedTournamentId', tournamentToSelect.id);
      }
    }
  }, [tournaments, selectedTournament]);

  // Load registrations when tournament changes
  useEffect(() => {
    if (selectedTournament) {
      loadRegistrations(selectedTournament.id);
      
      // Восстановить состояние таймера из localStorage
      const savedTimerState = localStorage.getItem(`timer_${selectedTournament.id}`);
      if (savedTimerState) {
        const { currentTime: savedTime, timerActive: savedActive, lastUpdate } = JSON.parse(savedTimerState);
        const timePassed = Math.floor((Date.now() - lastUpdate) / 1000);
        
        if (savedActive && savedTime > timePassed) {
          setCurrentTime(savedTime - timePassed);
          setTimerActive(true);
        } else {
          setCurrentTime(savedTime);
          setTimerActive(false);
        }
      } else {
        setCurrentTime(selectedTournament.timer_remaining || selectedTournament.timer_duration || 1200);
        setTimerActive(false);
      }
      
      localStorage.setItem('selectedTournamentId', selectedTournament.id);
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
            // Сохранить завершенное состояние
            if (selectedTournament) {
              localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
                currentTime: 0,
                timerActive: false,
                lastUpdate: Date.now()
              }));
              updateTimerInDatabase(0);
            }
            return 0;
          }
          
          // Сохранить текущее состояние каждые 10 секунд
          if (newTime % 10 === 0 && selectedTournament) {
            localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
              currentTime: newTime,
              timerActive: true,
              lastUpdate: Date.now()
            }));
            updateTimerInDatabase(newTime);
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Сохранить состояние при остановке таймера
      if (selectedTournament) {
        localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
          currentTime,
          timerActive: false,
          lastUpdate: Date.now()
        }));
        updateTimerInDatabase(currentTime);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive, currentTime, selectedTournament]);

  const loadTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTournaments(data);
    }
  };

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name');

    if (!error && data) {
      setPlayers(data);
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

    if (!error && data) {
      setRegistrations(data);
    }
  };

  const updateTimerInDatabase = async (timeRemaining: number) => {
    if (!selectedTournament) return;
    
    await supabase
      .from('tournaments')
      .update({ timer_remaining: timeRemaining })
      .eq('id', selectedTournament.id);
  };

  const handleTournamentSelect = (tournament: Tournament) => {
    console.log('Selecting tournament:', tournament.id);
    setSelectedTournament(tournament);
    
    // Остановим таймер при смене турнира
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setTimerActive(false);
    }
  };

  const toggleTimer = () => {
    const newTimerActive = !timerActive;
    setTimerActive(newTimerActive);
    
    // Сохранить состояние при переключении
    if (selectedTournament) {
      localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
        currentTime,
        timerActive: newTimerActive,
        lastUpdate: Date.now()
      }));
    }
  };

  const resetTimer = () => {
    if (selectedTournament) {
      const resetTime = selectedTournament.timer_duration || 1200;
      setCurrentTime(resetTime);
      setTimerActive(false);
      
      // Сохранить сброшенное состояние
      localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
        currentTime: resetTime,
        timerActive: false,
        lastUpdate: Date.now()
      }));
      updateTimerInDatabase(resetTime);
    }
  };

  const nextLevel = async () => {
    if (!selectedTournament) return;

    const newLevel = selectedTournament.current_level + 1;
    const newSmallBlind = Math.round(selectedTournament.current_small_blind * 1.5);
    const newBigBlind = Math.round(selectedTournament.current_big_blind * 1.5);
    const resetTime = selectedTournament.timer_duration || 1200;

    const { error } = await supabase
      .from('tournaments')
      .update({
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind,
        timer_remaining: resetTime
      })
      .eq('id', selectedTournament.id);

    if (!error) {
      setSelectedTournament({
        ...selectedTournament,
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind
      });
      setCurrentTime(resetTime);
      setTimerActive(false);
      
      // Сохранить новое состояние таймера
      localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
        currentTime: resetTime,
        timerActive: false,
        lastUpdate: Date.now()
      }));
    }
  };

  const prevLevel = async () => {
    if (!selectedTournament || selectedTournament.current_level <= 1) return;

    const newLevel = selectedTournament.current_level - 1;
    const newSmallBlind = Math.round(selectedTournament.current_small_blind / 1.5);
    const newBigBlind = Math.round(selectedTournament.current_big_blind / 1.5);
    const resetTime = selectedTournament.timer_duration || 1200;

    const { error } = await supabase
      .from('tournaments')
      .update({
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind,
        timer_remaining: resetTime
      })
      .eq('id', selectedTournament.id);

    if (!error) {
      setSelectedTournament({
        ...selectedTournament,
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind
      });
      setCurrentTime(resetTime);
      setTimerActive(false);
      
      // Сохранить новое состояние таймера
      localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
        currentTime: resetTime,
        timerActive: false,
        lastUpdate: Date.now()
      }));
    }
  };

  const stopTournament = async () => {
    if (!selectedTournament) return;

    const { data, error } = await supabase.rpc('complete_tournament', {
      tournament_id_param: selectedTournament.id
    });

    if (!error) {
      setSelectedTournament({ ...selectedTournament, status: 'completed' });
      setTimerActive(false);
      toast({ title: "Турнир завершен" });
      loadTournaments();
    }
  };

  const onTimerAdjust = (seconds: number) => {
    const newTime = Math.max(0, currentTime + seconds);
    setCurrentTime(newTime);
    
    // Сохранить изменение
    if (selectedTournament) {
      localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
        currentTime: newTime,
        timerActive,
        lastUpdate: Date.now()
      }));
      updateTimerInDatabase(newTime);
    }
  };

  const onFinishTournament = async () => {
    if (!selectedTournament) return;

    const { data, error } = await supabase.rpc('complete_tournament', {
      tournament_id_param: selectedTournament.id
    });

    if (!error) {
      setSelectedTournament({ 
        ...selectedTournament, 
        status: 'completed',
        finished_at: new Date().toISOString()
      });
      setTimerActive(false);
      toast({ title: "Турнир завершен" });
      loadTournaments();
    }
  };

  const deleteTournament = async (id: string) => {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({ title: "Турнир удален" });
      loadTournaments();
      if (selectedTournament?.id === id) {
        setSelectedTournament(null);
        localStorage.removeItem('selectedTournamentId');
        localStorage.removeItem(`timer_${id}`);
      }
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-light text-gray-800 mb-2">Директор турниров</h1>
              <p className="text-gray-600 text-lg">Управление и мониторинг покерных турниров</p>
            </div>
            
            {selectedTournament && (
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-subtle">
                <p className="text-sm text-gray-500 mb-1">Активный турнир</p>
                <p className="font-medium text-gray-800">{selectedTournament.name}</p>
                <Badge 
                  variant={selectedTournament.status === 'running' ? 'default' : 'secondary'}
                  className="mt-2"
                >
                  {selectedTournament.status === 'running' ? 'Активен' : 
                   selectedTournament.status === 'pending' ? 'Ожидание' : 'Завершен'}
                </Badge>
              </div>
            )}
          </div>

          {/* Custom Tab System заменяем обратно на Radix Tabs */}
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => {
              console.log('Tab change:', activeTab, '->', value);
              setActiveTab(value);
            }} 
            className="space-y-10"
          >
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-1 bg-gray-100/60 rounded-lg border border-gray-200/30">
              <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Обзор</span>
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Турниры</span>
              </TabsTrigger>
              <TabsTrigger value="control" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Управление</span>
              </TabsTrigger>
              <TabsTrigger value="players" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Игроки</span>
              </TabsTrigger>
              <TabsTrigger value="ratings" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Рейтинги</span>
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Результаты</span>
              </TabsTrigger>
              <TabsTrigger value="sync" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Синхронизация</span>
              </TabsTrigger>
              <TabsTrigger value="rating-test" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Тест рейтинга</span>
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
                    onNextLevel={nextLevel}
                    onPrevLevel={prevLevel}
                    onStopTournament={stopTournament}
                    onRefresh={() => loadRegistrations(selectedTournament.id)}
                    onTimerAdjust={onTimerAdjust}
                    onFinishTournament={onFinishTournament}
                  />
                </div>
              ) : (
                <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
                  <CardContent className="text-center py-16">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Турнир не выбран</h3>
                    <p className="text-gray-500 mb-6">Выберите турнир на вкладке "Турниры" для отображения информации</p>
                    <Button
                      onClick={() => setActiveTab('tournaments')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Перейти к турнирам
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tournaments" className="space-y-10 animate-fade-in">
              {/* Create Tournament Section */}
              <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal hover:shadow-subtle transition-all duration-300 rounded-xl group">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-gray-800 text-xl font-light">
                    <div className="p-2 bg-blue-100/80 rounded-lg group-hover:bg-blue-200/80 transition-colors">
                      <Plus className="w-5 h-5 text-blue-600" />
                    </div>
                    Создать турнир
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Настройте новый покерный турнир
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-subtle hover:shadow-lg transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать новый турнир
                  </Button>
                </CardContent>
              </Card>

              {/* Tournaments Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {tournaments.map((tournament) => (
                  <Card 
                    key={tournament.id} 
                    className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal hover:shadow-dramatic transition-all duration-500 rounded-xl group hover:-translate-y-2"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <CardTitle className="text-lg font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                          {tournament.name}
                        </CardTitle>
                        <Badge 
                          variant={tournament.status === 'running' ? 'destructive' : 
                                  tournament.status === 'scheduled' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {tournament.status === 'running' ? 'Активен' : 
                           tournament.status === 'scheduled' ? 'Запланирован' : 
                           tournament.status === 'completed' ? 'Завершен' : tournament.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-gray-600 text-sm">
                        {tournament.description || "Рейтинговый турнир"}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Tournament Info */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Время начала:</span>
                          <span className="font-medium">{new Date(tournament.start_time).toLocaleString('ru-RU')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Бай-ин:</span>
                          <span className="font-medium text-green-600">{tournament.buy_in.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Макс. игроков:</span>
                          <span className="font-medium">{tournament.max_players}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Стартовые фишки:</span>
                          <span className="font-medium">{tournament.starting_chips.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Текущий уровень:</span>
                          <span className="font-medium">{tournament.current_level}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Блайнды:</span>
                          <span className="font-medium">{tournament.current_small_blind}/{tournament.current_big_blind}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-4 border-t border-gray-200/50">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTournamentSelect(tournament)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors"
                          >
                            <Trophy className="w-4 h-4 mr-1" />
                            Выбрать
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTournament(tournament);
                              setIsModalOpen(true);
                            }}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50 transition-colors"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Редактировать
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {tournament.status === 'scheduled' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const { data, error } = await supabase.rpc('start_tournament_registration', {
                                    tournament_id_param: tournament.id
                                  });
                                  
                                  if (!error) {
                                    loadTournaments();
                                    toast({ title: "Регистрация открыта" });
                                  }
                                }}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors"
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Открыть регистрацию
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const { data, error } = await supabase.rpc('start_tournament', {
                                    tournament_id_param: tournament.id
                                  });
                                  
                                  if (!error) {
                                    loadTournaments();
                                    toast({ title: "Турнир запущен" });
                                  }
                                }}
                                className="text-green-600 border-green-200 hover:bg-green-50 transition-colors"
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Запустить сразу
                              </Button>
                            </>
                          )}
                          
                          {tournament.status === 'registration' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const { data, error } = await supabase.rpc('start_tournament', {
                                  tournament_id_param: tournament.id
                                });
                                
                                if (!error) {
                                  loadTournaments();
                                  toast({ title: "Турнир запущен" });
                                }
                              }}
                              className="text-green-600 border-green-200 hover:bg-green-50 transition-colors"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Запустить
                            </Button>
                          )}
                          
                          {tournament.status === 'running' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const { data, error } = await supabase.rpc('pause_tournament', {
                                  tournament_id_param: tournament.id
                                });
                                
                                if (!error) {
                                  loadTournaments();
                                  toast({ title: "Турнир приостановлен" });
                                }
                              }}
                              className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 transition-colors"
                            >
                              <Pause className="w-4 h-4 mr-1" />
                              Пауза
                            </Button>
                          )}
                          
                          {tournament.status === 'paused' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const { data, error } = await supabase.rpc('resume_tournament', {
                                  tournament_id_param: tournament.id
                                });
                                
                                if (!error) {
                                  loadTournaments();
                                  toast({ title: "Турнир возобновлен" });
                                }
                              }}
                              className="text-green-600 border-green-200 hover:bg-green-50 transition-colors"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Возобновить
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Вы уверены, что хотите удалить этот турнир?')) {
                                deleteTournament(tournament.id);
                              }
                            }}
                            className="text-red-600 border-red-200 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Удалить
                          </Button>
                        </div>

                        {/* Additional Quick Actions */}
                        <div className="grid grid-cols-3 gap-1 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleTournamentSelect(tournament);
                              setActiveTab('control');
                            }}
                            className="text-xs text-gray-500 hover:text-blue-600"
                          >
                            <Timer className="w-3 h-3 mr-1" />
                            Таймер
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleTournamentSelect(tournament);
                              setActiveTab('players');
                            }}
                            className="text-xs text-gray-500 hover:text-blue-600"
                          >
                            <Users className="w-3 h-3 mr-1" />
                            Игроки
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleTournamentSelect(tournament);
                              setActiveTab('results');
                            }}
                            className="text-xs text-gray-500 hover:text-blue-600"
                          >
                            <Trophy className="w-3 h-3 mr-1" />
                            Результаты
                          </Button>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      {selectedTournament?.id === tournament.id && (
                        <div className="absolute -top-2 -right-2">
                          <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {tournaments.length === 0 && (
                <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
                  <CardContent className="text-center py-16">
                    <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Нет созданных турниров</h3>
                    <p className="text-gray-500 mb-6">Создайте первый турнир для начала работы</p>
                    <Button
                      onClick={() => setIsModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Новый турнир
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="control" className="space-y-8 animate-fade-in">
              {selectedTournament ? (
                <div className="space-y-8">
                  <BlindStructure tournamentId={selectedTournament.id} />
                  <PayoutStructure tournamentId={selectedTournament.id} registeredPlayers={registrations.length} />
                  <ManualAdjustments tournaments={tournaments} selectedTournament={selectedTournament} onRefresh={loadTournaments} />
                </div>
              ) : (
                <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
                  <CardContent className="text-center py-16">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Турнир не выбран</h3>
                    <p className="text-gray-500 mb-6">Выберите турнир для настройки управления</p>
                    <Button
                      onClick={() => setActiveTab('tournaments')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Выбрать турнир
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="players" className="space-y-8 animate-fade-in">
              {selectedTournament && (
                <PlayerManagement 
                  tournament={selectedTournament}
                  players={players}
                  registrations={registrations}
                  onRegistrationUpdate={() => selectedTournament && loadRegistrations(selectedTournament.id)}
                />
              )}
            </TabsContent>

            <TabsContent value="ratings" className="space-y-6 animate-fade-in">
              <RatingManagement 
                tournaments={tournaments} 
                selectedTournament={selectedTournament}
                onRefresh={loadTournaments}
              />
            </TabsContent>

            <TabsContent value="results" className="space-y-6 animate-fade-in">
              <TournamentResults selectedTournament={selectedTournament} />
            </TabsContent>

            <TabsContent value="sync" className="space-y-6 animate-fade-in">
              <TournamentSyncManager 
                tournaments={tournaments}
                onRefresh={loadTournaments}
              />
            </TabsContent>

            <TabsContent value="rating-test" className="space-y-6 animate-fade-in">
              <RatingSystemTest />
            </TabsContent>
          </Tabs>

          {/* Tournament Creation/Edit Modal */}
          <TournamentCreationModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            tournament={editingTournament}
            onTournamentUpdate={() => {
              loadTournaments();
              setIsModalOpen(false);
              setEditingTournament(null);
            }}
          />
        </div>
      </div>
    </AuthGuard>
  );
};

export default TournamentDirector;