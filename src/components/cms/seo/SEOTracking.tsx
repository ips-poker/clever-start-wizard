import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, 
  Save, 
  Eye, 
  TrendingUp, 
  Target, 
  Globe,
  Code,
  Settings,
  AlertCircle
} from "lucide-react";

interface TrackingSettings {
  google_analytics_id: string;
  google_tag_manager_id: string;
  yandex_metrica_id: string;
  google_search_console_verification: string;
  yandex_webmaster_verification: string;
  facebook_pixel_id: string;
  custom_head_scripts: string;
  custom_body_scripts: string;
  cookie_consent_enabled: boolean;
  gdpr_compliant: boolean;
}

export function SEOTracking() {
  const [settings, setSettings] = useState<TrackingSettings>({
    google_analytics_id: '',
    google_tag_manager_id: '',
    yandex_metrica_id: '',
    google_search_console_verification: '',
    yandex_webmaster_verification: '',
    facebook_pixel_id: '',
    custom_head_scripts: '',
    custom_body_scripts: '',
    cookie_consent_enabled: true,
    gdpr_compliant: true,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_settings')
        .select('*')
        .eq('category', 'tracking');

      if (error) throw error;

      // Convert array of settings to object
      const settingsObj = data.reduce((acc: any, setting) => {
        acc[setting.setting_key] = setting.setting_value || '';
        return acc;
      }, {});

      setSettings(prev => ({ ...prev, ...settingsObj }));
    } catch (error) {
      console.error('Error loading tracking settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить настройки отслеживания",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    
    try {
      // Convert settings object to array of database records
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: typeof value === 'boolean' ? value.toString() : value,
        setting_type: typeof value === 'boolean' ? 'boolean' : 'text',
        category: 'tracking',
        description: getSettingDescription(key),
        is_public: false,
      }));

      // Upsert all settings
      for (const setting of settingsArray) {
        const { error } = await supabase
          .from('cms_settings')
          .upsert({
            ...setting,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'setting_key'
          });

        if (error) throw error;
      }

      toast({
        title: "Сохранено!",
        description: "Настройки отслеживания успешно сохранены",
      });
    } catch (error) {
      console.error('Error saving tracking settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки отслеживания",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      google_analytics_id: 'ID Google Analytics для отслеживания трафика',
      google_tag_manager_id: 'ID Google Tag Manager для управления тегами',
      yandex_metrica_id: 'ID Яндекс.Метрики для российской аудитории',
      google_search_console_verification: 'Код верификации Google Search Console',
      yandex_webmaster_verification: 'Код верификации Яндекс.Вебмастер',
      facebook_pixel_id: 'ID Facebook Pixel для рекламы в Facebook',
      custom_head_scripts: 'Пользовательские скрипты в <head>',
      custom_body_scripts: 'Пользовательские скрипты в <body>',
      cookie_consent_enabled: 'Включить уведомление о cookies',
      gdpr_compliant: 'GDPR совместимость',
    };
    return descriptions[key] || '';
  };

  const generateTrackingCode = () => {
    let code = '';

    // Google Analytics 4
    if (settings.google_analytics_id) {
      code += `<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${settings.google_analytics_id}');
</script>

`;
    }

    // Google Tag Manager
    if (settings.google_tag_manager_id) {
      code += `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${settings.google_tag_manager_id}');</script>

`;
    }

    // Yandex Metrica
    if (settings.yandex_metrica_id) {
      code += `<!-- Yandex.Metrika -->
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

   ym(${settings.yandex_metrica_id}, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true,
        webvisor:true
   });
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/${settings.yandex_metrica_id}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>

`;
    }

    // Facebook Pixel
    if (settings.facebook_pixel_id) {
      code += `<!-- Facebook Pixel -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${settings.facebook_pixel_id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${settings.facebook_pixel_id}&ev=PageView&noscript=1"
/></noscript>

`;
    }

    // Verification meta tags
    let metaTags = '';
    if (settings.google_search_console_verification) {
      metaTags += `<meta name="google-site-verification" content="${settings.google_search_console_verification}" />\n`;
    }
    if (settings.yandex_webmaster_verification) {
      metaTags += `<meta name="yandex-verification" content="${settings.yandex_webmaster_verification}" />\n`;
    }

    if (metaTags) {
      code = metaTags + '\n' + code;
    }

    // Custom scripts
    if (settings.custom_head_scripts) {
      code += `<!-- Custom Head Scripts -->
${settings.custom_head_scripts}

`;
    }

    return code;
  };

  if (loading) return <div className="flex items-center justify-center p-8">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">SEO отслеживание и аналитика</h2>
          <p className="text-muted-foreground">
            Настройка кодов отслеживания и верификации поисковых систем
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="flex items-center gap-2">
          {saving ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Сохранить настройки
        </Button>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Аналитика
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Верификация
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Пользовательские
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Код
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Google Analytics 4
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Measurement ID</Label>
                  <Input
                    value={settings.google_analytics_id}
                    onChange={(e) => setSettings(prev => ({ ...prev, google_analytics_id: e.target.value }))}
                    placeholder="G-XXXXXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Найти в Google Analytics → Администрирование → Информация об отслеживании
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Google Tag Manager
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Container ID</Label>
                  <Input
                    value={settings.google_tag_manager_id}
                    onChange={(e) => setSettings(prev => ({ ...prev, google_tag_manager_id: e.target.value }))}
                    placeholder="GTM-XXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Найти в Google Tag Manager при создании контейнера
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Яндекс.Метрика
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Номер счётчика</Label>
                  <Input
                    value={settings.yandex_metrica_id}
                    onChange={(e) => setSettings(prev => ({ ...prev, yandex_metrica_id: e.target.value }))}
                    placeholder="12345678"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Найти в Яндекс.Метрике после создания счётчика
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Facebook Pixel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Pixel ID</Label>
                  <Input
                    value={settings.facebook_pixel_id}
                    onChange={(e) => setSettings(prev => ({ ...prev, facebook_pixel_id: e.target.value }))}
                    placeholder="123456789012345"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Найти в Facebook Business Manager → Events Manager
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="verification" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Google Search Console
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Код верификации</Label>
                  <Input
                    value={settings.google_search_console_verification}
                    onChange={(e) => setSettings(prev => ({ ...prev, google_search_console_verification: e.target.value }))}
                    placeholder="abcdefghijklmnopqrstuvwxyz123456"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Только код без meta тега. Найти в Search Console → Настройки → Подтверждение права собственности
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Яндекс.Вебмастер
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Код верификации</Label>
                  <Input
                    value={settings.yandex_webmaster_verification}
                    onChange={(e) => setSettings(prev => ({ ...prev, yandex_webmaster_verification: e.target.value }))}
                    placeholder="abcdefghijklmnopqrstuvwxyz123456"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Только код без meta тега. Найти в Яндекс.Вебмастер при добавлении сайта
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Пользовательские скрипты
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Скрипты для &lt;head&gt;</Label>
                  <Textarea
                    value={settings.custom_head_scripts}
                    onChange={(e) => setSettings(prev => ({ ...prev, custom_head_scripts: e.target.value }))}
                    placeholder="<script>/* Ваши скрипты для head */</script>"
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Скрипты будут добавлены в раздел &lt;head&gt; всех страниц
                  </p>
                </div>

                <div>
                  <Label>Скрипты для &lt;body&gt;</Label>
                  <Textarea
                    value={settings.custom_body_scripts}
                    onChange={(e) => setSettings(prev => ({ ...prev, custom_body_scripts: e.target.value }))}
                    placeholder="<script>/* Ваши скрипты для body */</script>"
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Скрипты будут добавлены в конец &lt;body&gt; всех страниц
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Настройки приватности
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Уведомление о cookies</Label>
                    <p className="text-sm text-muted-foreground">
                      Показывать уведомление о использовании cookies
                    </p>
                  </div>
                  <Switch
                    checked={settings.cookie_consent_enabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, cookie_consent_enabled: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>GDPR совместимость</Label>
                    <p className="text-sm text-muted-foreground">
                      Соблюдение требований GDPR для европейских пользователей
                    </p>
                  </div>
                  <Switch
                    checked={settings.gdpr_compliant}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, gdpr_compliant: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Сгенерированный код отслеживания
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
                <code>{generateTrackingCode() || "Настройте коды отслеживания для генерации"}</code>
              </pre>
              
              {generateTrackingCode() && (
                <Button
                  onClick={() => navigator.clipboard.writeText(generateTrackingCode())}
                  variant="outline"
                  className="mt-4"
                >
                  Скопировать код
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}