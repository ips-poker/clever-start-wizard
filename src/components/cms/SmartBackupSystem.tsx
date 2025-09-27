import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  HardDrive, 
  Download, 
  Upload, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Database,
  Cloud,
  Shield,
  Zap,
  RotateCcw,
  Settings,
  Bell,
  Brain
} from "lucide-react";

interface BackupConfig {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  retention_days: number;
  include_files: boolean;
  include_database: boolean;
  include_settings: boolean;
  compression: boolean;
  encryption: boolean;
  cloud_storage: boolean;
  enabled: boolean;
  next_run: string;
}

interface BackupRecord {
  id: string;
  config_id: string;
  name: string;
  type: string;
  size: number;
  status: 'completed' | 'in_progress' | 'failed' | 'scheduled';
  created_at: string;
  completed_at?: string;
  duration?: number;
  checksum: string;
  location: 'local' | 'cloud';
  can_restore: boolean;
  ai_health_score: number;
  compression_ratio: number;
}

interface SmartRecommendation {
  id: string;
  type: 'frequency' | 'retention' | 'optimization' | 'security';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: string;
  action?: string;
}

export function SmartBackupSystem() {
  const [configs, setConfigs] = useState<BackupConfig[]>([]);
  const [backupRecords, setBackupRecords] = useState<BackupRecord[]>([]);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [storageUsage, setStorageUsage] = useState({
    used: 0,
    total: 0,
    cloud_used: 0,
    cloud_limit: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchBackupData();
    runAIAnalysis();
  }, []);

  const fetchBackupData = async () => {
    try {
      // Mock data - in real implementation, fetch from backup service
      const mockConfigs: BackupConfig[] = [
        {
          id: '1',
          name: 'Автоматический полный бэкап',
          type: 'full',
          frequency: 'weekly',
          retention_days: 30,
          include_files: true,
          include_database: true,
          include_settings: true,
          compression: true,
          encryption: true,
          cloud_storage: true,
          enabled: true,
          next_run: new Date(Date.now() + 86400000 * 3).toISOString()
        },
        {
          id: '2',
          name: 'Инкрементальный бэкап данных',
          type: 'incremental',
          frequency: 'daily',
          retention_days: 7,
          include_files: false,
          include_database: true,
          include_settings: false,
          compression: true,
          encryption: true,
          cloud_storage: false,
          enabled: true,
          next_run: new Date(Date.now() + 3600000 * 6).toISOString()
        }
      ];

      const mockRecords: BackupRecord[] = [
        {
          id: '1',
          config_id: '1',
          name: 'Полный бэкап - 2024-08-01',
          type: 'full',
          size: 2147483648, // 2GB
          status: 'completed',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          completed_at: new Date(Date.now() - 86400000 + 1800000).toISOString(),
          duration: 1800,
          checksum: 'sha256:a1b2c3d4...',
          location: 'cloud',
          can_restore: true,
          ai_health_score: 98,
          compression_ratio: 0.65
        },
        {
          id: '2',
          config_id: '2',
          name: 'Инкрементальный - 2024-08-01',
          type: 'incremental',
          size: 52428800, // 50MB
          status: 'completed',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date(Date.now() - 3600000 + 300000).toISOString(),
          duration: 300,
          checksum: 'sha256:e5f6g7h8...',
          location: 'local',
          can_restore: true,
          ai_health_score: 95,
          compression_ratio: 0.80
        },
        {
          id: '3',
          config_id: '2',
          name: 'Инкрементальный - сейчас',
          type: 'incremental',
          size: 0,
          status: 'in_progress',
          created_at: new Date().toISOString(),
          checksum: '',
          location: 'local',
          can_restore: false,
          ai_health_score: 0,
          compression_ratio: 0
        }
      ];

      setConfigs(mockConfigs);
      setBackupRecords(mockRecords);
      setStorageUsage({
        used: 2200000000, // 2.2GB
        total: 5368709120, // 5GB
        cloud_used: 2147483648, // 2GB
        cloud_limit: 10737418240 // 10GB
      });
    } catch (error) {
      console.error('Error fetching backup data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные бэкапов",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async () => {
    setAiAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockRecommendations: SmartRecommendation[] = [
        {
          id: '1',
          type: 'frequency',
          priority: 'medium',
          title: 'Увеличить частоту бэкапов',
          description: 'На основе анализа активности, рекомендуется увеличить частоту инкрементальных бэкапов до каждых 6 часов',
          impact: 'Снижение потери данных при сбоях',
          action: 'change_frequency'
        },
        {
          id: '2',
          type: 'optimization',
          priority: 'low',
          title: 'Оптимизация сжатия',
          description: 'Можно улучшить сжатие на 15% используя алгоритм zstd вместо gzip',
          impact: 'Экономия 300MB места',
          action: 'change_compression'
        },
        {
          id: '3',
          type: 'security',
          priority: 'high',
          title: 'Тестирование восстановления',
          description: 'Последняя проверка восстановления была 30 дней назад. Рекомендуется регулярное тестирование',
          impact: 'Уверенность в возможности восстановления',
          action: 'test_restore'
        }
      ];

      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Error running AI analysis:', error);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const createManualBackup = async () => {
    setCreating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newBackup: BackupRecord = {
        id: Date.now().toString(),
        config_id: 'manual',
        name: `Ручной бэкап - ${new Date().toLocaleDateString('ru-RU')}`,
        type: 'full',
        size: Math.floor(Math.random() * 1000000000) + 500000000,
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration: 180,
        checksum: 'sha256:manual...',
        location: 'local',
        can_restore: true,
        ai_health_score: 97,
        compression_ratio: 0.70
      };

      setBackupRecords(prev => [newBackup, ...prev]);
      toast({
        title: "Бэкап создан",
        description: "Ручной бэкап успешно завершен",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать бэкап",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleConfig = async (configId: string, enabled: boolean) => {
    try {
      setConfigs(prev => prev.map(config => 
        config.id === configId ? { ...config, enabled } : config
      ));
      
      toast({
        title: enabled ? "Конфигурация включена" : "Конфигурация отключена",
        description: `Автоматические бэкапы ${enabled ? 'возобновлены' : 'приостановлены'}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить конфигурацию",
        variant: "destructive",
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'scheduled': return <Calendar className="w-4 h-4 text-orange-500" />;
      default: return <HardDrive className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">Высокий</Badge>;
      case 'medium': return <Badge variant="secondary">Средний</Badge>;
      case 'low': return <Badge variant="outline">Низкий</Badge>;
      default: return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6" />
            Умная система бэкапов
          </h2>
          <p className="text-muted-foreground">AI-управляемые бэкапы с автоматической оптимизацией</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={createManualBackup} disabled={creating} variant="outline">
            <Download className={`w-4 h-4 mr-2 ${creating ? 'animate-pulse' : ''}`} />
            {creating ? 'Создание...' : 'Создать бэкап'}
          </Button>
          <Button onClick={runAIAnalysis} disabled={aiAnalyzing}>
            <Brain className={`w-4 h-4 mr-2 ${aiAnalyzing ? 'animate-pulse' : ''}`} />
            {aiAnalyzing ? 'Анализ...' : 'AI Анализ'}
          </Button>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Локальное хранилище</p>
                <p className="text-xl font-bold">{formatBytes(storageUsage.used)}</p>
                <p className="text-xs text-muted-foreground">из {formatBytes(storageUsage.total)}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <HardDrive className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <Progress value={(storageUsage.used / storageUsage.total) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Облачное хранилище</p>
                <p className="text-xl font-bold">{formatBytes(storageUsage.cloud_used)}</p>
                <p className="text-xs text-muted-foreground">из {formatBytes(storageUsage.cloud_limit)}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-100">
                <Cloud className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <Progress value={(storageUsage.cloud_used / storageUsage.cloud_limit) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Активные конфигурации</p>
                <p className="text-xl font-bold">{configs.filter(c => c.enabled).length}</p>
                <p className="text-xs text-muted-foreground">из {configs.length} настроенных</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Средний health score</p>
                <p className="text-xl font-bold">
                  {Math.round(backupRecords.filter(r => r.ai_health_score > 0).reduce((acc, r) => acc + r.ai_health_score, 0) / backupRecords.filter(r => r.ai_health_score > 0).length)}
                </p>
                <p className="text-xs text-muted-foreground">AI оценка качества</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-100">
                <Brain className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI рекомендации
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div key={rec.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{rec.title}</h4>
                      {getPriorityBadge(rec.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                    <p className="text-xs font-medium text-green-600">Эффект: {rec.impact}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Применить
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup Configurations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Конфигурации бэкапов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {configs.map((config) => (
              <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">{config.name}</h4>
                    <Badge variant={config.type === 'full' ? 'default' : 'secondary'}>
                      {config.type}
                    </Badge>
                    <Badge variant="outline">
                      {config.frequency}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {config.include_database && <span className="flex items-center gap-1"><Database className="w-3 h-3" />БД</span>}
                    {config.encryption && <span className="flex items-center gap-1"><Shield className="w-3 h-3" />Шифрование</span>}
                    {config.cloud_storage && <span className="flex items-center gap-1"><Cloud className="w-3 h-3" />Облако</span>}
                    <span>Следующий: {new Date(config.next_run).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={config.enabled}
                    onCheckedChange={(enabled) => toggleConfig(config.id, enabled)}
                  />
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Последние бэкапы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backupRecords.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(backup.status)}
                  <div>
                    <h4 className="font-medium text-sm">{backup.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatBytes(backup.size)}</span>
                      {backup.duration && <span>• {Math.round(backup.duration / 60)}мин</span>}
                      {backup.ai_health_score > 0 && (
                        <span className="flex items-center gap-1">
                          • <Brain className="w-3 h-3" />{backup.ai_health_score}%
                        </span>
                      )}
                      <span>• {backup.location === 'cloud' ? 'Облако' : 'Локально'}</span>
                      <span>• {new Date(backup.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {backup.can_restore && (
                    <Button variant="outline" size="sm">
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Восстановить
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}