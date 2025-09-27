import { useState } from 'react';
import { useRatingProfiles } from '@/hooks/useRatingProfiles';
import { useRatingSystemIntegration } from '@/hooks/useRatingSystemIntegration';
import { validateRatingConfig, getConfigurationHealthScore, suggestConfigImprovements } from '@/utils/ratingValidation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Activity,
  Target,
  Zap,
  TrendingUp,
  Shield,
  RefreshCw,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RatingSystemProfilesManager() {
  const { profiles, activeProfile, setActiveProfile } = useRatingProfiles();
  const { integrationStatus, systemHealth, isChecking, checkSystemIntegration, testFullIntegration } = useRatingSystemIntegration();
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const handleTestIntegration = async () => {
    setIsTesting(true);
    try {
      const result = await testFullIntegration();
      
      if (result.success) {
        toast({
          title: 'Интеграция работает корректно',
          description: result.message
        });
      } else {
        toast({
          title: 'Ошибка интеграции',
          description: result.error,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка тестирования',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const renderProfileHealth = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return null;

    const validation = validateRatingConfig(profile.config);
    const healthScore = getConfigurationHealthScore(profile.config);
    const suggestions = suggestConfigImprovements(profile.config);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-poker-text-primary">Здоровье профиля</h4>
          <Badge variant={getHealthBadgeVariant(healthScore)} className="text-sm">
            {healthScore}/100
          </Badge>
        </div>

        <Progress value={healthScore} className="h-2" />

        {validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <strong>Критические ошибки:</strong>
                <ul className="list-disc list-inside text-sm">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {validation.warnings.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <strong>Предупреждения:</strong>
                <ul className="list-disc list-inside text-sm">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {suggestions.length > 0 && (
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <strong>Рекомендации:</strong>
                <ul className="list-disc list-inside text-sm">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  const renderIntegrationStatus = () => {
    const statusItems = [
      { key: 'profiles', label: 'Профили', icon: Settings },
      { key: 'edgeFunction', label: 'Edge функция', icon: Zap },
      { key: 'database', label: 'База данных', icon: Shield },
      { key: 'tournaments', label: 'Турниры', icon: Target },
      { key: 'players', label: 'Игроки', icon: Activity }
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-poker-text-primary">Статус интеграции</h4>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkSystemIntegration}
            disabled={isChecking}
            className="border-poker-border"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>

        <div className="grid gap-3">
          {statusItems.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between p-3 border border-poker-border rounded-lg">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-poker-text-muted" />
                <span className="text-poker-text-primary">{label}</span>
              </div>
              <Badge 
                variant={integrationStatus[key as keyof typeof integrationStatus] ? 'default' : 'destructive'}
                className="text-xs"
              >
                {integrationStatus[key as keyof typeof integrationStatus] ? 'Работает' : 'Проблема'}
              </Badge>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h5 className="font-medium text-poker-text-primary">Общее здоровье системы</h5>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border border-poker-border rounded-lg">
              <div className={`text-2xl font-bold ${getHealthColor(systemHealth.overall)}`}>
                {systemHealth.overall}%
              </div>
              <div className="text-sm text-poker-text-muted">Общая оценка</div>
            </div>
            <div className="p-3 border border-poker-border rounded-lg">
              <div className={`text-2xl font-bold ${getHealthColor(systemHealth.config)}`}>
                {systemHealth.config}%
              </div>
              <div className="text-sm text-poker-text-muted">Конфигурация</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-poker-border shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-poker-text-primary">
            <Settings className="h-5 w-5 text-poker-accent" />
            Менеджер профилей рейтинговой системы
          </CardTitle>
          <CardDescription className="text-poker-text-secondary">
            Управление профилями, мониторинг здоровья системы и интеграции компонентов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-6">
            <Button 
              onClick={handleTestIntegration} 
              disabled={isTesting || !activeProfile}
              className="bg-poker-primary hover:bg-poker-primary/90"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Тестирование...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Протестировать интеграцию
                </>
              )}
            </Button>
          </div>

          <Tabs defaultValue="profiles" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profiles">Профили</TabsTrigger>
              <TabsTrigger value="integration">Интеграция</TabsTrigger>
              <TabsTrigger value="health">Здоровье системы</TabsTrigger>
            </TabsList>

            <TabsContent value="profiles" className="space-y-4">
              <Card className="bg-gradient-card border-poker-border shadow-card">
                <CardHeader>
                  <CardTitle className="text-poker-text-primary">Активные профили</CardTitle>
                  <CardDescription className="text-poker-text-secondary">
                    Управление профилями рейтинговой системы
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profiles.map((profile) => (
                      <div 
                        key={profile.id} 
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          activeProfile?.id === profile.id 
                            ? 'border-poker-accent bg-poker-accent/5' 
                            : 'border-poker-border hover:border-poker-accent/50'
                        }`}
                        onClick={() => setActiveProfile(profile)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-poker-text-primary">{profile.name}</h4>
                          <div className="flex items-center gap-2">
                            {profile.is_default && (
                              <Badge variant="secondary" className="text-xs">По умолчанию</Badge>
                            )}
                            {activeProfile?.id === profile.id && (
                              <Badge className="text-xs">Активный</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-poker-text-muted mb-3">{profile.description}</p>
                        <div className="flex items-center gap-4 text-sm text-poker-text-muted">
                          <span>Использований: {profile.usage_count}</span>
                          <span>Типы: {profile.tournament_types.join(', ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integration" className="space-y-4">
              <Card className="bg-gradient-card border-poker-border shadow-card">
                <CardHeader>
                  <CardTitle className="text-poker-text-primary">Статус интеграции</CardTitle>
                  <CardDescription className="text-poker-text-secondary">
                    Мониторинг подключения всех компонентов системы
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderIntegrationStatus()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health" className="space-y-4">
              <Card className="bg-gradient-card border-poker-border shadow-card">
                <CardHeader>
                  <CardTitle className="text-poker-text-primary">Здоровье системы</CardTitle>
                  <CardDescription className="text-poker-text-secondary">
                    Анализ качества конфигурации и рекомендации по улучшению
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeProfile ? renderProfileHealth(activeProfile.id) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Выберите профиль для анализа его здоровья
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}