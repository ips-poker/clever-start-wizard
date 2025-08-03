import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Users, Clock, Play, Pause, Square, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/auth/AuthGuard";

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
  starting_chips: number;
}

interface Player {
  id: string;
  name: string;
  email: string;
  elo_rating: number;
}

interface Registration {
  id: string;
  tournament_id: string;
  player_id: string;
  seat_number: number;
  chips: number;
  status: string;
  player: Player;
}

const SimpleTournamentDirector = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeView, setActiveView] = useState<'overview' | 'tournaments' | 'players'>('overview');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // New tournament form
  const [newTournament, setNewTournament] = useState({
    name: "",
    description: "",
    buy_in: 0,
    max_players: 9,
    start_time: "",
    starting_chips: 10000
  });

  // New player form
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    email: ""
  });

  // Load data functions
  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_time', { ascending: false });

      if (!error && data) {
        setTournaments(data);
      }
    } catch (error) {
      console.warn('Error loading tournaments:', error);
    }
  };

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('elo_rating', { ascending: false });

      if (!error && data) {
        setPlayers(data);
      }
    } catch (error) {
      console.warn('Error loading players:', error);
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

      if (!error && data) {
        setRegistrations(data);
      }
    } catch (error) {
      console.warn('Error loading registrations:', error);
    }
  };

  // Initial data load
  useEffect(() => {
    loadTournaments();
    loadPlayers();
  }, []);

  // Load registrations when tournament selected
  useEffect(() => {
    if (selectedTournament) {
      loadRegistrations(selectedTournament.id);
      setCurrentTime(selectedTournament.timer_remaining || 0);
    }
  }, [selectedTournament]);

  // Simple timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (timerActive && currentTime > 0) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            toast({ title: "Время истекло!" });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive, toast]);

  // Create tournament
  const createTournament = async () => {
    if (!newTournament.name || !newTournament.start_time) {
      toast({ title: "Ошибка", description: "Заполните обязательные поля", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('tournaments')
      .insert([{
        ...newTournament,
        start_time: new Date(newTournament.start_time).toISOString()
      }]);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось создать турнир", variant: "destructive" });
    } else {
      toast({ title: "Успех", description: "Турнир создан" });
      setNewTournament({ name: "", description: "", buy_in: 0, max_players: 9, start_time: "", starting_chips: 10000 });
      loadTournaments();
    }
  };

  // Add player
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

  // Start tournament
  const startTournament = async (tournament: Tournament) => {
    const { error } = await supabase
      .from('tournaments')
      .update({ status: 'running' })
      .eq('id', tournament.id);

    if (!error) {
      toast({ title: "Успех", description: "Турнир запущен" });
      loadTournaments();
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status badge
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

  return (
    <AuthGuard requireAdmin={true}>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Tournament Director</h1>
          
          {/* Navigation */}
          <div className="flex gap-4 mb-8">
            <Button 
              variant={activeView === 'overview' ? 'default' : 'outline'}
              onClick={() => setActiveView('overview')}
            >
              Обзор
            </Button>
            <Button 
              variant={activeView === 'tournaments' ? 'default' : 'outline'}
              onClick={() => setActiveView('tournaments')}
            >
              Турниры
            </Button>
            <Button 
              variant={activeView === 'players' ? 'default' : 'outline'}
              onClick={() => setActiveView('players')}
            >
              Игроки
            </Button>
          </div>

          {/* Overview */}
          {activeView === 'overview' && (
            <div className="space-y-6">
              {selectedTournament ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tournament Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5" />
                        {selectedTournament.name}
                        {getStatusBadge(selectedTournament.status)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>Buy-in: {selectedTournament.buy_in} EP</div>
                        <div>Макс. игроков: {selectedTournament.max_players}</div>
                        <div>Уровень: {selectedTournament.current_level}</div>
                        <div>Блайнды: {selectedTournament.current_small_blind}/{selectedTournament.current_big_blind}</div>
                      </div>
                      
                      {/* Timer */}
                      <div className="text-center">
                        <div className="text-4xl font-mono mb-4">{formatTime(currentTime)}</div>
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant={timerActive ? "secondary" : "default"}
                            size="sm"
                            onClick={() => setTimerActive(!timerActive)}
                          >
                            {timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentTime(selectedTournament.timer_duration || 1200);
                              setTimerActive(false);
                            }}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Registrations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Регистрации ({registrations.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {registrations.map((reg) => (
                          <div key={reg.id} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span>{reg.player.name}</span>
                            <div className="text-sm text-muted-foreground">
                              Место {reg.seat_number} • {reg.chips} фишек
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">Выберите турнир</h3>
                    <p className="text-muted-foreground">Перейдите на вкладку "Турниры" для выбора</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Tournaments */}
          {activeView === 'tournaments' && (
            <div className="space-y-6">
              {/* Create Tournament */}
              <Card>
                <CardHeader>
                  <CardTitle>Создать турнир</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Название</Label>
                      <Input
                        id="name"
                        value={newTournament.name}
                        onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                        placeholder="Название турнира"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Input
                        id="description"
                        value={newTournament.description}
                        onChange={(e) => setNewTournament({ ...newTournament, description: e.target.value })}
                        placeholder="Описание"
                      />
                    </div>
                    <div>
                      <Label htmlFor="buy_in">Buy-in</Label>
                      <Input
                        id="buy_in"
                        type="number"
                        value={newTournament.buy_in}
                        onChange={(e) => setNewTournament({ ...newTournament, buy_in: parseInt(e.target.value) })}
                      />
                    </div>
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
                    <div>
                      <Label htmlFor="starting_chips">Стартовые фишки</Label>
                      <Input
                        id="starting_chips"
                        type="number"
                        value={newTournament.starting_chips}
                        onChange={(e) => setNewTournament({ ...newTournament, starting_chips: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button onClick={createTournament}>Создать турнир</Button>
                </CardContent>
              </Card>

              {/* Tournament List */}
              <Card>
                <CardHeader>
                  <CardTitle>Список турниров</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Buy-in</TableHead>
                        <TableHead>Игроки</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tournaments.map((tournament) => (
                        <TableRow key={tournament.id}>
                          <TableCell className="font-medium">{tournament.name}</TableCell>
                          <TableCell>{getStatusBadge(tournament.status)}</TableCell>
                          <TableCell>{tournament.buy_in} EP</TableCell>
                          <TableCell>{tournament.max_players}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={selectedTournament?.id === tournament.id ? "default" : "outline"}
                                onClick={() => setSelectedTournament(tournament)}
                              >
                                Выбрать
                              </Button>
                              {tournament.status === 'registration' && (
                                <Button
                                  size="sm"
                                  onClick={() => startTournament(tournament)}
                                >
                                  Запустить
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Players */}
          {activeView === 'players' && (
            <div className="space-y-6">
              {/* Add Player */}
              <Card>
                <CardHeader>
                  <CardTitle>Добавить игрока</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="player_name">Имя</Label>
                      <Input
                        id="player_name"
                        value={newPlayer.name}
                        onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                        placeholder="Имя игрока"
                      />
                    </div>
                    <div>
                      <Label htmlFor="player_email">Email</Label>
                      <Input
                        id="player_email"
                        type="email"
                        value={newPlayer.email}
                        onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                  <Button onClick={addPlayer}>Добавить игрока</Button>
                </CardContent>
              </Card>

              {/* Players List */}
              <Card>
                <CardHeader>
                  <CardTitle>Список игроков</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Имя</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Рейтинг</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players.map((player) => (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium">{player.name}</TableCell>
                          <TableCell>{player.email}</TableCell>
                          <TableCell>{player.elo_rating}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default SimpleTournamentDirector;