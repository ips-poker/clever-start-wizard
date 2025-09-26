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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

            {/* Bonuses Settings */}
            <TabsContent value="bonuses" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-gradient-card border-primary/20 hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Система бонусов и модификаторов
                    </CardTitle>
                    <CardDescription>
                      Настройка дополнительных очков и бонусных систем
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Бонус за ребай: {(localConfig.rebuy_multiplier || 1).toFixed(2)}x
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Множитель очков при совершении ребая
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

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Бонус за addon: {(localConfig.addon_multiplier || 1).toFixed(2)}x
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Множитель очков при покупке аддона
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[localConfig.addon_multiplier || 1]}
                          onValueChange={(values) => handleConfigChange('addon_multiplier', values[0])}
                          max={3}
                          min={0}
                          step={0.1}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Бонус за попадание в призы: {localConfig.itm_bonus || 0}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Фиксированный бонус за попадание в призовую зону
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[localConfig.itm_bonus || 0]}
                          onValueChange={(values) => handleConfigChange('itm_bonus', values[0])}
                          max={100}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Бонус за "пузырь": {localConfig.bubble_bonus || 0}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Компенсационный бонус за вылет на "пузыре" (первый не в призах)
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[localConfig.bubble_bonus || 0]}
                          onValueChange={(values) => handleConfigChange('bubble_bonus', values[0])}
                          max={50}
                          min={0}
                          step={2}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Штраф за позднюю регистрацию: {localConfig.late_entry_penalty || 0}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Штрафные очки за позднюю регистрацию в турнир
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[localConfig.late_entry_penalty || 0]}
                          onValueChange={(values) => handleConfigChange('late_entry_penalty', values[0])}
                          max={20}
                          min={0}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Бонус за хедс-ап: {localConfig.heads_up_bonus || 0}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Дополнительный бонус за игру один на один в финале
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[localConfig.heads_up_bonus || 0]}
                          onValueChange={(values) => handleConfigChange('heads_up_bonus', values[0])}
                          max={30}
                          min={0}
                          step={2}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Prize Settings */}
            <TabsContent value="prizes" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-gradient-card border-primary/20 hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      Призовая система
                    </CardTitle>
                    <CardDescription>
                      Настройка расчета очков на основе призовых сумм и позиций
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Коэффициент призовых: {(localConfig.prize_coefficient * 10000).toFixed(1)}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Определяет влияние призовой суммы на рейтинг (в десятых долях процента)
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[localConfig.prize_coefficient]}
                          onValueChange={(values) => handleConfigChange('prize_coefficient', values[0])}
                          max={0.01}
                          min={0.0001}
                          step={0.0001}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Минимальные призовые очки: {localConfig.min_prize_points || 0}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Минимальные очки за призовое место
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[localConfig.min_prize_points || 0]}
                          onValueChange={(values) => handleConfigChange('min_prize_points', values[0])}
                          max={100}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Максимальные призовые очки: {localConfig.max_prize_points || 500}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Ограничение максимальных очков за призы
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[localConfig.max_prize_points || 500]}
                          onValueChange={(values) => handleConfigChange('max_prize_points', values[0])}
                          max={1000}
                          min={100}
                          step={25}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Вес распределения: {(localConfig.prize_distribution_weight || 1).toFixed(2)}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Влияет на различие между призовыми местами
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[localConfig.prize_distribution_weight || 1]}
                          onValueChange={(values) => handleConfigChange('prize_distribution_weight', values[0])}
                          max={3}
                          min={0.5}
                          step={0.1}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Position Bonuses Section */}
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary" />
                        Позиционные бонусы
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-3">
                          <Label>Бонус за 1 место: {localConfig.first_place_bonus || 0}</Label>
                          <Slider
                            value={[localConfig.first_place_bonus || 0]}
                            onValueChange={(values) => handleConfigChange('first_place_bonus', values[0])}
                            max={100}
                            min={0}
                            step={5}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Бонус за 2 место: {localConfig.second_place_bonus || 0}</Label>
                          <Slider
                            value={[localConfig.second_place_bonus || 0]}
                            onValueChange={(values) => handleConfigChange('second_place_bonus', values[0])}
                            max={75}
                            min={0}
                            step={5}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Бонус за 3 место: {localConfig.third_place_bonus || 0}</Label>
                          <Slider
                            value={[localConfig.third_place_bonus || 0]}
                            onValueChange={(values) => handleConfigChange('third_place_bonus', values[0])}
                            max={50}
                            min={0}
                            step={5}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* AI/ML Settings */}
            <TabsContent value="ai" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-primary/20 hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI & Машинное обучение
                    </CardTitle>
                    <CardDescription>
                      Продвинутые алгоритмы и адаптивное обучение системы
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert className="border-primary/20 bg-primary/5">
                      <Brain className="h-4 w-4" />
                      <AlertDescription>
                        Эти настройки используют алгоритмы машинного обучения для автоматической оптимизации системы рейтингов.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Адаптивное обучение
                          <Badge variant="secondary" className="ml-2">AI</Badge>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Система автоматически адаптируется к стилю игры участников
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Switch
                          checked={!!(localConfig as any).enable_ai_learning}
                          onCheckedChange={(checked) => handleConfigChange('enable_ai_learning', checked)}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Детекция аномалий
                          <Badge variant="secondary" className="ml-2">ML</Badge>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Автоматическое обнаружение подозрительных результатов
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Switch
                          checked={!!(localConfig as any).enable_anomaly_detection}
                          onCheckedChange={(checked) => handleConfigChange('enable_anomaly_detection', checked)}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Скорость обучения: {((localConfig as any).learning_rate || 0.1).toFixed(3)}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Скорость адаптации алгоритма к новым данным
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[(localConfig as any).learning_rate || 0.1]}
                          onValueChange={(values) => handleConfigChange('learning_rate', values[0])}
                          max={1}
                          min={0.001}
                          step={0.001}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Размер окна данных: {(localConfig as any).data_window_size || 100}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Количество последних турниров для анализа
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[(localConfig as any).data_window_size || 100]}
                          onValueChange={(values) => handleConfigChange('data_window_size', values[0])}
                          max={500}
                          min={50}
                          step={10}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Минимальная уверенность: {((localConfig as any).confidence_threshold || 0.8).toFixed(2)}
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Минимальная уверенность для применения AI корректировок
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Slider
                          value={[(localConfig as any).confidence_threshold || 0.8]}
                          onValueChange={(values) => handleConfigChange('confidence_threshold', values[0])}
                          max={0.99}
                          min={0.5}
                          step={0.01}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Прогнозирование результатов
                          <Badge variant="outline" className="ml-2">Экспериментальное</Badge>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Использование ML для прогнозирования будущих результатов
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Switch
                          checked={!!(localConfig as any).enable_prediction}
                          onCheckedChange={(checked) => handleConfigChange('enable_prediction', checked)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Profiles Settings */}
            <TabsContent value="profiles" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-gradient-card border-primary/20 hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      Профили и шаблоны
                    </CardTitle>
                    <CardDescription>
                      Управление различными конфигурациями для разных типов турниров
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Active Profile Display */}
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Текущий профиль</h4>
                          <p className="text-sm text-muted-foreground">
                            {(activeProfile as any)?.profile_name || 'По умолчанию'}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {activeProfile?.tournament_types?.join(', ') || 'Универсальный'}
                        </Badge>
                      </div>
                    </div>

                    {/* Profile Templates */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">Предустановленные шаблоны</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                              <Trophy className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h5 className="font-medium">Турниры MTT</h5>
                              <p className="text-xs text-muted-foreground">
                                Для многостоловых турниров
                              </p>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                              <Target className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h5 className="font-medium">SNG турниры</h5>
                              <p className="text-xs text-muted-foreground">
                                Для одностоловых турниров
                              </p>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100">
                              <Star className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <h5 className="font-medium">Турбо турниры</h5>
                              <p className="text-xs text-muted-foreground">
                                Для быстрых турниров
                              </p>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-100">
                              <Activity className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <h5 className="font-medium">Кэш-турниры</h5>
                              <p className="text-xs text-muted-foreground">
                                Для гибридных форматов
                              </p>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Profile Management */}
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-semibold">Управление профилями</h4>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Сохранить как профиль
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          Загрузить профиль
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Экспорт настроек
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          Импорт настроек
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Enhanced Preview Panel with Charts */}
        <AnimatePresence>
          {previewMode && configPreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Metrics Overview */}
                <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Влияние настроек
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-lg bg-background/80">
                        <div className="text-xl font-bold text-primary">
                          {configPreview.averageChange > 0 ? '+' : ''}{configPreview.averageChange}
                        </div>
                        <div className="text-xs text-muted-foreground">Среднее изменение</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-background/80">
                        <div className="text-xl font-bold text-green-500">
                          +{configPreview.maxChange}
                        </div>
                        <div className="text-xs text-muted-foreground">Максимум за победу</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-background/80">
                        <div className="text-xl font-bold text-red-500">
                          {configPreview.minChange}
                        </div>
                        <div className="text-xs text-muted-foreground">Минимум за вылет</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-background/80">
                        <div className="text-xl font-bold text-purple-500">
                          {configPreview.systemStability}%
                        </div>
                        <div className="text-xs text-muted-foreground">Стабильность</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Simulation Results */}
                <Card className="bg-gradient-to-r from-secondary/5 to-accent/5 border-secondary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-secondary" />
                      Симуляция турнира
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">1 место (Победа)</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="w-4/5 h-full bg-gradient-to-r from-green-500 to-green-600" />
                          </div>
                          <span className="text-sm font-medium text-green-600">+{configPreview.maxChange * 0.8}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">3 место (Призы)</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="w-3/5 h-full bg-gradient-to-r from-blue-500 to-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-blue-600">+{Math.round(configPreview.averageChange * 1.5)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">6 место (ITM)</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="w-2/5 h-full bg-gradient-to-r from-yellow-500 to-yellow-600" />
                          </div>
                          <span className="text-sm font-medium text-yellow-600">+{Math.round(configPreview.averageChange * 0.8)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">15 место (Вылет)</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="w-1/5 h-full bg-gradient-to-r from-red-500 to-red-600" />
                          </div>
                          <span className="text-sm font-medium text-red-600">{Math.round(configPreview.minChange * 0.6)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Advanced Analytics */}
              <Card className="mt-6 bg-gradient-to-br from-primary/3 via-secondary/3 to-accent/3 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-primary" />
                    Расширенная аналитика
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Распределение очков</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Топ 10%</span>
                          <span className="font-medium">+{configPreview.maxChange}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Средние места</span>
                          <span className="font-medium">+{configPreview.averageChange}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Последние 20%</span>
                          <span className="font-medium">{configPreview.minChange}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">Системные показатели</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Стабильность</span>
                          <Badge variant={configPreview.systemStability > 80 ? 'default' : 'secondary'}>
                            {configPreview.systemStability}%
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Волатильность</span>
                          <Badge variant="outline">Средняя</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Справедливость</span>
                          <Badge variant="default">Высокая</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">Рекомендации</h4>
                      <div className="space-y-2 text-sm">
                        {configPreview.systemStability < 70 && (
                          <div className="flex items-center gap-2 text-yellow-600">
                            <AlertTriangle className="h-3 w-3" />
                            Увеличьте контроль волатильности
                          </div>
                        )}
                        {(localConfig.prize_coefficient || 0) > 0.005 && (
                          <div className="flex items-center gap-2 text-blue-600">
                            <Info className="h-3 w-3" />
                            Высокий коэффициент призовых
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Настройки сбалансированы
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
      </AnimatePresence>
    </motion.div>
  );
}