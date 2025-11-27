import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GlitchText } from "@/components/ui/glitch-text";
import { 
  Calendar, 
  Clock, 
  Users, 
  Trophy, 
  Coins, 
  PlayCircle,
  UserPlus,
  Repeat,
  Timer,
  Target,
  AlertCircle,
  X,
  Star,
  Award,
  TrendingUp,
  Zap,
  Crown,
  Gem
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { calculateTotalRPSPool, formatRPSPoints, formatParticipationFee } from "@/utils/rpsCalculations";

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

interface Tournament {
  id: string;
  name: string;
  description?: string;
  participation_fee: number;
  reentry_fee?: number;
  additional_fee?: number;
  reentry_chips?: number;
  additional_chips?: number;
  starting_chips: number;
  max_players: number;
  start_time: string;
  status: string;
  tournament_format?: string;
  reentry_end_level?: number;
  additional_level?: number;
  break_start_level?: number;
  tournament_registrations?: Array<{
    count: number;
    reentries?: number;
    additional_sets?: number;
  }>;
}

interface TelegramTournamentModalProps {
  tournament: Tournament | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister?: (tournamentId: string) => void;
  registering?: boolean;
}

export function TelegramTournamentModal({ 
  tournament, 
  open, 
  onOpenChange, 
  onRegister,
  registering = false 
}: TelegramTournamentModalProps) {
  const [blindStructure, setBlindStructure] = useState<BlindLevel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tournament && open) {
      loadBlindStructure();
    }
  }, [tournament, open]);

  const loadBlindStructure = async () => {
    if (!tournament) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('level');

      if (error) throw error;
      setBlindStructure(data || []);
    } catch (error) {
      console.error('Error loading blind structure:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return formatParticipationFee(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'registration': { label: 'Регистрация', className: 'bg-syndikate-orange/20 text-syndikate-orange brutal-border' },
      'running': { label: 'В процессе', className: 'bg-syndikate-red/20 text-syndikate-red brutal-border' },
      'scheduled': { label: 'Запланирован', className: 'bg-syndikate-orange/20 text-syndikate-orange brutal-border' },
      'completed': { label: 'Завершен', className: 'bg-muted text-muted-foreground brutal-border' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    
    return (
      <Badge className={`px-3 py-1 text-xs font-bold uppercase ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  if (!tournament) return null;

  const dateTime = formatDateTime(tournament.start_time);
  const currentPlayers = tournament.tournament_registrations?.[0]?.count || 0;
  const totalReentries = tournament.tournament_registrations?.[0]?.reentries || 0;
  const totalAdditionalSets = tournament.tournament_registrations?.[0]?.additional_sets || 0;
  
  const totalRPSPool = calculateTotalRPSPool(
    currentPlayers,
    tournament.participation_fee,
    totalReentries,
    tournament.reentry_fee || 0,
    totalAdditionalSets,
    tournament.additional_fee || 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-syndikate-metal/98 brutal-border backdrop-blur-2xl text-foreground shadow-neon-orange">
        {/* Industrial Background */}
        <div className="absolute inset-0 opacity-5 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 industrial-texture" />
          <div className="absolute top-4 right-6 text-4xl text-syndikate-orange font-bold transform rotate-12 animate-pulse">♠</div>
          <div className="absolute top-16 left-4 text-3xl text-syndikate-red font-bold transform -rotate-12 animate-pulse" style={{ animationDelay: '0.5s' }}>♥</div>
          <div className="absolute bottom-12 right-8 text-5xl text-syndikate-orange font-bold transform rotate-45 animate-pulse" style={{ animationDelay: '1s' }}>♦</div>
          <div className="absolute bottom-4 left-6 text-4xl text-syndikate-rust font-bold transform -rotate-30 animate-pulse" style={{ animationDelay: '1.5s' }}>♣</div>
        </div>
        
        {/* Metal Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-3 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 135, 31, 0.08) 2px, rgba(255, 135, 31, 0.08) 3px),
              repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 135, 31, 0.08) 2px, rgba(255, 135, 31, 0.08) 3px)
            `,
            backgroundSize: '30px 30px'
          }}
        />
        
        {/* Animated Glows */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-syndikate-orange/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-40 h-40 bg-syndikate-red/15 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

        <DialogHeader className="relative z-10 pb-4 animate-fade-in">
          <div className="text-center">
            {/* Title with Corner Brackets */}
            <div className="relative inline-block mb-3">
              <div className="absolute -top-2 -left-2 w-4 h-4 border-l-2 border-t-2 border-syndikate-orange" />
              <div className="absolute -top-2 -right-2 w-4 h-4 border-r-2 border-t-2 border-syndikate-orange" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 border-l-2 border-b-2 border-syndikate-orange" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-r-2 border-b-2 border-syndikate-orange" />
              
              <DialogTitle className="font-display text-xl uppercase text-foreground tracking-wider px-6 py-2 animate-scale-in neon-orange">
                <GlitchText 
                  text={tournament.name}
                  glitchIntensity="high"
                  glitchInterval={5000}
                  className="inline-block"
                />
              </DialogTitle>
            </div>
            
            <div className="flex justify-center mb-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="h-[3px] w-16 bg-gradient-neon shadow-neon-orange"></div>
            </div>
            <div className="flex justify-center gap-2 mb-3 animate-scale-in" style={{ animationDelay: '0.2s' }}>
              {getStatusBadge(tournament.status)}
              <Badge className="bg-syndikate-orange/20 text-syndikate-orange brutal-border px-2 py-1 text-xs font-bold uppercase">
                <Trophy className="h-3 w-3 mr-1" />
                ID: {tournament.id.split('-')[0].toUpperCase()}
              </Badge>
            </div>
            <DialogDescription className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto animate-fade-in font-medium" style={{ animationDelay: '0.3s' }}>
              {tournament.description || "Присоединяйтесь к покерному турниру"}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 relative z-10">
          {/* Основная информация */}
          <div className="space-y-3">
            {/* Дата, время и участники в одной строке */}
            <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="bg-syndikate-concrete/50 brutal-border p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center">
                    <Calendar className="h-3 w-3 text-background" />
                  </div>
                  <h3 className="text-xs font-display font-bold text-foreground uppercase">Дата и время</h3>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{dateTime.date}</p>
                  <p className="text-sm text-syndikate-orange font-bold">{dateTime.time}</p>
                </div>
              </div>

              <div className="bg-syndikate-concrete/50 brutal-border p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center">
                    <Users className="h-3 w-3 text-background" />
                  </div>
                  <h3 className="text-xs font-display font-bold text-foreground uppercase">Участники</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-syndikate-orange">{currentPlayers}</span>
                  <span className="text-syndikate-rust font-bold">/</span>
                  <span className="text-lg font-bold text-foreground/80">{tournament.max_players}</span>
                </div>
                <div className="mt-2 bg-syndikate-rust/30 brutal-border h-1 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-neon transition-all duration-500"
                    style={{ width: `${Math.min((currentPlayers / tournament.max_players) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Стоимость и призовой фонд */}
            <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="bg-syndikate-concrete/50 brutal-border p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center">
                    <Coins className="h-3 w-3 text-background" />
                  </div>
                  <h3 className="text-xs font-display font-bold text-foreground uppercase">Орг. взнос</h3>
                </div>
                <p className="text-lg font-bold text-syndikate-orange">{formatCurrency(tournament.participation_fee)}</p>
                {tournament.reentry_fee && tournament.reentry_fee > 0 && (
                  <p className="text-xs text-foreground/60 mt-1 font-medium">Повторный вход: {formatCurrency(tournament.reentry_fee)}</p>
                )}
              </div>

              <div className="bg-syndikate-orange/10 brutal-border p-3 backdrop-blur-sm border-syndikate-orange/30 relative overflow-hidden group/prize">
                <div className="absolute inset-0 industrial-texture opacity-20" />
                <div className="absolute top-0 right-0 w-20 h-20 bg-syndikate-orange/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange animate-pulse">
                      <Crown className="h-3 w-3 text-background" />
                    </div>
                    <h3 className="text-xs font-display font-bold text-foreground uppercase flex items-center gap-1">
                      <Zap className="h-3 w-3 text-syndikate-orange" />
                      Фонд RPS
                    </h3>
                  </div>
                  <p className="text-lg font-bold text-syndikate-orange neon-orange">{formatRPSPoints(totalRPSPool)}</p>
                </div>
              </div>
            </div>

            {/* Стартовый стек и формат */}
            <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="bg-syndikate-concrete/50 brutal-border p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-syndikate-red brutal-border flex items-center justify-center">
                    <Target className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-xs font-display font-bold text-foreground uppercase">Стартовый стек</h3>
                </div>
                <p className="text-sm font-bold text-foreground">{tournament.starting_chips?.toLocaleString() || 'N/A'} фишек</p>
              </div>

              <div className="bg-syndikate-concrete/50 brutal-border p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center">
                    <Trophy className="h-3 w-3 text-background" />
                  </div>
                  <h3 className="text-xs font-display font-bold text-foreground uppercase">Формат</h3>
                </div>
                <Badge className="bg-syndikate-orange/20 text-syndikate-orange brutal-border px-2 py-0.5 text-xs font-bold uppercase">
                  {tournament.tournament_format?.toUpperCase() || 'FREEZEOUT'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Структура блайндов */}
          {blindStructure.length > 0 && (
            <div className="bg-syndikate-metal/50 brutal-border p-3 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.7s' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-syndikate-orange rounded-none flex items-center justify-center brutal-border">
                  <Timer className="h-3 w-3 text-background" />
                </div>
                <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">Структура блайндов</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                {blindStructure.slice(0, 8).map((level, index) => (
                  <div 
                    key={level.level} 
                    className={`p-2 brutal-border transition-all duration-300 ${
                      level.is_break 
                        ? 'bg-syndikate-orange/20 border-syndikate-orange/50' 
                        : 'bg-syndikate-concrete/30 border-syndikate-rust/30'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-xs font-bold text-foreground/80 uppercase">Ур. {level.level}</span>
                      {level.ante > 0 && (
                        <Badge className="bg-syndikate-orange/30 text-syndikate-orange brutal-border text-xs px-1 py-0">
                          A
                        </Badge>
                      )}
                    </div>
                    
                    {level.is_break ? (
                      <div className="text-center">
                        <p className="text-syndikate-orange font-bold text-xs uppercase">ПЕРЕРЫВ</p>
                        <p className="text-xs text-foreground/60 font-medium">{level.duration / 60}м</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-foreground text-xs font-bold">{level.small_blind}</span>
                          <span className="text-syndikate-orange text-xs font-bold">/</span>
                          <span className="text-foreground text-xs font-bold">{level.big_blind}</span>
                        </div>
                        {level.ante > 0 && (
                          <div className="text-center">
                            <span className="text-xs text-syndikate-orange font-bold">A:{level.ante}</span>
                          </div>
                        )}
                        <div className="text-xs text-foreground/60 text-center font-medium">
                          {level.duration / 60}м
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {blindStructure.length > 8 && (
                <div className="text-center mt-2">
                  <p className="text-syndikate-orange text-xs font-bold uppercase">+{blindStructure.length - 8} уровней</p>
                </div>
              )}
            </div>
          )}

          {/* Кнопка регистрации */}
          {tournament.status === 'registration' && onRegister && (
            <div className="flex justify-center pt-2 animate-scale-in" style={{ animationDelay: '0.8s' }}>
              <Button 
                onClick={() => onRegister(tournament.id)} 
                disabled={registering} 
                className="bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase tracking-wider py-3 px-6 brutal-border shadow-neon-orange hover:shadow-neon-orange transition-all duration-300 text-sm w-full relative overflow-hidden group/register disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-syndikate-red/20 translate-x-full group-hover/register:translate-x-0 transition-transform duration-500" />
                {registering ? (
                  <div className="flex items-center gap-2 relative z-10">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                    <span>Регистрируем...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center relative z-10">
                    <Target className="h-4 w-4" />
                    <span>Записаться на турнир</span>
                    <Zap className="h-4 w-4 animate-pulse" />
                  </div>
                )}
              </Button>
            </div>
          )}
        </div>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(251, 191, 36, 0.5);
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(251, 191, 36, 0.7);
          }
          .animate-bounce-subtle {
            animation: bounce-subtle 3s ease-in-out infinite;
          }
          @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
            50% { transform: translateY(-10px) rotate(var(--tw-rotate)); }
          }
          .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
            opacity: 0;
          }
          .animate-scale-in {
            animation: scaleIn 0.5s ease-out forwards;
            opacity: 0;
            transform: scale(0.95);
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}