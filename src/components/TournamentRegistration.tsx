import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Clock, Trophy, UserCheck, UserPlus } from "lucide-react";
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
  registered_count?: number;
  starting_chips: number;
}

interface TournamentRegistrationProps {
  tournaments: Tournament[];
  playerId?: string;
  onRegistrationUpdate: () => void;
}

export function TournamentRegistration({ tournaments, playerId, onRegistrationUpdate }: TournamentRegistrationProps) {
  const [registeredTournaments, setRegisteredTournaments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string>("");

  useEffect(() => {
    if (playerId) {
      loadRegistrations();
    }
  }, [playerId]);

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

    setLoading(tournamentId);

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

      setRegisteredTournaments(prev => new Set([...prev, tournamentId]));
      onRegistrationUpdate();
      toast("Успешно зарегистрированы на турнир!");
    } catch (error) {
      console.error('Error registering for tournament:', error);
      toast("Ошибка при регистрации на турнир");
    } finally {
      setLoading("");
    }
  };

  const handleUnregister = async (tournamentId: string) => {
    if (!playerId) return;

    setLoading(tournamentId);

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
      onRegistrationUpdate();
      toast("Регистрация отменена");
    } catch (error) {
      console.error('Error unregistering from tournament:', error);
      toast("Ошибка при отмене регистрации");
    } finally {
      setLoading("");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registration':
        return <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 animate-pulse">🔴 Регистрация</Badge>;
      case 'active':
        return <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">🎮 Идет турнир</Badge>;
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
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Доступные турниры</h2>
      </div>

      <div className="grid gap-6">
        {tournaments.map((tournament) => {
          const isRegistered = registeredTournaments.has(tournament.id);
          const isLoading = loading === tournament.id;
          const timeInfo = formatTime(tournament.start_time);
          const canRegister = tournament.status === 'registration' && playerId;
          const canUnregister = isRegistered && tournament.status === 'registration';

          return (
            <Card key={tournament.id} className="group border-border/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:border-primary/20 bg-gradient-to-br from-card via-card to-card/80 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="relative z-10">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors">{tournament.name}</CardTitle>
                    {tournament.description && (
                      <p className="text-muted-foreground text-sm">{tournament.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(tournament.status)}
                    {isRegistered && (
                      <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Зарегистрирован
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{timeInfo.date}</p>
                      <p className="text-muted-foreground">{timeInfo.time}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Начало</p>
                      <p className="text-muted-foreground">{timeInfo.relative}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Бай-ин</p>
                      <p className="text-muted-foreground">{tournament.buy_in}₽</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Игроки</p>
                      <p className="text-muted-foreground">
                        {tournament.registered_count || 0}/{tournament.max_players}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="text-sm text-muted-foreground">
                    Стартовые фишки: <span className="font-medium text-foreground">{tournament.starting_chips.toLocaleString()}</span>
                  </div>

                  <div className="flex gap-2">
                    {!playerId ? (
                      <div className="text-sm text-muted-foreground">
                        Войдите в аккаунт для регистрации
                      </div>
                    ) : tournament.status === 'registration' ? (
                      isRegistered ? (
                        <Button
                          variant="outline"
                          onClick={() => handleUnregister(tournament.id)}
                          disabled={isLoading}
                          className="gap-2"
                        >
                          {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                          Отменить регистрацию
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleRegister(tournament.id)}
                          disabled={isLoading || (tournament.registered_count || 0) >= tournament.max_players}
                          className="gap-2"
                        >
                          {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                          {(tournament.registered_count || 0) >= tournament.max_players ? 'Нет мест' : 'Зарегистрироваться'}
                        </Button>
                      )
                    ) : tournament.status === 'active' ? (
                      <Badge className="bg-blue-100 text-blue-800">Турнир идет</Badge>
                    ) : (
                      <Badge variant="secondary">Регистрация закрыта</Badge>
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