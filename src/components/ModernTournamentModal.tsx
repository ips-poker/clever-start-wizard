import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Clock, 
  Users, 
  Trophy, 
  DollarSign, 
  PlayCircle,
  UserPlus,
  Repeat,
  Plus,
  Timer,
  Target,
  AlertCircle,
  Edit,
  Save,
  X,
  Coffee,
  Crown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ModernTournament } from "@/types/tournament";
import { calculateTotalRPSPool, formatRPSPoints, formatParticipationFee } from "@/utils/rpsCalculations";

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

interface ModernTournamentModalProps {
  tournament: ModernTournament | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTournamentUpdate?: () => void;
}

export function ModernTournamentModal({ tournament, open, onOpenChange, onTournamentUpdate }: ModernTournamentModalProps) {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [blindStructure, setBlindStructure] = useState<BlindLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    participation_fee: 0,
    reentry_fee: 0,
    additional_fee: 0,
    reentry_chips: 0,
    additional_chips: 0,
    starting_chips: 0,
    max_players: 0,
    start_time: '',
    tournament_format: '',
    reentry_end_level: 0,
    additional_level: 0,
    break_start_level: 0
  });
  const [breakLevels, setBreakLevels] = useState<number[]>([]);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (tournament && open) {
      loadBlindStructure();
      loadRegistrations();
      setEditForm({
        name: tournament.name,
        description: tournament.description || '',
        participation_fee: tournament.participation_fee,
        reentry_fee: tournament.reentry_fee,
        additional_fee: tournament.additional_fee,
        reentry_chips: tournament.reentry_chips,
        additional_chips: tournament.additional_chips,
        starting_chips: tournament.starting_chips,
        max_players: tournament.max_players,
        start_time: tournament.start_time.slice(0, 16), // Format for datetime-local input
        tournament_format: tournament.tournament_format,
        reentry_end_level: tournament.reentry_end_level || 0,
        additional_level: tournament.additional_level || 0,
        break_start_level: tournament.break_start_level || 0
      });
      // Загружаем существующие перерывы
      loadBreakLevels();
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

  const loadRegistrations = async () => {
    if (!tournament) return;
    
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', tournament.id);

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error loading registrations:', error);
    }
  };

  const loadBreakLevels = async () => {
    if (!tournament) return;
    
    try {
      const { data, error } = await supabase
        .from('blind_levels')
        .select('level')
        .eq('tournament_id', tournament.id)
        .eq('is_break', true)
        .order('level');

      if (error) throw error;
      setBreakLevels(data?.map(b => b.level) || []);
    } catch (error) {
      console.error('Error loading break levels:', error);
    }
  };

  const calculateLateRegistrationDeadline = () => {
    if (!tournament || !blindStructure.length) return null;
    
    const startTime = new Date(tournament.start_time);
    const reentryEndLevel = tournament.reentry_end_level || 6;
    
    let totalMinutes = 0;
    for (let i = 0; i < reentryEndLevel && i < blindStructure.length; i++) {
      totalMinutes += blindStructure[i].duration / 60; // convert seconds to minutes
    }
    
    const deadline = new Date(startTime.getTime() + totalMinutes * 60000);
    return deadline;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'default';
      case 'running': return 'destructive';
      case 'scheduled': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'registration': return 'Регистрация открыта';
      case 'running': return 'Мероприятие идет';
      case 'scheduled': return 'Запланирован';
      case 'completed': return 'Завершен';
      default: return status;
    }
  };

  const handleEditFormChange = (field: string, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!tournament) return null;

  const lateRegDeadline = calculateLateRegistrationDeadline();
  
  // Рассчитываем фонд RPS баллов на основе реальных участников
  const participantCount = registrations.length;
  const totalReentries = registrations.reduce((sum, reg) => sum + (reg.reentries || 0), 0);
  const totalAdditionalSets = registrations.reduce((sum, reg) => sum + (reg.additional_sets || 0), 0);
  
  const rpsPool = calculateTotalRPSPool(
    participantCount,
    tournament.participation_fee,
    totalReentries,
    tournament.reentry_fee,
    totalAdditionalSets,
    tournament.additional_fee
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-900/98 via-black/95 to-slate-800/98 border-amber-400/20 backdrop-blur-2xl text-white">
        {/* Покерные масти декорация */}
        <div className="absolute inset-0 opacity-5 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-6 text-3xl text-amber-400 transform rotate-12 animate-pulse">♠</div>
          <div className="absolute top-16 left-4 text-2xl text-amber-500 transform -rotate-12 animate-bounce-subtle">♥</div>
          <div className="absolute bottom-12 right-8 text-4xl text-amber-400 transform rotate-45 animate-pulse">♦</div>
          <div className="absolute bottom-4 left-6 text-3xl text-amber-500 transform -rotate-30 animate-bounce-subtle">♣</div>
        </div>

        <DialogHeader className="relative z-10 pb-4">
          <div className="text-center">
            <DialogTitle className="text-xl font-light text-white tracking-wider uppercase mb-2">
              {tournament.name}
            </DialogTitle>
            <div className="flex justify-center mb-3">
              <div className="h-0.5 w-12 bg-gradient-to-r from-amber-400 to-amber-600"></div>
            </div>
            <div className="flex justify-center mb-3">
              <Badge className={`px-3 py-1 rounded-full text-xs font-medium border ${
                tournament.status === 'registration' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                tournament.status === 'running' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                tournament.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                'bg-gray-500/20 text-gray-400 border-gray-500/30'
              }`}>
                {getStatusLabel(tournament.status)}
              </Badge>
            </div>
            <DialogDescription className="text-white/60 text-xs leading-relaxed max-w-xs mx-auto">
              {tournament.description || "Подробная информация о мероприятии"}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 relative z-10">
          {/* Основная информация */}
          <div className="space-y-3">
            {/* Дата, время и участники в одной строке */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center">
                    <Calendar className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-sm font-medium text-white">Дата и время</h3>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-light text-white">
                    {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-amber-400 font-medium">
                    {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md flex items-center justify-center">
                    <Users className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-sm font-medium text-white">Участники</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-light text-white">{participantCount}</span>
                  <span className="text-white/40">/</span>
                  <span className="text-lg font-light text-white/80">{tournament.max_players}</span>
                </div>
                <div className="mt-2 bg-white/10 rounded-full h-1 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                    style={{ width: `${Math.min((participantCount / tournament.max_players) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Стоимость и призовой фонд */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-md flex items-center justify-center">
                    <DollarSign className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-sm font-medium text-white">Орг. взнос</h3>
                </div>
                <p className="text-lg font-semibold text-white">{formatParticipationFee(tournament.participation_fee)}</p>
                {tournament.reentry_fee && tournament.reentry_fee > 0 && (
                  <p className="text-xs text-white/60 mt-1">Повторный вход: {formatParticipationFee(tournament.reentry_fee)}</p>
                )}
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/15 to-amber-500/10 rounded-lg p-3 border border-amber-500/20 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-md flex items-center justify-center">
                    <Crown className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-sm font-medium text-white">Фонд RPS баллов</h3>
                </div>
                <p className="text-lg font-semibold text-amber-400">{formatRPSPoints(rpsPool)}</p>
              </div>
            </div>

            {/* Стартовый стек и формат */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-md flex items-center justify-center">
                    <Target className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-sm font-medium text-white">Стартовый стек</h3>
                </div>
                <p className="text-sm font-light text-white">{tournament.starting_chips?.toLocaleString() || 'N/A'} фишек</p>
              </div>

              <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-md flex items-center justify-center">
                    <Trophy className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-sm font-medium text-white">Формат</h3>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 px-2 py-0.5 text-xs font-medium">
                  {tournament.tournament_format?.toUpperCase() || 'FREEZEOUT'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Структура блайндов */}
          {blindStructure.length > 0 && (
            <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md flex items-center justify-center">
                  <Timer className="h-3 w-3 text-white" />
                </div>
                <h3 className="text-sm font-medium text-white">Структура блайндов</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                {blindStructure.slice(0, 8).map((level) => (
                  <div 
                    key={level.level} 
                    className={`p-2 rounded-md border transition-all duration-300 ${
                      level.is_break 
                        ? 'bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/30' 
                        : 'bg-gradient-to-br from-white/5 to-white/10 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-xs font-medium text-white/60">Ур. {level.level}</span>
                      {level.ante > 0 && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-1 py-0">
                          A
                        </Badge>
                      )}
                    </div>
                    
                    {level.is_break ? (
                      <div className="text-center">
                        <p className="text-orange-400 font-medium text-xs">ПЕРЕРЫВ</p>
                        <p className="text-xs text-white/60">{level.duration / 60}м</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-white text-xs">{level.small_blind}</span>
                          <span className="text-white/40 text-xs">/</span>
                          <span className="text-white text-xs">{level.big_blind}</span>
                        </div>
                        {level.ante > 0 && (
                          <div className="text-center">
                            <span className="text-xs text-blue-400">A:{level.ante}</span>
                          </div>
                        )}
                        <div className="text-xs text-white/60 text-center">
                          {level.duration / 60}м
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {blindStructure.length > 8 && (
                <div className="text-center mt-2">
                  <p className="text-white/60 text-xs">+{blindStructure.length - 8} уровней</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-center pt-4 relative z-10">
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300 text-sm rounded-lg px-8"
          >
            Закрыть
          </Button>
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