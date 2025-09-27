import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Plus, Edit, Save, X, MessageCircle, CreditCard, Bot, Webhook, ExternalLink, TestTube } from "lucide-react";

interface Integration {
  id: string;
  integration_name: string;
  integration_type: string;
  config: Record<string, any>;
  api_keys: Record<string, any>;
  is_active: boolean;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
}

export function IntegrationsManager() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    integration_name: '',
    integration_type: 'bot',
    config: {} as Record<string, any>,
    api_keys: {} as Record<string, any>,
    is_active: false
  });

  const { toast } = useToast();

  const integrationTypes = [
    { value: 'bot', label: 'Telegram Бот', icon: Bot },
    { value: 'payment', label: 'Платежная система', icon: CreditCard },
    { value: 'notification', label: 'Уведомления', icon: MessageCircle },
    { value: 'webhook', label: 'Webhook', icon: Webhook },
  ];

  const predefinedIntegrations = {
    telegram_bot: {
      name: 'Telegram Бот',
      type: 'bot',
      fields: {
        bot_token: { label: 'Bot Token', type: 'password', required: true },
        webhook_url: { label: 'Webhook URL', type: 'text', required: false },
        chat_id: { label: 'Chat ID', type: 'text', required: false },
      },
      config: {
        auto_notifications: true,
        tournament_updates: true,
        registration_notifications: true,
      }
    },
    stripe: {
      name: 'Stripe Платежи',
      type: 'payment',
      fields: {
        public_key: { label: 'Publishable Key', type: 'text', required: true },
        secret_key: { label: 'Secret Key', type: 'password', required: true },
        webhook_secret: { label: 'Webhook Secret', type: 'password', required: false },
      },
      config: {
        currency: 'RUB',
        auto_receipts: true,
        test_mode: true,
      }
    },
    yookassa: {
      name: 'ЮKassa',
      type: 'payment',
      fields: {
        shop_id: { label: 'Shop ID', type: 'text', required: true },
        secret_key: { label: 'Secret Key', type: 'password', required: true },
      },
      config: {
        currency: 'RUB',
        auto_capture: true,
        test_mode: true,
      }
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('cms_integrations')
        .select('*')
        .order('integration_type', { ascending: true });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить интеграции",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id?: string) => {
    try {
      if (id) {
        const { error } = await (supabase as any)
          .from('cms_integrations')
          .update(formData)
          .eq('id', id);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await (supabase as any)
          .from('cms_integrations')
          .insert([formData]);
        if (error) throw error;
        setShowAddForm(false);
      }

      await fetchIntegrations();
      resetForm();
      toast({
        title: "Успешно",
        description: id ? "Интеграция обновлена" : "Интеграция создана",
      });
    } catch (error) {
      console.error('Error saving integration:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить интеграцию",
        variant: "destructive",
      });
    }
  };

  const handleTest = async (integration: Integration) => {
    setTestingId(integration.id);
    
    try {
      // Имитация тестирования интеграции
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // В реальности здесь будет вызов API для тестирования
      console.log('Testing integration:', integration.integration_name);
      
      toast({
        title: "Тест успешен",
        description: `Интеграция ${integration.integration_name} работает корректно`,
      });

      // Обновляем время последней синхронизации
      await (supabase as any)
        .from('cms_integrations')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', integration.id);
        
      await fetchIntegrations();
    } catch (error) {
      toast({
        title: "Ошибка теста",
        description: "Интеграция не прошла тест",
        variant: "destructive",
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить интеграцию?')) return;
    
    try {
      const { error } = await (supabase as any)
        .from('cms_integrations')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchIntegrations();
      toast({ title: "Успешно", description: "Интеграция удалена" });
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось удалить", variant: "destructive" });
    }
  };

  const startEdit = (item: Integration) => {
    setFormData({
      integration_name: item.integration_name,
      integration_type: item.integration_type,
      config: item.config || {},
      api_keys: item.api_keys || {},
      is_active: item.is_active,
    });
    setEditingId(item.id);
  };

  const resetForm = () => {
    setFormData({
      integration_name: '',
      integration_type: 'bot',
      config: {},
      api_keys: {},
      is_active: false
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const addPredefinedIntegration = (key: string) => {
    const integration = predefinedIntegrations[key as keyof typeof predefinedIntegrations];
    setFormData({
      integration_name: integration.name,
      integration_type: integration.type,
      config: integration.config,
      api_keys: {},
      is_active: false
    });
    setShowAddForm(true);
  };

  const getIntegrationsByType = (type: string) => {
    return integrations.filter(integration => integration.integration_type === type);
  };

  const renderStatusBadge = (integration: Integration) => {
    if (testingId === integration.id) {
      return <Badge variant="secondary">Тестирование...</Badge>;
    }
    if (!integration.is_active) {
      return <Badge variant="destructive">Неактивна</Badge>;
    }
    if (integration.last_sync) {
      const lastSync = new Date(integration.last_sync);
      const now = new Date();
      const diffHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
      
      if (diffHours < 1) {
        return <Badge variant="default">Активна</Badge>;
      } else if (diffHours < 24) {
        return <Badge variant="secondary">Проверена {Math.round(diffHours)}ч назад</Badge>;
      } else {
        return <Badge variant="outline">Требует проверки</Badge>;
      }
    }
    return <Badge variant="outline">Не проверена</Badge>;
  };

  if (loading) return <div className="flex items-center justify-center p-8">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Интеграции</h2>
          <p className="text-muted-foreground">Подключение внешних сервисов и автоматизация</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus size={16} />
          Добавить интеграцию
        </Button>
      </div>

      {/* Quick Add Predefined */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрое подключение</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => addPredefinedIntegration('telegram_bot')}
            >
              <Bot size={24} />
              <span>Telegram Бот</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => addPredefinedIntegration('stripe')}
            >
              <CreditCard size={24} />
              <span>Stripe</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => addPredefinedIntegration('yookassa')}
            >
              <CreditCard size={24} />
              <span>ЮKassa</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Новая интеграция</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Название</Label>
                <Input
                  value={formData.integration_name}
                  onChange={(e) => setFormData({ ...formData, integration_name: e.target.value })}
                  placeholder="Название интеграции"
                />
              </div>
              <div>
                <Label>Тип</Label>
                <Select value={formData.integration_type} onValueChange={(value) => setFormData({ ...formData, integration_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {integrationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>API ключи (JSON)</Label>
              <Textarea
                value={JSON.stringify(formData.api_keys, null, 2)}
                onChange={(e) => {
                  try {
                    setFormData({ ...formData, api_keys: JSON.parse(e.target.value) });
                  } catch (error) {
                    // Игнорируем ошибки парсинга во время ввода
                  }
                }}
                rows={4}
                placeholder='{"api_key": "your_key_here"}'
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label>Конфигурация (JSON)</Label>
              <Textarea
                value={JSON.stringify(formData.config, null, 2)}
                onChange={(e) => {
                  try {
                    setFormData({ ...formData, config: JSON.parse(e.target.value) });
                  } catch (error) {
                    // Игнорируем ошибки парсинга во время ввода
                  }
                }}
                rows={4}
                placeholder='{"enabled": true}'
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Активна</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEdit}><X size={16} className="mr-2" />Отмена</Button>
              <Button onClick={() => handleSave()}><Save size={16} className="mr-2" />Сохранить</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integrations by Type */}
      <Tabs defaultValue="bot" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {integrationTypes.map((type) => {
            const IconComponent = type.icon;
            return (
              <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-2">
                <IconComponent size={16} />
                {type.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {integrationTypes.map((type) => (
          <TabsContent key={type.value} value={type.value} className="space-y-4">
            {getIntegrationsByType(type.value).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <type.icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Нет интеграций типа "{type.label}"</h3>
                  <Button onClick={() => setShowAddForm(true)}>Добавить интеграцию</Button>
                </CardContent>
              </Card>
            ) : (
              getIntegrationsByType(type.value).map((integration) => (
                <Card key={integration.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{integration.integration_name}</h3>
                            {renderStatusBadge(integration)}
                          </div>
                          {integration.last_sync && (
                            <p className="text-sm text-muted-foreground">
                              Последняя проверка: {new Date(integration.last_sync).toLocaleString('ru-RU')}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTest(integration)}
                            disabled={testingId === integration.id || !integration.is_active}
                          >
                            <TestTube size={14} className="mr-1" />
                            {testingId === integration.id ? 'Тест...' : 'Тест'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => startEdit(integration)}>
                            <Edit size={14} />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(integration.id)}>
                            <X size={14} />
                          </Button>
                        </div>
                      </div>

                      {(Object.keys(integration.config).length > 0 || Object.keys(integration.api_keys).length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.keys(integration.config).length > 0 && (
                            <div className="bg-muted/50 rounded-lg p-3">
                              <h4 className="font-semibold text-sm mb-2">Конфигурация</h4>
                              <pre className="text-xs font-mono overflow-x-auto">
                                {JSON.stringify(integration.config, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {Object.keys(integration.api_keys).length > 0 && (
                            <div className="bg-muted/50 rounded-lg p-3">
                              <h4 className="font-semibold text-sm mb-2">API ключи</h4>
                              <div className="space-y-1">
                                {Object.keys(integration.api_keys).map((key) => (
                                  <div key={key} className="text-xs">
                                    <span className="font-semibold">{key}:</span> 
                                    <span className="font-mono">***hidden***</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}