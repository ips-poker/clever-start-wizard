import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  name: string;
  description: string;
  buy_in: number;
  max_players: number;
  start_time: string;
  status: string;
  _count?: {
    tournament_registrations: number;
  };
}

export function TournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
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
        .in('status', ['registration', 'running'])
        .eq('is_archived', false)
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
    // For now, we'll just show a success message
    // In a real app, this would require authentication
    toast({
      title: "Регистрация на турнир",
      description: "Для регистрации на турнир необходимо войти в систему",
      variant: "default"
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      scheduled: "secondary",
      registration: "default",
      running: "destructive",
      finished: "outline"
    } as const;

    const labels = {
      scheduled: "Запланирован",
      registration: "Регистрация",
      running: "Идет",
      finished: "Завершен"
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
              <Card key={tournament.id} className="overflow-hidden hover:shadow-elegant transition-all duration-300 border-poker-platinum/20 hover:border-poker-gold/40">
                <CardHeader className="bg-gradient-to-br from-poker-charcoal/5 to-poker-steel/5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 text-poker-charcoal">
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
                      <Calendar className="w-4 h-4 text-poker-gold" />
                      <span>{new Date(tournament.start_time).toLocaleString('ru-RU')}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Users className="w-4 h-4 text-poker-steel" />
                      <span>
                        {tournament._count?.tournament_registrations || 0} / {tournament.max_players} игроков
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Trophy className="w-4 h-4 text-poker-gold" />
                      <span>Рейтинговый турнир</span>
                    </div>

                    <div className="pt-4">
                      <Button 
                        onClick={() => registerForTournament(tournament.id)}
                        className="w-full bg-gradient-charcoal text-poker-cream hover:shadow-charcoal transition-all duration-300"
                        disabled={tournament.status !== 'registration' && tournament.status !== 'scheduled'}
                      >
                        {tournament.status === 'registration' ? 'Зарегистрироваться' : 'Скоро откроется регистрация'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="hover:bg-poker-steel/10 hover:text-poker-steel transition-all duration-300">
            Показать все турниры
          </Button>
        </div>
      </div>
    </section>
  );
}