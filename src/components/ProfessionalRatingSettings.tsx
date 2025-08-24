import React, { useState, useEffect, useCallback } from 'react';
import { useRatingSystemConfig } from '@/hooks/useRatingSystemConfig';
import { useAdvancedRatingSystem } from '@/hooks/useAdvancedRatingSystem';
import { useRatingProfiles } from '@/hooks/useRatingProfiles';
import { validateRatingConfig } from '@/utils/ratingValidation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Settings, 
  Calculator, 
  Trophy, 
  TrendingUp, 
  Save, 
  RotateCcw,
  Info,
  AlertTriangle,
  Eye,
  DollarSign,
  Target,
  Zap,
  Brain,
  BarChart3,
  Layers,
  Sparkles,
  Award,
  Activity,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Star,
  Gauge
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface ValidationIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  suggestion?: string;
}

interface ConfigPreview {
  averageChange: number;
  maxChange: number;
  minChange: number;
  topPlayerAdvantage: number;
  systemStability: number;
}

export default function ProfessionalRatingSettings() {
  const { config, isLoading: configLoading, saveConfig: saveConfigHook, resetToDefaults } = useRatingSystemConfig();
  const { systemMetrics, clearCache } = useAdvancedRatingSystem();
  const { profiles, activeProfile } = useRatingProfiles();
  const [localConfig, setLocalConfig] = useState(config);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [configPreview, setConfigPreview] = useState<ConfigPreview | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLocalConfig(config);
    validateConfig(config);
  }, [config]);

  const validateConfig = useCallback((configToValidate: any) => {
    setIsValidating(true);
    try {
      const validationResult = validateRatingConfig(configToValidate);
      const issues = [
        ...validationResult.errors.map(error => ({ level: 'error' as const, message: error })),
        ...validationResult.warnings.map(warning => ({ level: 'warning' as const, message: warning }))
      ];
      setValidationIssues(issues);
      
      // Генерируем предварительный просмотр изменений
      const preview = calculateConfigPreview(configToValidate);
      setConfigPreview(preview);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, []);

  const calculateConfigPreview = (configToValidate: any): ConfigPreview => {
    // Симуляция влияния настроек на рейтинг
    const baseVariation = configToValidate.base_points / 10;
    const prizeImpact = configToValidate.prize_coefficient * 1000;
    const volatilityFactor = configToValidate.volatility_control || 1;
    
    return {
      averageChange: Math.round(baseVariation * prizeImpact / volatilityFactor),
      maxChange: Math.round(baseVariation * prizeImpact * 2),
      minChange: Math.round(-baseVariation * prizeImpact / 2),
      topPlayerAdvantage: Math.round(prizeImpact * 0.3),
      systemStability: Math.max(0, Math.min(100, 100 - (baseVariation * 2)))
    };
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const result = await saveConfigHook(localConfig);
      
      if (result.success) {
        toast({
          title: 'Профессиональные настройки сохранены',
          description: result.fallback ? 
            'Настройки сохранены локально (проблемы с подключением к серверу)' :
            'Конфигурация RPS успешно обновлена и синхронизирована'
        });
        clearCache(); // Очищаем кеш для применения новых настроек
      } else {
        throw result.error;
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка сохранения',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    validateConfig(newConfig);
  };

  const applySuggestions = async () => {
    // Простая оптимизация настроек
    const optimizedConfig = { 
      ...localConfig, 
      base_points: Math.max(50, Math.min(200, localConfig.base_points)),
      prize_coefficient: Math.max(0.0001, Math.min(0.01, localConfig.prize_coefficient))
    };
    setLocalConfig(optimizedConfig);
    toast({
      title: 'Применены оптимизации',
      description: 'Настройки оптимизированы на основе рекомендуемых значений'
    });
  };

  const getValidationColor = () => {
    const errorCount = validationIssues.filter(i => i.level === 'error').length;
    const warningCount = validationIssues.filter(i => i.level === 'warning').length;
    
    if (errorCount > 0) return 'destructive';
    if (warningCount > 0) return 'warning';
    return 'success';
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <TooltipProvider>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header Card */}
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-r from-background/80 to-background/60 border-primary/20 shadow-xl backdrop-blur-sm hover:shadow-2xl transition-all duration-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      Профессиональные настройки RPS
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Расширенная система настройки рейтинговых алгоритмов с AI-оптимизацией
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10">
                    v2.0 Pro
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger>
                      <Activity className="h-4 w-4 text-primary animate-pulse" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Система работает в реальном времени
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                <Button 
                  onClick={saveConfig} 
                  disabled={isSaving || validationIssues.some(i => i.level === 'error')}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={applySuggestions}
                  className="border-primary/20 hover:bg-primary/5 hover:border-primary/40"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Оптимизация
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setPreviewMode(!previewMode)}
                  className={previewMode ? 'bg-primary/10 border-primary/40' : ''}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Предварительный просмотр
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={resetToDefaults}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Сброс
                </Button>
              </div>

              {/* System Status */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-3 bg-gradient-to-br from-background to-background/50">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Стабильность</span>
                  </div>
                  <div className="text-lg font-bold text-blue-500">
                    {configPreview?.systemStability || 0}%
                  </div>
                </Card>
                
                <Card className="p-3 bg-gradient-to-br from-background to-background/50">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Расчетов</span>
                  </div>
                  <div className="text-lg font-bold text-green-500">
                    {systemMetrics?.totalCalculations || 0}
                  </div>
                </Card>
                
                <Card className="p-3 bg-gradient-to-br from-background to-background/50">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Среднее время</span>
                  </div>
                  <div className="text-lg font-bold text-orange-500">
                    {Math.round(systemMetrics?.avgCalculationTime || 0)}ms
                  </div>
                </Card>
                
                <Card className="p-3 bg-gradient-to-br from-background to-background/50">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Кеш</span>
                  </div>
                  <div className="text-lg font-bold text-purple-500">
                    {Math.round(systemMetrics?.cacheHitRate || 0)}%
                  </div>
                </Card>
              </div>

              {/* Validation Status */}
              <AnimatePresence>
                {validationIssues.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Alert className={`mb-4 ${getValidationColor() === 'destructive' ? 'border-destructive/50 bg-destructive/10' : 
                      getValidationColor() === 'warning' ? 'border-yellow-500/50 bg-yellow-500/10' : 
                      'border-green-500/50 bg-green-500/10'}`}>
                      {getValidationColor() === 'destructive' ? <XCircle className="h-4 w-4" /> :
                       getValidationColor() === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                       <CheckCircle className="h-4 w-4" />}
                      <AlertDescription>
                        <div className="space-y-1">
                          {validationIssues.slice(0, 3).map((issue, index) => (
                            <div key={index} className="text-sm">
                              <strong>{issue.level.toUpperCase()}:</strong> {issue.message}
                              {issue.suggestion && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  💡 {issue.suggestion}
                                </div>
                              )}
                            </div>
                          ))}
                          {validationIssues.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              И еще {validationIssues.length - 3} проблем...
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Configuration Tabs */}
        <motion.div variants={itemVariants}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Базовые
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Продвинутые
              </TabsTrigger>
              <TabsTrigger value="bonuses" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Бонусы
              </TabsTrigger>
              <TabsTrigger value="prizes" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Призовые
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI/ML
              </TabsTrigger>
              <TabsTrigger value="profiles" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Профили
              </TabsTrigger>
            </TabsList>

            {/* Basic Settings */}
            <TabsContent value="basic" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-gradient-card border-primary/20 hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Базовые параметры
                    </CardTitle>
                    <CardDescription>
                      Основные настройки системы начисления рейтинговых очков
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="base_points" className="flex items-center gap-2">
                          Базовые очки за участие
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Минимальные очки, получаемые за участие в турнире
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          id="base_points"
                          type="number"
                          value={localConfig.base_points}
                          onChange={(e) => handleConfigChange('base_points', parseInt(e.target.value) || 0)}
                          className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="text-xs text-muted-foreground">
                          Рекомендуемый диапазон: 50-200
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="min_rating" className="flex items-center gap-2">
                          Минимальный рейтинг
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Минимальное значение рейтинга игрока
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          id="min_rating"
                          type="number"
                          value={localConfig.min_rating}
                          onChange={(e) => handleConfigChange('min_rating', parseInt(e.target.value) || 100)}
                          className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="text-xs text-muted-foreground">
                          Защищает от критического падения рейтинга
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Максимальный рейтинг: {localConfig.max_rating || 3000}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Максимальное значение рейтинга игрока
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[localConfig.max_rating || 3000]}
                          onValueChange={(values) => handleConfigChange('max_rating', values[0])}
                          max={5000}
                          min={2000}
                          step={100}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Множитель ребаев: {(localConfig.rebuy_multiplier || 1).toFixed(2)}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Множитель очков за ребай
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[localConfig.rebuy_multiplier || 1]}
                          onValueChange={(values) => handleConfigChange('rebuy_multiplier', values[0])}
                          max={3}
                          min={0}
                          step={0.1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Advanced Settings */}
            <TabsContent value="advanced" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-gradient-card border-primary/20 hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Продвинутые алгоритмы
                    </CardTitle>
                    <CardDescription>
                      Настройки для профессиональных алгоритмов расчета рейтинга
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Позиционные бонусы
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Включить систему бонусов за позиции
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Switch
                          checked={localConfig.enable_position_bonus || false}
                          onCheckedChange={(checked) => handleConfigChange('enable_position_bonus', checked)}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Бонус за 1 место: {localConfig.first_place_bonus || 0}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Дополнительные очки за первое место
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[localConfig.first_place_bonus || 0]}
                          onValueChange={(values) => handleConfigChange('first_place_bonus', values[0])}
                          max={100}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Модификатор поля: {localConfig.field_size_modifier ? 'Включен' : 'Выключен'}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Учет размера поля в расчетах
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Switch
                          checked={localConfig.field_size_modifier || false}
                          onCheckedChange={(checked) => handleConfigChange('field_size_modifier', checked)}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Модификатор бай-ина: {localConfig.buy_in_modifier ? 'Включен' : 'Выключен'}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Учет размера бай-ина в расчетах
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Switch
                          checked={localConfig.buy_in_modifier || false}
                          onCheckedChange={(checked) => handleConfigChange('buy_in_modifier', checked)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Остальные табы будут добавлены аналогично... */}
          </Tabs>
        </motion.div>

        {/* Preview Panel */}
        <AnimatePresence>
          {previewMode && configPreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Предварительный просмотр влияния настроек
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {configPreview.averageChange > 0 ? '+' : ''}{configPreview.averageChange}
                      </div>
                      <div className="text-xs text-muted-foreground">Среднее изменение</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        +{configPreview.maxChange}
                      </div>
                      <div className="text-xs text-muted-foreground">Максимум за победу</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {configPreview.minChange}
                      </div>
                      <div className="text-xs text-muted-foreground">Минимум за вылет</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        +{configPreview.topPlayerAdvantage}
                      </div>
                      <div className="text-xs text-muted-foreground">Преимущество топов</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-500">
                        {configPreview.systemStability}%
                      </div>
                      <div className="text-xs text-muted-foreground">Стабильность</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  );
}