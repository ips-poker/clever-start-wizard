import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Clock, Trophy, UserCheck, UserPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Tournament {
  id: string;
  name: string;
  description?: string;
  start_time: string;
  buy_in: number;
  max_players: number;
  status: string;
  starting_chips: number;
}

interface ProfileTournamentsProps {
  playerId?: string;
}

export function ProfileTournaments({ playerId }: ProfileTournamentsProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registeredTournaments, setRegisteredTournaments] = useState<Set<string>>(new Set());
  const [tournamentCounts, setTournamentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string>("");

  // Загружаем данные только один раз при монтировании
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTournaments(),
        playerId ? loadRegistrations() : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['scheduled', 'registration', 'running'])
        .eq('is_published', true)
        .not('is_archived', 'eq', true)
        .order('start_time', { ascending: true });

      if (error) throw error;

      setTournaments(data || []);

      // Загружаем счетчики
      if (data && data.length > 0) {
        const tournamentIds = data.map(t => t.id);
        const { data: registrations, error: countError } = await supabase
          .from('tournament_registrations')
          .select('tournament_id')
          .in('tournament_id', tournamentIds);

        if (!countError && registrations) {
          const counts: Record<string, number> = {};
          tournamentIds.forEach(id => {
            counts[id] = registrations.filter(reg => reg.tournament_id === id).length;
          });
          setTournamentCounts(counts);
        }
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
      toast("Ошибка при загрузке турниров");
    }
  };

  const loadRegistrations = async () => {
    if (!playerId) return;

    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('tournament_id')
        .eq('player_id', playerId);

      if (error) throw error;

      const registeredIds = new Set(data?.map(reg => reg.tournament_id) || []);
      setRegisteredTournaments(registeredIds);
    } catch (error) {
      console.error('Error loading registrations:', error);
    }
  };

  const handleRegister = async (tournamentId: string) => {
    if (!playerId) {
      toast("Ошибка: игрок не найден");
      return;
    }

    setRegistering(tournamentId);

    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .insert([{
          tournament_id: tournamentId,
          player_id: playerId,
          status: 'registered'
        }]);

      if (error) {
        if (error.code === '23505') {
          toast("Вы уже зарегистрированы на этот турнир");
        } else {
          throw error;
        }
        return;
      }

      // Обновляем локальное состояние
      setRegisteredTournaments(prev => new Set([...prev, tournamentId]));
      setTournamentCounts(prev => ({
        ...prev,
        [tournamentId]: (prev[tournamentId] || 0) + 1
      }));
      toast("Успешно зарегистрированы на турнир!");
    } catch (error) {
      console.error('Error registering for tournament:', error);
      toast("Ошибка при регистрации на турнир");
    } finally {
      setRegistering("");
    }
  };

  const handleUnregister = async (tournamentId: string) => {
    if (!playerId) return;

    setRegistering(tournamentId);

    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId);

      if (error) throw error;

      // Обновляем локальное состояние
      setRegisteredTournaments(prev => {
        const newSet = new Set(prev);
        newSet.delete(tournamentId);
        return newSet;
      });
      setTournamentCounts(prev => ({
        ...prev,
        [tournamentId]: Math.max(0, (prev[tournamentId] || 0) - 1)
      }));
      toast("Регистрация отменена");
    } catch (error) {
      console.error('Error unregistering from tournament:', error);
      toast("Ошибка при отмене регистрации");
    } finally {
      setRegistering("");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-gradient-to-r from-blue-400 to-blue-500 text-white border-0">📅 Запланирован</Badge>;
      case 'registration':
        return <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">📝 Регистрация</Badge>;
      case 'running':
        return <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0">🔴 Идет турнир</Badge>;
      case 'paused':
        return <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">⏸️ Пауза</Badge>;
      case 'completed':
        return <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0">🏁 Завершен</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('ru-RU'),
      time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      relative: formatDistanceToNow(date, { addSuffix: true, locale: ru })
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка турниров...</p>
        </div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">Нет доступных турниров</h3>
          <p className="text-muted-foreground">
            В данный момент нет турниров, доступных для регистрации
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Турниры</h2>
        </div>
        <Button onClick={loadAllData} variant="outline" size="sm">
          Обновить
        </Button>
      </div>

      <div className="grid gap-6">
        {tournaments.map((tournament) => {
          const isRegistered = registeredTournaments.has(tournament.id);
          const isLoading = registering === tournament.id;
          const timeInfo = formatTime(tournament.start_time);
          const registeredCount = tournamentCounts[tournament.id] || 0;

          return (
            <Card key={tournament.id} className="group border-border/50 hover:shadow-md transition-shadow duration-200 bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-primary rounded-full opacity-80"></div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{tournament.name}</h3>
                      <p className="text-xs text-muted-foreground">{timeInfo.date} · {timeInfo.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(tournament.status)}
                    {isRegistered && (
                      <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                        ✓
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>{tournament.buy_in}₽</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{registeredCount}/{tournament.max_players}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    <span>{(tournament.starting_chips / 1000).toFixed(0)}k</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  {!playerId ? (
                    <span className="text-xs text-muted-foreground">Требуется авторизация</span>
                  ) : tournament.status === 'registration' ? (
                    isRegistered ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnregister(tournament.id)}
                        disabled={isLoading}
                        className="h-7 px-3 text-xs"
                      >
                        {isLoading ? "..." : "Отменить"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleRegister(tournament.id)}
                        disabled={isLoading || registeredCount >= tournament.max_players}
                        className="h-7 px-3 text-xs"
                      >
                        {isLoading ? "..." : registeredCount >= tournament.max_players ? 'Нет мест' : 'Участвовать'}
                      </Button>
                    )
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {tournament.status === 'running' ? 'Идет' : 'Закрыта'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}