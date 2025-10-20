import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Minus, 
  Clock, 
  Users, 
  Target, 
  Timer,
  Calculator,
  AlertTriangle,
  Settings,
  Trophy,
  Calendar,
  Info,
  Save,
  X,
  Brain,
  Zap,
  Eye,
  CheckCircle,
  XCircle,
  Coffee,
  Edit,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateTotalRPSPool, convertFeeToRPS, formatRPSPoints, formatParticipationFee } from "@/utils/rpsCalculations";
import { LegalTerminologyInfo } from "./LegalTerminologyInfo";

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

interface ModernTournament {
  id?: string;
  name: string;
  description: string;
  participation_fee: number; // Организационный взнос
  reentry_fee: number; // Стоимость повторного входа
  additional_fee: number; // Стоимость дополнительного набора
  reentry_chips: number;
  additional_chips: number;
  starting_chips: number;
  max_players: number;
  expected_participants?: number;
  start_time: string;
  status: string;
  tournament_format: string;
  reentry_end_level: number;
  additional_level: number;
  break_start_level: number;
  timer_duration: number;
  is_published: boolean;
  is_archived: boolean;
}

interface ModernTournamentCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament?: ModernTournament | null;
  onTournamentUpdate: () => void;
}

const TOURNAMENT_FORMATS = [
  { value: 'freezeout', label: 'Фризаут', description: 'Без повторных входов и дополнительных наборов', category: 'standard', difficulty: 'medium' },
  { value: 'reentry', label: 'С повторным входом', description: 'С возможностью повторного входа', category: 'standard', difficulty: 'high' },
  { value: 'additional', label: 'С дополнительным набором', description: 'С дополнительным набором инвентаря', category: 'standard', difficulty: 'medium' },
  { value: 'reentry-additional', label: 'Полный формат', description: 'С повторными входами и дополнительным набором', category: 'standard', difficulty: 'high' },
  { value: 'turbo', label: 'Турбо', description: 'Быстрые блайнды (10мин)', category: 'turbo', difficulty: 'high' },
  { value: 'hyper-turbo', label: 'Гипер-турбо', description: 'Очень быстрые блайнды (5мин)', category: 'turbo', difficulty: 'extreme' },
  { value: 'deepstack', label: 'Глубокие стеки', description: 'Глубокие стеки (200+ BB)', category: 'standard', difficulty: 'medium' },
  { value: 'satellite', label: 'Сателлит', description: 'Квалификационное мероприятие', category: 'special', difficulty: 'medium' }
];

const DEFAULT_BLIND_STRUCTURES = {
  standard: [
    { level: 1, small_blind: 100, big_blind: 200, ante: 200, duration: 1200, is_break: false },
    { level: 2, small_blind: 200, big_blind: 400, ante: 400, duration: 1200, is_break: false },
    { level: 3, small_blind: 300, big_blind: 600, ante: 600, duration: 1200, is_break: false },
    { level: 4, small_blind: 400, big_blind: 800, ante: 800, duration: 1200, is_break: false },
    { level: 5, small_blind: 500, big_blind: 1000, ante: 1000, duration: 1200, is_break: false },
    { level: 6, small_blind: 600, big_blind: 1200, ante: 1200, duration: 1200, is_break: false },
    { level: 7, small_blind: 800, big_blind: 1600, ante: 1600, duration: 1200, is_break: false },
    { level: 8, small_blind: 1000, big_blind: 2000, ante: 2000, duration: 1200, is_break: false }
  ],
  turbo: [
    { level: 1, small_blind: 100, big_blind: 200, ante: 200, duration: 600, is_break: false },
    { level: 2, small_blind: 200, big_blind: 400, ante: 400, duration: 600, is_break: false },
    { level: 3, small_blind: 300, big_blind: 600, ante: 600, duration: 600, is_break: false },
    { level: 4, small_blind: 500, big_blind: 1000, ante: 1000, duration: 600, is_break: false }
  ]
};

export function ModernTournamentCreationModal({ 
  open, 
  onOpenChange, 
  tournament, 
  onTournamentUpdate 
}: ModernTournamentCreationModalProps) {
  const [formData, setFormData] = useState<ModernTournament>({
    name: '',
    description: '',
    participation_fee: 1000,
    reentry_fee: 1000,
    additional_fee: 1000,
    reentry_chips: 10000,
    additional_chips: 15000,
    starting_chips: 10000,
    max_players: 9,
    start_time: '',
    status: 'scheduled',
    tournament_format: 'freezeout',
    reentry_end_level: 6,
    additional_level: 7,
    break_start_level: 4,
    timer_duration: 1200,
    is_published: false,
    is_archived: false
  });

  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>(DEFAULT_BLIND_STRUCTURES.standard);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('basic');
  const { toast } = useToast();

  useEffect(() => {
    if (tournament) {
      setFormData(tournament);
    } else {
      // Сброс формы для нового турнира
      setFormData({
        name: '',
        description: '',
        participation_fee: 1000,
        reentry_fee: 1000,
        additional_fee: 1000,
        reentry_chips: 10000,
        additional_chips: 15000,
        starting_chips: 10000,
        max_players: 9,
        start_time: '',
        status: 'scheduled',
        tournament_format: 'freezeout',
        reentry_end_level: 6,
        additional_level: 7,
        break_start_level: 4,
        timer_duration: 1200,
        is_published: false,
        is_archived: false
      });
    }
  }, [tournament, open]);

  const updateFormData = (key: keyof ModernTournament, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    
    // Автоматические корректировки
    if (key === 'participation_fee') {
      // Обновляем стартовые фишки пропорционально организационному взносу
      const chipRatio = formData.starting_chips / formData.participation_fee;
      if (!isNaN(chipRatio) && chipRatio > 0) {
        setFormData(prev => ({ 
          ...prev, 
          [key]: value,
          starting_chips: value * Math.round(chipRatio)
        }));
      }
    }
  };

  const validateForm = (): string[] => {
    const newErrors: string[] = [];
    
    if (!formData.name.trim()) newErrors.push('Название мероприятия обязательно');
    if (formData.participation_fee <= 0) newErrors.push('Организационный взнос должен быть больше 0');
    if (formData.starting_chips <= 0) newErrors.push('Количество стартового инвентаря должно быть больше 0');
    if (formData.max_players <= 0) newErrors.push('Максимальное количество участников должно быть больше 0');
    if (!formData.start_time) newErrors.push('Время начала обязательно');
    
    // Проверки для форматов с повторными входами
    if ((formData.tournament_format === 'reentry' || formData.tournament_format === 'reentry-additional') 
        && formData.reentry_fee === 0) {
      newErrors.push('Стоимость повторного входа должна быть указана для данного формата');
    }
    
    // Проверки для форматов с дополнительными наборами
    if ((formData.tournament_format === 'additional' || formData.tournament_format === 'reentry-additional') 
        && formData.additional_fee === 0) {
      newErrors.push('Стоимость дополнительного набора должна быть указана для данного формата');
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      if (tournament?.id) {
        // Обновление существующего турнира через безопасную RPC функцию
        const { error } = await supabase.rpc('update_tournament_safe', {
          p_tournament_id: tournament.id,
          p_name: formData.name,
          p_description: formData.description,
          p_participation_fee: formData.participation_fee,
          p_reentry_fee: formData.reentry_fee,
          p_additional_fee: formData.additional_fee,
          p_reentry_chips: formData.reentry_chips,
          p_additional_chips: formData.additional_chips,
          p_starting_chips: formData.starting_chips,
          p_max_players: formData.max_players,
          p_start_time: formData.start_time,
          p_tournament_format: formData.tournament_format,
          p_reentry_end_level: formData.reentry_end_level,
          p_additional_level: formData.additional_level,
          p_break_start_level: formData.break_start_level,
          p_timer_duration: formData.timer_duration,
          p_is_published: formData.is_published
        });

        if (error) throw error;
      } else {
        // Создание нового турнира через безопасную RPC функцию
        const { data: newTournamentId, error } = await supabase.rpc('create_tournament_safe', {
          p_name: formData.name,
          p_description: formData.description,
          p_participation_fee: formData.participation_fee,
          p_reentry_fee: formData.reentry_fee,
          p_additional_fee: formData.additional_fee,
          p_reentry_chips: formData.reentry_chips,
          p_additional_chips: formData.additional_chips,
          p_starting_chips: formData.starting_chips,
          p_max_players: formData.max_players,
          p_start_time: formData.start_time,
          p_tournament_format: formData.tournament_format,
          p_reentry_end_level: formData.reentry_end_level,
          p_additional_level: formData.additional_level,
          p_break_start_level: formData.break_start_level,
          p_timer_duration: formData.timer_duration,
          p_is_published: formData.is_published,
          p_voice_control_enabled: false,
          p_status: 'scheduled'
        });

        if (error) throw error;

        // Создание структуры блайндов через безопасную RPC функцию
        if (newTournamentId) {
          const blindLevelsJson = blindLevels.map(level => ({
            level: level.level,
            small_blind: level.small_blind,
            big_blind: level.big_blind,
            ante: level.ante,
            duration: level.duration,
            is_break: level.is_break
          }));

          const { error: blindError } = await supabase.rpc('create_blind_levels_safe', {
            p_tournament_id: newTournamentId,
            p_blind_levels: blindLevelsJson
          });

          if (blindError) throw blindError;
        }
      }

      toast({
        title: tournament ? "Мероприятие обновлено" : "Мероприятие создано",
        description: "Данные успешно сохранены",
      });

      onTournamentUpdate();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Tournament save error:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить мероприятие",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const expectedParticipants = formData.expected_participants || formData.max_players;
  const expectedRPSPool = calculateTotalRPSPool(
    expectedParticipants, // Используем ожидаемое количество участников
    formData.participation_fee,
    Math.floor(expectedParticipants * 0.2), // Ожидаемые повторные входы (20%)
    formData.reentry_fee,
    Math.floor(expectedParticipants * 0.3), // Ожидаемые дополнительные наборы (30%)
    formData.additional_fee
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            {tournament ? 'Редактировать мероприятие' : 'Создать новое мероприятие'}
          </DialogTitle>
          <DialogDescription>
            Услуги по организации досуга в формате турнира с арендой игрового инвентаря
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Основные</TabsTrigger>
            <TabsTrigger value="fees">Взносы</TabsTrigger>
            <TabsTrigger value="format">Формат</TabsTrigger>
            <TabsTrigger value="structure">Структура</TabsTrigger>
            <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название мероприятия *</Label>
                <Input
                  id="name"
                  placeholder="Например: EPC Weekly Tournament"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">Время начала *</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => updateFormData('start_time', e.target.value)}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  placeholder="Описание мероприятия..."
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={3}
                />
              </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_players">Максимальное количество участников *</Label>
                    <Input
                      id="max_players"
                      type="number"
                      min="2"
                      max="200"
                      value={formData.max_players}
                      onChange={(e) => updateFormData('max_players', parseInt(e.target.value) || 9)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expected_participants">Ожидаемое количество участников</Label>
                    <Input
                      id="expected_participants"
                      type="number"
                      min="1"
                      max={formData.max_players}
                      value={formData.expected_participants || formData.max_players}
                      onChange={(e) => updateFormData('expected_participants', parseInt(e.target.value) || formData.max_players)}
                      placeholder={`До ${formData.max_players} участников`}
                    />
                    <p className="text-xs text-gray-500">Для расчета ожидаемого фонда RPS баллов</p>
                  </div>

              <div className="space-y-2">
                <Label htmlFor="starting_chips">Стартовый игровой инвентарь (фишки) *</Label>
                <Input
                  id="starting_chips"
                  type="number"
                  min="1000"
                  step="1000"
                  value={formData.starting_chips}
                  onChange={(e) => updateFormData('starting_chips', parseInt(e.target.value) || 10000)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fees" className="space-y-6">
            <LegalTerminologyInfo />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Организационный взнос *</CardTitle>
                  <CardDescription>
                    Плата за стандартный набор игрового инвентаря и услуги по организации досуга
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="participation_fee">Организационный взнос (₽)</Label>
                    <Input
                      id="participation_fee"
                      type="number"
                      min="100"
                      step="100"
                      value={formData.participation_fee}
                      onChange={(e) => updateFormData('participation_fee', parseInt(e.target.value) || 1000)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Соответствует {formatRPSPoints(convertFeeToRPS(formData.participation_fee))}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Дополнительные услуги</CardTitle>
                  <CardDescription>
                    Стоимость дополнительной аренды инвентаря
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reentry_fee">Повторный вход (₽)</Label>
                    <Input
                      id="reentry_fee"
                      type="number"
                      min="0"
                      step="100"
                      value={formData.reentry_fee}
                      onChange={(e) => updateFormData('reentry_fee', parseInt(e.target.value) || 0)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Дополнительная аренда: {formatRPSPoints(convertFeeToRPS(formData.reentry_fee))}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additional_fee">Дополнительный набор (₽)</Label>
                    <Input
                      id="additional_fee"
                      type="number"
                      min="0"
                      step="100"
                      value={formData.additional_fee}
                      onChange={(e) => updateFormData('additional_fee', parseInt(e.target.value) || 0)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Дополнительный набор: {formatRPSPoints(convertFeeToRPS(formData.additional_fee))}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="format" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="format">Формат мероприятия</Label>
                <Select value={formData.tournament_format} onValueChange={(value) => updateFormData('tournament_format', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите формат" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOURNAMENT_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        <div>
                          <div className="font-medium">{format.label}</div>
                          <div className="text-sm text-muted-foreground">{format.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timer_duration">Длительность уровня (сек)</Label>
                  <Input
                    id="timer_duration"
                    type="number"
                    min="300"
                    step="300"
                    value={formData.timer_duration}
                    onChange={(e) => updateFormData('timer_duration', parseInt(e.target.value) || 1200)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reentry_end_level">Повторный вход до уровня</Label>
                  <Input
                    id="reentry_end_level"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.reentry_end_level}
                    onChange={(e) => updateFormData('reentry_end_level', parseInt(e.target.value) || 6)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_level">Дополнительный набор на уровне</Label>
                  <Input
                    id="additional_level"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.additional_level}
                    onChange={(e) => updateFormData('additional_level', parseInt(e.target.value) || 7)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="structure" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5" />
                  Структура блайндов
                </CardTitle>
                <CardDescription>
                  Настройте структуру повышения ставок для турнира
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Быстрые шаблоны */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBlindLevels(DEFAULT_BLIND_STRUCTURES.standard);
                      toast({ title: "Шаблон применен", description: "Загружена стандартная структура блайндов" });
                    }}
                  >
                    Стандарт (20 мин)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBlindLevels(DEFAULT_BLIND_STRUCTURES.turbo);
                      toast({ title: "Шаблон применен", description: "Загружена турбо структура блайндов" });
                    }}
                  >
                    Турбо (10 мин)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const deepstack = DEFAULT_BLIND_STRUCTURES.standard.map(level => ({
                        ...level,
                        small_blind: Math.floor(level.small_blind * 0.5),
                        big_blind: Math.floor(level.big_blind * 0.5),
                        ante: Math.floor(level.ante * 0.5),
                        duration: 1800 // 30 минут
                      }));
                      setBlindLevels(deepstack);
                      toast({ title: "Шаблон применен", description: "Загружена структура с глубокими стеками" });
                    }}
                  >
                    Глубокие стеки (30 мин)
                  </Button>
                </div>

                {/* Управление уровнями */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Всего уровней: {blindLevels.length} • 
                      Ожидаемая длительность: {Math.floor(blindLevels.reduce((acc, level) => acc + level.duration, 0) / 60)} мин
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const newLevel: BlindLevel = {
                          level: blindLevels.length + 1,
                          small_blind: blindLevels.length > 0 
                            ? Math.floor(blindLevels[blindLevels.length - 1].big_blind * 1.5)
                            : 100,
                          big_blind: blindLevels.length > 0 
                            ? Math.floor(blindLevels[blindLevels.length - 1].big_blind * 2)
                            : 200,
                          ante: blindLevels.length > 0 
                            ? Math.floor(blindLevels[blindLevels.length - 1].big_blind * 2)
                            : 200,
                          duration: formData.timer_duration,
                          is_break: false
                        };
                        setBlindLevels([...blindLevels, newLevel]);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Добавить уровень
                    </Button>
                  </div>

                  {/* Таблица уровней */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left p-3 font-medium">Уровень</th>
                            <th className="text-left p-3 font-medium">Малый блайнд</th>
                            <th className="text-left p-3 font-medium">Большой блайнд</th>
                            <th className="text-left p-3 font-medium">Анте</th>
                            <th className="text-left p-3 font-medium">Время</th>
                            <th className="text-center p-3 font-medium">Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {blindLevels.map((level, index) => (
                            <tr key={index} className="border-t hover:bg-muted/25">
                              <td className="p-3">
                                {level.is_break ? (
                                  <Badge variant="secondary" className="gap-1">
                                    <Coffee className="w-3 h-3" />
                                    Перерыв {level.level}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">
                                    Уровень {level.level}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3">{level.is_break ? '-' : level.small_blind.toLocaleString()}</td>
                              <td className="p-3">{level.is_break ? '-' : level.big_blind.toLocaleString()}</td>
                              <td className="p-3">{level.is_break ? '-' : level.ante.toLocaleString()}</td>
                              <td className="p-3">{Math.floor(level.duration / 60)} мин</td>
                              <td className="p-3">
                                <div className="flex gap-1 justify-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      // Открыть диалог редактирования уровня
                                      const newSmallBlind = prompt(`Малый блайнд (текущий: ${level.small_blind})`, level.small_blind.toString());
                                      const newBigBlind = prompt(`Большой блайнд (текущий: ${level.big_blind})`, level.big_blind.toString());
                                      const newAnte = prompt(`Анте (текущий: ${level.ante})`, level.ante.toString());
                                      const newDuration = prompt(`Длительность в секундах (текущая: ${level.duration})`, level.duration.toString());
                                      
                                      if (newSmallBlind && newBigBlind && newAnte && newDuration) {
                                        const updatedLevels = [...blindLevels];
                                        updatedLevels[index] = {
                                          ...level,
                                          small_blind: parseInt(newSmallBlind),
                                          big_blind: parseInt(newBigBlind),
                                          ante: parseInt(newAnte),
                                          duration: parseInt(newDuration)
                                        };
                                        setBlindLevels(updatedLevels);
                                      }
                                    }}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const updatedLevels = blindLevels.filter((_, i) => i !== index);
                                      // Перенумеровать уровни
                                      const renumberedLevels = updatedLevels.map((lvl, i) => ({
                                        ...lvl,
                                        level: i + 1
                                      }));
                                      setBlindLevels(renumberedLevels);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {blindLevels.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Структура блайндов не задана</p>
                      <p className="text-sm">Выберите шаблон или добавьте уровни вручную</p>
                    </div>
                  )}

                  {/* Быстрые действия */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const breakLevel: BlindLevel = {
                          level: blindLevels.length + 1,
                          small_blind: 0,
                          big_blind: 0,
                          ante: 0,
                          duration: 600, // 10 минут перерыв
                          is_break: true
                        };
                        setBlindLevels([...blindLevels, breakLevel]);
                      }}
                    >
                      <Coffee className="w-4 h-4 mr-1" />
                      Добавить перерыв
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (blindLevels.length > 0) {
                          const factor = parseFloat(prompt("Коэффициент увеличения (например, 1.5)", "1.5") || "1.5");
                          const updatedLevels = blindLevels.map(level => ({
                            ...level,
                            small_blind: level.is_break ? 0 : Math.floor(level.small_blind * factor),
                            big_blind: level.is_break ? 0 : Math.floor(level.big_blind * factor),
                            ante: level.is_break ? 0 : Math.floor(level.ante * factor)
                          }));
                          setBlindLevels(updatedLevels);
                          toast({ title: "Структура обновлена", description: `Все блайнды увеличены в ${factor} раз` });
                        }
                      }}
                    >
                      <Calculator className="w-4 h-4 mr-1" />
                      Масштабировать блайнды
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Предпросмотр мероприятия</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Основная информация</h4>
                    <div className="space-y-1 text-sm">
                      <div>Название: <strong>{formData.name || 'Не указано'}</strong></div>
                      <div>Участников: <strong>{formData.max_players}</strong></div>
                      <div>Стартовый инвентарь: <strong>{formData.starting_chips.toLocaleString()} фишек</strong></div>
                      <div>Инвентарь/взнос: <strong>{Math.round(formData.starting_chips / formData.participation_fee)}</strong></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">RPS система</h4>
                    <div className="space-y-1 text-sm">
                      <div>Ожидаемый фонд RPS: <strong>{formatRPSPoints(expectedRPSPool)}</strong></div>
                      <div>Организационные взносы: <strong>{formatParticipationFee(formData.participation_fee)}</strong></div>
                      <div>Повторный вход: <strong>{formatParticipationFee(formData.reentry_fee)}</strong></div>
                      <div>Дополнительный набор: <strong>{formatParticipationFee(formData.additional_fee)}</strong></div>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Мероприятие проводится в формате услуг по организации досуга. 
                    Игровой инвентарь используется для ведения счета и не имеет денежной стоимости.
                    Призы выдаются исключительно в виде RPS баллов.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Отмена
          </Button>
          
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {tournament ? 'Обновить' : 'Создать'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}