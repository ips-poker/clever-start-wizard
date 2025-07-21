import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

interface TournamentModalProps {
  tournament: Tournament | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TournamentModal({ tournament, open, onOpenChange }: TournamentModalProps) {
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

  const calculateLateRegistrationDeadline = () => {
    if (!tournament || !blindStructure.length) return null;
    
    const startTime = new Date(tournament.start_time);
    const rebuyEndLevel = tournament.rebuy_end_level || 6;
    
    let totalMinutes = 0;
    for (let i = 0; i < rebuyEndLevel && i < blindStructure.length; i++) {
      totalMinutes += blindStructure[i].duration / 60; // convert seconds to minutes
    }
    
    const deadline = new Date(startTime.getTime() + totalMinutes * 60000);
    return deadline;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₽`;
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
      case 'running': return 'Турнир идет';
      case 'scheduled': return 'Запланирован';
      case 'completed': return 'Завершен';
      default: return status;
    }
  };

  if (!tournament) return null;

  const lateRegDeadline = calculateLateRegistrationDeadline();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-poker-primary mb-2">
                {tournament.name}
              </DialogTitle>
              <p className="text-muted-foreground">{tournament.description}</p>
            </div>
            <Badge variant={getStatusColor(tournament.status)} className="ml-4">
              {getStatusLabel(tournament.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Основная информация */}
          <div className="space-y-6">
            <div className="bg-gradient-card rounded-lg p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-poker-accent" />
                Основная информация
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    Дата и время
                  </span>
                  <span className="font-medium">
                    {new Date(tournament.start_time).toLocaleString('ru-RU')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2" />
                    Игроки
                  </span>
                  <span className="font-medium">
                    {tournament._count?.tournament_registrations || 0} / {tournament.max_players}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-muted-foreground">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Формат
                  </span>
                  <Badge variant="outline">
                    {tournament.tournament_format === 'freezeout' ? 'Freezeout' : tournament.tournament_format}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-muted-foreground">
                    <Target className="w-4 h-4 mr-2" />
                    Стартовый стек
                  </span>
                  <span className="font-medium">
                    {tournament.starting_chips.toLocaleString()} фишек
                  </span>
                </div>

                {lateRegDeadline && (
                  <div className="flex items-start justify-between">
                    <span className="flex items-center text-sm text-muted-foreground">
                      <Timer className="w-4 h-4 mr-2" />
                      Поздняя регистрация до
                    </span>
                    <span className="font-medium text-right">
                      {lateRegDeadline.toLocaleString('ru-RU')}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        (до {tournament.rebuy_end_level} уровня)
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Стоимость участия */}
            <div className="bg-gradient-card rounded-lg p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-poker-success" />
                Стоимость участия
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-muted-foreground">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Бай-ин
                  </span>
                  <span className="font-bold text-lg text-poker-accent">
                    {formatCurrency(tournament.buy_in)}
                  </span>
                </div>

                {tournament.rebuy_cost > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center text-sm text-muted-foreground">
                      <Repeat className="w-4 h-4 mr-2" />
                      Ребай
                    </span>
                    <span className="font-medium">
                      {formatCurrency(tournament.rebuy_cost)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({tournament.rebuy_chips.toLocaleString()} фишек)
                      </span>
                    </span>
                  </div>
                )}

                {tournament.addon_cost > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center text-sm text-muted-foreground">
                      <Plus className="w-4 h-4 mr-2" />
                      Аддон
                    </span>
                    <span className="font-medium">
                      {formatCurrency(tournament.addon_cost)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({tournament.addon_chips.toLocaleString()} фишек)
                      </span>
                    </span>
                  </div>
                )}

                {tournament.rebuy_cost > 0 && (
                  <div className="bg-poker-warning/10 border border-poker-warning/20 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-poker-warning mt-0.5" />
                      <div className="text-xs text-poker-warning">
                        <p>Ребаи доступны до {tournament.rebuy_end_level} уровня</p>
                        {tournament.addon_cost > 0 && (
                          <p>Аддон доступен на {tournament.addon_level} уровне</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Структура блайндов */}
          <div className="space-y-6">
            <div className="bg-gradient-card rounded-lg p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-poker-primary" />
                Структура блайндов
              </h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-accent mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Загрузка структуры...</p>
                </div>
              ) : blindStructure.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {blindStructure.map((level, index) => (
                      <div key={index} className={`
                        flex items-center justify-between p-3 rounded-lg text-sm
                        ${level.is_break 
                          ? 'bg-poker-warning/10 border border-poker-warning/20' 
                          : 'bg-background border border-border'
                        }
                        ${index < (tournament.rebuy_end_level || 6) ? 'border-l-4 border-l-poker-success' : ''}
                        ${index === (tournament.addon_level || 7) - 1 ? 'border-r-4 border-r-poker-accent' : ''}
                      `}>
                        <div className="flex items-center space-x-4">
                          <span className="font-semibold min-w-[3rem]">
                            {level.level}
                          </span>
                          {level.is_break ? (
                            <span className="text-poker-warning font-medium">Перерыв</span>
                          ) : (
                            <span>
                              {level.small_blind}/{level.big_blind}
                              {level.ante > 0 && (
                                <span className="text-muted-foreground ml-1">
                                  (анте {level.ante})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {Math.floor(level.duration / 60)} мин
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-poker-success rounded"></div>
                        <span>Ребай доступен</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-poker-accent rounded"></div>
                        <span>Аддон</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-poker-warning rounded"></div>
                        <span>Перерыв</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Структура блайндов не загружена
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          {tournament.status === 'registration' && (
            <Button className="bg-gradient-button hover:shadow-elevated transition-all duration-300">
              <UserPlus className="w-4 h-4 mr-2" />
              Зарегистрироваться
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}