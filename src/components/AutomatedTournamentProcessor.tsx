import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bot, 
  Play, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Settings,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  name: string;
  status: string;
  finished_at?: string;
  buy_in: number;
}

interface AutomationSettings {
  enabled: boolean;
  auto_calculate_ratings: boolean;
  auto_publish_results: boolean;
  delay_minutes: number;
}

const AutomatedTournamentProcessor = () => {
  const [settings, setSettings] = useState<AutomationSettings>({
    enabled: true,
    auto_calculate_ratings: true,
    auto_publish_results: true,
    delay_minutes: 2
  });
  const [pendingTournaments, setPendingTournaments] = useState<Tournament[]>([]);
  const [processingTournaments, setProcessingTournaments] = useState<Set<string>>(new Set());
  const [processedToday, setProcessedToday] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadPendingTournaments();
    
    if (settings.enabled) {
      startAutomationMonitoring();
    }
    
    return () => {
      setIsMonitoring(false);
    };
  }, [settings.enabled]);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('automationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = (newSettings: AutomationSettings) => {
    setSettings(newSettings);
    localStorage.setItem('automationSettings', JSON.stringify(newSettings));
    toast({
      title: "Настройки сохранены",
      description: "Настройки автоматизации обновлены",
    });
  };

  const loadPendingTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'finished')
        .is('finished_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingTournaments(data || []);
    } catch (error) {
      console.error('Error loading pending tournaments:', error);
    }
  };

  const startAutomationMonitoring = () => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    // Мониторинг изменений в таблице турниров
    const channel = supabase
      .channel('tournament-automation')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: 'status=eq.finished'
        },
        async (payload) => {
          const tournament = payload.new as Tournament;
          
          if (settings.enabled && !processingTournaments.has(tournament.id)) {
            toast({
              title: "Турнир завершен",
              description: `Автоматическая обработка турнира "${tournament.name}"`,
            });
            
            // Задержка перед обработкой
            setTimeout(() => {
              processTournamentAutomatically(tournament);
            }, settings.delay_minutes * 60 * 1000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setIsMonitoring(false);
    };
  };

  const processTournamentAutomatically = async (tournament: Tournament) => {
    if (processingTournaments.has(tournament.id)) return;
    
    setProcessingTournaments(prev => new Set(prev).add(tournament.id));
    
    try {
      // 1. Проверить наличие результатов
      const { data: registrations, error: regError } = await supabase
        .from('tournament_registrations')
        .select('player_id, position, rebuys, addons')
        .eq('tournament_id', tournament.id)
        .not('position', 'is', null);

      if (regError) throw regError;

      if (!registrations || registrations.length === 0) {
        throw new Error('Нет результатов для обработки');
      }

      // 2. Расчет рейтингов (если включено)
      if (settings.auto_calculate_ratings) {
        const { error: eloError } = await supabase.functions.invoke('calculate-elo', {
          body: {
            tournament_id: tournament.id,
            results: registrations.map(reg => ({
              player_id: reg.player_id,
              position: reg.position,
              rebuys: reg.rebuys || 0,
              addons: reg.addons || 0
            }))
          }
        });

        if (eloError) throw eloError;
      }

      // 3. Публикация результатов (если включено)
      if (settings.auto_publish_results) {
        const { error: publishError } = await supabase
          .from('tournaments')
          .update({ 
            is_published: true,
            finished_at: new Date().toISOString()
          })
          .eq('id', tournament.id);

        if (publishError) throw publishError;
      }

      setProcessedToday(prev => prev + 1);
      
      toast({
        title: "Автоматическая обработка завершена",
        description: `Турнир "${tournament.name}" успешно обработан`,
      });
      
      // Обновить список ожидающих турниров
      loadPendingTournaments();
      
    } catch (error: any) {
      toast({
        title: "Ошибка автоматической обработки",
        description: `Турнир "${tournament.name}": ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setProcessingTournaments(prev => {
        const newSet = new Set(prev);
        newSet.delete(tournament.id);
        return newSet;
      });
    }
  };

  const processManually = async (tournament: Tournament) => {
    await processTournamentAutomatically(tournament);
  };

  return (
    <div className="space-y-6">
      {/* Статус автоматизации */}
      <Card className="bg-gradient-card border-poker-border shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-poker-text-primary">
            <Bot className="h-5 w-5 text-poker-accent" />
            Автоматическая обработка турниров
            {settings.enabled && isMonitoring && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Zap className="w-3 h-3 mr-1" />
                Активна
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Основные настройки */}
          <div className="flex items-center justify-between">
            <Label htmlFor="automation-enabled">Включить автоматизацию</Label>
            <Switch 
              id="automation-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => saveSettings({...settings, enabled: checked})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-ratings">Автоматический расчет рейтингов</Label>
            <Switch 
              id="auto-ratings"
              checked={settings.auto_calculate_ratings}
              onCheckedChange={(checked) => saveSettings({...settings, auto_calculate_ratings: checked})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-publish">Автопубликация результатов</Label>
            <Switch 
              id="auto-publish"
              checked={settings.auto_publish_results}
              onCheckedChange={(checked) => saveSettings({...settings, auto_publish_results: checked})}
            />
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-poker-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-poker-text-primary">{processedToday}</div>
              <div className="text-sm text-poker-text-muted">Обработано сегодня</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-poker-text-primary">{pendingTournaments.length}</div>
              <div className="text-sm text-poker-text-muted">Ожидают обработки</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-poker-text-primary">{processingTournaments.size}</div>
              <div className="text-sm text-poker-text-muted">Обрабатывается</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ожидающие турниры */}
      {pendingTournaments.length > 0 && (
        <Card className="bg-gradient-card border-poker-border shadow-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-poker-text-primary">
              <Clock className="h-5 w-5 text-poker-warning" />
              Ожидают автоматической обработки ({pendingTournaments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTournaments.map((tournament) => {
                const isProcessing = processingTournaments.has(tournament.id);
                
                return (
                  <div
                    key={tournament.id}
                    className="flex items-center justify-between p-4 border border-poker-border rounded-lg bg-poker-surface"
                  >
                    <div className="flex items-center gap-3">
                      {isProcessing ? (
                        <div className="w-2 h-2 bg-poker-accent rounded-full animate-pulse" />
                      ) : (
                        <div className="w-2 h-2 bg-poker-warning rounded-full" />
                      )}
                      <div>
                        <h4 className="font-medium text-poker-text-primary">{tournament.name}</h4>
                        <p className="text-sm text-poker-text-secondary">
                          Бай-ин: {tournament.buy_in}₽
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isProcessing ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Settings className="w-3 h-3 mr-1 animate-spin" />
                          Обрабатывается
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Ожидание
                        </Badge>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => processManually(tournament)}
                        disabled={isProcessing}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Обработать сейчас
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {settings.enabled && (
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Автоматическая обработка включена. Турниры будут обработаны через {settings.delay_minutes} мин после завершения.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {!settings.enabled && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Автоматическая обработка отключена. Турниры требуют ручной обработки.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AutomatedTournamentProcessor;