import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { 
  Trophy, 
  Users, 
  Timer,
  Play,
  Pause,
  Square,
  Plus,
  Minus,
  UserMinus,
  RotateCcw,
  Smartphone,
  Monitor
} from "lucide-react";
import { MobileTournamentTimer } from "@/components/MobileTournamentTimer";
import { MobilePlayerManagement } from "@/components/MobilePlayerManagement";
import { MobileTableSeating } from "@/components/MobileTableSeating";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  status: string;
  buy_in: number;
  max_players: number;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number | null;
  timer_remaining: number | null;
  starting_chips: number;
  start_time: string;
  created_at: string;
  finished_at: string | null;
  is_published: boolean | null;
}

interface Player {
  id: string;
  name: string;
  email: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
}

interface Registration {
  id: string;
  player: Player;
  seat_number: number | null;
  chips: number;
  status: string;
  rebuys: number;
  addons: number;
  position?: number;
  eliminated_at?: string;
  final_position?: number;
}

const MobileDirector = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadRegistrations();
      subscribeToUpdates();
    }
  }, [selectedTournament]);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['registration', 'running', 'paused'])
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error loading tournaments:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить турниры",
          variant: "destructive"
        });
        return;
      }

      setTournaments(data || []);
      
      // Автоматически выбираем активный турнир
      const activeTournament = data?.find(t => t.status === 'running') || data?.[0];
      if (activeTournament) {
        setSelectedTournament(activeTournament);
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrations = async () => {
    if (!selectedTournament) return;

    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`
          id,
          seat_number,
          chips,
          status,
          rebuys,
          addons,
          position,
          eliminated_at,
          final_position,
          player:players(
            id,
            name,
            email,
            elo_rating,
            games_played,
            wins,
            avatar_url
          )
        `)
        .eq('tournament_id', selectedTournament.id);

      if (error) {
        console.error('Error loading registrations:', error);
        return;
      }

      setRegistrations(data || []);
    } catch (error) {
      console.error('Error loading registrations:', error);
    }
  };

  const subscribeToUpdates = () => {
    if (!selectedTournament) return;

    // Подписка на изменения турнира
    const tournamentChannel = supabase
      .channel(`tournament-${selectedTournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${selectedTournament.id}`
        },
        (payload) => {
          console.log('Tournament updated:', payload);
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new && payload.new.id === selectedTournament.id) {
            const updatedTournament = payload.new as any;
            setSelectedTournament(prev => ({ 
              ...prev, 
              ...updatedTournament,
              timer_remaining: updatedTournament.timer_remaining || prev?.timer_remaining,
              current_level: updatedTournament.current_level || prev?.current_level,
              current_small_blind: updatedTournament.current_small_blind || prev?.current_small_blind,
              current_big_blind: updatedTournament.current_big_blind || prev?.current_big_blind,
              status: updatedTournament.status || prev?.status
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
          filter: `tournament_id=eq.${selectedTournament.id}`
        },
        (payload) => {
          console.log('Registration updated:', payload);
          loadRegistrations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tournamentChannel);
    };
  };

  const getActivePlayers = () => {
    return registrations.filter(r => 
      r.status === 'registered' || 
      r.status === 'playing' || 
      r.status === 'confirmed' ||
      (!r.status || r.status === 'active')
    );
  };

  const getEliminatedPlayers = () => {
    return registrations.filter(r => r.status === 'eliminated');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!selectedTournament) {
    return (
      <AuthGuard requireAdmin>
        <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Smartphone className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">Мобильное управление</h1>
              </div>
              <p className="text-muted-foreground">Управляйте турниром с мобильного устройства</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Выберите турнир
                </CardTitle>
                <CardDescription>
                  Нет активных турниров для управления
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/director')} 
                  className="w-full"
                  variant="outline"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Перейти к турнирному директору
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const activePlayers = getActivePlayers();
  const eliminatedPlayers = getEliminatedPlayers();

  return (
    <AuthGuard requireAdmin>
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        {/* Header */}
        <div className="bg-card border-b sticky top-0 z-10">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-6 w-6 text-primary" />
                <h1 className="text-lg font-bold truncate">{selectedTournament.name}</h1>
              </div>
              <Badge variant={
                selectedTournament.status === 'running' ? 'default' :
                selectedTournament.status === 'paused' ? 'secondary' :
                selectedTournament.status === 'registration' ? 'outline' : 'destructive'
              }>
                {selectedTournament.status === 'running' ? 'В игре' :
                 selectedTournament.status === 'paused' ? 'Пауза' :
                 selectedTournament.status === 'registration' ? 'Регистрация' :
                 selectedTournament.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{activePlayers.length}/{selectedTournament.max_players}</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                <span>₽{selectedTournament.buy_in}</span>
              </div>
            </div>
          </div>

          {/* Tournament Selection */}
          {tournaments.length > 1 && (
            <div className="px-4 pb-4">
              <select 
                value={selectedTournament.id}
                onChange={(e) => {
                  const tournament = tournaments.find(t => t.id === e.target.value);
                  setSelectedTournament(tournament || null);
                }}
                className="w-full p-2 border rounded-md bg-background"
              >
                {tournaments.map(tournament => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name} ({tournament.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="p-4">
          <Tabs defaultValue="timer" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timer" className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Таймер
              </TabsTrigger>
              <TabsTrigger value="players" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Игроки
              </TabsTrigger>
              <TabsTrigger value="seating" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Рассадка
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timer" className="space-y-4">
              <MobileTournamentTimer 
                tournament={{
                  id: selectedTournament.id,
                  name: selectedTournament.name,
                  status: selectedTournament.status,
                  current_level: selectedTournament.current_level,
                  current_small_blind: selectedTournament.current_small_blind,
                  current_big_blind: selectedTournament.current_big_blind,
                  timer_duration: selectedTournament.timer_duration,
                  timer_remaining: selectedTournament.timer_remaining
                }}
                onTournamentUpdate={(updatedTournament) => {
                  setSelectedTournament(prev => ({
                    ...prev,
                    ...updatedTournament
                  }));
                }}
              />
            </TabsContent>

            <TabsContent value="players" className="space-y-4">
              <MobilePlayerManagement 
                tournament={selectedTournament}
                registrations={registrations}
                onRegistrationUpdate={loadRegistrations}
              />
            </TabsContent>

            <TabsContent value="seating" className="space-y-4">
              <MobileTableSeating 
                tournament={selectedTournament}
                registrations={registrations}
                onSeatingUpdate={loadRegistrations}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
};

export default MobileDirector;