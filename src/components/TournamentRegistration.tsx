import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Trophy, 
  Calendar,
  DollarSign,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  name: string;
  email: string;
  elo_rating: number;
  games_played: number;
  wins: number;
}

interface Tournament {
  id: string;
  name: string;
  description?: string;
  start_time: string;
  buy_in: number;
  max_players: number;
  status: string;
  starting_chips: number;
  is_published: boolean;
}

interface Registration {
  id: string;
  player_id: string;
  tournament_id: string;
  status: string;
  created_at: string;
  player: Player;
}

export function TournamentRegistration() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTournaments(),
        loadPlayers(),
        loadRegistrations()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('is_published', true)
      .not('is_archived', 'eq', true)
      .in('status', ['scheduled', 'registration', 'running'])
      .order('start_time', { ascending: true });

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

  const loadRegistrations = async () => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        player:players(*)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRegistrations(data);
    }
  };

  const createPlayer = async () => {
    if (!newPlayerName.trim() || !newPlayerEmail.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните имя и email игрока",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('players')
        .insert([{
          name: newPlayerName.trim(),
          email: newPlayerEmail.trim(),
          elo_rating: 100,
          user_id: user?.id // Привязываем к текущему пользователю
        }])
        .select()
        .single();

      if (error) throw error;

      setPlayers(prev => [...prev, data]);
      setNewPlayerName("");
      setNewPlayerEmail("");
      toast({
        title: "Игрок создан",
        description: `Игрок ${data.name} успешно создан`
      });
    } catch (error: any) {
      toast({
        title: "Ошибка создания игрока",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const registerPlayer = async () => {
    if (!selectedTournament || !selectedPlayer) {
      toast({
        title: "Ошибка",
        description: "Выберите турнир и игрока",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .insert([{
          tournament_id: selectedTournament,
          player_id: selectedPlayer,
          status: 'registered'
        }])
        .select(`
          *,
          player:players(*)
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Уже зарегистрирован",
            description: "Этот игрок уже зарегистрирован на данный турнир",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      setRegistrations(prev => [data, ...prev]);
      toast({
        title: "Регистрация успешна",
        description: "Игрок зарегистрирован на турнир"
      });
    } catch (error: any) {
      toast({
        title: "Ошибка регистрации",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const unregisterPlayer = async (registrationId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      setRegistrations(prev => prev.filter(reg => reg.id !== registrationId));
      toast({
        title: "Регистрация отменена",
        description: "Игрок отписан от турнира"
      });
    } catch (error: any) {
      toast({
        title: "Ошибка отмены регистрации",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500 text-white">Запланирован</Badge>;
      case 'registration':
        return <Badge className="bg-green-500 text-white">Регистрация</Badge>;
      case 'running':
        return <Badge className="bg-red-500 text-white">Идет</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500 text-white">Пауза</Badge>;
      case 'completed':
        return <Badge className="bg-gray-500 text-white">Завершен</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTournamentRegistrations = (tournamentId: string) => {
    return registrations.filter(reg => reg.tournament_id === tournamentId);
  };

  const isPlayerRegistered = (tournamentId: string, playerId: string) => {
    return registrations.some(reg => reg.tournament_id === tournamentId && reg.player_id === playerId);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Тестирование регистрации турниров</h2>
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Player */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Создать игрока
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">Имя игрока</Label>
              <Input
                id="player-name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Введите имя игрока"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="player-email">Email игрока</Label>
              <Input
                id="player-email"
                type="email"
                value={newPlayerEmail}
                onChange={(e) => setNewPlayerEmail(e.target.value)}
                placeholder="player@example.com"
              />
            </div>
            <Button onClick={createPlayer} disabled={loading} className="w-full">
              Создать игрока
            </Button>
          </CardContent>
        </Card>

        {/* Register Player */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Зарегистрировать игрока
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="select-tournament">Турнир</Label>
              <select
                id="select-tournament"
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Выберите турнир</option>
                {tournaments.map(tournament => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name} - {tournament.status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="select-player">Игрок</Label>
              <select
                id="select-player"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Выберите игрока</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name} (RPS: {player.elo_rating})
                  </option>
                ))}
              </select>
            </div>
            <Button 
              onClick={registerPlayer} 
              disabled={loading || !selectedTournament || !selectedPlayer} 
              className="w-full"
            >
              Зарегистрировать
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Tournaments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Активные турниры ({tournaments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>Нет опубликованных турниров</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tournaments.map(tournament => {
                const tournamentRegs = getTournamentRegistrations(tournament.id);
                return (
                  <div key={tournament.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{tournament.name}</h3>
                        {getStatusBadge(tournament.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {tournamentRegs.length}/{tournament.max_players}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {tournament.buy_in}₽
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Начало: {new Date(tournament.start_time).toLocaleString('ru-RU')}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Зарегистрированные игроки:</p>
                      {tournamentRegs.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Пока никто не зарегистрирован</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {tournamentRegs.map(reg => (
                            <div key={reg.id} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2">
                              <span className="text-sm">
                                {reg.player.name} (RPS: {reg.player.elo_rating})
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unregisterPlayer(reg.id)}
                                disabled={loading}
                                className="text-red-600 hover:bg-red-50"
                              >
                                Отменить
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{tournaments.length}</p>
            <p className="text-sm text-muted-foreground">Активных турниров</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold">{players.length}</p>
            <p className="text-sm text-muted-foreground">Всего игроков</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold">{registrations.length}</p>
            <p className="text-sm text-muted-foreground">Всего регистраций</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}