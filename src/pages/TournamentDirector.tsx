import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { TournamentModal } from "@/components/TournamentModal";
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
      setCurrentTime(selectedTournament.timer_remaining || 0);
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
    setTimerActive(!timerActive);
  };

  const resetTimer = () => {
    if (selectedTournament) {
      setCurrentTime(selectedTournament.timer_duration);
      setTimerActive(false);
    }
  };

  const nextLevel = async () => {
    if (!selectedTournament) return;

    const newLevel = selectedTournament.current_level + 1;
    const newSmallBlind = Math.round(selectedTournament.current_small_blind * 1.5);
    const newBigBlind = Math.round(selectedTournament.current_big_blind * 1.5);

    const { error } = await supabase
      .from('tournaments')
      .update({
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind,
        timer_remaining: selectedTournament.timer_duration
      })
      .eq('id', selectedTournament.id);

    if (!error) {
      setSelectedTournament({
        ...selectedTournament,
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind
      });
      setCurrentTime(selectedTournament.timer_duration);
      setTimerActive(false);
    }
  };

  const prevLevel = async () => {
    if (!selectedTournament || selectedTournament.current_level <= 1) return;

    const newLevel = selectedTournament.current_level - 1;
    const newSmallBlind = Math.round(selectedTournament.current_small_blind / 1.5);
    const newBigBlind = Math.round(selectedTournament.current_big_blind / 1.5);

    const { error } = await supabase
      .from('tournaments')
      .update({
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind,
        timer_remaining: selectedTournament.timer_duration
      })
      .eq('id', selectedTournament.id);

    if (!error) {
      setSelectedTournament({
        ...selectedTournament,
        current_level: newLevel,
        current_small_blind: newSmallBlind,
        current_big_blind: newBigBlind
      });
      setCurrentTime(selectedTournament.timer_duration);
      setTimerActive(false);
    }
  };

  const stopTournament = async () => {
    if (!selectedTournament) return;

    const { error } = await supabase
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', selectedTournament.id);

    if (!error) {
      setSelectedTournament({ ...selectedTournament, status: 'completed' });
      setTimerActive(false);
      toast({ title: "Турнир завершен" });
      loadTournaments();
    }
  };

  const onTimerAdjust = (seconds: number) => {
    setCurrentTime(prev => Math.max(0, prev + seconds));
  };

  const onFinishTournament = async () => {
    if (!selectedTournament) return;

    const { error } = await supabase
      .from('tournaments')
      .update({ 
        status: 'completed',
        finished_at: new Date().toISOString()
      })
      .eq('id', selectedTournament.id);

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

          {/* Custom Tab System - без Radix UI */}
          <div className="space-y-10">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 p-1 bg-gray-100/60 rounded-lg border border-gray-200/30">
              {[
                { id: 'overview', label: 'Обзор', icon: BarChart3 },
                { id: 'tournaments', label: 'Турниры', icon: Trophy },
                { id: 'control', label: 'Управление', icon: Settings },
                { id: 'players', label: 'Игроки', icon: Users },
                { id: 'ratings', label: 'Рейтинги', icon: TrendingUp },
                { id: 'results', label: 'Результаты', icon: CheckCircle },
                { id: 'sync', label: 'Синхронизация', icon: RefreshCw },
                { id: 'rating-test', label: 'Тест рейтинга', icon: Target }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      console.log('Tab change start:', activeTab, '->', tab.id);
                      
                      // Остановим таймер при переключении
                      if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                        setTimerActive(false);
                      }
                      
                      setActiveTab(tab.id);
                      console.log('Tab change complete:', tab.id);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
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
                </div>
              )}

              {/* Tournaments Tab */}
              {activeTab === 'tournaments' && (
                <div className="space-y-10">
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
                        Новый турнир
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Tournaments List */}
                  <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/30 shadow-minimal">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-gray-700 font-light">
                        <Trophy className="w-5 h-5" />
                        Все турниры
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tournaments.map(tournament => (
                          <Card 
                            key={tournament.id} 
                            className={`cursor-pointer transition-all border-2 hover:shadow-subtle ${
                              selectedTournament?.id === tournament.id 
                                ? 'border-blue-300 bg-blue-50' 
                                : 'border-gray-200/50 hover:border-blue-200/70'
                            }`}
                            onClick={() => handleTournamentSelect(tournament)}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="font-semibold text-gray-800 mb-2">{tournament.name}</h3>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingTournament(tournament);
                                    }}
                                    className="h-8 w-8 p-0 hover:bg-blue-100"
                                  >
                                    <Edit className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteTournament(tournament.id);
                                    }}
                                    className="h-8 w-8 p-0 hover:bg-red-100"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p>Бай-ин: {tournament.buy_in}₽</p>
                                <p>Максимум: {tournament.max_players} игроков</p>
                                <p>Уровень: {tournament.current_level}</p>
                              </div>
                              <Badge 
                                variant={tournament.status === 'running' ? 'default' : 
                                        tournament.status === 'pending' ? 'secondary' : 'outline'}
                                className="mt-3"
                              >
                                {tournament.status === 'running' ? 'Активен' : 
                                 tournament.status === 'pending' ? 'Ожидание' : 'Завершен'}
                              </Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {tournaments.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Турниры не найдены</p>
                          <p className="text-sm mt-2">Создайте первый турнир</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Control Tab */}
              {activeTab === 'control' && (
                <div className="space-y-8">
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
                </div>
              )}

              {/* Players Tab */}
              {activeTab === 'players' && (
                <div className="space-y-8">
                  <div className="space-y-8">
                    {selectedTournament && (
                      <PlayerManagement 
                        tournament={selectedTournament}
                        players={players}
                        registrations={registrations}
                        onRegistrationUpdate={() => selectedTournament && loadRegistrations(selectedTournament.id)}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Ratings Tab */}
              {activeTab === 'ratings' && (
                <div className="space-y-6">
                  <RatingManagement 
                    tournaments={tournaments} 
                    selectedTournament={selectedTournament}
                    onRefresh={loadTournaments}
                  />
                </div>
              )}

              {/* Results Tab */}
              {activeTab === 'results' && (
                <div className="space-y-6">
                  <Card className="bg-gradient-card border-poker-border shadow-elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                        <Trophy className="h-5 w-5" />
                        Результаты турниров
                      </CardTitle>
                      <CardDescription className="text-poker-text-muted">
                        Просматривайте результаты завершенных турниров
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {tournaments.filter(t => t.status === 'completed').map(tournament => (
                          <Card 
                            key={tournament.id} 
                            className={`cursor-pointer transition-all border-2 ${
                              selectedTournament?.id === tournament.id 
                                ? 'border-poker-primary bg-poker-primary/10' 
                                : 'border-poker-border hover:border-poker-primary/50'
                            }`}
                            onClick={() => setSelectedTournament(tournament)}
                          >
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-poker-text-primary mb-2">{tournament.name}</h3>
                              <div className="space-y-1 text-sm text-poker-text-muted">
                                <p>Бай-ин: {tournament.buy_in}₽</p>
                                <p>Завершен: {tournament.finished_at ? new Date(tournament.finished_at).toLocaleDateString('ru-RU') : 'Дата неизвестна'}</p>
                              </div>
                              <Badge 
                                variant="outline" 
                                className="mt-2 border-green-200 bg-green-50 text-green-600"
                              >
                                Завершен
                              </Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {tournaments.filter(t => t.status === 'completed').length === 0 && (
                        <div className="text-center py-8 text-poker-text-muted">
                          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Нет завершенных турниров для отображения</p>
                          <p className="text-sm mt-2">Завершите турнир через раздел "Управление", чтобы увидеть результаты здесь</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <TournamentResults selectedTournament={selectedTournament} />
                </div>
              )}

              {/* Sync Tab */}
              {activeTab === 'sync' && (
                <div className="space-y-6">
                  <TournamentSyncManager 
                    tournaments={tournaments}
                    onRefresh={loadTournaments}
                  />
                </div>
              )}

              {/* Rating Test Tab */}
              {activeTab === 'rating-test' && (
                <div className="space-y-6">
                  <RatingSystemTest />
                </div>
              )}
            </div>
          </div>

          {/* Tournament Modal */}
          <TournamentModal
            open={isModalOpen}
            onOpenChange={() => setIsModalOpen(false)}
            tournament={null}
            onTournamentUpdate={() => {
              loadTournaments();
              setIsModalOpen(false);
            }}
          />

          {/* Tournament Edit Dialog */}
          <Dialog open={!!editingTournament} onOpenChange={() => setEditingTournament(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Редактирование турнира
                </DialogTitle>
                <DialogDescription>
                  Внесите изменения в настройки турнира
                </DialogDescription>
              </DialogHeader>
              {editingTournament && (
                <TournamentModal
                  open={true}
                  onOpenChange={() => setEditingTournament(null)}
                  tournament={editingTournament}
                  onTournamentUpdate={() => {
                    loadTournaments();
                    setEditingTournament(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AuthGuard>
  );
};

export default TournamentDirector;