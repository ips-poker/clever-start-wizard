import { useState, useEffect } from "react";
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
  DollarSign, 
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
import AutomatedTournamentProcessor from "./AutomatedTournamentProcessor";

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

interface Tournament {
  id?: string;
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
  timer_duration: number;
  is_published: boolean;
  is_archived: boolean;
}

interface TournamentCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament?: Tournament | null;
  onTournamentUpdate: () => void;
}

const TOURNAMENT_FORMATS = [
  { value: 'freezeout', label: 'Freezeout', description: 'Без ребаев и аддонов', category: 'standard', difficulty: 'medium' },
  { value: 'rebuy', label: 'Rebuy', description: 'С возможностью ребая', category: 'standard', difficulty: 'high' },
  { value: 'addon', label: 'Addon', description: 'С аддоном', category: 'standard', difficulty: 'medium' },
  { value: 'rebuy-addon', label: 'Rebuy + Addon', description: 'С ребаями и аддоном', category: 'standard', difficulty: 'high' },
  { value: 'turbo', label: 'Turbo', description: 'Быстрые блайнды (10мин)', category: 'turbo', difficulty: 'high' },
  { value: 'hyper-turbo', label: 'Hyper Turbo', description: 'Очень быстрые блайнды (5мин)', category: 'turbo', difficulty: 'extreme' },
  { value: 'bounty', label: 'Bounty', description: 'С наградами за выбывание', category: 'special', difficulty: 'high' },
  { value: 'mystery-bounty', label: 'Mystery Bounty', description: 'Случайные награды', category: 'special', difficulty: 'extreme' },
  { value: 'deepstack', label: 'Deepstack', description: 'Глубокие стеки (200+ BB)', category: 'standard', difficulty: 'medium' },
  { value: 'satellite', label: 'Satellite', description: 'Сателлит турнир', category: 'special', difficulty: 'medium' },
  { value: 'shootout', label: 'Shootout', description: 'Турнир на выбывание столов', category: 'special', difficulty: 'high' }
];

const DEFAULT_BLIND_STRUCTURES = {
  standard: [
    { level: 1, small_blind: 100, big_blind: 200, ante: 200, duration: 1200 },
    { level: 2, small_blind: 200, big_blind: 400, ante: 400, duration: 1200 },
    { level: 3, small_blind: 300, big_blind: 600, ante: 600, duration: 1200 },
    { level: 4, small_blind: 400, big_blind: 800, ante: 800, duration: 1200 },
    { level: 5, small_blind: 500, big_blind: 1000, ante: 1000, duration: 1200 },
    { level: 6, small_blind: 600, big_blind: 1200, ante: 1200, duration: 1200 },
    { level: 7, small_blind: 800, big_blind: 1600, ante: 1600, duration: 1200 },
    { level: 8, small_blind: 1000, big_blind: 2000, ante: 2000, duration: 1200 },
    { level: 9, small_blind: 1500, big_blind: 3000, ante: 3000, duration: 1200 },
    { level: 10, small_blind: 2000, big_blind: 4000, ante: 4000, duration: 1200 }
  ],
  turbo: [
    { level: 1, small_blind: 100, big_blind: 200, ante: 200, duration: 600 },
    { level: 2, small_blind: 200, big_blind: 400, ante: 400, duration: 600 },
    { level: 3, small_blind: 300, big_blind: 600, ante: 600, duration: 600 },
    { level: 4, small_blind: 500, big_blind: 1000, ante: 1000, duration: 600 },
    { level: 5, small_blind: 800, big_blind: 1600, ante: 1600, duration: 600 },
    { level: 6, small_blind: 1000, big_blind: 2000, ante: 2000, duration: 600 },
    { level: 7, small_blind: 1500, big_blind: 3000, ante: 3000, duration: 600 },
    { level: 8, small_blind: 2000, big_blind: 4000, ante: 4000, duration: 600 },
    { level: 9, small_blind: 3000, big_blind: 6000, ante: 6000, duration: 600 },
    { level: 10, small_blind: 5000, big_blind: 10000, ante: 10000, duration: 600 }
  ],
  hyperTurbo: [
    { level: 1, small_blind: 100, big_blind: 200, ante: 200, duration: 300 },
    { level: 2, small_blind: 200, big_blind: 400, ante: 400, duration: 300 },
    { level: 3, small_blind: 400, big_blind: 800, ante: 800, duration: 300 },
    { level: 4, small_blind: 600, big_blind: 1200, ante: 1200, duration: 300 },
    { level: 5, small_blind: 1000, big_blind: 2000, ante: 2000, duration: 300 },
    { level: 6, small_blind: 1500, big_blind: 3000, ante: 3000, duration: 300 },
    { level: 7, small_blind: 2500, big_blind: 5000, ante: 5000, duration: 300 },
    { level: 8, small_blind: 4000, big_blind: 8000, ante: 8000, duration: 300 },
    { level: 9, small_blind: 6000, big_blind: 12000, ante: 12000, duration: 300 },
    { level: 10, small_blind: 10000, big_blind: 20000, ante: 20000, duration: 300 }
  ]
};

export function TournamentCreationModal({ open, onOpenChange, tournament, onTournamentUpdate }: TournamentCreationModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState<Tournament>({
    name: '',
    description: '',
    buy_in: 1000,
    rebuy_cost: 1000,
    addon_cost: 1000,
    rebuy_chips: 10000,
    addon_chips: 15000,
    starting_chips: 10000,
    max_players: 9,
    start_time: '',
    status: 'scheduled',
    tournament_format: 'freezeout',
    rebuy_end_level: 6,
    addon_level: 7,
    break_start_level: 4,
    timer_duration: 1200,
    is_published: false,
    is_archived: false
  });

  const [blindStructure, setBlindStructure] = useState<BlindLevel[]>([]);
  const [breakLevels, setBreakLevels] = useState<number[]>([4, 8, 12]);
  const { toast } = useToast();

  // Валидация в реальном времени
  useEffect(() => {
    validateTournamentSettings();
  }, [formData, blindStructure]);

  const validateTournamentSettings = () => {
    const errors = [];
    
    // Валидация чип-стека
    const chipRatio = formData.starting_chips / formData.buy_in;
    if (chipRatio < 50) {
      errors.push('Стартовый стек слишком мал (рекомендуется 50+ бай-инов)');
    }
    if (chipRatio > 300) {
      errors.push('Стартовый стек очень большой (может затянуть турнир)');
    }
    
    // Валидация времени блайндов для формата
    if (formData.tournament_format === 'turbo' && formData.timer_duration > 900) {
      errors.push('Для турбо формата рекомендуется время блайндов не более 15 минут');
    }
    if (formData.tournament_format === 'hyper-turbo' && formData.timer_duration > 600) {
      errors.push('Для гипер-турбо формата рекомендуется время блайндов не более 10 минут');
    }
    
    // Валидация ребаев
    if ((formData.tournament_format === 'rebuy' || formData.tournament_format === 'rebuy-addon') 
        && formData.rebuy_cost === 0) {
      errors.push('Для турниров с ребаями необходимо указать стоимость ребая');
    }
    
    // Валидация максимального количества игроков
    if (formData.max_players < 6) {
      errors.push('Минимальное количество игроков: 6');
    }
    
    setValidationErrors(errors);
  };

  const handleAnalysisComplete = (result: any) => {
    setAnalysisResult(result);
  };

  // Initialize form data
  useEffect(() => {
    if (tournament) {
      setFormData({
        ...tournament,
        start_time: tournament.start_time.slice(0, 16) // Format for datetime-local input
      });
      loadBlindStructure();
    } else {
      // Set default start time to next hour
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      setFormData(prev => ({
        ...prev,
        start_time: nextHour.toISOString().slice(0, 16)
      }));
      generateDefaultBlindStructure('standard');
    }
  }, [tournament, open]);

  const loadBlindStructure = async () => {
    if (!tournament?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('level');

      if (error) throw error;
      setBlindStructure(data || []);
      
      // Load break levels
      const breaks = data?.filter(level => level.is_break).map(level => level.level) || [];
      setBreakLevels(breaks);
    } catch (error) {
      console.error('Error loading blind structure:', error);
    }
  };

  const generateDefaultBlindStructure = (type: keyof typeof DEFAULT_BLIND_STRUCTURES) => {
    const structure = DEFAULT_BLIND_STRUCTURES[type].map(level => ({
      ...level,
      is_break: false
    }));
    setBlindStructure(structure);
  };

  const updateFormData = (field: keyof Tournament, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateEstimatedDuration = () => {
    const totalLevels = blindStructure.length + breakLevels.length;
    const breakDuration = breakLevels.length * 15; // 15 minutes per break
    const levelDuration = blindStructure.reduce((sum, level) => sum + (level.duration / 60), 0);
    return Math.round((levelDuration + breakDuration) / 60 * 10) / 10; // Hours with 1 decimal
  };

  const saveTournament = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Укажите название турнира',
        variant: 'destructive'
      });
      return;
    }

    if (loading || isCreating) return;
    
    setLoading(true);
    setIsCreating(true);
    
    try {
      let tournamentId = tournament?.id;

      if (tournament?.id) {
        // Update existing tournament
        const { error } = await supabase
          .from('tournaments')
          .update({
            name: formData.name,
            description: formData.description,
            buy_in: formData.buy_in,
            rebuy_cost: formData.rebuy_cost,
            addon_cost: formData.addon_cost,
            rebuy_chips: formData.rebuy_chips,
            addon_chips: formData.addon_chips,
            starting_chips: formData.starting_chips,
            max_players: formData.max_players,
            start_time: formData.start_time,
            tournament_format: formData.tournament_format,
            rebuy_end_level: formData.rebuy_end_level,
            addon_level: formData.addon_level,
            break_start_level: formData.break_start_level,
            timer_duration: formData.timer_duration,
            is_published: formData.is_published
          })
          .eq('id', tournament.id);

        if (error) throw error;
      } else {
        // Create new tournament
        const { data, error } = await supabase
          .from('tournaments')
          .insert([{
            name: formData.name,
            description: formData.description,
            buy_in: formData.buy_in,
            rebuy_cost: formData.rebuy_cost,
            addon_cost: formData.addon_cost,
            rebuy_chips: formData.rebuy_chips,
            addon_chips: formData.addon_chips,
            starting_chips: formData.starting_chips,
            max_players: formData.max_players,
            start_time: formData.start_time,
            status: 'scheduled',
            tournament_format: formData.tournament_format,
            rebuy_end_level: formData.rebuy_end_level,
            addon_level: formData.addon_level,
            break_start_level: formData.break_start_level,
            timer_duration: formData.timer_duration,
            is_published: formData.is_published,
            is_archived: false,
            current_level: 1,
            current_small_blind: blindStructure[0]?.small_blind || 100,
            current_big_blind: blindStructure[0]?.big_blind || 200,
            timer_remaining: formData.timer_duration
          }])
          .select('id')
          .single();

        if (error) throw error;
        tournamentId = data.id;
      }

      toast({
        title: tournament ? 'Турнир обновлен' : 'Турнир создан',
        description: tournament ? 'Изменения успешно сохранены' : 'Новый турнир успешно создан',
      });

      onTournamentUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="w-6 h-6 text-poker-accent" />
            {tournament ? 'Редактирование турнира' : 'Создание нового турнира'}
          </DialogTitle>
          <DialogDescription>
            {tournament ? 'Внесите изменения в настройки турнира' : 'Настройте параметры нового покерного турнира'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Основное
            </TabsTrigger>
            <TabsTrigger value="structure" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Структура
            </TabsTrigger>
            <TabsTrigger value="blinds" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Блайнды
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Анализ
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Дополнительно
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Основная информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Название турнира *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      placeholder="Например: Еженедельный турнир"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="format">Формат турнира</Label>
                    <Select value={formData.tournament_format} onValueChange={(value) => {
                      updateFormData('tournament_format', value);
                      // Автоматическое обновление настроек на основе формата
                      const format = TOURNAMENT_FORMATS.find(f => f.value === value);
                      if (format) {
                        if (format.category === 'turbo') {
                          updateFormData('timer_duration', format.value === 'hyper-turbo' ? 300 : 600);
                        }
                        if (format.value === 'deepstack') {
                          updateFormData('starting_chips', formData.buy_in * 200);
                        }
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOURNAMENT_FORMATS.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-2">
                                <span>{format.label}</span>
                                <Badge 
                                  className={
                                    format.difficulty === 'medium' ? 'bg-blue-100 text-blue-800' :
                                    format.difficulty === 'high' ? 'bg-orange-100 text-orange-800' :
                                    format.difficulty === 'extreme' ? 'bg-red-100 text-red-800' :
                                    'bg-green-100 text-green-800'
                                  }
                                >
                                  {format.category}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">{format.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание турнира</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Описание турнира, правила, особенности..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Предупреждения валидации */}
            {validationErrors.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Обнаружены проблемы в настройках:</strong>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Быстрые настройки для популярных форматов */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 w-5" />
                  Быстрые настройки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      updateFormData('buy_in', 1000);
                      updateFormData('starting_chips', 10000);
                      updateFormData('tournament_format', 'freezeout');
                      updateFormData('timer_duration', 1200);
                    }}
                  >
                    Стандартный
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      updateFormData('buy_in', 500);
                      updateFormData('starting_chips', 5000);
                      updateFormData('tournament_format', 'turbo');
                      updateFormData('timer_duration', 600);
                    }}
                  >
                    Быстрый
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      updateFormData('buy_in', 2000);
                      updateFormData('starting_chips', 40000);
                      updateFormData('tournament_format', 'deepstack');
                      updateFormData('timer_duration', 1800);
                    }}
                  >
                    Глубокий
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      updateFormData('buy_in', 1000);
                      updateFormData('starting_chips', 10000);
                      updateFormData('tournament_format', 'rebuy');
                      updateFormData('rebuy_cost', 1000);
                      updateFormData('rebuy_end_level', 6);
                    }}
                  >
                    Ребай
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="structure" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Финансовые параметры
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="buy-in">Бай-ин (₽)</Label>
                      <Input
                        id="buy-in"
                        type="number"
                        value={formData.buy_in}
                        onChange={(e) => updateFormData('buy_in', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="starting-chips">Стартовый стек</Label>
                      <Input
                        id="starting-chips"
                        type="number"
                        value={formData.starting_chips}
                        onChange={(e) => updateFormData('starting_chips', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                  </div>

                  {(formData.tournament_format.includes('rebuy') || formData.tournament_format === 'rebuy-addon') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rebuy-cost">Стоимость ребая (₽)</Label>
                        <Input
                          id="rebuy-cost"
                          type="number"
                          value={formData.rebuy_cost}
                          onChange={(e) => updateFormData('rebuy_cost', parseInt(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rebuy-chips">Фишки за ребай</Label>
                        <Input
                          id="rebuy-chips"
                          type="number"
                          value={formData.rebuy_chips}
                          onChange={(e) => updateFormData('rebuy_chips', parseInt(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                    </div>
                  )}

                  {(formData.tournament_format === 'addon' || formData.tournament_format === 'rebuy-addon') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="addon-cost">Стоимость аддона (₽)</Label>
                        <Input
                          id="addon-cost"
                          type="number"
                          value={formData.addon_cost}
                          onChange={(e) => updateFormData('addon_cost', parseInt(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addon-chips">Фишки за аддон</Label>
                        <Input
                          id="addon-chips"
                          type="number"
                          value={formData.addon_chips}
                          onChange={(e) => updateFormData('addon_chips', parseInt(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Игровые параметры
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max-players">Максимум игроков</Label>
                      <Input
                        id="max-players"
                        type="number"
                        value={formData.max_players}
                        onChange={(e) => updateFormData('max_players', parseInt(e.target.value) || 0)}
                        min="2"
                        max="200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timer-duration">Время уровня (сек)</Label>
                      <Input
                        id="timer-duration"
                        type="number"
                        value={formData.timer_duration}
                        onChange={(e) => updateFormData('timer_duration', parseInt(e.target.value) || 0)}
                        min="60"
                        max="7200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start-time">Время начала</Label>
                    <Input
                      id="start-time"
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => updateFormData('start_time', e.target.value)}
                    />
                  </div>

                  <Separator />
                  
                  <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                    <h4 className="font-medium">Текущие настройки</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Чипы/Бай-ин: <strong>{Math.round(formData.starting_chips / formData.buy_in)}</strong></div>
                      <div>Время уровня: <strong>{Math.floor(formData.timer_duration / 60)} мин</strong></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="blinds" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Структура блайндов
                </CardTitle>
                <CardDescription>
                  Предполагаемая продолжительность: {calculateEstimatedDuration()} часов
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Структура блайндов автоматически генерируется на основе выбранного формата турнира.
                  Для детальной настройки используйте продвинутые инструменты турнирного директора.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <AutomatedTournamentProcessor 
              tournamentData={formData}
              onAnalysisComplete={handleAnalysisComplete}
              realTimeMode={true}
            />
            
            {analysisResult && (
              <Alert className={
                analysisResult.risk_level === 'low' ? 'border-green-200 bg-green-50' :
                analysisResult.risk_level === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                analysisResult.risk_level === 'high' ? 'border-orange-200 bg-orange-50' :
                'border-red-200 bg-red-50'
              }>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  <strong>Оценка турнира: {analysisResult.overall_score}/100</strong>
                  <br />
                  {analysisResult.recommendations.length > 0 && (
                    <span className="text-sm">
                      Основные рекомендации: {analysisResult.recommendations.slice(0, 2).join(', ')}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Дополнительные настройки
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => updateFormData('is_published', checked)}
                  />
                  <Label htmlFor="is-published">Опубликовать турнир сразу после создания</Label>
                </div>
                
                <Separator />
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Предварительный расчёт</h4>
                  <div className="text-sm space-y-1">
                    <div>Ожидаемый призовой фонд: <strong>{(formData.buy_in * Math.floor(formData.max_players * 0.7)).toLocaleString()} ₽</strong></div>
                    <div>Соотношение чипы/бай-ин: <strong>{Math.round(formData.starting_chips / formData.buy_in)}</strong></div>
                    <div>Примерная длительность: <strong>{calculateEstimatedDuration()} часов</strong></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button 
            onClick={saveTournament}
            disabled={loading || isCreating || !formData.name.trim()}
            className="bg-gradient-button hover:shadow-elevated transition-all duration-300"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {tournament ? 'Сохранить изменения' : 'Создать турнир'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}