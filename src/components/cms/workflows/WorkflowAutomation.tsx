import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Zap, 
  Play, 
  Pause, 
  Settings, 
  Plus,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Mail,
  Database,
  Globe,
  Calendar
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'schedule' | 'event' | 'webhook';
    config: any;
  };
  actions: Array<{
    type: 'email' | 'database' | 'api' | 'notification';
    config: any;
  }>;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  executionCount: number;
  status: 'active' | 'paused' | 'error';
}

export function WorkflowAutomation() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'schedule',
    actionType: 'email',
    triggerConfig: {},
    actionConfig: {}
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      // Симуляция загрузки воркфлоу
      const mockWorkflows: Workflow[] = [
        {
          id: '1',
          name: 'Еженедельный отчет по турнирам',
          description: 'Автоматическая отправка статистики турниров каждый понедельник',
          trigger: { 
            type: 'schedule', 
            config: { cron: '0 9 * * 1', timezone: 'Europe/Moscow' } 
          },
          actions: [
            { 
              type: 'email', 
              config: { 
                template: 'tournament_report',
                recipients: ['admin@ips.club'],
                subject: 'Еженедельный отчет по турнирам'
              } 
            }
          ],
          isActive: true,
          lastRun: new Date(Date.now() - 86400000 * 7).toISOString(),
          nextRun: new Date(Date.now() + 86400000).toISOString(),
          executionCount: 15,
          status: 'active'
        },
        {
          id: '2',
          name: 'Резервное копирование данных',
          description: 'Ежедневное создание бэкапов базы данных',
          trigger: { 
            type: 'schedule', 
            config: { cron: '0 2 * * *', timezone: 'Europe/Moscow' } 
          },
          actions: [
            { 
              type: 'database', 
              config: { 
                operation: 'backup',
                tables: ['players', 'tournaments', 'cms_content'],
                destination: 'cloud_storage'
              } 
            }
          ],
          isActive: true,
          lastRun: new Date(Date.now() - 3600000 * 6).toISOString(),
          nextRun: new Date(Date.now() + 86400000 - 3600000 * 6).toISOString(),
          executionCount: 42,
          status: 'active'
        },
        {
          id: '3',
          name: 'Уведомления о новых игроках',
          description: 'Отправка приветственного письма новым пользователям',
          trigger: { 
            type: 'event', 
            config: { event: 'player_registered' } 
          },
          actions: [
            { 
              type: 'email', 
              config: { 
                template: 'welcome_player',
                delay: 300
              } 
            },
            {
              type: 'notification',
              config: {
                message: 'Зарегистрирован новый игрок',
                channels: ['slack', 'telegram']
              }
            }
          ],
          isActive: false,
          lastRun: new Date(Date.now() - 3600000 * 2).toISOString(),
          executionCount: 28,
          status: 'paused'
        }
      ];
      setWorkflows(mockWorkflows);
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить воркфлоу",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (id: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === id 
        ? { ...w, isActive: !w.isActive, status: w.isActive ? 'paused' : 'active' as any }
        : w
    ));
    
    toast({
      title: "Успешно",
      description: "Статус воркфлоу изменен",
    });
  };

  const runWorkflowNow = async (id: string) => {
    toast({
      title: "Запущено",
      description: "Воркфлоу выполняется...",
    });
    
    // Симуляция выполнения
    setTimeout(() => {
      setWorkflows(prev => prev.map(w => 
        w.id === id 
          ? { ...w, lastRun: new Date().toISOString(), executionCount: w.executionCount + 1 }
          : w
      ));
      
      toast({
        title: "Выполнено",
        description: "Воркфлоу успешно выполнен",
      });
    }, 2000);
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Удалить воркфлоу?')) return;
    
    setWorkflows(prev => prev.filter(w => w.id !== id));
    toast({
      title: "Удалено",
      description: "Воркфлоу удален",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'schedule': return <Clock className="w-4 h-4" />;
      case 'event': return <Zap className="w-4 h-4" />;
      case 'webhook': return <Globe className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      case 'notification': return <Users className="w-4 h-4" />;
      case 'api': return <Globe className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Автоматизация</h2>
          <p className="text-muted-foreground">Настройка автоматических процессов и уведомлений</p>
        </div>
        <Button onClick={() => setShowEditor(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Создать воркфлоу
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Активные</p>
                <p className="text-2xl font-bold">{workflows.filter(w => w.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Pause className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Приостановлены</p>
                <p className="text-2xl font-bold">{workflows.filter(w => w.status === 'paused').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Ошибки</p>
                <p className="text-2xl font-bold">{workflows.filter(w => w.status === 'error').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Выполнений</p>
                <p className="text-2xl font-bold">{workflows.reduce((sum, w) => sum + w.executionCount, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список воркфлоу */}
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(workflow.status)}
                    <h3 className="text-lg font-semibold">{workflow.name}</h3>
                    <Badge variant={workflow.isActive ? "default" : "secondary"}>
                      {workflow.isActive ? "Активен" : "Отключен"}
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground text-sm mb-3">{workflow.description}</p>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {getTriggerIcon(workflow.trigger.type)}
                      <span>Триггер: {workflow.trigger.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Действий: {workflow.actions.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Выполнений: {workflow.executionCount}</span>
                    </div>
                    {workflow.lastRun && (
                      <div className="flex items-center gap-1">
                        <span>Последний запуск: {new Date(workflow.lastRun).toLocaleString('ru-RU')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    {workflow.actions.map((action, index) => (
                      <div key={index} className="flex items-center gap-1 bg-muted rounded-full px-2 py-1 text-xs">
                        {getActionIcon(action.type)}
                        <span>{action.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={workflow.isActive}
                    onCheckedChange={() => toggleWorkflow(workflow.id)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runWorkflowNow(workflow.id)}
                    disabled={!workflow.isActive}
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedWorkflow(workflow);
                      setShowEditor(true);
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteWorkflow(workflow.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workflows.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет воркфлоу</h3>
            <p className="text-muted-foreground mb-4">
              Создайте первый автоматический процесс для упрощения управления сайтом
            </p>
            <Button onClick={() => setShowEditor(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать воркфлоу
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Диалог редактора воркфлоу */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedWorkflow ? 'Редактировать воркфлоу' : 'Создать воркфлоу'}
            </DialogTitle>
            <DialogDescription>
              Настройте автоматический процесс с триггерами и действиями
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="general">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Общие</TabsTrigger>
              <TabsTrigger value="trigger">Триггер</TabsTrigger>
              <TabsTrigger value="actions">Действия</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4">
              <div>
                <Label htmlFor="workflow-name">Название</Label>
                <Input
                  id="workflow-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Название воркфлоу"
                />
              </div>
              
              <div>
                <Label htmlFor="workflow-description">Описание</Label>
                <Textarea
                  id="workflow-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание воркфлоу"
                  rows={3}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="trigger" className="space-y-4">
              <div>
                <Label htmlFor="trigger-type">Тип триггера</Label>
                <Select value={formData.triggerType} onValueChange={(value) => setFormData({ ...formData, triggerType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schedule">Расписание</SelectItem>
                    <SelectItem value="event">Событие</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.triggerType === 'schedule' && (
                <div>
                  <Label>Расписание (Cron)</Label>
                  <Input placeholder="0 9 * * 1 (каждый понедельник в 9:00)" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Используйте формат cron для настройки расписания
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="actions" className="space-y-4">
              <div>
                <Label htmlFor="action-type">Тип действия</Label>
                <Select value={formData.actionType} onValueChange={(value) => setFormData({ ...formData, actionType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email уведомление</SelectItem>
                    <SelectItem value="database">Операция с БД</SelectItem>
                    <SelectItem value="api">API запрос</SelectItem>
                    <SelectItem value="notification">Push уведомление</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.actionType === 'email' && (
                <div className="space-y-3">
                  <div>
                    <Label>Получатели</Label>
                    <Input placeholder="admin@example.com, user@example.com" />
                  </div>
                  <div>
                    <Label>Шаблон письма</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите шаблон" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tournament_report">Отчет по турнирам</SelectItem>
                        <SelectItem value="welcome_player">Приветствие игрока</SelectItem>
                        <SelectItem value="backup_report">Отчет о резервном копировании</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              Отмена
            </Button>
            <Button onClick={() => {
              toast({
                title: "Успешно",
                description: selectedWorkflow ? "Воркфлоу обновлен" : "Воркфлоу создан",
              });
              setShowEditor(false);
            }}>
              {selectedWorkflow ? 'Обновить' : 'Создать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}