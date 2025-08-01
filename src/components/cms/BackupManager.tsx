import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Upload, Calendar, Database, RefreshCw, AlertTriangle, CheckCircle, HardDrive, Settings, X } from "lucide-react";

interface BackupItem {
  id: string;
  name: string;
  type: 'full' | 'data' | 'settings' | 'files';
  size: number;
  status: 'completed' | 'in_progress' | 'failed';
  created_at: string;
  download_url?: string;
}

export function BackupManager() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backupType, setBackupType] = useState('full');
  const [autoBackup, setAutoBackup] = useState(true);

  const { toast } = useToast();

  const backupTypes = [
    { value: 'full', label: 'Полная копия', description: 'Все данные, настройки и файлы' },
    { value: 'data', label: 'Только данные', description: 'База данных без файлов' },
    { value: 'settings', label: 'Настройки', description: 'Конфигурация и настройки CMS' },
    { value: 'files', label: 'Файлы', description: 'Медиа файлы и загрузки' },
  ];

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      // Имитация загрузки резервных копий
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Пример данных для демонстрации
      const mockBackups: BackupItem[] = [
        {
          id: '1',
          name: 'Автоматическая копия',
          type: 'full',
          size: 157286400, // ~150MB
          status: 'completed',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // вчера
          download_url: '#'
        },
        {
          id: '2',
          name: 'Копия перед обновлением',
          type: 'data',
          size: 25165824, // ~24MB
          status: 'completed',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // неделю назад
          download_url: '#'
        },
        {
          id: '3',
          name: 'Недельная копия',
          type: 'full',
          size: 0,
          status: 'in_progress',
          created_at: new Date().toISOString(),
        }
      ];
      
      setBackups(mockBackups);
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список резервных копий",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setCreating(true);
    setProgress(0);

    try {
      // Имитация создания резервной копии
      const totalSteps = 10;
      for (let i = 0; i <= totalSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setProgress((i / totalSteps) * 100);
      }

      const newBackup: BackupItem = {
        id: Date.now().toString(),
        name: `Резервная копия ${new Date().toLocaleDateString('ru-RU')}`,
        type: backupType as any,
        size: Math.floor(Math.random() * 200000000) + 10000000, // случайный размер
        status: 'completed',
        created_at: new Date().toISOString(),
        download_url: '#'
      };

      setBackups(prev => [newBackup, ...prev]);

      toast({
        title: "Успешно",
        description: "Резервная копия создана",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать резервную копию",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
      setProgress(0);
    }
  };

  const restoreBackup = async (backup: BackupItem) => {
    if (!confirm(`Восстановить из копии "${backup.name}"? Текущие данные будут перезаписаны.`)) {
      return;
    }

    setRestoring(true);
    setProgress(0);

    try {
      // Имитация восстановления
      const totalSteps = 8;
      for (let i = 0; i <= totalSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, 400));
        setProgress((i / totalSteps) * 100);
      }

      toast({
        title: "Успешно",
        description: "Данные восстановлены из резервной копии",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Ошибка при восстановлении данных",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
      setProgress(0);
    }
  };

  const deleteBackup = async (id: string) => {
    if (!confirm('Удалить резервную копию?')) return;
    
    try {
      setBackups(prev => prev.filter(b => b.id !== id));
      toast({
        title: "Успешно",
        description: "Резервная копия удалена",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить резервную копию",
        variant: "destructive",
      });
    }
  };

  const downloadBackup = async (backup: BackupItem) => {
    if (!backup.download_url) return;
    
    // В реальности здесь будет скачивание файла
    toast({
      title: "Загрузка",
      description: `Начата загрузка: ${backup.name}`,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Завершено</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">Выполняется</Badge>;
      case 'failed':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'full':
        return <HardDrive className="w-4 h-4" />;
      case 'data':
        return <Database className="w-4 h-4" />;
      case 'settings':
        return <Settings className="w-4 h-4" />;
      case 'files':
        return <Upload className="w-4 h-4" />;
      default:
        return <HardDrive className="w-4 h-4" />;
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Резервное копирование</h2>
          <p className="text-muted-foreground">Создание и восстановление резервных копий данных</p>
        </div>
      </div>

      {/* Create Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download size={20} />
            Создание резервной копии
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Тип резервной копии</Label>
            <Select value={backupType} onValueChange={setBackupType} disabled={creating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {backupTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {creating && (
            <div className="space-y-2">
              <Label>Прогресс создания:</Label>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{Math.round(progress)}% завершено</p>
            </div>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Создание полной резервной копии может занять несколько минут в зависимости от объема данных.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button 
              onClick={createBackup} 
              disabled={creating}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              {creating ? 'Создание...' : 'Создать копию'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={20} />
            Автоматическое копирование
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Включить автоматическое копирование</h4>
              <p className="text-sm text-muted-foreground">
                Автоматическое создание резервных копий каждую неделю
              </p>
            </div>
            <Button
              variant={autoBackup ? "default" : "outline"}
              onClick={() => setAutoBackup(!autoBackup)}
            >
              {autoBackup ? "Включено" : "Выключено"}
            </Button>
          </div>

          {autoBackup && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Следующая автоматическая копия будет создана в воскресенье в 02:00
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Restore Progress */}
      {restoring && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw size={20} className="animate-spin" />
              Восстановление данных
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{Math.round(progress)}% завершено</p>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Не закрывайте страницу во время восстановления данных.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle>Список резервных копий</CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8">
              <HardDrive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет резервных копий</h3>
              <p className="text-muted-foreground">Создайте первую резервную копию</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(backup.type)}
                      {getStatusIcon(backup.status)}
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">{backup.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{backupTypes.find(t => t.value === backup.type)?.label}</span>
                        {backup.size > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(backup.size)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(backup.created_at).toLocaleString('ru-RU')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(backup.status)}
                    
                    {backup.status === 'completed' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadBackup(backup)}
                          className="flex items-center gap-1"
                        >
                          <Download size={14} />
                          Скачать
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreBackup(backup)}
                          disabled={restoring}
                        >
                          <RefreshCw size={14} />
                          Восстановить
                        </Button>
                      </>
                    )}
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteBackup(backup.id)}
                      disabled={backup.status === 'in_progress'}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}