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
    <section id="tournaments" className="py-20 bg-gradient-to-br from-slate-900 via-black to-slate-800 relative overflow-hidden">
      {/* Покерные масти декорация */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        <div className="absolute top-10 left-10 text-amber-400/30 text-5xl animate-pulse transform rotate-12">♠</div>
        <div className="absolute top-20 right-20 text-amber-400/20 text-4xl animate-bounce-subtle transform -rotate-12">♣</div>
        <div className="absolute bottom-10 left-20 text-amber-400/25 text-6xl animate-pulse transform rotate-45">♥</div>
        <div className="absolute bottom-20 right-10 text-amber-400/20 text-3xl animate-bounce-subtle transform -rotate-30">♦</div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-light text-white tracking-wide">
              ПРЕДСТОЯЩИЕ ТУРНИРЫ
            </h2>
          </div>
          <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-6"></div>
          <p className="text-lg text-white/70 max-w-2xl mx-auto font-light">
            Присоединяйтесь к нашим рейтинговым турнирам и поднимайтесь в таблице лидеров
          </p>
        </div>

{tournaments.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-8 backdrop-blur-xl max-w-md mx-auto">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-medium mb-3 text-white">Турниры готовятся</h3>
              <p className="text-white/60">Новые турниры будут добавлены в ближайшее время</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="group relative">
                {/* Ticket-style card inspired by Telegram app */}
                <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/98 to-black/95 border border-white/20 rounded-3xl overflow-hidden shadow-2xl group-hover:scale-[1.02] transition-all duration-700 hover:shadow-amber-500/30 backdrop-blur-2xl relative">
                  {/* Ticket perforations */}
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-slate-900 rounded-full -ml-3 border border-white/10"></div>
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-slate-900 rounded-full -mr-3 border border-white/10"></div>
                  
                  {/* Dashed line */}
                  <div className="absolute left-6 right-6 top-1/2 h-px border-t-2 border-dashed border-white/20 transform -translate-y-1/2"></div>
                  
                  {/* Top section */}
                  <div className="p-6 pb-8 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-amber-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="absolute inset-0 opacity-8 group-hover:opacity-20 transition-opacity duration-500">
                      <div className="absolute top-4 right-4 text-amber-400/30 text-3xl animate-pulse">♠</div>
                      <div className="absolute top-8 left-4 text-amber-400/20 text-2xl animate-bounce-subtle">♣</div>
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <Trophy className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white group-hover:text-amber-100 transition-colors duration-300 leading-tight">
                              {tournament.name}
                            </h3>
                            <p className="text-white/60 text-sm">ID: {tournament.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                        {getStatusBadge(tournament.status)}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-amber-400" />
                          <span className="text-white/80 text-sm">
                            {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                              day: 'numeric', 
                              month: 'long', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-amber-400" />
                          <span className="text-white/80 text-sm">
                            {tournament._count?.tournament_registrations || 0} / {tournament.max_players} игроков
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom section */}
                  <div className="p-6 pt-4 bg-gradient-to-br from-slate-900/50 to-black/50 relative">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                          <span className="text-amber-400 text-lg font-bold">
                            {tournament.participation_fee.toLocaleString()} ₽
                          </span>
                        </div>
                        <div className="text-white/60 text-sm">
                          Стартовый стек: {tournament.starting_chips.toLocaleString()}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-amber-400/40 text-amber-400 hover:bg-amber-400/15 transition-all duration-300 rounded-xl backdrop-blur-sm"
                          onClick={() => {
                            setSelectedTournament(tournament);
                            setModalOpen(true);
                          }}
                        >
                          <Info className="h-4 w-4 mr-2" />
                          Подробная информация
                        </Button>
                        
                        {tournament.status === 'registration' && (
                          <Button 
                            size="sm" 
                            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold transition-all duration-300 rounded-xl shadow-lg hover:shadow-amber-500/30"
                            onClick={() => registerForTournament(tournament.id)}
                          >
                            Зарегистрироваться
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Button 
            variant="outline" 
            size="lg" 
            className="border-amber-400/50 text-amber-400 hover:bg-amber-400/10 px-8 py-4 font-medium rounded-lg transition-all duration-300"
            onClick={() => window.location.href = '/tournaments'}
          >
            <ChevronRight className="h-5 w-5 mr-2" />
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
      
      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-10px) rotate(var(--tw-rotate)); }
        }
      `}</style>
    </section>
  );
}