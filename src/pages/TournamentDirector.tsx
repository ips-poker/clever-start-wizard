import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Users, Clock, Settings, Plus, Play, Pause, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadRegistrations(selectedTournament.id);
    }
  }, [selectedTournament]);

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

    const { error } = await supabase
      .from('tournaments')
      .update({ 
        current_level: selectedTournament.current_level + 1,
        timer_remaining: selectedTournament.timer_duration
      })
      .eq('id', selectedTournament.id);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось повысить уровень блайндов", variant: "destructive" });
    } else {
      toast({ title: "Успех", description: "Уровень блайндов повышен" });
      loadTournaments();
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Турнирный Директор</h1>
          <p className="text-muted-foreground">Профессиональная система управления покерными турнирами</p>
        </div>

        <Tabs defaultValue="tournaments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tournaments">Турниры</TabsTrigger>
            <TabsTrigger value="control">Управление</TabsTrigger>
            <TabsTrigger value="players">Игроки</TabsTrigger>
            <TabsTrigger value="ratings">Рейтинг</TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Создать новый турнир</CardTitle>
                  <CardDescription>Настройте параметры нового турнира</CardDescription>
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

              <Card>
                <CardHeader>
                  <CardTitle>Список турниров</CardTitle>
                  <CardDescription>Все созданные турниры</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tournaments.map((tournament) => (
                      <div
                        key={tournament.id}
                        className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
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

          <TabsContent value="control" className="space-y-6">
            {selectedTournament ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Таймер уровня
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-6xl font-mono font-bold">
                        {Math.floor(selectedTournament.timer_remaining / 60)}:
                        {(selectedTournament.timer_remaining % 60).toString().padStart(2, '0')}
                      </div>
                      <p className="text-muted-foreground">Уровень {selectedTournament.current_level}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setTimerActive(!timerActive)}>
                        {timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" onClick={nextBlindLevel}>
                        Следующий уровень
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Текущие блайнды
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 border rounded">
                          <p className="text-sm text-muted-foreground">Малый блайнд</p>
                          <p className="text-2xl font-bold">{selectedTournament.current_small_blind}</p>
                        </div>
                        <div className="text-center p-4 border rounded">
                          <p className="text-sm text-muted-foreground">Большой блайнд</p>
                          <p className="text-2xl font-bold">{selectedTournament.current_big_blind}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Участники турнира
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Игрок</TableHead>
                          <TableHead>Место</TableHead>
                          <TableHead>Фишки</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Ребаи</TableHead>
                          <TableHead>Аддоны</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registrations.map((reg) => (
                          <TableRow key={reg.id}>
                            <TableCell>{reg.player.name}</TableCell>
                            <TableCell>{reg.seat_number || '-'}</TableCell>
                            <TableCell>{reg.chips}</TableCell>
                            <TableCell>{getStatusBadge(reg.status)}</TableCell>
                            <TableCell>{reg.rebuys}</TableCell>
                            <TableCell>{reg.addons}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Выберите турнир</h3>
                  <p className="text-muted-foreground">Выберите турнир на вкладке "Турниры" для управления</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="players" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Добавить игрока</CardTitle>
                  <CardDescription>Зарегистрировать нового игрока в системе</CardDescription>
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

              <Card>
                <CardHeader>
                  <CardTitle>Статистика игроков</CardTitle>
                  <CardDescription>Общая информация о зарегистрированных игроках</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 border rounded">
                        <p className="text-2xl font-bold">{players.length}</p>
                        <p className="text-sm text-muted-foreground">Всего игроков</p>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <p className="text-2xl font-bold">
                          {players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.elo_rating, 0) / players.length) : 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Средний рейтинг</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ratings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Рейтинг игроков (ELO)
                </CardTitle>
                <CardDescription>Текущий рейтинг всех игроков</CardDescription>
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