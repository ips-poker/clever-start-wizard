import { useState, useEffect } from 'react';
import { useRatingSystemConfig } from '@/hooks/useRatingSystemConfig';
import { supabase } from '@/integrations/supabase/client';
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
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SimulationResult {
  player_name: string;
  position: number;
  prize_amount: number;
  base_points: number;
  rebuy_addon_points: number;
  prize_points: number;
  position_bonus: number;
  total_change: number;
  current_rating: number;
  new_rating: number;
}

export default function RatingSystemSettings() {
  const { config, isLoading: configLoading, saveConfig: saveConfigHook, resetToDefaults } = useRatingSystemConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [simulation, setSimulation] = useState<SimulationResult[]>([]);
  const [showSimulation, setShowSimulation] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);
  const { toast } = useToast();

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const result = await saveConfigHook(localConfig);
      
      if (result.success) {
        toast({
          title: 'Настройки сохранены',
          description: result.fallback ? 
            'Настройки сохранены локально (проблемы с подключением к серверу)' :
            'Конфигурация рейтинговой системы обновлена'
        });
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

  const handleResetToDefaults = () => {
    resetToDefaults();
    setLocalConfig(config);
    toast({
      title: 'Настройки сброшены',
      description: 'Восстановлены настройки по умолчанию'
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-poker-border shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-poker-text-primary">
            <Settings className="h-5 w-5 text-poker-accent" />
            Расширенные настройки рейтинговой системы RPS
          </CardTitle>
          <CardDescription className="text-poker-text-secondary">
            Полная настройка системы расчета рейтинговых баллов для турниров
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-3">
            <Button 
              onClick={saveConfig} 
              disabled={isSaving}
              className="bg-poker-primary hover:bg-poker-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleResetToDefaults}
              className="border-poker-border hover:bg-poker-accent/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Сбросить
            </Button>
          </div>

          <Alert className="bg-gradient-card border-poker-border">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-poker-text-secondary">
              Изменения применяются к новым расчетам рейтингов. Для пересчета существующих результатов используйте функцию "Пересчитать рейтинги".
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Базовые</TabsTrigger>
          <TabsTrigger value="bonuses">Бонусы</TabsTrigger>
          <TabsTrigger value="prizes">Призовые</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card className="bg-gradient-card border-poker-border shadow-card">
            <CardHeader>
              <CardTitle className="text-poker-text-primary">Базовые параметры</CardTitle>
              <CardDescription className="text-poker-text-secondary">
                Основные настройки начисления рейтинговых очков
              </CardDescription>
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
                  <p className="text-xs text-poker-text-muted">Минимальные очки за участие в турнире</p>
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
                  <p className="text-xs text-poker-text-muted">Рейтинг не может быть меньше этого значения</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonuses" className="space-y-4">
          <Card className="bg-gradient-card border-poker-border shadow-card">
            <CardHeader>
              <CardTitle className="text-poker-text-primary">Бонусная система</CardTitle>
              <CardDescription className="text-poker-text-secondary">
                Настройка дополнительных очков и бонусов
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-poker-text-primary">Множитель ребаев: {localConfig.rebuy_multiplier}</Label>
                <Slider
                  value={[localConfig.rebuy_multiplier]}
                  onValueChange={(values) => setLocalConfig({...localConfig, rebuy_multiplier: values[0]})}
                  max={5}
                  min={0}
                  step={0.1}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prizes" className="space-y-4">
          <Card className="bg-gradient-card border-poker-border shadow-card">
            <CardHeader>
              <CardTitle className="text-poker-text-primary">Призовая система</CardTitle>
              <CardDescription className="text-poker-text-secondary">
                Настройка расчета очков за призовые места
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-poker-text-primary">Коэффициент призовых: {(localConfig.prize_coefficient * 100).toFixed(3)}%</Label>
                <Slider
                  value={[localConfig.prize_coefficient]}
                  onValueChange={(values) => setLocalConfig({...localConfig, prize_coefficient: values[0]})}
                  max={0.01}
                  min={0.0001}
                  step={0.0001}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}