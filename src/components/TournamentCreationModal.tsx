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
  Trash2,
  BarChart3,
  DollarSign,
  AlertCircle
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
  timer_duration: number;
  is_published: boolean;
  is_archived: boolean;
  voice_control_enabled: boolean;
}

interface TournamentCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament?: ModernTournament | null;
  onTournamentUpdate: () => void;
}

const TOURNAMENT_FORMATS = [
  { value: 'freezeout', label: 'Фризаут', description: 'Без повторных входов и дополнительных наборов', category: 'standard', difficulty: 'medium' },
  { value: 'reentry', label: 'С повторным входом', description: 'С возможностью повторного входа', category: 'standard', difficulty: 'high' },
  { value: 'additional', label: 'С дополнительным набором', description: 'С дополнительным набором инвентаря', category: 'standard', difficulty: 'medium' },
  { value: 'reentry-additional', label: 'Полный формат', description: 'С повторными входами и дополнительным набором', category: 'standard', difficulty: 'high' }
];

const DEFAULT_BLIND_STRUCTURES = {
  standard: [
    { level: 1, small_blind: 100, big_blind: 200, ante: 200, duration: 1200, is_break: false },
    { level: 2, small_blind: 200, big_blind: 400, ante: 400, duration: 1200, is_break: false },
    { level: 3, small_blind: 300, big_blind: 600, ante: 600, duration: 1200, is_break: false },
    { level: 4, small_blind: 400, big_blind: 800, ante: 800, duration: 1200, is_break: false },
    { level: 5, small_blind: 500, big_blind: 1000, ante: 1000, duration: 900, is_break: true },
    { level: 6, small_blind: 600, big_blind: 1200, ante: 1200, duration: 1200, is_break: false },
    { level: 7, small_blind: 800, big_blind: 1600, ante: 1600, duration: 1200, is_break: false },
    { level: 8, small_blind: 1000, big_blind: 2000, ante: 2000, duration: 1200, is_break: false },
    { level: 9, small_blind: 1500, big_blind: 3000, ante: 3000, duration: 900, is_break: true },
    { level: 10, small_blind: 2000, big_blind: 4000, ante: 4000, duration: 1200, is_break: false },
    { level: 11, small_blind: 3000, big_blind: 6000, ante: 6000, duration: 1200, is_break: false },
    { level: 12, small_blind: 4000, big_blind: 8000, ante: 8000, duration: 1200, is_break: false },
    { level: 13, small_blind: 5000, big_blind: 10000, ante: 10000, duration: 900, is_break: true },
    { level: 14, small_blind: 6000, big_blind: 12000, ante: 12000, duration: 1200, is_break: false },
    { level: 15, small_blind: 8000, big_blind: 16000, ante: 16000, duration: 1200, is_break: false }
  ]
};

export function TournamentCreationModal({ 
  open, 
  onOpenChange, 
  tournament, 
  onTournamentUpdate 
}: TournamentCreationModalProps) {
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
    is_archived: false,
    voice_control_enabled: false
  });

  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>(DEFAULT_BLIND_STRUCTURES.standard);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [autoCreateBlinds, setAutoCreateBlinds] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (tournament) {
      setFormData(tournament);
    } else {
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
        is_archived: false,
        voice_control_enabled: false
      });
    }
  }, [tournament, open]);

  const updateFormData = (key: keyof ModernTournament, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const validateForm = (): string[] => {
    const newErrors: string[] = [];
    
    if (!formData.name.trim()) newErrors.push('Название мероприятия обязательно');
    if (formData.participation_fee <= 0) newErrors.push('Организационный взнос должен быть больше 0');
    if (formData.starting_chips <= 0) newErrors.push('Количество стартового инвентаря должно быть больше 0');
    if (formData.max_players <= 0) newErrors.push('Максимальное количество участников должно быть больше 0');
    if (!formData.start_time) newErrors.push('Время начала обязательно');

    return newErrors;
  };

  const createDefaultBlinds = async (tournamentId: string) => {
    if (!autoCreateBlinds) return;

    const blindLevelsData = DEFAULT_BLIND_STRUCTURES.standard.map(level => ({
      tournament_id: tournamentId,
      level: level.level,
      small_blind: level.small_blind,
      big_blind: level.big_blind,
      ante: level.ante,
      duration: level.duration,
      is_break: level.is_break
    }));

    const { error } = await supabase
      .from('blind_levels')
      .insert(blindLevelsData);

    if (error) throw error;
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
            is_published: formData.is_published,
            voice_control_enabled: formData.voice_control_enabled
          })
          .eq('id', tournament.id);

        if (error) throw error;
      } else {
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
            voice_control_enabled: formData.voice_control_enabled,
            status: 'scheduled'
          }])
          .select()
          .single();

        if (error) throw error;

        if (newTournament) {
          await createDefaultBlinds(newTournament.id);
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

  const calculateScore = () => {
    let score = 50;
    const chipRatio = formData.starting_chips / Math.max(formData.participation_fee, 1);
    
    // Чем больше фишек на взнос, тем лучше
    if (chipRatio >= 100) score += 30;
    else if (chipRatio >= 75) score += 20;
    else if (chipRatio >= 50) score += 10;
    else score -= 10;
    
    // Количество игроков
    if (formData.max_players >= 20) score += 10;
    else if (formData.max_players >= 10) score += 5;
    
    // Формат турнира
    if (formData.tournament_format === 'freezeout') score += 5;
    
    return Math.min(Math.max(score, 0), 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            {tournament ? 'Редактировать мероприятие' : 'Создание нового мероприятия'}
          </DialogTitle>
          <DialogDescription>
            Настройте параметры нового покерного турнира
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
          <TabsList className="grid w-full grid-cols-5 bg-gray-100">
            <TabsTrigger value="basic" className="data-[state=active]:bg-white">Основное</TabsTrigger>
            <TabsTrigger value="structure" className="data-[state=active]:bg-white">Структура</TabsTrigger>
            <TabsTrigger value="blinds" className="data-[state=active]:bg-white">Блайнды</TabsTrigger>
            <TabsTrigger value="analysis" className="data-[state=active]:bg-white">Анализ</TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-white">Дополнительно</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card className="bg-white/80 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800">Основные настройки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    <Label htmlFor="participation_fee">Организационный взнос *</Label>
                    <Input
                      id="participation_fee"
                      type="number"
                      min="0"
                      step="100"
                      value={formData.participation_fee}
                      onChange={(e) => updateFormData('participation_fee', parseInt(e.target.value) || 1000)}
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

                  <div className="space-y-2">
                    <Label htmlFor="tournament_format">Формат турнира</Label>
                    <Select 
                      value={formData.tournament_format} 
                      onValueChange={(value) => updateFormData('tournament_format', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите формат" />
                      </SelectTrigger>
                      <SelectContent>
                        {TOURNAMENT_FORMATS.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            <div className="flex items-center gap-2">
                              <span>{format.label}</span>
                              <Badge variant="outline" className="text-xs">
                                {format.category}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(formData.tournament_format === 'reentry' || formData.tournament_format === 'reentry-additional') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reentry_fee">Стоимость повторного входа</Label>
                        <Input
                          id="reentry_fee"
                          type="number"
                          min="0"
                          step="100"
                          value={formData.reentry_fee}
                          onChange={(e) => updateFormData('reentry_fee', parseInt(e.target.value) || 1000)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reentry_chips">Фишки при повторном входе</Label>
                        <Input
                          id="reentry_chips"
                          type="number"
                          min="1000"
                          step="1000"
                          value={formData.reentry_chips}
                          onChange={(e) => updateFormData('reentry_chips', parseInt(e.target.value) || 10000)}
                        />
                      </div>
                    </div>
                  )}

                  {(formData.tournament_format === 'additional' || formData.tournament_format === 'reentry-additional') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="additional_fee">Стоимость дополнительного набора</Label>
                        <Input
                          id="additional_fee"
                          type="number"
                          min="0"
                          step="100"
                          value={formData.additional_fee}
                          onChange={(e) => updateFormData('additional_fee', parseInt(e.target.value) || 1000)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="additional_chips">Фишки дополнительного набора</Label>
                        <Input
                          id="additional_chips"
                          type="number"
                          min="1000"
                          step="1000"
                          value={formData.additional_chips}
                          onChange={(e) => updateFormData('additional_chips', parseInt(e.target.value) || 15000)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="structure" className="space-y-6">
            <Card className="bg-white/80 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Структура блайндов
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-blue-50/50 border-blue-200/50 hover:bg-blue-50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <h3 className="font-medium text-gray-800">Автоматически создать стандартную структуру блайндов</h3>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Будет создана структура из 15 уровней</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Перерывы на 4, 8, 12 уровнях</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Автоматическая адаптация под формат турнира</span>
                          </div>
                        </div>
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => setAutoCreateBlinds(true)}
                          variant={autoCreateBlinds ? "default" : "outline"}
                        >
                          Создать автоматически
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-amber-50/50 border-amber-200/50 hover:bg-amber-50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                            <Edit className="w-4 h-4 text-white" />
                          </div>
                          <h3 className="font-medium text-gray-800">Структура блайндов</h3>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Настроить структуру блайндов вручную после создания турнира</p>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>После создания турнира перейдите на вкладку "Управление" → "Структура блайндов" для настройки уровней вручную.</p>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                          onClick={() => setAutoCreateBlinds(false)}
                        >
                          Настроить позже
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {autoCreateBlinds && (
                  <Card className="bg-green-50/50 border-green-200/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Выбрано: Автоматическое создание структуры блайндов</span>
                      </div>
                      <p className="text-sm text-green-700 mt-2">
                        При создании турнира будет автоматически сгенерирована профессиональная структура блайндов, 
                        адаптированная под количество участников и формат турнира.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blinds" className="space-y-6">
            <Card className="bg-white/80 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Предварительная структура блайндов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Информация</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Детальная настройка блайндов будет доступна после создания турнира в разделе "Управление турниром".
                      Здесь отображается предварительная структура на основе выбранных параметров.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium text-gray-700 mb-1">Начальный стек</div>
                      <div className="text-lg font-semibold text-gray-900">{formData.starting_chips.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium text-gray-700 mb-1">Макс. игроки</div>
                      <div className="text-lg font-semibold text-gray-900">{formData.max_players}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium text-gray-700 mb-1">Формат</div>
                      <div className="text-lg font-semibold text-gray-900 capitalize">{formData.tournament_format}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium text-gray-700 mb-1">Длительность уровня</div>
                      <div className="text-lg font-semibold text-gray-900">{Math.floor(formData.timer_duration / 60)} мин</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <Card className="bg-white/80 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Автоматический анализ турнира
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="text-center space-y-3">
                          <div className="text-3xl font-bold text-blue-800">
                            {calculateScore()}
                          </div>
                          <div className="text-sm text-blue-600">из 100</div>
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            Средний риск
                          </Badge>
                          <div className="text-xs text-blue-700">Общая оценка</div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-gray-600">Скорость:</div>
                          <div className="font-medium">medium</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Навык:</div>
                          <div className="font-medium">75%</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Удача:</div>
                          <div className="font-medium">25%</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Чипы/Взнос:</div>
                          <div className="font-medium">{Math.round(formData.starting_chips / Math.max(formData.participation_fee, 1))}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">Обнаружены потенциальные проблемы:</h4>
                    <div className="space-y-2">
                      {formData.starting_chips / Math.max(formData.participation_fee, 1) < 50 && (
                        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">Низкий чип-стек увеличивает фактор удачи</span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Оценка турнира: {calculateScore()}/100
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Основные рекомендации:</h4>
                    <div className="space-y-1 text-sm text-green-700">
                      <div>Рассмотрите увеличение стартового стека до 75-100 взносов</div>
                      <div>Рекомендуемая структура блайндов: standard</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card className="bg-white/80 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Дополнительные настройки
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label htmlFor="voice_control" className="text-sm font-medium text-gray-700">
                      Голосовое управление
                    </Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="voice_control"
                        checked={formData.voice_control_enabled}
                        onChange={(e) => updateFormData('voice_control_enabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <Label htmlFor="voice_control" className="text-sm text-gray-600">
                        Включить голосовое управление турниром
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="is_published" className="text-sm font-medium text-gray-700">
                      Публикация
                    </Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_published"
                        checked={formData.is_published}
                        onChange={(e) => updateFormData('is_published', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <Label htmlFor="is_published" className="text-sm text-gray-600">
                        Опубликовать турнир сразу
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-3">Интеграции</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gray-50 border-gray-200">
                      <CardContent className="p-3 text-center">
                        <div className="text-sm text-gray-600 mb-1">Telegram-бот</div>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                          Активен
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50 border-gray-200">
                      <CardContent className="p-3 text-center">
                        <div className="text-sm text-gray-600 mb-1">Фискализация</div>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                          OrangeData
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50 border-gray-200">
                      <CardContent className="p-3 text-center">
                        <div className="text-sm text-gray-600 mb-1">Голос</div>
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                          ElevenLabs
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Сохранение...' : (tournament ? 'Обновить' : 'Создать')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}