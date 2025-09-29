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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-gradient-card border-2 border-poker-border/30 rounded-3xl shadow-floating backdrop-blur-xl"
                     style={{
                       background: 'var(--gradient-card)',
                       boxShadow: 'var(--shadow-floating), var(--shadow-accent)'
                     }}>
        
        {/* Декоративная перфорация сверху */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-r from-transparent via-poker-border/30 to-transparent rounded-t-3xl">
          <div className="flex justify-center items-center h-full space-x-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-poker-border/60"
              />
            ))}
          </div>
        </div>
        
        <DialogHeader className="pt-8">
          <div className="flex items-start justify-between px-2">
            <div className="flex-1">
              <div className="relative">
                <DialogTitle className="text-4xl font-black text-foreground mb-3 tracking-tight leading-tight">
                  {tournament.name}
                  <div className="absolute -bottom-1 left-0 w-20 h-1 bg-gradient-accent rounded-full"></div>
                </DialogTitle>
                <DialogDescription className="text-lg text-poker-text-secondary leading-relaxed">
                  {tournament.description || "Подробная информация о турнире"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 ml-6">
              <div className="relative">
                <Badge 
                  variant={getStatusColor(tournament.status)}
                  className="text-sm px-4 py-2 rounded-xl font-bold shadow-subtle"
                >
                  {getStatusLabel(tournament.status)}
                </Badge>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-poker-accent rounded-full animate-ping"></div>
              </div>
              <div className="text-right bg-poker-surface/50 rounded-xl px-4 py-3 backdrop-blur-sm border border-poker-border/30">
                <div className="text-xs text-poker-text-muted uppercase tracking-widest">ID турнира</div>
                <div className="text-sm font-mono text-poker-accent font-bold">{tournament.id.slice(-8).toUpperCase()}</div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2">
          {/* Основная информация */}
          <div className="space-y-6">
            <div className="bg-gradient-surface rounded-2xl p-8 border border-poker-border/30 hover:border-poker-accent/40 transition-all duration-300 hover:shadow-elevated"
                 style={{
                   background: 'var(--gradient-surface)',
                   boxShadow: 'var(--shadow-card)'
                 }}>
              <h3 className="text-2xl font-black mb-6 flex items-center text-foreground">
                <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center mr-4 shadow-accent">
                  <Trophy className="w-6 h-6 text-white" />
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
            <div className="bg-gradient-surface rounded-2xl p-8 border border-poker-border/30 hover:border-poker-accent/40 transition-all duration-300 hover:shadow-elevated text-center"
                 style={{
                   background: 'var(--gradient-accent)',
                   boxShadow: 'var(--shadow-accent)'
                 }}>
              <h3 className="text-2xl font-black mb-6 flex items-center justify-center text-white">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-4 backdrop-blur-sm">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                Фонд RPS баллов
              </h3>
              
              <div className="text-5xl font-black text-white mb-4 tracking-tight">
                {formatRPSPoints(rpsPool)}
              </div>
              <div className="text-lg text-white/80 font-medium">
                Рассчитывается автоматически на основе взносов участников
              </div>
            </div>
          </div>

          {/* Структура блайндов */}
          <div className="space-y-6">
            <div className="bg-gradient-surface rounded-2xl p-8 border border-poker-border/30 hover:border-poker-accent/40 transition-all duration-300 hover:shadow-elevated"
                 style={{
                   background: 'var(--gradient-surface)',
                   boxShadow: 'var(--shadow-card)'
                 }}>
              <h3 className="text-2xl font-black mb-6 flex items-center text-foreground">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-4 shadow-lg">
                  <Clock className="w-6 h-6 text-white" />
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

        {/* Декоративная перфорация снизу */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-r from-transparent via-poker-border/30 to-transparent">
          <div className="flex justify-center items-center h-full space-x-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-poker-border/60"
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-8 pb-4 border-t border-poker-border/30 mt-8 px-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="h-12 px-8 rounded-2xl border-2 border-poker-accent/30 text-poker-accent hover:bg-poker-accent/10 hover:border-poker-accent/60 transition-all duration-300 font-bold tracking-wide backdrop-blur-sm bg-white/5"
          >
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}