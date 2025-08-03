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
  }, []);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_registrations(count)
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
          player_id: user.id,
          registration_time: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Успешная регистрация",
        description: "Вы успешно зарегистрированы на турнир",
        variant: "default"
      });

      // Обновляем список турниров
      loadTournaments();
      
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
                      <span>{tournament.buy_in.toLocaleString()} ₽</span>
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
                        disabled={tournament.status === 'running' || tournament.status === 'completed' || tournament.status === 'paused'}
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
      
      <TournamentModal 
        tournament={selectedTournament}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onTournamentUpdate={loadTournaments}
      />
    </section>
  );
}