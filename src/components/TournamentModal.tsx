import { useState, useEffect } from "react";
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
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  onTournamentUpdate?: () => void;
}

export function TournamentModal({ tournament, open, onOpenChange, onTournamentUpdate }: TournamentModalProps) {
  const [blindStructure, setBlindStructure] = useState<BlindLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    buy_in: 0,
    rebuy_cost: 0,
    addon_cost: 0,
    rebuy_chips: 0,
    addon_chips: 0,
    starting_chips: 0,
    max_players: 0,
    start_time: '',
    tournament_format: '',
    rebuy_end_level: 0,
    addon_level: 0,
    break_start_level: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    if (tournament && open) {
      loadBlindStructure();
      setEditForm({
        name: tournament.name,
        description: tournament.description || '',
        buy_in: tournament.buy_in,
        rebuy_cost: tournament.rebuy_cost,
        addon_cost: tournament.addon_cost,
        rebuy_chips: tournament.rebuy_chips,
        addon_chips: tournament.addon_chips,
        starting_chips: tournament.starting_chips,
        max_players: tournament.max_players,
        start_time: tournament.start_time.slice(0, 16), // Format for datetime-local input
        tournament_format: tournament.tournament_format,
        rebuy_end_level: tournament.rebuy_end_level,
        addon_level: tournament.addon_level,
        break_start_level: tournament.break_start_level
      });
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

  const saveTournamentChanges = async () => {
    if (!tournament) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          name: editForm.name,
          description: editForm.description,
          buy_in: editForm.buy_in,
          rebuy_cost: editForm.rebuy_cost,
          addon_cost: editForm.addon_cost,
          rebuy_chips: editForm.rebuy_chips,
          addon_chips: editForm.addon_chips,
          starting_chips: editForm.starting_chips,
          max_players: editForm.max_players,
          start_time: editForm.start_time,
          tournament_format: editForm.tournament_format,
          rebuy_end_level: editForm.rebuy_end_level,
          addon_level: editForm.addon_level,
          break_start_level: editForm.break_start_level
        })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({
        title: 'Турнир обновлен',
        description: 'Изменения успешно сохранены',
      });

      setIsEditing(false);
      onTournamentUpdate?.();
    } catch (error: any) {
      toast({
        title: 'Ошибка сохранения',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <DialogTitle className="text-xl font-bold">
                    Редактирование турнира
                  </DialogTitle>
                  <DialogDescription>
                    Изменение параметров и настроек турнира
                  </DialogDescription>
                  <div>
                    <Label htmlFor="tournament-name">Название турнира</Label>
                    <Input
                      id="tournament-name"
                      value={editForm.name}
                      onChange={(e) => handleEditFormChange('name', e.target.value)}
                      className="text-xl font-bold"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tournament-description">Описание</Label>
                    <Textarea
                      id="tournament-description"
                      value={editForm.description}
                      onChange={(e) => handleEditFormChange('description', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <DialogTitle className="text-2xl font-bold text-poker-primary mb-2">
                    {tournament.name}
                  </DialogTitle>
                  <DialogDescription>
                    {tournament.description || "Подробная информация о турнире"}
                  </DialogDescription>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge variant={getStatusColor(tournament.status)}>
                {getStatusLabel(tournament.status)}
              </Badge>
              {tournament.status !== 'completed' && (
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {isEditing ? (
                    <>
                      <X className="w-4 h-4" />
                      Отмена
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      Редактировать
                    </>
                  )}
                </Button>
              )}
            </div>
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
              
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-time">Дата и время</Label>
                      <Input
                        id="start-time"
                        type="datetime-local"
                        value={editForm.start_time}
                        onChange={(e) => handleEditFormChange('start_time', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-players">Макс. игроков</Label>
                      <Input
                        id="max-players"
                        type="number"
                        value={editForm.max_players}
                        onChange={(e) => handleEditFormChange('max_players', parseInt(e.target.value) || 0)}
                        min="2"
                        max="500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tournament-format">Формат</Label>
                      <Select value={editForm.tournament_format} onValueChange={(value) => handleEditFormChange('tournament_format', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="freezeout">Freezeout</SelectItem>
                          <SelectItem value="rebuy">Rebuy</SelectItem>
                          <SelectItem value="bounty">Bounty</SelectItem>
                          <SelectItem value="turbo">Turbo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="starting-chips">Стартовый стек</Label>
                      <Input
                        id="starting-chips"
                        type="number"
                        value={editForm.starting_chips}
                        onChange={(e) => handleEditFormChange('starting_chips', parseInt(e.target.value) || 0)}
                        min="1000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="rebuy-end-level">Ребай до уровня</Label>
                      <Input
                        id="rebuy-end-level"
                        type="number"
                        value={editForm.rebuy_end_level}
                        onChange={(e) => handleEditFormChange('rebuy_end_level', parseInt(e.target.value) || 0)}
                        min="0"
                        max="20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="addon-level">Аддон на уровне</Label>
                      <Input
                        id="addon-level"
                        type="number"
                        value={editForm.addon_level}
                        onChange={(e) => handleEditFormChange('addon_level', parseInt(e.target.value) || 0)}
                        min="0"
                        max="20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="break-start-level">Перерыв с уровня</Label>
                      <Input
                        id="break-start-level"
                        type="number"
                        value={editForm.break_start_level}
                        onChange={(e) => handleEditFormChange('break_start_level', parseInt(e.target.value) || 0)}
                        min="0"
                        max="20"
                      />
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            {/* Стоимость участия */}
            <div className="bg-gradient-card rounded-lg p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-poker-success" />
                Стоимость участия
              </h3>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="buy-in">Бай-ин (₽)</Label>
                    <Input
                      id="buy-in"
                      type="number"
                      value={editForm.buy_in}
                      onChange={(e) => handleEditFormChange('buy_in', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rebuy-cost">Ребай (₽)</Label>
                      <Input
                        id="rebuy-cost"
                        type="number"
                        value={editForm.rebuy_cost}
                        onChange={(e) => handleEditFormChange('rebuy_cost', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rebuy-chips">Фишки за ребай</Label>
                      <Input
                        id="rebuy-chips"
                        type="number"
                        value={editForm.rebuy_chips}
                        onChange={(e) => handleEditFormChange('rebuy_chips', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="addon-cost">Аддон (₽)</Label>
                      <Input
                        id="addon-cost"
                        type="number"
                        value={editForm.addon_cost}
                        onChange={(e) => handleEditFormChange('addon_cost', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="addon-chips">Фишки за аддон</Label>
                      <Input
                        id="addon-chips"
                        type="number"
                        value={editForm.addon_chips}
                        onChange={(e) => handleEditFormChange('addon_chips', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
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
          {isEditing && (
            <Button 
              onClick={saveTournamentChanges}
              disabled={loading}
              className="bg-gradient-button hover:shadow-elevated transition-all duration-300"
            >
              <Save className="w-4 h-4 mr-2" />
              Сохранить изменения
            </Button>
          )}
          {tournament.status === 'registration' && !isEditing && (
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