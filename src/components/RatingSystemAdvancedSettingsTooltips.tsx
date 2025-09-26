import { useState, useEffect } from 'react';
import { useRatingProfiles } from '@/hooks/useRatingProfiles';
import { RatingProfile, RatingSystemConfig } from '@/hooks/useRatingSystemConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Settings, 
  Save, 
  Copy, 
  Trash2, 
  Upload, 
  Download,
  BarChart3,
  Calculator,
  Trophy,
  Target,
  Clock,
  Zap,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Gamepad2,
  Info,
  AlertTriangle,
  Plus,
  Edit,
  FileText,
  Activity,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface CalculationPreview {
  scenario: string;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  newRating: number;
  ratingChange: number;
}

// Объект с подсказками для всех параметров
const tooltips = {
  base_points: "Базовые очки, которые игрок получает за участие в турнире. Рекомендуется 1-5 очков для стандартных турниров.",
  participation_bonus: "Дополнительные очки за участие. Используется для поощрения активности игроков.",
  min_rating: "Минимально возможный рейтинг игрока. Защищает от чрезмерного падения рейтинга.",
  max_rating: "Максимально возможный рейтинг. Создает потолок для развития рейтинга.",
  min_players_for_rating: "Минимальное количество участников для применения рейтинга. Турниры с меньшим количеством игроков не влияют на рейтинг.",
  auto_apply: "Автоматически применяет изменения рейтинга после завершения турнира без подтверждения.",
  rebuy_multiplier: "Множитель очков за каждый ребай. Увеличивает значимость дополнительных вложений.",
  addon_multiplier: "Множитель очков за аддоны. Влияет на расчет при использовании дополнительных фишек.",
  first_place_bonus: "Дополнительные очки за первое место. Значительно влияет на мотивацию к победе.",
  second_place_bonus: "Бонус за второе место. Поощряет стремление к финальному столу.",
  third_place_bonus: "Бонус за третье место. Награждает попадание в топ-3.",
  itm_bonus: "Бонус за попадание в призовую зону (ITM - In The Money). Поощряет стабильную игру.",
  bubble_bonus: "Компенсационный бонус для игрока, выбывшего непосредственно перед призовой зоной.",
  heads_up_bonus: "Дополнительные очки за игру один-на-один в финале турнира.",
  prize_coefficient: "Процент от выигранной суммы, конвертируемый в рейтинговые очки. Чем больше выигрыш, тем больше очков.",
  min_prize_points: "Минимальное количество очков за призовое место, независимо от суммы выигрыша.",
  max_prize_points: "Максимальное количество очков за призовое место. Ограничивает влияние очень крупных выигрышей.",
  prize_distribution_weight: "Влияние распределения призового фонда на количество получаемых очков.",
  turbo_modifier: "Модификатор для турбо-турниров. Обычно меньше 1.0, так как они требуют меньше времени и усилий.",
  deepstack_modifier: "Модификатор для дипстек турниров. Обычно больше 1.0 из-за повышенной сложности.",
  freeroll_modifier: "Модификатор для бесплатных турниров. Обычно меньше 1.0 из-за отсутствия финансового риска.",
  knockout_bonus: "Дополнительные очки за каждого выбитого игрока в турнирах на выбывание.",
  field_size_modifier: "Учитывает размер поля турнира при расчете. Большие турниры дают больше очков.",
  buy_in_modifier: "Учитывает размер взноса при расчете. Более дорогие турниры дают больше очков.",
  guarantee_modifier: "Повышенный модификатор для турниров с гарантированным призовым фондом.",
  position_weight: "Важность финальной позиции в турнире при расчете рейтинга.",
  prize_weight: "Важность размера выигранного приза при расчете рейтинга.",
  field_size_weight: "Важность размера поля турнира при расчете рейтинга.",
  buy_in_weight: "Важность размера взноса при расчете рейтинга.",
  duration_weight: "Важность длительности турнира при расчете рейтинга.",
  performance_weight: "Общий вес показателей производительности игрока."
};

interface TooltipFieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
  tooltip: string;
}

function TooltipField({ id, label, children, tooltip }: TooltipFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="text-poker-text-primary">{label}</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-poker-text-muted hover:text-poker-accent cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-gradient-tooltip border-poker-border">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  );
}

interface ConnectionStatusProps {
  isOnline: boolean;
  lastSaved?: string;
}

function ConnectionStatus({ isOnline, lastSaved }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-poker-text-muted">
      {isOnline ? (
        <div className="flex items-center gap-1 text-green-600">
          <Wifi className="h-4 w-4" />
          <span>Подключено к серверу</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-amber-600">
          <WifiOff className="h-4 w-4" />
          <span>Автономный режим</span>
        </div>
      )}
      {lastSaved && (
        <span>• Последнее сохранение: {new Date(lastSaved).toLocaleTimeString()}</span>
      )}
    </div>
  );
}

export default function RatingSystemAdvancedSettingsTooltips() {
  const { 
    profiles, 
    activeProfile, 
    isLoading, 
    setActiveProfile, 
    saveProfile, 
    deleteProfile, 
    duplicateProfile, 
    exportProfile, 
    importProfile,
    getProfileAnalytics 
  } = useRatingProfiles();
  
  const [localConfig, setLocalConfig] = useState<RatingSystemConfig | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');
  const [selectedTournamentTypes, setSelectedTournamentTypes] = useState<string[]>([]);
  const [calculationPreviews, setCalculationPreviews] = useState<CalculationPreview[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSaved, setLastSaved] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const { toast: useToastHook } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (activeProfile) {
      setLocalConfig(activeProfile.config);
      loadAnalytics(activeProfile.id);
    }
  }, [activeProfile]);

  useEffect(() => {
    if (localConfig) {
      generateCalculationPreviews();
    }
  }, [localConfig]);

  const loadAnalytics = async (profileId: string) => {
    const data = await getProfileAnalytics(profileId);
    setAnalytics(data);
  };

  const generateCalculationPreviews = () => {
    if (!localConfig) return;

    const scenarios: CalculationPreview[] = [
      {
        scenario: '1 место из 50 игроков',
        basePoints: localConfig.base_points + localConfig.participation_bonus,
        bonusPoints: localConfig.first_place_bonus + localConfig.itm_bonus,
        totalPoints: 0,
        newRating: 0,
        ratingChange: 0
      },
      {
        scenario: '3 место из 100 игроков',
        basePoints: localConfig.base_points + localConfig.participation_bonus,
        bonusPoints: localConfig.third_place_bonus + localConfig.itm_bonus + localConfig.top_3_bonus,
        totalPoints: 0,
        newRating: 0,
        ratingChange: 0
      },
      {
        scenario: 'Пузырь (9 место из 8 ITM)',
        basePoints: localConfig.base_points + localConfig.participation_bonus,
        bonusPoints: localConfig.bubble_bonus,
        totalPoints: 0,
        newRating: 0,
        ratingChange: 0
      },
      {
        scenario: 'Выбывание на 25 месте из 50',
        basePoints: localConfig.base_points + localConfig.participation_bonus,
        bonusPoints: 0,
        totalPoints: 0,
        newRating: 0,
        ratingChange: 0
      }
    ];

    scenarios.forEach(scenario => {
      scenario.totalPoints = scenario.basePoints + scenario.bonusPoints;
      scenario.ratingChange = scenario.totalPoints;
      scenario.newRating = 1500 + scenario.ratingChange; // Assuming 1500 current rating
    });

    setCalculationPreviews(scenarios);
  };

  const handleSaveProfile = async () => {
    if (!activeProfile || !localConfig) return;

    setIsSaving(true);
    const updatedProfile: RatingProfile = {
      ...activeProfile,
      config: localConfig,
      updated_at: new Date().toISOString()
    };

    try {
      const result = await saveProfile(updatedProfile);
      
      if (result.success) {
        setLastSaved(new Date().toISOString());
        
        if (result.fallback) {
          toast.success('Настройки сохранены локально', {
            description: 'Проблемы с подключением к серверу. Данные сохранены в браузере.',
            icon: <AlertTriangle className="h-4 w-4" />
          });
        } else {
          toast.success('Профиль сохранен', {
            description: 'Конфигурация рейтинговой системы обновлена на сервере.',
            icon: <CheckCircle2 className="h-4 w-4" />
          });
        }
      } else {
        throw new Error('Не удалось сохранить профиль');
      }
    } catch (error) {
      toast.error('Ошибка сохранения', {
        description: 'Не удалось сохранить профиль. Попробуйте еще раз.',
        icon: <AlertCircle className="h-4 w-4" />
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;

    const newProfile: RatingProfile = {
      id: `profile_${Date.now()}`,
      name: newProfileName,
      description: newProfileDescription,
      config: activeProfile?.config || profiles[0]?.config,
      tournament_types: selectedTournamentTypes,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0,
      avg_rating_change: 0
    };

    const result = await saveProfile(newProfile);
    
    if (result.success) {
      setIsCreateDialogOpen(false);
      setNewProfileName('');
      setNewProfileDescription('');
      setSelectedTournamentTypes([]);
      setActiveProfile(newProfile);
      toast.success('Профиль создан', {
        description: `Профиль "${newProfileName}" успешно создан`
      });
    } else {
      toast.error('Ошибка создания', {
        description: 'Не удалось создать профиль'
      });
    }
  };

  const tournamentTypes = [
    { value: 'standard', label: 'Стандартный' },
    { value: 'turbo', label: 'Турбо' },
    { value: 'hyperturbo', label: 'Гипертурбо' },
    { value: 'deepstack', label: 'Дипстек' },
    { value: 'knockout', label: 'Нокаут' },
    { value: 'satellite', label: 'Сателлит' },
    { value: 'freeroll', label: 'Фрироль' },
    { value: 'freezeout', label: 'Фризаут' },
    { value: 'rebuy', label: 'Ребай' },
    { value: 'addon', label: 'Аддон' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статус подключения */}
      <div className="flex justify-between items-center">
        <ConnectionStatus isOnline={isOnline} lastSaved={lastSaved} />
          <Button 
            onClick={handleSaveProfile} 
            disabled={isSaving}
            className="bg-poker-primary hover:bg-poker-primary/90"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? 'Сохранение...' : 'Сохранить профиль'}
          </Button>
        </div>

        {/* Управление профилями */}
        <Card className="bg-gradient-card border-poker-border shadow-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-poker-text-primary">
              <Settings className="h-5 w-5 text-poker-accent" />
              Профессиональные настройки рейтинговой системы RPS
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-poker-text-muted hover:text-poker-accent cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md bg-gradient-tooltip border-poker-border">
                  <p className="text-sm">
                    Система профилей позволяет создавать различные конфигурации рейтинга для разных типов турниров. 
                    Каждый профиль содержит настройки бонусов, модификаторов и весовых коэффициентов.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription className="text-poker-text-secondary">
              Расширенная система настройки профилей для разных типов турниров. Используйте подсказки для понимания каждого параметра.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Select 
                value={activeProfile?.id || ''} 
                onValueChange={(value) => {
                  const profile = profiles.find(p => p.id === value);
                  if (profile) setActiveProfile(profile);
                }}
              >
                <SelectTrigger className="w-[250px] bg-background border-poker-border">
                  <SelectValue placeholder="Выберите профиль" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex items-center gap-2">
                        {profile.name}
                        {profile.is_default && <Badge variant="secondary" className="text-xs">По умолчанию</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-poker-border">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать профиль
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gradient-card border-poker-border">
                  <DialogHeader>
                    <DialogTitle className="text-poker-text-primary">Создать новый профиль</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="profileName" className="text-poker-text-primary">Название профиля</Label>
                      <Input
                        id="profileName"
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        className="bg-background border-poker-border"
                        placeholder="Например: Турбо турниры"
                      />
                    </div>
                    <div>
                      <Label htmlFor="profileDescription" className="text-poker-text-primary">Описание</Label>
                      <Textarea
                        id="profileDescription"
                        value={newProfileDescription}
                        onChange={(e) => setNewProfileDescription(e.target.value)}
                        className="bg-background border-poker-border"
                        placeholder="Краткое описание профиля и его назначения"
                      />
                    </div>
                    <Button onClick={handleCreateProfile} className="bg-poker-primary hover:bg-poker-primary/90">
                      Создать профиль
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {activeProfile && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-background border-poker-border">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-poker-text-primary">{activeProfile.usage_count}</div>
                    <div className="text-sm text-poker-text-muted">Использований</div>
                  </CardContent>
                </Card>
                <Card className="bg-background border-poker-border">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-poker-text-primary">
                      {analytics?.avg_rating_change?.toFixed(1) || '0.0'}
                    </div>
                    <div className="text-sm text-poker-text-muted">Среднее изменение</div>
                  </CardContent>
                </Card>
                <Card className="bg-background border-poker-border">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-poker-text-primary">
                      {analytics?.success_rate?.toFixed(1) || '0.0'}%
                    </div>
                    <div className="text-sm text-poker-text-muted">Успешность</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {localConfig && (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">Базовые</TabsTrigger>
              <TabsTrigger value="bonuses">Бонусы</TabsTrigger>
              <TabsTrigger value="prizes">Призовые</TabsTrigger>
              <TabsTrigger value="modifiers">Модификаторы</TabsTrigger>
              <TabsTrigger value="weights">Веса</TabsTrigger>
              <TabsTrigger value="preview">Превью</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card className="bg-gradient-card border-poker-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                    <Target className="h-5 w-5 text-poker-accent" />
                    Базовые параметры
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TooltipField id="base_points" label="Базовые очки за участие" tooltip={tooltips.base_points}>
                      <Input
                        id="base_points"
                        type="number"
                        value={localConfig.base_points}
                        onChange={(e) => setLocalConfig({...localConfig, base_points: parseInt(e.target.value) || 0})}
                        className="bg-background border-poker-border"
                      />
                    </TooltipField>

                    <TooltipField id="participation_bonus" label="Бонус за участие" tooltip={tooltips.participation_bonus}>
                      <Input
                        id="participation_bonus"
                        type="number"
                        value={localConfig.participation_bonus}
                        onChange={(e) => setLocalConfig({...localConfig, participation_bonus: parseInt(e.target.value) || 0})}
                        className="bg-background border-poker-border"
                      />
                    </TooltipField>

                    <TooltipField id="min_rating" label="Минимальный рейтинг" tooltip={tooltips.min_rating}>
                      <Input
                        id="min_rating"
                        type="number"
                        value={localConfig.min_rating}
                        onChange={(e) => setLocalConfig({...localConfig, min_rating: parseInt(e.target.value) || 100})}
                        className="bg-background border-poker-border"
                      />
                    </TooltipField>

                    <TooltipField id="max_rating" label="Максимальный рейтинг" tooltip={tooltips.max_rating}>
                      <Input
                        id="max_rating"
                        type="number"
                        value={localConfig.max_rating}
                        onChange={(e) => setLocalConfig({...localConfig, max_rating: parseInt(e.target.value) || 5000})}
                        className="bg-background border-poker-border"
                      />
                    </TooltipField>

                    <TooltipField id="min_players" label="Минимум игроков для рейтинга" tooltip={tooltips.min_players_for_rating}>
                      <Input
                        id="min_players"
                        type="number"
                        value={localConfig.min_players_for_rating}
                        onChange={(e) => setLocalConfig({...localConfig, min_players_for_rating: parseInt(e.target.value) || 8})}
                        className="bg-background border-poker-border"
                      />
                    </TooltipField>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto_apply"
                      checked={localConfig.auto_apply}
                      onCheckedChange={(checked) => setLocalConfig({...localConfig, auto_apply: checked})}
                    />
                    <Label htmlFor="auto_apply" className="text-poker-text-primary">Автоматическое применение</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-poker-text-muted hover:text-poker-accent cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs bg-gradient-tooltip border-poker-border">
                        <p className="text-sm">{tooltips.auto_apply}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bonuses" className="space-y-4">
              <Card className="bg-gradient-card border-poker-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                    <Trophy className="h-5 w-5 text-poker-accent" />
                    Бонусная система
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TooltipField id="rebuy_multiplier" label={`Множитель ребаев: ${localConfig.rebuy_multiplier}`} tooltip={tooltips.rebuy_multiplier}>
                      <Slider
                        value={[localConfig.rebuy_multiplier]}
                        onValueChange={(values) => setLocalConfig({...localConfig, rebuy_multiplier: values[0]})}
                        max={3}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>

                    <TooltipField id="addon_multiplier" label={`Множитель аддонов: ${localConfig.addon_multiplier}`} tooltip={tooltips.addon_multiplier}>
                      <Slider
                        value={[localConfig.addon_multiplier]}
                        onValueChange={(values) => setLocalConfig({...localConfig, addon_multiplier: values[0]})}
                        max={3}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>

                    <TooltipField id="first_place_bonus" label={`Бонус 1 место: ${localConfig.first_place_bonus}`} tooltip={tooltips.first_place_bonus}>
                      <Slider
                        value={[localConfig.first_place_bonus]}
                        onValueChange={(values) => setLocalConfig({...localConfig, first_place_bonus: values[0]})}
                        max={20}
                        min={0}
                        step={0.5}
                      />
                    </TooltipField>

                    <TooltipField id="second_place_bonus" label={`Бонус 2 место: ${localConfig.second_place_bonus}`} tooltip={tooltips.second_place_bonus}>
                      <Slider
                        value={[localConfig.second_place_bonus]}
                        onValueChange={(values) => setLocalConfig({...localConfig, second_place_bonus: values[0]})}
                        max={15}
                        min={0}
                        step={0.5}
                      />
                    </TooltipField>

                    <TooltipField id="third_place_bonus" label={`Бонус 3 место: ${localConfig.third_place_bonus}`} tooltip={tooltips.third_place_bonus}>
                      <Slider
                        value={[localConfig.third_place_bonus]}
                        onValueChange={(values) => setLocalConfig({...localConfig, third_place_bonus: values[0]})}
                        max={10}
                        min={0}
                        step={0.5}
                      />
                    </TooltipField>

                    <TooltipField id="itm_bonus" label={`Бонус ITM: ${localConfig.itm_bonus}`} tooltip={tooltips.itm_bonus}>
                      <Slider
                        value={[localConfig.itm_bonus]}
                        onValueChange={(values) => setLocalConfig({...localConfig, itm_bonus: values[0]})}
                        max={5}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>

                    <TooltipField id="bubble_bonus" label={`Бонус "пузырь": ${localConfig.bubble_bonus}`} tooltip={tooltips.bubble_bonus}>
                      <Slider
                        value={[localConfig.bubble_bonus]}
                        onValueChange={(values) => setLocalConfig({...localConfig, bubble_bonus: values[0]})}
                        max={5}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>

                    <TooltipField id="heads_up_bonus" label={`Бонус хедз-ап: ${localConfig.heads_up_bonus}`} tooltip={tooltips.heads_up_bonus}>
                      <Slider
                        value={[localConfig.heads_up_bonus]}
                        onValueChange={(values) => setLocalConfig({...localConfig, heads_up_bonus: values[0]})}
                        max={10}
                        min={0}
                        step={0.5}
                      />
                    </TooltipField>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card className="bg-gradient-card border-poker-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                    <Calculator className="h-5 w-5 text-poker-accent" />
                    Предварительный просмотр расчетов
                  </CardTitle>
                  <CardDescription className="text-poker-text-secondary">
                    Примеры расчета рейтинга с текущими настройками
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {calculationPreviews.map((preview, index) => (
                      <div key={index} className="border border-poker-border rounded-lg p-4">
                        <div className="font-medium text-poker-text-primary mb-2">{preview.scenario}</div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <div className="text-poker-text-muted">Базовые очки</div>
                            <div className="text-poker-text-primary font-medium">{preview.basePoints}</div>
                          </div>
                          <div>
                            <div className="text-poker-text-muted">Бонусные очки</div>
                            <div className="text-poker-text-primary font-medium">{preview.bonusPoints}</div>
                          </div>
                          <div>
                            <div className="text-poker-text-muted">Всего очков</div>
                            <div className="text-poker-text-primary font-medium">{preview.totalPoints}</div>
                          </div>
                          <div>
                            <div className="text-poker-text-muted">Изменение</div>
                            <div className={`font-medium ${preview.ratingChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {preview.ratingChange >= 0 ? '+' : ''}{preview.ratingChange}
                            </div>
                          </div>
                          <div>
                            <div className="text-poker-text-muted">Новый рейтинг</div>
                            <div className="text-poker-text-primary font-medium">{preview.newRating}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prizes" className="space-y-4">
              <Card className="bg-gradient-card border-poker-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                    <DollarSign className="h-5 w-5 text-poker-accent" />
                    Призовая система
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TooltipField id="prize_coefficient" label={`Коэффициент призовых: ${localConfig.prize_coefficient}`} tooltip={tooltips.prize_coefficient}>
                      <Slider
                        value={[localConfig.prize_coefficient]}
                        onValueChange={(values) => setLocalConfig({...localConfig, prize_coefficient: values[0]})}
                        max={0.01}
                        min={0}
                        step={0.0001}
                      />
                    </TooltipField>

                    <TooltipField id="min_prize_points" label={`Минимум призовых очков: ${localConfig.min_prize_points}`} tooltip={tooltips.min_prize_points}>
                      <Slider
                        value={[localConfig.min_prize_points]}
                        onValueChange={(values) => setLocalConfig({...localConfig, min_prize_points: values[0]})}
                        max={20}
                        min={0}
                        step={0.5}
                      />
                    </TooltipField>

                    <TooltipField id="max_prize_points" label={`Максимум призовых очков: ${localConfig.max_prize_points}`} tooltip={tooltips.max_prize_points}>
                      <Slider
                        value={[localConfig.max_prize_points]}
                        onValueChange={(values) => setLocalConfig({...localConfig, max_prize_points: values[0]})}
                        max={500}
                        min={0}
                        step={5}
                      />
                    </TooltipField>

                    <TooltipField id="prize_distribution_weight" label={`Вес распределения призов: ${localConfig.prize_distribution_weight}`} tooltip={tooltips.prize_distribution_weight}>
                      <Slider
                        value={[localConfig.prize_distribution_weight]}
                        onValueChange={(values) => setLocalConfig({...localConfig, prize_distribution_weight: values[0]})}
                        max={3}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="modifiers" className="space-y-4">
              <Card className="bg-gradient-card border-poker-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                    <Zap className="h-5 w-5 text-poker-accent" />
                    Модификаторы турниров
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TooltipField id="turbo_modifier" label={`Турбо модификатор: ${localConfig.turbo_modifier}`} tooltip={tooltips.turbo_modifier}>
                      <Slider
                        value={[localConfig.turbo_modifier]}
                        onValueChange={(values) => setLocalConfig({...localConfig, turbo_modifier: values[0]})}
                        max={2}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>

                    <TooltipField id="deepstack_modifier" label={`Дипстек модификатор: ${localConfig.deepstack_modifier}`} tooltip={tooltips.deepstack_modifier}>
                      <Slider
                        value={[localConfig.deepstack_modifier]}
                        onValueChange={(values) => setLocalConfig({...localConfig, deepstack_modifier: values[0]})}
                        max={2}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>

                    <TooltipField id="freeroll_modifier" label={`Фрироль модификатор: ${localConfig.freeroll_modifier}`} tooltip={tooltips.freeroll_modifier}>
                      <Slider
                        value={[localConfig.freeroll_modifier]}
                        onValueChange={(values) => setLocalConfig({...localConfig, freeroll_modifier: values[0]})}
                        max={2}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>

                    <TooltipField id="knockout_bonus" label={`Бонус за нокаут: ${localConfig.knockout_bonus}`} tooltip={tooltips.knockout_bonus}>
                      <Slider
                        value={[localConfig.knockout_bonus]}
                        onValueChange={(values) => setLocalConfig({...localConfig, knockout_bonus: values[0]})}
                        max={5}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="field_size_modifier"
                        checked={localConfig.field_size_modifier}
                        onCheckedChange={(checked) => setLocalConfig({...localConfig, field_size_modifier: checked})}
                      />
                      <Label htmlFor="field_size_modifier" className="text-poker-text-primary">Модификатор размера поля</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-poker-text-muted hover:text-poker-accent cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs bg-gradient-tooltip border-poker-border">
                          <p className="text-sm">{tooltips.field_size_modifier}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="buy_in_modifier"
                        checked={localConfig.buy_in_modifier}
                        onCheckedChange={(checked) => setLocalConfig({...localConfig, buy_in_modifier: checked})}
                      />
                      <Label htmlFor="buy_in_modifier" className="text-poker-text-primary">Модификатор бай-ина</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-poker-text-muted hover:text-poker-accent cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs bg-gradient-tooltip border-poker-border">
                          <p className="text-sm">{tooltips.buy_in_modifier}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="guarantee_modifier"
                        checked={localConfig.guarantee_modifier}
                        onCheckedChange={(checked) => setLocalConfig({...localConfig, guarantee_modifier: checked})}
                      />
                      <Label htmlFor="guarantee_modifier" className="text-poker-text-primary">Гарантированный турнир</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-poker-text-muted hover:text-poker-accent cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs bg-gradient-tooltip border-poker-border">
                          <p className="text-sm">{tooltips.guarantee_modifier}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="weights" className="space-y-4">
              <Card className="bg-gradient-card border-poker-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                    <BarChart3 className="h-5 w-5 text-poker-accent" />
                    Весовые коэффициенты
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TooltipField id="position_weight" label={`Вес позиции: ${localConfig.weights.position_weight}`} tooltip={tooltips.position_weight}>
                      <Slider
                        value={[localConfig.weights.position_weight]}
                        onValueChange={(values) => setLocalConfig({...localConfig, weights: {...localConfig.weights, position_weight: values[0]}})}
                        max={3}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>

                    <TooltipField id="prize_weight" label={`Вес приза: ${localConfig.weights.prize_weight}`} tooltip={tooltips.prize_weight}>
                      <Slider
                        value={[localConfig.weights.prize_weight]}
                        onValueChange={(values) => setLocalConfig({...localConfig, weights: {...localConfig.weights, prize_weight: values[0]}})}
                        max={3}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>

                    <TooltipField id="field_size_weight" label={`Вес размера поля: ${localConfig.weights.field_size_weight}`} tooltip={tooltips.field_size_weight}>
                      <Slider
                        value={[localConfig.weights.field_size_weight]}
                        onValueChange={(values) => setLocalConfig({...localConfig, weights: {...localConfig.weights, field_size_weight: values[0]}})}
                        max={3}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>

                    <TooltipField id="buy_in_weight" label={`Вес бай-ина: ${localConfig.weights.buy_in_weight}`} tooltip={tooltips.buy_in_weight}>
                      <Slider
                        value={[localConfig.weights.buy_in_weight]}
                        onValueChange={(values) => setLocalConfig({...localConfig, weights: {...localConfig.weights, buy_in_weight: values[0]}})}
                        max={3}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>

                    <TooltipField id="duration_weight" label={`Вес длительности: ${localConfig.weights.duration_weight}`} tooltip={tooltips.duration_weight}>
                      <Slider
                        value={[localConfig.weights.duration_weight]}
                        onValueChange={(values) => setLocalConfig({...localConfig, weights: {...localConfig.weights, duration_weight: values[0]}})}
                        max={3}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>

                    <TooltipField id="performance_weight" label={`Вес производительности: ${localConfig.weights.performance_weight}`} tooltip={tooltips.performance_weight}>
                      <Slider
                        value={[localConfig.weights.performance_weight]}
                        onValueChange={(values) => setLocalConfig({...localConfig, weights: {...localConfig.weights, performance_weight: values[0]}})}
                        max={3}
                        min={0}
                        step={0.1}
                      />
                    </TooltipField>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

        {/* Остальные вкладки аналогично с TooltipField */}
      </Tabs>
    )}
  </div>
);
}