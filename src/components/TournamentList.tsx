import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy, Clock, Info, ChevronRight, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TournamentModal } from "./TournamentModal";

interface Tournament {
  id: string;
  name: string;
  description: string;
  buy_in: number;
  rebuy_cost: number;
  addon_cost: number;
  rebuy_chips: number;
  addon_chips: number;
  starting_chips: number;
  max_players: number;
  start_time: string;
  status: string;
  tournament_format: string;
  rebuy_end_level: number;
  addon_level: number;
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
          <div className="text-center py-20">
            <div className="relative">
              <div className="w-32 h-32 mx-auto mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-poker-accent/20 to-poker-primary/20 rounded-full blur-xl"></div>
                <div className="relative w-full h-full bg-gradient-card rounded-full flex items-center justify-center border border-border/50 shadow-floating">
                  <Trophy className="w-16 h-16 text-poker-accent animate-bounce-subtle" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-poker-primary">Нет доступных турниров</h3>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">Новые турниры будут добавлены в ближайшее время. Следите за обновлениями!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tournaments.map((tournament, index) => {
              const playersFilled = ((tournament._count?.tournament_registrations || 0) / tournament.max_players) * 100;
              const isAlmostFull = playersFilled >= 80;
              
              return (
                <Card 
                  key={tournament.id} 
                  className="group overflow-hidden hover:shadow-floating transition-all duration-700 border-border/40 hover:border-poker-accent/50 hover:-translate-y-2 relative bg-gradient-card backdrop-blur-sm animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Card Header with Enhanced Visual Hierarchy */}
                  <div className="relative">
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-5 overflow-hidden">
                      <Trophy className="w-full h-full text-poker-accent rotate-12 transform translate-x-8 -translate-y-4" />
                    </div>
                    
                    <CardHeader className="relative pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-poker-accent rounded-full animate-pulse"></div>
                            <span className="text-xs font-semibold text-poker-accent uppercase tracking-wider">
                              {tournament.tournament_format}
                            </span>
                          </div>
                          <CardTitle className="text-xl mb-2 text-poker-primary group-hover:text-poker-accent transition-colors duration-500 leading-tight">
                            {tournament.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                            {tournament.description || "Профессиональный рейтинговый турнир"}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(tournament.status)}
                          {isAlmostFull && (
                            <Badge variant="destructive" className="text-xs animate-pulse">
                              Почти заполнен
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Tournament Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>Заполнено мест</span>
                          <span className="font-semibold">{tournament._count?.tournament_registrations || 0} / {tournament.max_players}</span>
                        </div>
                        <div className="w-full bg-border/30 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-poker-accent to-poker-primary h-2 rounded-full transition-all duration-1000 relative overflow-hidden"
                            style={{ width: `${Math.min(playersFilled, 100)}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </div>
                
                <CardContent className="pt-0 px-6 pb-6">
                  <div className="space-y-4">
                    {/* Enhanced Tournament Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30 hover:border-poker-accent/30 transition-colors">
                        <div className="w-8 h-8 bg-poker-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-poker-accent" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">Дата</div>
                          <div className="text-sm font-semibold text-foreground truncate">
                            {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30 hover:border-poker-success/30 transition-colors">
                        <div className="w-8 h-8 bg-poker-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-4 h-4 text-poker-success" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">Бай-ин</div>
                          <div className="text-sm font-semibold text-foreground">
                            {tournament.buy_in.toLocaleString()} ₽
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30 hover:border-poker-primary/30 transition-colors">
                        <div className="w-8 h-8 bg-poker-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-poker-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">Время</div>
                          <div className="text-sm font-semibold text-foreground">
                            {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30 hover:border-poker-accent/30 transition-colors">
                        <div className="w-8 h-8 bg-poker-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-4 h-4 text-poker-accent" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">Стек</div>
                          <div className="text-sm font-semibold text-foreground">
                            {tournament.starting_chips?.toLocaleString() || '10K'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Action Buttons */}
                    <div className="pt-4 space-y-3">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSelectedTournament(tournament);
                          setModalOpen(true);
                        }}
                        className="w-full transition-all duration-500 border-poker-accent/40 text-poker-accent hover:bg-poker-accent/10 hover:border-poker-accent hover:shadow-accent group/btn"
                      >
                        <Info className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                        Подробнее о турнире
                        <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                      
                      <Button 
                        onClick={() => registerForTournament(tournament.id)}
                        className="w-full bg-gradient-button hover:shadow-elevated transition-all duration-500 relative overflow-hidden group/register"
                        disabled={tournament.status === 'running' || tournament.status === 'finished' || tournament.status === 'paused'}
                      >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/register:translate-x-[100%] transition-transform duration-700"></div>
                        <span className="relative">
                          {tournament.status === 'scheduled' ? 'Скоро откроется регистрация' :
                           tournament.status === 'registration' ? 'Зарегистрироваться' : 
                           tournament.status === 'running' ? 'Турнир идет' :
                           tournament.status === 'paused' ? 'Турнир приостановлен' : 'Турнир завершен'}
                        </span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
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
      
      <TournamentModal 
        tournament={selectedTournament}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onTournamentUpdate={loadTournaments}
      />
    </section>
  );
}