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
  Coffee
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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-poker-surface via-poker-surface-elevated to-poker-surface border-2 border-poker-gray/30 shadow-poker-elevated">
        {/* Премиальная перфорация сверху */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-r from-transparent via-poker-gray/30 to-transparent overflow-hidden">
          <div className="flex justify-center items-center h-full space-x-3">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-poker-gray/60" />
            ))}
          </div>
        </div>
        
        <DialogHeader className="pt-8 pb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div>
                <DialogTitle className="text-3xl font-black text-foreground mb-3 tracking-tight">
                  {tournament.name}
                </DialogTitle>
                <DialogDescription className="text-base text-muted-foreground/80 leading-relaxed">
                  {tournament.description || "Подробная информация о мероприятии"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-6">
              <Badge 
                variant={getStatusColor(tournament.status)}
                className="text-sm px-4 py-2 font-semibold"
              >
                {getStatusLabel(tournament.status)}
              </Badge>
            </div>
          </div>
          
          {/* Разделительная линия с перфорацией */}
          <div className="relative mt-6">
            <div className="border-t border-dashed border-poker-gray/40"></div>
            <div className="absolute -left-6 top-0 w-4 h-4 bg-poker-surface rounded-full border-2 border-poker-gray/30 transform -translate-y-2"></div>
            <div className="absolute -right-6 top-0 w-4 h-4 bg-poker-surface rounded-full border-2 border-poker-gray/30 transform -translate-y-2"></div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Основная информация */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-poker-surface-elevated/80 to-poker-surface/60 rounded-2xl p-8 border-2 border-poker-gray/20 shadow-poker-card backdrop-blur-sm">
              <h3 className="text-xl font-black mb-6 flex items-center tracking-tight">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-poker-red/20 to-poker-red/10 flex items-center justify-center mr-3 border border-poker-red/30">
                  <Trophy className="w-5 h-5 text-poker-red" />
                </div>
                Основная информация
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Дата и время</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{new Date(tournament.start_time).toLocaleString('ru-RU')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Игроки</span>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{participantCount} из {tournament.max_players} участников</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Формат</span>
                    <div className="flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium capitalize">{tournament.tournament_format}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Стартовый стек</span>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{tournament.starting_chips.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {lateRegDeadline && (
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Поздняя регистрация до</span>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{lateRegDeadline.toLocaleString('ru-RU')}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Организационный взнос</span>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{formatParticipationFee(tournament.participation_fee)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {tournament.tournament_format !== 'freezeout' && (
                <Separator className="my-4" />
              )}

              {tournament.tournament_format.includes('reentry') && (
                <div className="space-y-2">
                  <h4 className="font-medium text-poker-primary">Повторные входы</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>Стоимость: {formatParticipationFee(tournament.reentry_fee)}</div>
                    <div>Инвентарь: {tournament.reentry_chips.toLocaleString()}</div>
                    <div>Доступно до: уровень {tournament.reentry_end_level}</div>
                    {lateRegDeadline && (
                      <div>До: {lateRegDeadline.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}</div>
                    )}
                  </div>
                </div>
              )}

              {tournament.tournament_format.includes('additional') && (
                <div className="space-y-2">
                  <h4 className="font-medium text-poker-primary">Дополнительные наборы</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>Стоимость: {formatParticipationFee(tournament.additional_fee)}</div>
                    <div>Инвентарь: {tournament.additional_chips.toLocaleString()}</div>
                    <div>Доступно на: уровень {tournament.additional_level}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Фонд RPS баллов */}
            <div className="bg-gradient-to-br from-poker-gold/10 via-poker-surface-elevated/80 to-poker-surface/60 rounded-2xl p-8 border-2 border-poker-gold/20 shadow-poker-card backdrop-blur-sm">
              <h3 className="text-xl font-black mb-6 flex items-center tracking-tight">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-poker-gold/20 to-poker-gold/10 flex items-center justify-center mr-3 border border-poker-gold/30">
                  <Trophy className="w-5 h-5 text-poker-gold" />
                </div>
                Фонд RPS баллов
              </h3>
              
              <div className="text-center bg-gradient-to-br from-poker-gold/5 to-transparent rounded-xl p-6 border border-poker-gold/20">
                <div className="text-4xl font-black text-poker-gold mb-4 tracking-tight">
                  {formatRPSPoints(rpsPool)}
                </div>
                <div className="text-sm text-muted-foreground/80 font-medium">
                  Рассчитывается автоматически на основе взносов участников
                </div>
              </div>
            </div>
          </div>

          {/* Структура блайндов */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-poker-surface-elevated/80 to-poker-surface/60 rounded-2xl p-8 border-2 border-poker-gray/20 shadow-poker-card backdrop-blur-sm">
              <h3 className="text-xl font-black mb-6 flex items-center tracking-tight">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center mr-3 border border-blue-500/30">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                Структура блайндов
              </h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Загрузка структуры...</p>
                </div>
              ) : blindStructure.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {blindStructure.slice(0, 8).map((level) => (
                    <div key={level.level} className="flex justify-between items-center py-2 px-3 bg-white/50 rounded">
                      <span className="font-medium">Уровень {level.level}</span>
                      {level.is_break ? (
                        <Badge variant="secondary" className="text-xs">
                          <Coffee className="w-3 h-3 mr-1" />
                          Перерыв
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {level.small_blind}/{level.big_blind}
                        </span>
                      )}
                    </div>
                  ))}
                  {blindStructure.length > 8 && (
                    <div className="text-center py-2 text-muted-foreground text-sm">
                      ... и еще {blindStructure.length - 8} уровней
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Структура блайндов не создана</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Разделительная линия и кнопки */}
        <div className="relative mt-8">
          <div className="border-t border-dashed border-poker-gray/40"></div>
          <div className="absolute -left-6 top-0 w-4 h-4 bg-poker-surface rounded-full border-2 border-poker-gray/30 transform -translate-y-2"></div>
          <div className="absolute -right-6 top-0 w-4 h-4 bg-poker-surface rounded-full border-2 border-poker-gray/30 transform -translate-y-2"></div>
        </div>
        
        <div className="flex justify-end gap-4 pt-8">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="h-12 px-8 rounded-xl border-2 border-poker-gray/30 hover:border-poker-red/50 font-semibold text-base transition-all duration-300"
          >
            Закрыть
          </Button>
        </div>
        
        {/* Перфорация снизу */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-r from-transparent via-poker-gray/30 to-transparent overflow-hidden">
          <div className="flex justify-center items-center h-full space-x-3">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-poker-gray/60" />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}