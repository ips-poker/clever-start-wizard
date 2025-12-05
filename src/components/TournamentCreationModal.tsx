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
  AlertCircle,
  Mic,
  Send,
  Layers
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateTotalRPSPool, convertFeeToRPS, formatRPSPoints, formatParticipationFee } from "@/utils/rpsCalculations";
import { LegalTerminologyInfo } from "./LegalTerminologyInfo";
import syndikateLogo from "@/assets/syndikate-logo-main.png";

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
    
    if (chipRatio >= 100) score += 30;
    else if (chipRatio >= 75) score += 20;
    else if (chipRatio >= 50) score += 10;
    else score -= 10;
    
    if (formData.max_players >= 20) score += 10;
    else if (formData.max_players >= 10) score += 5;
    
    if (formData.tournament_format === 'freezeout') score += 5;
    
    return Math.min(Math.max(score, 0), 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-background border-2 border-border p-0">
        {/* Industrial texture overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              hsl(var(--syndikate-metal-light)) 2px,
              hsl(var(--syndikate-metal-light)) 4px
            )`
          }} />
        </div>

        {/* Header with logo */}
        <div className="relative border-b border-border bg-secondary/50 p-6">
          <div className="flex items-center gap-4">
            <img src={syndikateLogo} alt="Syndikate" className="h-10 w-auto" />
            <div>
              <DialogTitle className="text-2xl font-display uppercase tracking-wider text-foreground flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                {tournament ? 'Редактировать мероприятие' : 'Создание турнира'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                Настройте параметры покерного турнира
              </DialogDescription>
            </div>
          </div>
          
          {/* Neon accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>

        <div className="relative p-6">
          {errors.length > 0 && (
            <Alert className="mb-6 bg-destructive/10 border-destructive/50 text-destructive">
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
            <TabsList className="grid w-full grid-cols-5 bg-secondary/50 border border-border p-1 mb-6">
              <TabsTrigger 
                value="basic" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium uppercase text-xs tracking-wide"
              >
                Основное
              </TabsTrigger>
              <TabsTrigger 
                value="structure" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium uppercase text-xs tracking-wide"
              >
                Структура
              </TabsTrigger>
              <TabsTrigger 
                value="blinds" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium uppercase text-xs tracking-wide"
              >
                Блайнды
              </TabsTrigger>
              <TabsTrigger 
                value="analysis" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium uppercase text-xs tracking-wide"
              >
                Анализ
              </TabsTrigger>
              <TabsTrigger 
                value="advanced" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium uppercase text-xs tracking-wide"
              >
                Настройки
              </TabsTrigger>
            </TabsList>

            {/* BASIC TAB */}
            <TabsContent value="basic" className="space-y-6">
              <Card className="bg-card/50 border-border backdrop-blur-sm">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-lg font-display uppercase tracking-wide text-foreground flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Основные настройки
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-muted-foreground uppercase text-xs tracking-wide">
                        Название мероприятия *
                      </Label>
                      <Input
                        id="name"
                        placeholder="Например: Weekly Championship"
                        value={formData.name}
                        onChange={(e) => updateFormData('name', e.target.value)}
                        className="bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="start_time" className="text-muted-foreground uppercase text-xs tracking-wide">
                        Время начала *
                      </Label>
                      <Input
                        id="start_time"
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => updateFormData('start_time', e.target.value)}
                        className="bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 text-foreground"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="description" className="text-muted-foreground uppercase text-xs tracking-wide">
                        Описание
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Описание мероприятия..."
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        rows={3}
                        className="bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 text-foreground placeholder:text-muted-foreground resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_players" className="text-muted-foreground uppercase text-xs tracking-wide">
                        Максимум участников *
                      </Label>
                      <Input
                        id="max_players"
                        type="number"
                        min="2"
                        max="200"
                        value={formData.max_players}
                        onChange={(e) => updateFormData('max_players', parseInt(e.target.value) || 9)}
                        className="bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="participation_fee" className="text-muted-foreground uppercase text-xs tracking-wide">
                        Организационный взнос *
                      </Label>
                      <Input
                        id="participation_fee"
                        type="number"
                        min="0"
                        step="100"
                        value={formData.participation_fee}
                        onChange={(e) => updateFormData('participation_fee', parseInt(e.target.value) || 1000)}
                        className="bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="starting_chips" className="text-muted-foreground uppercase text-xs tracking-wide">
                        Стартовые фишки *
                      </Label>
                      <Input
                        id="starting_chips"
                        type="number"
                        min="1000"
                        step="1000"
                        value={formData.starting_chips}
                        onChange={(e) => updateFormData('starting_chips', parseInt(e.target.value) || 10000)}
                        className="bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tournament_format" className="text-muted-foreground uppercase text-xs tracking-wide">
                        Формат турнира
                      </Label>
                      <Select 
                        value={formData.tournament_format} 
                        onValueChange={(value) => updateFormData('tournament_format', value)}
                      >
                        <SelectTrigger className="bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 text-foreground">
                          <SelectValue placeholder="Выберите формат" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {TOURNAMENT_FORMATS.map((format) => (
                            <SelectItem 
                              key={format.value} 
                              value={format.value}
                              className="text-foreground hover:bg-secondary focus:bg-secondary"
                            >
                              <div className="flex items-center gap-2">
                                <span>{format.label}</span>
                                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                  {format.category}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {(formData.tournament_format === 'reentry' || formData.tournament_format === 'reentry-additional') && (
                      <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-secondary/30 border border-border rounded-sm">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground uppercase text-xs tracking-wide">
                            Стоимость повторного входа
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            value={formData.reentry_fee}
                            onChange={(e) => updateFormData('reentry_fee', parseInt(e.target.value) || 1000)}
                            className="bg-secondary/50 border-border focus:border-primary text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground uppercase text-xs tracking-wide">
                            Фишки при повторном входе
                          </Label>
                          <Input
                            type="number"
                            min="1000"
                            step="1000"
                            value={formData.reentry_chips}
                            onChange={(e) => updateFormData('reentry_chips', parseInt(e.target.value) || 10000)}
                            className="bg-secondary/50 border-border focus:border-primary text-foreground"
                          />
                        </div>
                      </div>
                    )}

                    {(formData.tournament_format === 'additional' || formData.tournament_format === 'reentry-additional') && (
                      <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-secondary/30 border border-border rounded-sm">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground uppercase text-xs tracking-wide">
                            Стоимость дополнительного набора
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            value={formData.additional_fee}
                            onChange={(e) => updateFormData('additional_fee', parseInt(e.target.value) || 1000)}
                            className="bg-secondary/50 border-border focus:border-primary text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground uppercase text-xs tracking-wide">
                            Фишки дополнительного набора
                          </Label>
                          <Input
                            type="number"
                            min="1000"
                            step="1000"
                            value={formData.additional_chips}
                            onChange={(e) => updateFormData('additional_chips', parseInt(e.target.value) || 15000)}
                            className="bg-secondary/50 border-border focus:border-primary text-foreground"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* STRUCTURE TAB */}
            <TabsContent value="structure" className="space-y-6">
              <Card className="bg-card/50 border-border backdrop-blur-sm">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-lg font-display uppercase tracking-wide text-foreground flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Структура блайндов
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Auto create option */}
                    <div 
                      className={`relative cursor-pointer transition-all ${autoCreateBlinds ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setAutoCreateBlinds(true)}
                    >
                      <Card className="bg-primary/10 border-primary/30 hover:bg-primary/20 transition-colors h-full">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-primary-foreground" />
                              </div>
                              <h3 className="font-display uppercase tracking-wide text-foreground">Автоматически</h3>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-primary" />
                                <span>15 уровней блайндов</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-primary" />
                                <span>Перерывы на 4, 8, 12 уровнях</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-primary" />
                                <span>Адаптация под формат</span>
                              </div>
                            </div>
                            {autoCreateBlinds && (
                              <Badge className="bg-primary text-primary-foreground">ВЫБРАНО</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Manual option */}
                    <div 
                      className={`relative cursor-pointer transition-all ${!autoCreateBlinds ? 'ring-2 ring-accent' : ''}`}
                      onClick={() => setAutoCreateBlinds(false)}
                    >
                      <Card className="bg-accent/10 border-accent/30 hover:bg-accent/20 transition-colors h-full">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-accent rounded-sm flex items-center justify-center">
                                <Edit className="w-5 h-5 text-accent-foreground" />
                              </div>
                              <h3 className="font-display uppercase tracking-wide text-foreground">Вручную</h3>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <p>Настроить структуру блайндов вручную после создания турнира</p>
                              <p className="mt-2">Перейдите в "Управление" → "Структура блайндов"</p>
                            </div>
                            {!autoCreateBlinds && (
                              <Badge className="bg-accent text-accent-foreground">ВЫБРАНО</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {autoCreateBlinds && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-sm">
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Автоматическое создание структуры блайндов</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        При создании турнира будет сгенерирована профессиональная структура блайндов.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* BLINDS TAB */}
            <TabsContent value="blinds" className="space-y-6">
              <Card className="bg-card/50 border-border backdrop-blur-sm">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-lg font-display uppercase tracking-wide text-foreground flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Предварительная структура
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="p-4 bg-primary/10 border border-primary/30 rounded-sm">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <Info className="w-4 h-4" />
                        <span className="font-medium uppercase text-xs tracking-wide">Информация</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Детальная настройка блайндов будет доступна после создания турнира в разделе "Управление турниром".
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-secondary/50 border border-border p-4 rounded-sm">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Начальный стек</div>
                        <div className="text-xl font-display text-primary">{formData.starting_chips.toLocaleString()}</div>
                      </div>
                      <div className="bg-secondary/50 border border-border p-4 rounded-sm">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Макс. игроки</div>
                        <div className="text-xl font-display text-foreground">{formData.max_players}</div>
                      </div>
                      <div className="bg-secondary/50 border border-border p-4 rounded-sm">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Формат</div>
                        <div className="text-xl font-display text-foreground capitalize">{formData.tournament_format}</div>
                      </div>
                      <div className="bg-secondary/50 border border-border p-4 rounded-sm">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Длит. уровня</div>
                        <div className="text-xl font-display text-foreground">{Math.floor(formData.timer_duration / 60)} мин</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ANALYSIS TAB */}
            <TabsContent value="analysis" className="space-y-6">
              <Card className="bg-card/50 border-border backdrop-blur-sm">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-lg font-display uppercase tracking-wide text-foreground flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Автоматический анализ
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Score card */}
                      <Card className="bg-gradient-to-br from-secondary to-secondary/50 border-border">
                        <CardContent className="p-6">
                          <div className="text-center space-y-3">
                            <div className={`text-5xl font-display ${getScoreColor(calculateScore())}`}>
                              {calculateScore()}
                            </div>
                            <div className="text-sm text-muted-foreground">из 100</div>
                            <Badge 
                              className={`${calculateScore() >= 60 ? 'bg-primary/20 text-primary border-primary/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}
                              variant="outline"
                            >
                              {calculateScore() >= 80 ? 'Отлично' : calculateScore() >= 60 ? 'Хорошо' : calculateScore() >= 40 ? 'Средний риск' : 'Высокий риск'}
                            </Badge>
                            <div className="text-xs text-muted-foreground">Общая оценка</div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Stats */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-secondary/50 border border-border p-3 rounded-sm">
                            <div className="text-xs text-muted-foreground uppercase">Скорость</div>
                            <div className="font-medium text-foreground">medium</div>
                          </div>
                          <div className="bg-secondary/50 border border-border p-3 rounded-sm">
                            <div className="text-xs text-muted-foreground uppercase">Навык</div>
                            <div className="font-medium text-primary">75%</div>
                          </div>
                          <div className="bg-secondary/50 border border-border p-3 rounded-sm">
                            <div className="text-xs text-muted-foreground uppercase">Удача</div>
                            <div className="font-medium text-foreground">25%</div>
                          </div>
                          <div className="bg-secondary/50 border border-border p-3 rounded-sm">
                            <div className="text-xs text-muted-foreground uppercase">Чипы/Взнос</div>
                            <div className="font-medium text-primary">{Math.round(formData.starting_chips / Math.max(formData.participation_fee, 1))}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Warnings */}
                    {formData.starting_chips / Math.max(formData.participation_fee, 1) < 50 && (
                      <div className="flex items-center gap-3 text-yellow-400 bg-yellow-500/10 p-4 rounded-sm border border-yellow-500/30">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">Низкий чип-стек увеличивает фактор удачи</span>
                      </div>
                    )}

                    {/* Recommendations */}
                    <div className="bg-primary/10 border border-primary/30 rounded-sm p-4">
                      <h4 className="font-display uppercase tracking-wide text-primary mb-3">Рекомендации</h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div>• Рассмотрите увеличение стартового стека до 75-100 взносов</div>
                        <div>• Рекомендуемая структура блайндов: standard</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ADVANCED TAB */}
            <TabsContent value="advanced" className="space-y-6">
              <Card className="bg-card/50 border-border backdrop-blur-sm">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-lg font-display uppercase tracking-wide text-foreground flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Дополнительные настройки
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Voice control */}
                    <div className="bg-secondary/30 border border-border p-4 rounded-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-sm flex items-center justify-center">
                            <Mic className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <Label className="text-foreground font-medium">Голосовое управление</Label>
                            <p className="text-xs text-muted-foreground">Управление турниром голосом</p>
                          </div>
                        </div>
                        <Switch
                          checked={formData.voice_control_enabled}
                          onCheckedChange={(checked) => updateFormData('voice_control_enabled', checked)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    </div>

                    {/* Publish */}
                    <div className="bg-secondary/30 border border-border p-4 rounded-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent/20 rounded-sm flex items-center justify-center">
                            <Send className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <Label className="text-foreground font-medium">Публикация</Label>
                            <p className="text-xs text-muted-foreground">Опубликовать турнир сразу</p>
                          </div>
                        </div>
                        <Switch
                          checked={formData.is_published}
                          onCheckedChange={(checked) => updateFormData('is_published', checked)}
                          className="data-[state=checked]:bg-accent"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* Integrations */}
                  <div>
                    <h4 className="font-display uppercase tracking-wide text-foreground mb-4">Интеграции</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-secondary/30 border-border">
                        <CardContent className="p-4 text-center">
                          <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <div className="text-sm font-medium text-foreground">EPC Rating</div>
                          <Badge variant="outline" className="text-xs mt-1 border-muted-foreground/30 text-muted-foreground">Подключено</Badge>
                        </CardContent>
                      </Card>
                      <Card className="bg-secondary/30 border-border">
                        <CardContent className="p-4 text-center">
                          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <div className="text-sm font-medium text-foreground">Telegram</div>
                          <Badge variant="outline" className="text-xs mt-1 border-muted-foreground/30 text-muted-foreground">Доступно</Badge>
                        </CardContent>
                      </Card>
                      <Card className="bg-secondary/30 border-border">
                        <CardContent className="p-4 text-center">
                          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <div className="text-sm font-medium text-foreground">Аналитика</div>
                          <Badge variant="outline" className="text-xs mt-1 border-muted-foreground/30 text-muted-foreground">Включено</Badge>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer buttons */}
          <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-border">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="w-4 h-4 mr-2" />
              Отмена
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-display uppercase tracking-wide"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {tournament ? 'Сохранить' : 'Создать турнир'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
