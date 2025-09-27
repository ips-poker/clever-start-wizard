import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Receipt, 
  Settings, 
  TestTube, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  CreditCard,
  Building,
  Phone,
  Mail,
  MapPin,
  Clock,
  DollarSign,
  Shield,
  Globe,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OrangeDataConfig {
  api_key: string;
  sign_key: string;
  inn: string;
  group: string;
  organization_name: string;
  organization_address: string;
  organization_email: string;
  organization_phone: string;
  tax_system: 'osn' | 'usn_income' | 'usn_income_outcome' | 'envd' | 'esn' | 'patent';
  cashier_name: string;
  cashier_inn: string;
  auto_fiscalization: boolean;
  test_mode: boolean;
  webhook_url: string;
  enabled: boolean;
}

interface FiscalReceipt {
  id: string;
  order_id: string;
  receipt_id: string;
  amount: number;
  status: 'pending' | 'sent' | 'fiscal' | 'error';
  fiscal_document_number?: string;
  fiscal_document_attribute?: string;
  ofd_receipt_url?: string;
  created_at: string;
  error_message?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  response?: any;
  error?: string;
}

export function OrangeDataIntegration() {
  const [config, setConfig] = useState<OrangeDataConfig>({
    api_key: '',
    sign_key: '',
    inn: '',
    group: '',
    organization_name: '',
    organization_address: '',
    organization_email: '',
    organization_phone: '',
    tax_system: 'usn_income',
    cashier_name: '',
    cashier_inn: '',
    auto_fiscalization: true,
    test_mode: true,
    webhook_url: '',
    enabled: false
  });
  
  const [receipts, setReceipts] = useState<FiscalReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const { toast } = useToast();

  const taxSystems = [
    { value: 'osn', label: 'ОСН - Общая система налогообложения' },
    { value: 'usn_income', label: 'УСН доходы' },
    { value: 'usn_income_outcome', label: 'УСН доходы минус расходы' },
    { value: 'envd', label: 'ЕНВД' },
    { value: 'esn', label: 'ЕСН' },
    { value: 'patent', label: 'Патентная система' }
  ];

  useEffect(() => {
    fetchConfig();
    fetchReceipts();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('cms_integrations')
        .select('*')
        .eq('integration_name', 'orange_data')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig({
          ...config,
          ...data.config,
          api_key: data.api_keys?.api_key || '',
          sign_key: data.api_keys?.sign_key || '',
          enabled: data.is_active || false
        });
      }
    } catch (error) {
      console.error('Error fetching Orange Data config:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить настройки Orange Data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReceipts = async () => {
    try {
      // Mock data for demonstration
      const mockReceipts: FiscalReceipt[] = [
        {
          id: '1',
          order_id: 'order_123',
          receipt_id: 'rec_456',
          amount: 150000, // 1500.00 рублей в копейках
          status: 'fiscal',
          fiscal_document_number: '12345',
          fiscal_document_attribute: '987654321',
          ofd_receipt_url: 'https://check.ofd.ru/rec/12345',
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '2',
          order_id: 'order_124',
          receipt_id: 'rec_457',
          amount: 300000, // 3000.00 рублей
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ];
      setReceipts(mockReceipts);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const configData = {
        integration_name: 'orange_data',
        integration_type: 'fiscal',
        config: {
          inn: config.inn,
          group: config.group,
          organization_name: config.organization_name,
          organization_address: config.organization_address,
          organization_email: config.organization_email,
          organization_phone: config.organization_phone,
          tax_system: config.tax_system,
          cashier_name: config.cashier_name,
          cashier_inn: config.cashier_inn,
          auto_fiscalization: config.auto_fiscalization,
          test_mode: config.test_mode,
          webhook_url: config.webhook_url
        },
        api_keys: {
          api_key: config.api_key,
          sign_key: config.sign_key
        },
        is_active: config.enabled,
        last_sync: new Date().toISOString()
      };

      const { error } = await (supabase as any)
        .from('cms_integrations')
        .upsert(configData, { 
          onConflict: 'integration_name'
        });

      if (error) throw error;

      toast({
        title: "Настройки сохранены",
        description: "Конфигурация Orange Data успешно обновлена",
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('orange-data-test', {
        body: {
          api_key: config.api_key,
          sign_key: config.sign_key,
          inn: config.inn,
          group: config.group,
          test_mode: config.test_mode
        }
      });

      if (error) throw error;

      setTestResult({
        success: data.success,
        message: data.message,
        response: data.response
      });

      toast({
        title: data.success ? "Подключение успешно" : "Ошибка подключения",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: "Ошибка тестирования подключения",
        error: error.message
      });

      toast({
        title: "Ошибка тестирования",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const sendTestReceipt = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('orange-data-receipt', {
        body: {
          amount: 100, // 1 рубль для теста
          email: config.organization_email,
          tax_system: config.tax_system,
          test_mode: config.test_mode,
          items: [{
            name: 'Тестовый товар',
            price: 100,
            quantity: 1,
            vat: 'vat20'
          }]
        }
      });

      if (error) throw error;

      toast({
        title: "Тестовый чек отправлен",
        description: "Чек успешно отправлен в Orange Data",
      });

      fetchReceipts(); // Обновляем список чеков
    } catch (error: any) {
      toast({
        title: "Ошибка отправки чека",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'fiscal':
        return <Badge variant="default" className="bg-green-100 text-green-800">Фискализирован</Badge>;
      case 'sent':
        return <Badge variant="secondary">Отправлен</Badge>;
      case 'pending':
        return <Badge variant="outline">Ожидает</Badge>;
      case 'error':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fiscal': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'sent': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6" />
            Orange Data - Фискализация
          </h2>
          <p className="text-muted-foreground">Настройка онлайн-кассы и фискализации платежей</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={config.enabled ? "default" : "secondary"}>
            {config.enabled ? "Активна" : "Неактивна"}
          </Badge>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
          />
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Настройки</TabsTrigger>
          <TabsTrigger value="organization">Организация</TabsTrigger>
          <TabsTrigger value="receipts">Чеки</TabsTrigger>
          <TabsTrigger value="testing">Тестирование</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  API Настройки
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={config.api_key}
                    onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                    placeholder="Введите API ключ Orange Data"
                  />
                </div>
                <div>
                  <Label>Sign Key (Ключ подписи)</Label>
                  <Input
                    type="password"
                    value={config.sign_key}
                    onChange={(e) => setConfig({ ...config, sign_key: e.target.value })}
                    placeholder="Введите ключ подписи"
                  />
                </div>
                <div>
                  <Label>ИНН</Label>
                  <Input
                    value={config.inn}
                    onChange={(e) => setConfig({ ...config, inn: e.target.value })}
                    placeholder="ИНН организации"
                    maxLength={12}
                  />
                </div>
                <div>
                  <Label>Группа (Group)</Label>
                  <Input
                    value={config.group}
                    onChange={(e) => setConfig({ ...config, group: e.target.value })}
                    placeholder="Группа устройств"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Параметры фискализации
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Система налогообложения</Label>
                  <Select value={config.tax_system} onValueChange={(value: any) => setConfig({ ...config, tax_system: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taxSystems.map((system) => (
                        <SelectItem key={system.value} value={system.value}>
                          {system.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Автоматическая фискализация</Label>
                    <p className="text-xs text-muted-foreground">
                      Автоматически отправлять чеки при оплате
                    </p>
                  </div>
                  <Switch
                    checked={config.auto_fiscalization}
                    onCheckedChange={(checked) => setConfig({ ...config, auto_fiscalization: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Тестовый режим</Label>
                    <p className="text-xs text-muted-foreground">
                      Использовать тестовую среду Orange Data
                    </p>
                  </div>
                  <Switch
                    checked={config.test_mode}
                    onCheckedChange={(checked) => setConfig({ ...config, test_mode: checked })}
                  />
                </div>

                <div>
                  <Label>Webhook URL</Label>
                  <Input
                    value={config.webhook_url}
                    onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                    placeholder="https://yourdomain.com/webhooks/orange-data"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL для получения уведомлений о статусе чеков
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить настройки"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Данные организации
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Название организации</Label>
                  <Input
                    value={config.organization_name}
                    onChange={(e) => setConfig({ ...config, organization_name: e.target.value })}
                    placeholder="ООО Покерный клуб"
                  />
                </div>
                <div>
                  <Label>Email организации</Label>
                  <Input
                    type="email"
                    value={config.organization_email}
                    onChange={(e) => setConfig({ ...config, organization_email: e.target.value })}
                    placeholder="info@pokerclub.ru"
                  />
                </div>
                <div>
                  <Label>Телефон</Label>
                  <Input
                    value={config.organization_phone}
                    onChange={(e) => setConfig({ ...config, organization_phone: e.target.value })}
                    placeholder="+7 (xxx) xxx-xx-xx"
                  />
                </div>
                <div>
                  <Label>ИНН кассира</Label>
                  <Input
                    value={config.cashier_inn}
                    onChange={(e) => setConfig({ ...config, cashier_inn: e.target.value })}
                    placeholder="ИНН кассира"
                    maxLength={12}
                  />
                </div>
              </div>
              
              <div>
                <Label>Адрес организации</Label>
                <Textarea
                  value={config.organization_address}
                  onChange={(e) => setConfig({ ...config, organization_address: e.target.value })}
                  placeholder="г. Москва, ул. Примерная, д. 1, оф. 101"
                  rows={3}
                />
              </div>

              <div>
                <Label>ФИО кассира</Label>
                <Input
                  value={config.cashier_name}
                  onChange={(e) => setConfig({ ...config, cashier_name: e.target.value })}
                  placeholder="Иванов Иван Иванович"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                История фискальных чеков
              </CardTitle>
            </CardHeader>
            <CardContent>
              {receipts.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Нет чеков</h3>
                  <p className="text-muted-foreground">Фискальные чеки появятся здесь после первых платежей</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(receipt.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Заказ {receipt.order_id}</span>
                            {getStatusBadge(receipt.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{(receipt.amount / 100).toFixed(2)} ₽</span>
                            <span>{new Date(receipt.created_at).toLocaleString('ru-RU')}</span>
                            {receipt.fiscal_document_number && (
                              <span>ФД: {receipt.fiscal_document_number}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {receipt.ofd_receipt_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={receipt.ofd_receipt_url} target="_blank" rel="noopener noreferrer">
                              <Globe className="w-4 h-4 mr-1" />
                              ОФД
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  Тестирование подключения
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Проверьте корректность настроек API и подключение к Orange Data
                </p>
                
                <div className="flex gap-2">
                  <Button onClick={testConnection} disabled={testing} className="flex-1">
                    <TestTube className={`w-4 h-4 mr-2 ${testing ? 'animate-pulse' : ''}`} />
                    {testing ? 'Тестирование...' : 'Тест подключения'}
                  </Button>
                  <Button onClick={sendTestReceipt} variant="outline">
                    <Receipt className="w-4 h-4 mr-2" />
                    Тестовый чек
                  </Button>
                </div>

                {testResult && (
                  <Alert>
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      <strong>{testResult.success ? 'Успешно:' : 'Ошибка:'}</strong><br />
                      {testResult.message}
                      {testResult.response && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm">Детали ответа</summary>
                          <pre className="text-xs mt-1 overflow-auto">
                            {JSON.stringify(testResult.response, null, 2)}
                          </pre>
                        </details>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Статус интеграции
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">API ключи</span>
                    <Badge variant={config.api_key && config.sign_key ? "default" : "secondary"}>
                      {config.api_key && config.sign_key ? "Настроены" : "Не настроены"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">Данные организации</span>
                    <Badge variant={config.inn && config.organization_name ? "default" : "secondary"}>
                      {config.inn && config.organization_name ? "Заполнены" : "Требуется"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">Автофискализация</span>
                    <Badge variant={config.auto_fiscalization ? "default" : "outline"}>
                      {config.auto_fiscalization ? "Включена" : "Выключена"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">Режим работы</span>
                    <Badge variant={config.test_mode ? "secondary" : "default"}>
                      {config.test_mode ? "Тестовый" : "Боевой"}
                    </Badge>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Важно:</strong> Перед переключением в боевой режим убедитесь, что все настройки корректны и тестирование прошло успешно.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}