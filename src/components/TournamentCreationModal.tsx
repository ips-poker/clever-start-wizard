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
  { value: 'freezeout', label: 'Freezeout', description: 'Без ребаев и аддонов' },
  { value: 'rebuy', label: 'Rebuy', description: 'С возможностью ребая' },
  { value: 'addon', label: 'Addon', description: 'С аддоном' },
  { value: 'rebuy-addon', label: 'Rebuy + Addon', description: 'С ребаями и аддоном' },
  { value: 'turbo', label: 'Turbo', description: 'Быстрые блайнды' },
  { value: 'hyper-turbo', label: 'Hyper Turbo', description: 'Очень быстрые блайнды' },
  { value: 'bounty', label: 'Bounty', description: 'С наградами за выбывание' },
  { value: 'mystery-bounty', label: 'Mystery Bounty', description: 'Случайные награды' }
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

  const addBlindLevel = () => {
    const lastLevel = blindStructure[blindStructure.length - 1];
    const newLevel = {
      level: (lastLevel?.level || 0) + 1,
      small_blind: Math.round((lastLevel?.small_blind || 100) * 1.5),
      big_blind: Math.round((lastLevel?.big_blind || 200) * 1.5),
      ante: Math.round((lastLevel?.ante || 0) * 1.5),
      duration: formData.timer_duration,
      is_break: false
    };
    setBlindStructure(prev => [...prev, newLevel]);
  };

  const removeBlindLevel = (index: number) => {
    setBlindStructure(prev => prev.filter((_, i) => i !== index));
  };

  const updateBlindLevel = (index: number, field: keyof BlindLevel, value: number | boolean) => {
    setBlindStructure(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addBreakLevel = () => {
    const nextBreak = Math.max(...breakLevels, 0) + 4;
    setBreakLevels(prev => [...prev, nextBreak].sort((a, b) => a - b));
  };

  const removeBreakLevel = (level: number) => {
    setBreakLevels(prev => prev.filter(l => l !== level));
  };

  const updateBreakLevel = (index: number, newLevel: number) => {
    setBreakLevels(prev => {
      const updated = [...prev];
      updated[index] = newLevel;
      return updated.sort((a, b) => a - b);
    });
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

    if (loading) return; // Предотвращаем повторные нажатия
    setLoading(true);
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

      // Save blind structure
      if (tournamentId) {
        // Delete existing blind levels
        await supabase
          .from('blind_levels')
          .delete()
          .eq('tournament_id', tournamentId);

        // Create combined structure with proper level numbering
        const combinedLevels: Array<{
          tournament_id: string;
          level: number;
          small_blind: number;
          big_blind: number;
          ante: number;
          duration: number;
          is_break: boolean;
        }> = [];

        let currentLevel = 1;

        // Add regular blind levels and breaks in correct order
        const maxBlindLevel = Math.max(...blindStructure.map(b => b.level), 0);
        
        for (let i = 1; i <= maxBlindLevel; i++) {
          // Add regular blind level if it exists
          const blindLevel = blindStructure.find(b => b.level === i);
          if (blindLevel) {
            combinedLevels.push({
              tournament_id: tournamentId,
              level: currentLevel++,
              small_blind: blindLevel.small_blind,
              big_blind: blindLevel.big_blind,
              ante: blindLevel.ante,
              duration: blindLevel.duration,
              is_break: false
            });
          }

          // Add break if scheduled for this level
          if (breakLevels.includes(i)) {
            combinedLevels.push({
              tournament_id: tournamentId,
              level: currentLevel++,
              small_blind: 0,
              big_blind: 0,
              ante: 0,
              duration: 900, // 15 minutes
              is_break: true
            });
          }
        }

        if (combinedLevels.length > 0) {
          const { error: blindError } = await supabase
            .from('blind_levels')
            .insert(combinedLevels);

          if (blindError) throw blindError;
        }
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
          <TabsList className="grid w-full grid-cols-4">
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
                    <Select value={formData.tournament_format} onValueChange={(value) => updateFormData('tournament_format', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOURNAMENT_FORMATS.map(format => (
                          <SelectItem key={format.value} value={format.value}>
                            <div>
                              <div className="font-medium">{format.label}</div>
                              <div className="text-xs text-muted-foreground">{format.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Краткое описание турнира..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Дата и время начала *</Label>
                    <Input
                      id="start-time"
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => updateFormData('start_time', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-players">Максимум игроков</Label>
                    <Input
                      id="max-players"
                      type="number"
                      value={formData.max_players}
                      onChange={(e) => updateFormData('max_players', parseInt(e.target.value) || 0)}
                      min="2"
                      max="500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="starting-chips">Стартовые фишки</Label>
                    <Input
                      id="starting-chips"
                      type="number"
                      value={formData.starting_chips}
                      onChange={(e) => updateFormData('starting_chips', parseInt(e.target.value) || 0)}
                      min="1000"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => updateFormData('is_published', checked)}
                  />
                  <Label htmlFor="published">Опубликовать турнир на сайте</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="structure" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Стоимость участия
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="timer-duration">Время уровня (секунды)</Label>
                    <Input
                      id="timer-duration"
                      type="number"
                      value={formData.timer_duration}
                      onChange={(e) => updateFormData('timer_duration', parseInt(e.target.value) || 0)}
                      min="300"
                      max="3600"
                    />
                  </div>
                </div>

                {(formData.tournament_format.includes('rebuy') || formData.tournament_format === 'rebuy') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {(formData.tournament_format.includes('addon') || formData.tournament_format === 'addon') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rebuy-end-level">Ребай до уровня</Label>
                    <Input
                      id="rebuy-end-level"
                      type="number"
                      value={formData.rebuy_end_level}
                      onChange={(e) => updateFormData('rebuy_end_level', parseInt(e.target.value) || 0)}
                      min="0"
                      max="20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addon-level">Аддон на уровне</Label>
                    <Input
                      id="addon-level"
                      type="number"
                      value={formData.addon_level}
                      onChange={(e) => updateFormData('addon_level', parseInt(e.target.value) || 0)}
                      min="0"
                      max="20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="break-start-level">Первый перерыв</Label>
                    <Input
                      id="break-start-level"
                      type="number"
                      value={formData.break_start_level}
                      onChange={(e) => updateFormData('break_start_level', parseInt(e.target.value) || 0)}
                      min="0"
                      max="20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5" />
                  Настройка перерывов
                </CardTitle>
                <CardDescription>
                  Перерывы автоматически добавляются в структуру блайндов
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {breakLevels.map((level, index) => (
                    <div key={`break-${level}-${index}`} className="flex items-center gap-2">
                      <Label className="text-sm min-w-[140px]">Перерыв после уровня:</Label>
                      <Input
                        type="number"
                        value={level}
                        onChange={(e) => updateBreakLevel(index, parseInt(e.target.value) || 0)}
                        min="1"
                        max="50"
                        className="w-20"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeBreakLevel(level)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBreakLevel}
                    className="text-green-600 hover:bg-green-50"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Добавить перерыв
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blinds" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Структура блайндов
                    </CardTitle>
                    <CardDescription>
                      Предполагаемая продолжительность: {calculateEstimatedDuration()} часов
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateDefaultBlindStructure('standard')}
                    >
                      Стандарт
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateDefaultBlindStructure('turbo')}
                    >
                      Турбо
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateDefaultBlindStructure('hyperTurbo')}
                    >
                      Гипер
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('advanced')}
                      className="text-blue-600 border-blue-200"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Детальная настройка
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {(() => {
                      // Создаем объединенный массив уровней и перерывов
                      const allLevels = [];
                      blindStructure.forEach(level => {
                        allLevels.push({ ...level, type: 'game' });
                        // Проверяем, есть ли перерыв после этого уровня
                        if (breakLevels.includes(level.level)) {
                          allLevels.push({ 
                            level: level.level + 0.5, 
                            type: 'break',
                            duration: 900 // 15 минут 
                          });
                        }
                      });
                      
                      return allLevels.map((item, index) => (
                        item.type === 'break' ? (
                          <div key={`break-${item.level}-${index}`} className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="text-sm font-medium min-w-[60px] text-orange-600">
                              ☕ Перерыв
                            </div>
                            <div className="text-sm text-orange-600">
                              15 минут после уровня {Math.floor(item.level)}
                            </div>
                          </div>
                        ) : (
                          <div key={`blind-level-${item.level}-${index}`} className="flex items-center gap-2 p-3 bg-background border rounded-lg">
                            <div className="text-sm font-medium min-w-[60px]">
                              Ур. {item.level}
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                type="number"
                                value={item.small_blind}
                                onChange={(e) => {
                                  const gameIndex = blindStructure.findIndex(level => level.level === item.level);
                                  if (gameIndex !== -1) {
                                    updateBlindLevel(gameIndex, 'small_blind', parseInt(e.target.value) || 0);
                                  }
                                }}
                                className="w-20"
                                min="0"
                              />
                              <span>/</span>
                              <Input
                                type="number"
                                value={item.big_blind}
                                onChange={(e) => {
                                  const gameIndex = blindStructure.findIndex(level => level.level === item.level);
                                  if (gameIndex !== -1) {
                                    updateBlindLevel(gameIndex, 'big_blind', parseInt(e.target.value) || 0);
                                  }
                                }}
                                className="w-20"
                                min="0"
                              />
                              <span className="text-xs text-muted-foreground">Анте:</span>
                              <Input
                                type="number"
                                value={item.ante}
                                onChange={(e) => {
                                  const gameIndex = blindStructure.findIndex(level => level.level === item.level);
                                  if (gameIndex !== -1) {
                                    updateBlindLevel(gameIndex, 'ante', parseInt(e.target.value) || 0);
                                  }
                                }}
                                className="w-16"
                                min="0"
                              />
                              <span className="text-xs text-muted-foreground">Время:</span>
                              <Input
                                type="number"
                                value={item.duration}
                                onChange={(e) => {
                                  const gameIndex = blindStructure.findIndex(level => level.level === item.level);
                                  if (gameIndex !== -1) {
                                    updateBlindLevel(gameIndex, 'duration', parseInt(e.target.value) || 0);
                                  }
                                }}
                                className="w-20"
                                min="300"
                              />
                              <span className="text-xs text-muted-foreground">сек</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const gameIndex = blindStructure.findIndex(level => level.level === item.level);
                                if (gameIndex !== -1) {
                                  removeBlindLevel(gameIndex);
                                }
                              }}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                        )
                      ));
                    })()}
                  </div>
                  <Button
                    variant="outline"
                    onClick={addBlindLevel}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить уровень
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Расширенные настройки
                </CardTitle>
                <CardDescription>
                  Детальная настройка турнира и предпросмотр результата
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Публикация турнира</Label>
                    <p className="text-sm text-muted-foreground">
                      Опубликованные турниры отображаются на главной странице сайта
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_published}
                    onCheckedChange={(checked) => updateFormData('is_published', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Расчет призового фонда</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Здесь можно добавить предпросмотр призового фонда
                        toast({
                          title: "Расчет призового фонда",
                          description: `Базовый призовой фонд: ${(formData.buy_in * formData.max_players).toLocaleString()} ₽`
                        });
                      }}
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Предпросмотр
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-muted/30 rounded-lg p-4">
                    <div>
                      <span className="text-muted-foreground">Бай-ин:</span>
                      <p className="font-medium">{formData.buy_in.toLocaleString()} ₽</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Макс. игроков:</span>
                      <p className="font-medium">{formData.max_players}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Базовый призовой фонд:</span>
                      <p className="font-medium">{(formData.buy_in * formData.max_players).toLocaleString()} ₽</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">+ Ребаи/Адоны:</span>
                      <p className="font-medium text-green-600">Дополнительно</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Быстрый доступ к управлению</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled
                        className="opacity-50"
                      >
                        Структура блайндов
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled
                        className="opacity-50"
                      >
                        Призовой фонд
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    После создания турнира эти функции будут доступны во вкладке "Управление" турнирного директора
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-medium">Превью турнира</Label>
                  <div className="bg-gradient-card rounded-lg p-4 border border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{formData.name || 'Название турнира'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formData.description || 'Описание турнира'}
                        </p>
                      </div>
                      <Badge variant="default">
                        {TOURNAMENT_FORMATS.find(f => f.value === formData.tournament_format)?.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Бай-ин:</span>
                        <p className="font-medium">{formData.buy_in.toLocaleString()} ₽</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Игроки:</span>
                        <p className="font-medium">0 / {formData.max_players}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Стек:</span>
                        <p className="font-medium">{formData.starting_chips.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Время:</span>
                        <p className="font-medium">{Math.floor(formData.timer_duration / 60)} мин</p>
                      </div>
                    </div>
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
            disabled={loading || !formData.name.trim()}
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