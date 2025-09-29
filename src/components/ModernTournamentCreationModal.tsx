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
  XCircle
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
        // Обновление существующего турнира
        const { error } = await supabase
          .from('tournaments')
          .update({
            name: formData.name,
            description: formData.description,
            participation_fee: formData.participation_fee,
            reentry_fee: formData.reentry_fee,
            additional_fee: formData.additional_fee,
            reentry_chips: formData.reentry_chips,
            additional_chips: formData.additional_chips,
            starting_chips: formData.starting_chips,
            max_players: formData.max_players,
            start_time: formData.start_time,
            tournament_format: formData.tournament_format,
            reentry_end_level: formData.reentry_end_level,
            additional_level: formData.additional_level,
            break_start_level: formData.break_start_level,
            timer_duration: formData.timer_duration,
            is_published: formData.is_published
          })
          .eq('id', tournament.id);

        if (error) throw error;
      } else {
        // Создание нового турнира
        const { data: newTournament, error } = await supabase
          .from('tournaments')
          .insert([{
            name: formData.name,
            description: formData.description,
            participation_fee: formData.participation_fee,
            reentry_fee: formData.reentry_fee,
            additional_fee: formData.additional_fee,
            reentry_chips: formData.reentry_chips,
            additional_chips: formData.additional_chips,
            starting_chips: formData.starting_chips,
            max_players: formData.max_players,
            start_time: formData.start_time,
            tournament_format: formData.tournament_format,
            reentry_end_level: formData.reentry_end_level,
            additional_level: formData.additional_level,
            break_start_level: formData.break_start_level,
            timer_duration: formData.timer_duration,
            is_published: formData.is_published,
            status: 'scheduled'
          }])
          .select()
          .single();

        if (error) throw error;

        // Создание структуры блайндов
        if (newTournament) {
          const blindLevelsData = blindLevels.map(level => ({
            tournament_id: newTournament.id,
            level: level.level,
            small_blind: level.small_blind,
            big_blind: level.big_blind,
            ante: level.ante,
            duration: level.duration,
            is_break: level.is_break
          }));

          const { error: blindError } = await supabase
            .from('blind_levels')
            .insert(blindLevelsData);

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

  const expectedRPSPool = calculateTotalRPSPool(
    Math.floor(formData.max_players * 0.7), // Ожидаемое количество участников
    formData.participation_fee,
    Math.floor(formData.max_players * 0.3), // Ожидаемые повторные входы
    formData.reentry_fee,
    Math.floor(formData.max_players * 0.5), // Ожидаемые дополнительные наборы
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Основные</TabsTrigger>
            <TabsTrigger value="fees">Взносы</TabsTrigger>
            <TabsTrigger value="format">Формат</TabsTrigger>
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