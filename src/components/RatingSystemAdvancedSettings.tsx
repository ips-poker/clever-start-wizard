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
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import RatingSystemProfilesManager from './RatingSystemProfilesManager';

interface CalculationPreview {
  scenario: string;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  newRating: number;
  ratingChange: number;
}

export default function RatingSystemAdvancedSettings() {
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
  const { toast } = useToast();

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

    const updatedProfile: RatingProfile = {
      ...activeProfile,
      config: localConfig,
      updated_at: new Date().toISOString()
    };

    const result = await saveProfile(updatedProfile);
    
    if (result.success) {
      toast({
        title: 'Профиль сохранен',
        description: result.fallback ? 
          'Настройки сохранены локально (проблемы с подключением к серверу)' :
          'Конфигурация рейтинговой системы обновлена'
      });
    } else {
      toast({
        title: 'Ошибка сохранения',
        description: 'Не удалось сохранить профиль',
        variant: 'destructive'
      });
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
      toast({
        title: 'Профиль создан',
        description: `Профиль "${newProfileName}" успешно создан`
      });
    } else {
      toast({
        title: 'Ошибка создания',
        description: 'Не удалось создать профиль',
        variant: 'destructive'
      });
    }
  };

  const handleDuplicateProfile = async () => {
    if (!activeProfile) return;

    const newName = `${activeProfile.name} (копия)`;
    const result = await duplicateProfile(activeProfile.id, newName);
    
    if (result.success) {
      toast({
        title: 'Профиль скопирован',
        description: `Создана копия профиля "${activeProfile.name}"`
      });
    } else {
      toast({
        title: 'Ошибка копирования',
        description: 'Не удалось скопировать профиль',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteProfile = async () => {
    if (!activeProfile || activeProfile.is_default) return;

    const result = await deleteProfile(activeProfile.id);
    
    if (result.success) {
      toast({
        title: 'Профиль удален',
        description: `Профиль "${activeProfile.name}" удален`
      });
    } else {
      toast({
        title: 'Ошибка удаления',
        description: 'Не удалось удалить профиль',
        variant: 'destructive'
      });
    }
  };

  const handleExportProfile = () => {
    if (!activeProfile) return;
    exportProfile(activeProfile.id);
    toast({
      title: 'Профиль экспортирован',
      description: 'Файл профиля загружен'
    });
  };

  const handleImportProfile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importProfile(file);
      if (result.success) {
        toast({
          title: 'Профиль импортирован',
          description: 'Профиль успешно импортирован из файла'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка импорта',
        description: error.message,
        variant: 'destructive'
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
      {/* Управление профилями */}
      <Card className="bg-gradient-card border-poker-border shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-poker-text-primary">
            <Settings className="h-5 w-5 text-poker-accent" />
            Профессиональные настройки рейтинговой системы RPS
          </CardTitle>
          <CardDescription className="text-poker-text-secondary">
            Расширенная система настройки профилей для разных типов турниров
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

            <Button variant="outline" size="sm" onClick={handleDuplicateProfile} className="border-poker-border">
              <Copy className="w-4 h-4 mr-2" />
              Копировать
            </Button>

            <Button variant="outline" size="sm" onClick={handleExportProfile} className="border-poker-border">
              <Download className="w-4 h-4 mr-2" />
              Экспорт
            </Button>

            <Button variant="outline" size="sm" className="border-poker-border">
              <Upload className="w-4 h-4 mr-2" />
              <Label htmlFor="import-file" className="cursor-pointer">Импорт</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportProfile}
              />
            </Button>

            {!activeProfile?.is_default && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDeleteProfile}
                className="border-destructive text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </Button>
            )}

            <Button onClick={handleSaveProfile} className="bg-poker-primary hover:bg-poker-primary/90">
              <Save className="w-4 h-4 mr-2" />
              Сохранить профиль
            </Button>
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
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="basic">Базовые</TabsTrigger>
            <TabsTrigger value="bonuses">Бонусы</TabsTrigger>
            <TabsTrigger value="prizes">Призовые</TabsTrigger>
            <TabsTrigger value="modifiers">Модификаторы</TabsTrigger>
            <TabsTrigger value="weights">Веса</TabsTrigger>
            <TabsTrigger value="profiles">Профили</TabsTrigger>
            <TabsTrigger value="preview">Превью</TabsTrigger>
          </TabsList>

          <TabsContent value="profiles" className="space-y-4">
            <Card className="bg-gradient-card border-poker-border shadow-card">
              <CardHeader>
                <CardTitle className="text-poker-text-primary">Менеджер профилей</CardTitle>
                <CardDescription className="text-poker-text-secondary">
                  Управление профилями рейтинговой системы
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RatingSystemProfilesManager />
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
                  <div className="space-y-2">
                    <Label htmlFor="base_points" className="text-poker-text-primary">Базовые очки за участие</Label>
                    <Input
                      id="base_points"
                      type="number"
                      value={localConfig.base_points}
                      onChange={(e) => setLocalConfig({...localConfig, base_points: parseInt(e.target.value) || 0})}
                      className="bg-background border-poker-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="participation_bonus" className="text-poker-text-primary">Бонус за участие</Label>
                    <Input
                      id="participation_bonus"
                      type="number"
                      value={localConfig.participation_bonus}
                      onChange={(e) => setLocalConfig({...localConfig, participation_bonus: parseInt(e.target.value) || 0})}
                      className="bg-background border-poker-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_rating" className="text-poker-text-primary">Минимальный рейтинг</Label>
                    <Input
                      id="min_rating"
                      type="number"
                      value={localConfig.min_rating}
                      onChange={(e) => setLocalConfig({...localConfig, min_rating: parseInt(e.target.value) || 100})}
                      className="bg-background border-poker-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_rating" className="text-poker-text-primary">Максимальный рейтинг</Label>
                    <Input
                      id="max_rating"
                      type="number"
                      value={localConfig.max_rating}
                      onChange={(e) => setLocalConfig({...localConfig, max_rating: parseInt(e.target.value) || 5000})}
                      className="bg-background border-poker-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_players" className="text-poker-text-primary">Минимум игроков для рейтинга</Label>
                    <Input
                      id="min_players"
                      type="number"
                      value={localConfig.min_players_for_rating}
                      onChange={(e) => setLocalConfig({...localConfig, min_players_for_rating: parseInt(e.target.value) || 8})}
                      className="bg-background border-poker-border"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto_apply"
                    checked={localConfig.auto_apply}
                    onCheckedChange={(checked) => setLocalConfig({...localConfig, auto_apply: checked})}
                  />
                  <Label htmlFor="auto_apply" className="text-poker-text-primary">Автоматическое применение</Label>
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
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">Множитель ребаев: {localConfig.rebuy_multiplier}</Label>
                    <Slider
                      value={[localConfig.rebuy_multiplier]}
                      onValueChange={(values) => setLocalConfig({...localConfig, rebuy_multiplier: values[0]})}
                      max={3}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">Множитель аддонов: {localConfig.addon_multiplier}</Label>
                    <Slider
                      value={[localConfig.addon_multiplier]}
                      onValueChange={(values) => setLocalConfig({...localConfig, addon_multiplier: values[0]})}
                      max={3}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">Бонус 1 место: {localConfig.first_place_bonus}</Label>
                    <Slider
                      value={[localConfig.first_place_bonus]}
                      onValueChange={(values) => setLocalConfig({...localConfig, first_place_bonus: values[0]})}
                      max={20}
                      min={0}
                      step={0.5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">Бонус 2 место: {localConfig.second_place_bonus}</Label>
                    <Slider
                      value={[localConfig.second_place_bonus]}
                      onValueChange={(values) => setLocalConfig({...localConfig, second_place_bonus: values[0]})}
                      max={15}
                      min={0}
                      step={0.5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">Бонус 3 место: {localConfig.third_place_bonus}</Label>
                    <Slider
                      value={[localConfig.third_place_bonus]}
                      onValueChange={(values) => setLocalConfig({...localConfig, third_place_bonus: values[0]})}
                      max={10}
                      min={0}
                      step={0.5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">Бонус ITM: {localConfig.itm_bonus}</Label>
                    <Slider
                      value={[localConfig.itm_bonus]}
                      onValueChange={(values) => setLocalConfig({...localConfig, itm_bonus: values[0]})}
                      max={5}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">Бонус "пузырь": {localConfig.bubble_bonus}</Label>
                    <Slider
                      value={[localConfig.bubble_bonus]}
                      onValueChange={(values) => setLocalConfig({...localConfig, bubble_bonus: values[0]})}
                      max={5}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">Бонус хедз-ап: {localConfig.heads_up_bonus}</Label>
                    <Slider
                      value={[localConfig.heads_up_bonus]}
                      onValueChange={(values) => setLocalConfig({...localConfig, heads_up_bonus: values[0]})}
                      max={10}
                      min={0}
                      step={0.5}
                    />
                  </div>
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
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">
                      Коэффициент призовых: {(localConfig.prize_coefficient * 100).toFixed(3)}%
                    </Label>
                    <Slider
                      value={[localConfig.prize_coefficient]}
                      onValueChange={(values) => setLocalConfig({...localConfig, prize_coefficient: values[0]})}
                      max={0.01}
                      min={0.0001}
                      step={0.0001}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_prize_points" className="text-poker-text-primary">Минимум призовых очков</Label>
                    <Input
                      id="min_prize_points"
                      type="number"
                      value={localConfig.min_prize_points}
                      onChange={(e) => setLocalConfig({...localConfig, min_prize_points: parseInt(e.target.value) || 0})}
                      className="bg-background border-poker-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_prize_points" className="text-poker-text-primary">Максимум призовых очков</Label>
                    <Input
                      id="max_prize_points"
                      type="number"
                      value={localConfig.max_prize_points}
                      onChange={(e) => setLocalConfig({...localConfig, max_prize_points: parseInt(e.target.value) || 0})}
                      className="bg-background border-poker-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">
                      Вес распределения: {localConfig.prize_distribution_weight.toFixed(1)}
                    </Label>
                    <Slider
                      value={[localConfig.prize_distribution_weight]}
                      onValueChange={(values) => setLocalConfig({...localConfig, prize_distribution_weight: values[0]})}
                      max={2}
                      min={0.1}
                      step={0.1}
                    />
                  </div>
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
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">Турбо модификатор: {localConfig.turbo_modifier}</Label>
                    <Slider
                      value={[localConfig.turbo_modifier]}
                      onValueChange={(values) => setLocalConfig({...localConfig, turbo_modifier: values[0]})}
                      max={1.5}
                      min={0.5}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">Дипстек модификатор: {localConfig.deepstack_modifier}</Label>
                    <Slider
                      value={[localConfig.deepstack_modifier]}
                      onValueChange={(values) => setLocalConfig({...localConfig, deepstack_modifier: values[0]})}
                      max={1.5}
                      min={0.5}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">Фрироль модификатор: {localConfig.freeroll_modifier}</Label>
                    <Slider
                      value={[localConfig.freeroll_modifier]}
                      onValueChange={(values) => setLocalConfig({...localConfig, freeroll_modifier: values[0]})}
                      max={1}
                      min={0.1}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">Нокаут бонус: {localConfig.knockout_bonus}</Label>
                    <Slider
                      value={[localConfig.knockout_bonus]}
                      onValueChange={(values) => setLocalConfig({...localConfig, knockout_bonus: values[0]})}
                      max={5}
                      min={0}
                      step={0.1}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="field_size_modifier"
                      checked={localConfig.field_size_modifier}
                      onCheckedChange={(checked) => setLocalConfig({...localConfig, field_size_modifier: checked})}
                    />
                    <Label htmlFor="field_size_modifier" className="text-poker-text-primary">Модификатор размера поля</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="buy_in_modifier"
                      checked={localConfig.buy_in_modifier}
                      onCheckedChange={(checked) => setLocalConfig({...localConfig, buy_in_modifier: checked})}
                    />
                    <Label htmlFor="buy_in_modifier" className="text-poker-text-primary">Модификатор бай-ина</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="guarantee_modifier"
                      checked={localConfig.guarantee_modifier}
                      onCheckedChange={(checked) => setLocalConfig({...localConfig, guarantee_modifier: checked})}
                    />
                    <Label htmlFor="guarantee_modifier" className="text-poker-text-primary">Модификатор гарантии</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weights" className="space-y-4">
            <Card className="bg-gradient-card border-poker-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-poker-text-primary">
                  <Activity className="h-5 w-5 text-poker-accent" />
                  Весовые коэффициенты
                </CardTitle>
                <CardDescription className="text-poker-text-secondary">
                  Настройка важности различных факторов при расчете рейтинга
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">
                      Вес позиции: {localConfig.weights.position_weight.toFixed(1)}
                    </Label>
                    <Slider
                      value={[localConfig.weights.position_weight]}
                      onValueChange={(values) => setLocalConfig({
                        ...localConfig, 
                        weights: {...localConfig.weights, position_weight: values[0]}
                      })}
                      max={2}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">
                      Вес призовых: {localConfig.weights.prize_weight.toFixed(1)}
                    </Label>
                    <Slider
                      value={[localConfig.weights.prize_weight]}
                      onValueChange={(values) => setLocalConfig({
                        ...localConfig, 
                        weights: {...localConfig.weights, prize_weight: values[0]}
                      })}
                      max={2}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">
                      Вес размера поля: {localConfig.weights.field_size_weight.toFixed(1)}
                    </Label>
                    <Slider
                      value={[localConfig.weights.field_size_weight]}
                      onValueChange={(values) => setLocalConfig({
                        ...localConfig, 
                        weights: {...localConfig.weights, field_size_weight: values[0]}
                      })}
                      max={2}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">
                      Вес бай-ина: {localConfig.weights.buy_in_weight.toFixed(1)}
                    </Label>
                    <Slider
                      value={[localConfig.weights.buy_in_weight]}
                      onValueChange={(values) => setLocalConfig({
                        ...localConfig, 
                        weights: {...localConfig.weights, buy_in_weight: values[0]}
                      })}
                      max={2}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">
                      Вес длительности: {localConfig.weights.duration_weight.toFixed(1)}
                    </Label>
                    <Slider
                      value={[localConfig.weights.duration_weight]}
                      onValueChange={(values) => setLocalConfig({
                        ...localConfig, 
                        weights: {...localConfig.weights, duration_weight: values[0]}
                      })}
                      max={2}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-poker-text-primary">
                      Вес перформанса: {localConfig.weights.performance_weight.toFixed(1)}
                    </Label>
                    <Slider
                      value={[localConfig.weights.performance_weight]}
                      onValueChange={(values) => setLocalConfig({
                        ...localConfig, 
                        weights: {...localConfig.weights, performance_weight: values[0]}
                      })}
                      max={2}
                      min={0}
                      step={0.1}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}