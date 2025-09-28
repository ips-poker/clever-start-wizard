import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Users, 
  Play,
  Pause,
  Square,
  Timer,
  Plus,
  RefreshCw,
  Settings,
  BarChart3
} from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";

type Tournament = {
  id: string;
  name: string;
  description?: string;
  buy_in: number;
  max_players: number;
  start_time: string;
  status: string;
  current_level?: number;
  timer_remaining?: number;
  starting_chips: number;
  created_at: string;
  updated_at: string;
  [key: string]: any;
};

const TournamentDirector = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching tournaments:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить турниры",
          variant: "destructive"
        });
        return;
      }

      setTournaments(data as Tournament[] || []);
      
      if (!selectedTournament && data && data.length > 0) {
        const activeTournament = data.find(t => t.status === 'running' || t.status === 'registration');
        setSelectedTournament(activeTournament as Tournament || data[0] as Tournament);
      }
    } catch (error) {
      console.error('Error in fetchTournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const startTournament = async () => {
    if (!selectedTournament) return;

    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ 
          status: 'running',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTournament.id);

      if (error) {
        console.error('Error starting tournament:', error);
        return;
      }

      setSelectedTournament(prev => prev ? { ...prev, status: 'running' } : null);
      toast({
        title: "Турнир запущен",
        description: "Турнир успешно запущен"
      });
    } catch (error) {
      console.error('Error in startTournament:', error);
    }
  };

  const pauseTournament = async () => {
    if (!selectedTournament) return;

    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ 
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTournament.id);

      if (error) {
        console.error('Error pausing tournament:', error);
        return;
      }

      setSelectedTournament(prev => prev ? { ...prev, status: 'paused' } : null);
      toast({
        title: "Турнир приостановлен",
        description: "Турнир поставлен на паузу"
      });
    } catch (error) {
      console.error('Error in pauseTournament:', error);
    }
  };

  const completeTournament = async () => {
    if (!selectedTournament) return;

    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTournament.id);

      if (error) {
        console.error('Error completing tournament:', error);
        return;
      }

      setSelectedTournament(prev => prev ? { ...prev, status: 'completed' } : null);
      toast({
        title: "Турнир завершен",
        description: "Турнир успешно завершен"
      });
    } catch (error) {
      console.error('Error in completeTournament:', error);
    }
  };

  const renderTournamentOverview = () => {
    if (!selectedTournament) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Выберите турнир</h3>
            <p className="text-muted-foreground">Выберите турнир из списка для управления</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Статус</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge variant={
                  selectedTournament.status === 'running' ? 'default' :
                  selectedTournament.status === 'paused' ? 'secondary' :
                  selectedTournament.status === 'completed' ? 'outline' : 'destructive'
                }>
                  {selectedTournament.status === 'running' && 'Идет'}
                  {selectedTournament.status === 'paused' && 'Пауза'}
                  {selectedTournament.status === 'completed' && 'Завершен'}
                  {selectedTournament.status === 'registration' && 'Регистрация'}
                  {selectedTournament.status === 'scheduled' && 'Запланирован'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Бай-ин</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedTournament.buy_in}₽</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Макс. игроков</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedTournament.max_players}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Информация о турнире</CardTitle>
            <CardDescription>Основные детали турнира</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">{selectedTournament.name}</h3>
              {selectedTournament.description && (
                <p className="text-muted-foreground">{selectedTournament.description}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Время начала:</span>
                <p>{new Date(selectedTournament.start_time).toLocaleString('ru-RU')}</p>
              </div>
              <div>
                <span className="font-medium">Стартовые фишки:</span>
                <p>{selectedTournament.starting_chips.toLocaleString()}</p>
              </div>
              <div>
                <span className="font-medium">Текущий уровень:</span>
                <p>{selectedTournament.current_level || 1}</p>
              </div>
              <div>
                <span className="font-medium">Время на уровне:</span>
                <p>
                  {selectedTournament.timer_remaining 
                    ? `${Math.floor(selectedTournament.timer_remaining / 60)}:${String(selectedTournament.timer_remaining % 60).padStart(2, '0')}`
                    : 'Не задано'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Загрузка турниров...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 min-h-screen">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold">Турнирный директор</h1>
                <Button size="sm" onClick={fetchTournaments}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Tournament List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Турниры
                  </h2>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {tournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTournament?.id === tournament.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedTournament(tournament)}
                  >
                    <div className="font-medium text-sm">{tournament.name}</div>
                    <div className="text-xs opacity-75">
                      {new Date(tournament.start_time).toLocaleDateString('ru-RU')}
                    </div>
                    <div className="mt-1">
                      <Badge 
                        variant={
                          tournament.status === 'running' ? 'default' :
                          tournament.status === 'paused' ? 'secondary' :
                          tournament.status === 'completed' ? 'outline' : 'destructive'
                        }
                      >
                        {tournament.status === 'running' && 'Идет'}
                        {tournament.status === 'paused' && 'Пауза'}
                        {tournament.status === 'completed' && 'Завершен'}
                        {tournament.status === 'registration' && 'Регистрация'}
                        {tournament.status === 'scheduled' && 'Запланирован'}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {tournaments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет турниров</p>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="mt-8 space-y-1">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Управление
                </h2>
                
                {[
                  { id: 'overview', name: 'Обзор', icon: BarChart3 },
                  { id: 'players', name: 'Игроки', icon: Users },
                  { id: 'settings', name: 'Настройки', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header with controls */}
            {selectedTournament && (
              <div className="bg-white border-b border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{selectedTournament.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={
                        selectedTournament.status === 'running' ? 'default' :
                        selectedTournament.status === 'paused' ? 'secondary' :
                        selectedTournament.status === 'completed' ? 'outline' : 'destructive'
                      }>
                        {selectedTournament.status === 'running' && 'Идет'}
                        {selectedTournament.status === 'paused' && 'Пауза'}
                        {selectedTournament.status === 'completed' && 'Завершен'}
                        {selectedTournament.status === 'registration' && 'Регистрация'}
                        {selectedTournament.status === 'scheduled' && 'Запланирован'}
                      </Badge>
                      {selectedTournament.timer_remaining !== undefined && (
                        <Badge variant="outline">
                          <Timer className="h-3 w-3 mr-1" />
                          {Math.floor((selectedTournament.timer_remaining || 0) / 60)}:
                          {String((selectedTournament.timer_remaining || 0) % 60).padStart(2, '0')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedTournament.status === 'scheduled' && (
                      <Button onClick={startTournament} className="bg-green-600 hover:bg-green-700">
                        <Play className="h-4 w-4 mr-2" />
                        Запустить
                      </Button>
                    )}
                    
                    {selectedTournament.status === 'running' && (
                      <>
                        <Button onClick={pauseTournament} variant="outline">
                          <Pause className="h-4 w-4 mr-2" />
                          Пауза
                        </Button>
                        <Button onClick={completeTournament} variant="destructive">
                          <Square className="h-4 w-4 mr-2" />
                          Завершить
                        </Button>
                      </>
                    )}
                    
                    {selectedTournament.status === 'paused' && (
                      <Button onClick={startTournament} className="bg-green-600 hover:bg-green-700">
                        <Play className="h-4 w-4 mr-2" />
                        Возобновить
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Content */}
            <div className="p-6">
              <div className="bg-white rounded-lg shadow-sm border min-h-[600px]">
                {renderTournamentOverview()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default TournamentDirector;