import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Clock, Trophy, UserCheck, UserPlus, Zap, Target, Flame } from "lucide-react";
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
  participation_fee?: number;
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
      toast.error("Ошибка при загрузке турниров");
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
      toast.error("Ошибка: игрок не найден");
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
          toast.error("Вы уже зарегистрированы на этот турнир");
        } else {
          throw error;
        }
        return;
      }

      setRegisteredTournaments(prev => new Set([...prev, tournamentId]));
      setTournamentCounts(prev => ({
        ...prev,
        [tournamentId]: (prev[tournamentId] || 0) + 1
      }));
      toast.success("Успешно зарегистрированы на турнир!");
    } catch (error) {
      console.error('Error registering for tournament:', error);
      toast.error("Ошибка при регистрации на турнир");
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

      setRegisteredTournaments(prev => {
        const newSet = new Set(prev);
        newSet.delete(tournamentId);
        return newSet;
      });
      setTournamentCounts(prev => ({
        ...prev,
        [tournamentId]: Math.max(0, (prev[tournamentId] || 0) - 1)
      }));
      toast.success("Регистрация отменена");
    } catch (error) {
      console.error('Error unregistering from tournament:', error);
      toast.error("Ошибка при отмене регистрации");
    } finally {
      setRegistering("");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-600 text-white border-0 rounded-none font-bold">📅 ЗАПЛАНИРОВАН</Badge>;
      case 'registration':
        return <Badge className="bg-green-600 text-white border-0 rounded-none font-bold animate-pulse">📝 РЕГИСТРАЦИЯ</Badge>;
      case 'running':
        return <Badge className="bg-accent text-white border-0 rounded-none font-bold">🔴 ИДЕТ ИГРА</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-600 text-white border-0 rounded-none font-bold">⏸️ ПАУЗА</Badge>;
      case 'completed':
        return <Badge className="bg-muted text-muted-foreground border-0 rounded-none">🏁 ЗАВЕРШЕН</Badge>;
      default:
        return <Badge variant="secondary" className="rounded-none">{status}</Badge>;
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

  const registeredCount = registeredTournaments.size;
  const upcomingCount = tournaments.filter(t => t.status === 'scheduled' || t.status === 'registration').length;

  if (tournaments.length === 0) {
    return (
      <Card className="brutal-border bg-card">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">НЕТ ДОСТУПНЫХ ТУРНИРОВ</h3>
          <p className="text-muted-foreground">
            В данный момент нет турниров, доступных для регистрации
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="brutal-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 border border-primary/30">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{registeredCount}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Мои регистрации</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="brutal-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{upcomingCount}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Предстоящих</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="brutal-border bg-card col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 border border-green-500/30">
              <Trophy className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{tournaments.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Всего турниров</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary border border-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-wide">Доступные турниры</h2>
            <div className="h-0.5 w-20 bg-gradient-to-r from-primary to-accent mt-1" />
          </div>
        </div>
        <Button onClick={loadAllData} variant="outline" size="sm" className="rounded-none border-border hover:border-primary">
          Обновить
        </Button>
      </div>

      {/* Tournament Cards */}
      <div className="grid gap-4">
        {tournaments.map((tournament) => {
          const isRegistered = registeredTournaments.has(tournament.id);
          const isLoading = registering === tournament.id;
          const timeInfo = formatTime(tournament.start_time);
          const registeredPlayersCount = tournamentCounts[tournament.id] || 0;
          const fillPercentage = (registeredPlayersCount / tournament.max_players) * 100;

          return (
            <Card 
              key={tournament.id} 
              className={`brutal-border bg-card overflow-hidden transition-all duration-300 hover:border-primary/50 ${
                isRegistered ? 'border-green-500/50 bg-green-500/5' : ''
              }`}
            >
              {/* Progress bar at top */}
              <div className="h-1 bg-secondary">
                <div 
                  className={`h-full transition-all duration-500 ${
                    fillPercentage >= 90 ? 'bg-accent' : 
                    fillPercentage >= 50 ? 'bg-primary' : 'bg-green-500'
                  }`}
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>

              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Tournament Info */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(tournament.status)}
                      {isRegistered && (
                        <Badge className="bg-green-600 text-white border-0 rounded-none font-bold">
                          <UserCheck className="h-3 w-3 mr-1" />
                          ВЫ УЧАСТВУЕТЕ
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground hover:text-primary transition-colors">
                      {tournament.name}
                    </h3>
                    
                    {tournament.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{tournament.description}</p>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{timeInfo.date}</p>
                          <p className="text-xs text-muted-foreground">{timeInfo.time}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">Старт</p>
                          <p className="text-xs text-muted-foreground">{timeInfo.relative}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-primary">{tournament.participation_fee || tournament.buy_in}₽</p>
                          <p className="text-xs text-muted-foreground">Взнос</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className={`font-medium ${fillPercentage >= 90 ? 'text-accent' : 'text-foreground'}`}>
                            {registeredPlayersCount}/{tournament.max_players}
                          </p>
                          <p className="text-xs text-muted-foreground">Игроков</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Section */}
                  <div className="flex flex-col items-end gap-3 min-w-[180px]">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase">Стартовый стек</p>
                      <p className="text-lg font-bold text-foreground">{tournament.starting_chips.toLocaleString()}</p>
                    </div>

                    {!playerId ? (
                      <p className="text-xs text-muted-foreground text-right">
                        Войдите для регистрации
                      </p>
                    ) : tournament.status === 'registration' ? (
                      isRegistered ? (
                        <Button
                          variant="outline"
                          onClick={() => handleUnregister(tournament.id)}
                          disabled={isLoading}
                          className="gap-2 rounded-none border-accent text-accent hover:bg-accent hover:text-white w-full md:w-auto"
                        >
                          {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                          Отменить
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleRegister(tournament.id)}
                          disabled={isLoading || registeredPlayersCount >= tournament.max_players}
                          className="gap-2 rounded-none bg-primary hover:bg-primary/90 w-full md:w-auto"
                        >
                          {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                          {registeredPlayersCount >= tournament.max_players ? 'Мест нет' : 'Участвовать'}
                        </Button>
                      )
                    ) : tournament.status === 'running' ? (
                      <Badge className="bg-accent/20 text-accent border border-accent/30 rounded-none">
                        <Flame className="h-3 w-3 mr-1" />
                        Турнир идет
                      </Badge>
                    ) : tournament.status === 'scheduled' ? (
                      <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-none">
                        Скоро открытие
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="rounded-none">Закрыто</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
