import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  buy_in: number;
  rebuy_cost?: number;
  addon_cost?: number;
  rebuy_chips?: number;
  addon_chips?: number;
  starting_chips: number;
  max_players: number;
  start_time: string;
  status: string;
  tournament_format?: string;
  rebuy_end_level?: number;
  addon_level?: number;
  break_start_level?: number;
  tournament_registrations?: Array<{
    count: number;
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
    return `${amount.toLocaleString()} ₽`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'registration': { label: 'Регистрация открыта', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      'running': { label: 'Турнир проходит', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      'scheduled': { label: 'Запланирован', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      'completed': { label: 'Завершен', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    
    return (
      <Badge className={`px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}>
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
  const totalPrizePool = currentPlayers * tournament.buy_in;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900/98 via-black/95 to-slate-800/98 border-amber-400/20 backdrop-blur-2xl text-white">
        {/* Покерные масти декорация */}
        <div className="absolute inset-0 opacity-5 overflow-hidden pointer-events-none">
          <div className="absolute top-6 right-8 text-4xl text-amber-400 transform rotate-12 animate-pulse">♠</div>
          <div className="absolute top-20 left-6 text-3xl text-amber-500 transform -rotate-12 animate-bounce-subtle">♥</div>
          <div className="absolute bottom-16 right-10 text-5xl text-amber-400 transform rotate-45 animate-pulse">♦</div>
          <div className="absolute bottom-6 left-8 text-4xl text-amber-500 transform -rotate-30 animate-bounce-subtle">♣</div>
        </div>

        <DialogHeader className="relative z-10">
          <div className="text-center mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <DialogTitle className="text-2xl font-light text-white tracking-wider uppercase">
                {tournament.name}
              </DialogTitle>
              <div className="flex-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 w-8 h-8 p-0 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-center mb-3">
              <div className="h-0.5 w-16 bg-gradient-to-r from-amber-400 to-amber-600"></div>
            </div>
            <div className="flex justify-center mb-4">
              {getStatusBadge(tournament.status)}
            </div>
            <DialogDescription className="text-white/70 text-sm leading-relaxed max-w-md mx-auto">
              {tournament.description || "Присоединяйтесь к захватывающему покерному турниру в Event Poker Club"}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 relative z-10">
          {/* Основная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Левая колонка */}
            <div className="space-y-4">
              {/* Дата и время */}
              <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Дата и время</h3>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-light text-white">{dateTime.date}</p>
                  <p className="text-base text-amber-400 font-medium">{dateTime.time}</p>
                </div>
              </div>

              {/* Участники */}
              <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Участники</h3>
                </div>
                <div className="flex items-end gap-3">
                  <div>
                    <p className="text-2xl font-light text-white">{currentPlayers}</p>
                    <p className="text-xs text-white/60">зарегистрировано</p>
                  </div>
                  <div className="text-white/40 text-xl">/</div>
                  <div>
                    <p className="text-xl font-light text-white/80">{tournament.max_players}</p>
                    <p className="text-xs text-white/60">максимум</p>
                  </div>
                </div>
                <div className="mt-3 bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                    style={{ width: `${Math.min((currentPlayers / tournament.max_players) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Формат турнира */}
              <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Формат турнира</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 px-3 py-1 text-sm font-medium">
                    {tournament.tournament_format?.toUpperCase() || 'FREEZEOUT'}
                  </Badge>
                  {tournament.tournament_format === 'rebuy' && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1 text-sm font-medium">
                      <Repeat className="h-3 w-3 mr-1" />
                      REBUY
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Правая колонка */}
            <div className="space-y-4">
              {/* Стоимость участия */}
              <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Coins className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Стоимость участия</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Бай-ин:</span>
                    <span className="text-base font-semibold text-white">{formatCurrency(tournament.buy_in)}</span>
                  </div>
                  {tournament.rebuy_cost && tournament.rebuy_cost > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">Ребай:</span>
                      <span className="text-sm text-white">{formatCurrency(tournament.rebuy_cost)}</span>
                    </div>
                  )}
                  {tournament.addon_cost && tournament.addon_cost > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">Аддон:</span>
                      <span className="text-sm text-white">{formatCurrency(tournament.addon_cost)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Призовой фонд */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/15 to-amber-500/10 rounded-xl p-4 border border-amber-500/20 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Призовой фонд</h3>
                </div>
                <div className="text-center">
                  <p className="text-xl font-light text-amber-400 mb-1">{formatCurrency(totalPrizePool)}</p>
                  <p className="text-xs text-white/60">Текущий призовой фонд</p>
                </div>
              </div>

              {/* Стартовый стек */}
              <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Стартовый стек</h3>
                </div>
                <p className="text-2xl font-light text-white">{tournament.starting_chips?.toLocaleString() || 'N/A'} фишек</p>
              </div>
            </div>
          </div>

          {/* Структура блайндов */}
          {blindStructure.length > 0 && (
            <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Timer className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Структура блайндов</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto custom-scrollbar">
                {blindStructure.slice(0, 12).map((level, index) => (
                  <div 
                    key={level.level} 
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      level.is_break 
                        ? 'bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/30' 
                        : 'bg-gradient-to-br from-white/5 to-white/10 border-white/10 hover:border-amber-400/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-white/60">Уровень {level.level}</span>
                      {level.ante > 0 && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0.5">
                          ANTE
                        </Badge>
                      )}
                    </div>
                    
                    {level.is_break ? (
                      <div className="text-center">
                        <p className="text-orange-400 font-medium">ПЕРЕРЫВ</p>
                        <p className="text-xs text-white/60 mt-1">{level.duration / 60} мин</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white font-medium">{level.small_blind}</span>
                          <span className="text-white/40">/</span>
                          <span className="text-white font-medium">{level.big_blind}</span>
                        </div>
                        {level.ante > 0 && (
                          <div className="text-center">
                            <span className="text-xs text-blue-400">Ante: {level.ante}</span>
                          </div>
                        )}
                        <div className="text-xs text-white/60 text-center mt-1">
                          {level.duration / 60} мин
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {blindStructure.length > 12 && (
                <div className="text-center mt-4">
                  <p className="text-white/60 text-sm">И еще {blindStructure.length - 12} уровней...</p>
                </div>
              )}
            </div>
          )}

          {/* Кнопка регистрации */}
          {tournament.status === 'registration' && onRegister && (
            <div className="flex justify-center pt-4">
              <Button 
                onClick={() => onRegister(tournament.id)} 
                disabled={registering} 
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-amber-500/30 transition-all duration-300 text-lg min-w-[200px]"
              >
                {registering ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Регистрируем...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    <span>Записаться на турнир</span>
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
        `}</style>
      </DialogContent>
    </Dialog>
  );
}