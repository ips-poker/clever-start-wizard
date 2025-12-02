import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy, Clock, Info, ChevronRight, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ModernTournamentModal } from "./ModernTournamentModal";
import { TournamentTicketCard } from "./TournamentTicketCard";

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
  total_reentries?: number;
  total_additional_sets?: number;
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
      });
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTournaments = async () => {
    try {
      console.log('🎪 Загрузка турниров через прокси...');
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_registrations!tournament_id(id, reentries, additional_sets)
        `)
        .eq('is_published', true)
        .not('is_archived', 'eq', true)
        .in('status', ['scheduled', 'registration', 'running'])
        .order('start_time', { ascending: true })
        .limit(6);

      if (error) {
        console.error('❌ Ошибка загрузки турниров:', error);
        throw error;
      }
      
      console.log('✅ Турниры успешно загружены:', data?.length || 0, 'записей');

      // Transform the data to include registration count and calculate prize pool
      const tournamentsWithCount = data?.map(tournament => {
        const registrations = tournament.tournament_registrations || [];
        const registeredCount = registrations.length;
        
        // Calculate total reentries and additional sets
        const totalReentries = registrations.reduce((sum, reg) => sum + (reg.reentries || 0), 0);
        const totalAdditionalSets = registrations.reduce((sum, reg) => sum + (reg.additional_sets || 0), 0);

        return {
          ...tournament,
          _count: {
            tournament_registrations: registeredCount
          },
          total_reentries: totalReentries,
          total_additional_sets: totalAdditionalSets
        };
      }) || [];

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
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Industrial Background */}
      <div className="absolute inset-0 industrial-texture opacity-50" />
      
      {/* Metal Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px),
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px)
          `
        }}
      />

      {/* Neon Glow Spots */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-syndikate-orange/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-syndikate-red/10 rounded-full blur-3xl animate-pulse" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Загрузка турниров...</h2>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="tournaments" className="py-20 bg-background relative overflow-hidden">
      {/* Industrial Background */}
      <div className="absolute inset-0 industrial-texture opacity-50" />
      
      {/* Metal Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px),
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px)
          `
        }}
      />

      {/* Neon Glow Spots */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-syndikate-orange/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-syndikate-red/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-12 h-12 border-2 border-syndikate-orange bg-syndikate-metal brutal-border flex items-center justify-center">
              <Trophy className="h-6 w-6 text-syndikate-orange" />
            </div>
            <h2 className="font-display text-4xl lg:text-5xl uppercase tracking-wider text-foreground">
              ТУРНИРЫ
            </h2>
          </div>
          <div className="h-[2px] w-20 bg-gradient-neon mx-auto mb-6" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto uppercase tracking-wider">
            Присоединяйся к элите. Докажи свое превосходство.
          </p>
        </div>

 {tournaments.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-syndikate-metal brutal-border p-8 max-w-md mx-auto">
              <div className="w-16 h-16 bg-syndikate-orange brutal-border flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-background" />
              </div>
              <h3 className="font-display text-xl uppercase mb-3 text-foreground">Турниры готовятся</h3>
              <p className="text-muted-foreground uppercase tracking-wider text-sm">Новые турниры будут добавлены в ближайшее время</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <TournamentTicketCard
                key={tournament.id}
                tournament={tournament}
                onViewDetails={() => {
                  setSelectedTournament(tournament);
                  setModalOpen(true);
                }}
                onRegister={() => registerForTournament(tournament.id)}
              />
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Button 
            size="lg" 
            className="bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase tracking-wider shadow-neon-orange px-8 py-4 group"
            onClick={() => window.location.href = '/tournaments'}
          >
            Все турниры
            <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
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