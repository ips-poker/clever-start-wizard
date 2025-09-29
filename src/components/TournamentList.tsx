import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy, Clock, Info, ChevronRight, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ModernTournamentModal } from "./ModernTournamentModal";

interface Tournament {
  id: string;
  name: string;
  description: string;
  participation_fee: number;
  reentry_fee: number;
  additional_fee: number;
  reentry_chips: number;
  additional_chips: number;
  starting_chips: number;
  max_players: number;
  start_time: string;
  status: string;
  tournament_format: string;
  reentry_end_level: number;
  additional_level: number;
  break_start_level: number;
  _count?: {
    tournament_registrations: number;
  };
}

export function TournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTournaments();

    // Добавляем realtime подписку для мгновенных обновлений
    const channel = supabase
      .channel('tournaments_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournaments'
      }, () => {
        loadTournaments();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_registrations'
      }, () => {
        loadTournaments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_registrations!tournament_id(id)
        `)
        .eq('is_published', true)
        .not('is_archived', 'eq', true)
        .in('status', ['scheduled', 'registration', 'running'])
        .order('start_time', { ascending: true })
        .limit(6);

      if (error) throw error;

      // Transform the data to include registration count
      const tournamentsWithCount = data?.map(tournament => ({
        ...tournament,
        _count: {
          tournament_registrations: tournament.tournament_registrations?.length || 0
        }
      })) || [];

      setTournaments(tournamentsWithCount);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerForTournament = async (tournamentId: string) => {
    try {
      // Проверяем авторизацию
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Требуется авторизация",
          description: "Для регистрации на турнир необходимо войти в систему",
          variant: "destructive"
        });
        return;
      }

      // Проверяем, не зарегистрирован ли уже пользователь
      const { data: existingRegistration } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('player_id', user.id)
        .single();

      if (existingRegistration) {
        toast({
          title: "Уже зарегистрирован",
          description: "Вы уже зарегистрированы на этот турнир",
          variant: "default"
        });
        return;
      }

      // Регистрируем на турнир
      const { error } = await supabase
        .from('tournament_registrations')
        .insert({
          tournament_id: tournamentId,
          player_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Успешная регистрация",
        description: "Вы успешно зарегистрированы на турнир",
        variant: "default"
      });

      // Обновляем список турниров без кэширования
      await loadTournaments();
      
    } catch (error) {
      console.error('Error registering for tournament:', error);
      toast({
        title: "Ошибка регистрации",
        description: "Не удалось зарегистрироваться на турнир",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      scheduled: "secondary",
      registration: "default", 
      running: "destructive",
      completed: "outline",
      paused: "outline"
    } as const;

    const labels = {
      scheduled: "Запланирован",
      registration: "Регистрация",
      running: "Идет турнир",
      completed: "Завершен",
      paused: "Приостановлен"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Загрузка турниров...</h2>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="tournaments" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-poker-gold to-poker-steel bg-clip-text text-transparent">
            Предстоящие турниры
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Присоединяйтесь к нашим рейтинговым турнирам и поднимайтесь в таблице лидеров
          </p>
        </div>

        {tournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Нет доступных турниров</h3>
            <p className="text-muted-foreground">Новые турниры будут добавлены в ближайшее время</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <Card 
                key={tournament.id} 
                className="group overflow-hidden hover:shadow-dramatic transition-all duration-500 border-border/50 hover:border-poker-accent/40 hover:-translate-y-1 relative"
              >
                <CardHeader className="bg-gradient-card border-b border-border/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 text-poker-primary group-hover:text-poker-accent transition-colors">
                        {tournament.name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {tournament.description || "Рейтинговый турнир"}
                      </CardDescription>
                    </div>
                    {getStatusBadge(tournament.status)}
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 text-poker-accent" />
                      <span>{new Date(tournament.start_time).toLocaleString('ru-RU')}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Users className="w-4 h-4 text-poker-primary" />
                      <span>
                        {tournament._count?.tournament_registrations || 0} / {tournament.max_players} игроков
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4 text-poker-success" />
                      <span>Организационный взнос: {tournament.participation_fee.toLocaleString()} ₽</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Trophy className="w-4 h-4 text-poker-accent" />
                      <span>Рейтинговый турнир</span>
                    </div>

                    {/* Кнопка "Подробнее" появляется при наведении */}
                    <div className="pt-4 space-y-2">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSelectedTournament(tournament);
                          setModalOpen(true);
                        }}
                        className="w-full transition-all duration-300 border-poker-accent/30 text-poker-accent hover:bg-poker-accent/10"
                      >
                        <Info className="w-4 h-4 mr-2" />
                        Подробнее
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                      
                      <Button 
                        onClick={() => registerForTournament(tournament.id)}
                        className="w-full bg-gradient-button hover:shadow-elevated transition-all duration-300"
                        disabled={tournament.status === 'running' || tournament.status === 'finished' || tournament.status === 'paused'}
                      >
                        {tournament.status === 'scheduled' ? 'Скоро откроется регистрация' :
                         tournament.status === 'registration' ? 'Зарегистрироваться' : 
                         tournament.status === 'running' ? 'Турнир идет' :
                         tournament.status === 'paused' ? 'Турнир приостановлен' : 'Турнир завершен'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Button 
            variant="outline" 
            size="lg" 
            className="hover:bg-poker-primary/10 hover:text-poker-primary transition-all duration-300"
            onClick={() => window.location.href = '/tournaments'}
          >
            Показать все турниры
          </Button>
        </div>
      </div>
      
      <ModernTournamentModal 
        tournament={selectedTournament ? {
          ...selectedTournament,
          id: selectedTournament.id,
          name: selectedTournament.name,
          description: selectedTournament.description || '',
          participation_fee: selectedTournament.participation_fee,
          reentry_fee: selectedTournament.reentry_fee,
          additional_fee: selectedTournament.additional_fee,
          starting_chips: selectedTournament.starting_chips,
          reentry_chips: selectedTournament.reentry_chips || selectedTournament.starting_chips,
          additional_chips: selectedTournament.additional_chips || selectedTournament.starting_chips,
          max_players: selectedTournament.max_players,
          current_level: 1,
          current_small_blind: 100,
          current_big_blind: 200,
          timer_duration: 1200,
          timer_remaining: 1200,
          reentry_end_level: selectedTournament.reentry_end_level || 6,
          additional_level: selectedTournament.additional_level || 7,
          break_start_level: selectedTournament.break_start_level || 4,
          status: selectedTournament.status as any,
          start_time: selectedTournament.start_time,
          finished_at: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_published: true,
          is_archived: false,
          voice_control_enabled: false,
          last_voice_command: undefined,
          voice_session_id: undefined,
          tournament_format: selectedTournament.tournament_format as any
        } : null}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onTournamentUpdate={loadTournaments}
      />
    </section>
  );
}