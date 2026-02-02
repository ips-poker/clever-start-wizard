import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useClub } from '@/contexts/ClubContext';
import { 
  Send, 
  Users, 
  Trophy, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Bot,
  Link2,
  Smartphone,
  Palette,
  Upload,
  Save,
  Eye,
  Download
} from 'lucide-react';

interface ClubTelegramIntegrationProps {
  tournamentId?: string;
}

export function ClubTelegramIntegration({ tournamentId }: ClubTelegramIntegrationProps) {
  const { club } = useClub();
  const { toast } = useToast();
  
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#ff6b35');
  const [secondaryColor, setSecondaryColor] = useState('#000000');
  const [autoPostRegistrations, setAutoPostRegistrations] = useState(false);
  const [autoPostResults, setAutoPostResults] = useState(false);
  const [miniAppEnabled, setMiniAppEnabled] = useState(false);
  
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [configResult, setConfigResult] = useState<any>(null);
  
  // Load settings from database
  useEffect(() => {
    if (club?.id) {
      loadSettings();
    }
  }, [club?.id]);

  const loadSettings = async () => {
    if (!club?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('clans')
        .select('telegram_bot_token, telegram_channel_id, mini_app_url, logo_url, primary_color, secondary_color, auto_post_registrations, auto_post_results, mini_app_enabled')
        .eq('id', club.id)
        .single();

      if (error) throw error;

      if (data) {
        setBotToken(data.telegram_bot_token || '');
        setChannelId(data.telegram_channel_id || '');
        setWebAppUrl(data.mini_app_url || `${window.location.origin}/telegram?club=${club.id}`);
        setLogoUrl(data.logo_url || '');
        setPrimaryColor(data.primary_color || '#ff6b35');
        setSecondaryColor(data.secondary_color || '#000000');
        setAutoPostRegistrations(data.auto_post_registrations || false);
        setAutoPostResults(data.auto_post_results || false);
        setMiniAppEnabled(data.mini_app_enabled || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Save all settings to database
  const saveAllSettings = async () => {
    if (!club?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('clans')
        .update({
          telegram_bot_token: botToken || null,
          telegram_channel_id: channelId || null,
          mini_app_url: webAppUrl || null,
          logo_url: logoUrl || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          auto_post_registrations: autoPostRegistrations,
          auto_post_results: autoPostResults,
          mini_app_enabled: miniAppEnabled
        })
        .eq('id', club.id);

      if (error) throw error;

      toast({ title: "Настройки сохранены!" });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Configure bot (set menu button with Mini App)
  const configureBotMenuButton = async () => {
    if (!botToken || !webAppUrl) {
      toast({ title: "Ошибка", description: "Заполните токен бота и URL приложения", variant: "destructive" });
      return;
    }

    setIsConfiguring(true);
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: '🎰 Открыть',
            web_app: { url: webAppUrl }
          }
        })
      });

      const result = await response.json();
      
      if (result.ok) {
        setConfigResult({ success: true, message: 'Кнопка Mini App настроена!' });
        toast({ title: "Успешно!", description: "Кнопка Mini App настроена в боте" });
        
        // Enable Mini App in database
        setMiniAppEnabled(true);
        await supabase
          .from('clans')
          .update({ mini_app_enabled: true })
          .eq('id', club?.id);
      } else {
        throw new Error(result.description || 'Ошибка конфигурации');
      }
    } catch (error: any) {
      console.error('Bot config error:', error);
      setConfigResult({ success: false, message: error.message });
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsConfiguring(false);
    }
  };

  // Post tournament registrations to channel
  const postRegistrations = async () => {
    if (!tournamentId) {
      toast({ title: "Ошибка", description: "Турнир не выбран", variant: "destructive" });
      return;
    }

    setIsPosting(true);
    try {
      const { data, error } = await supabase.functions.invoke('post-tournament-registrations', {
        body: { 
          tournament_id: tournamentId,
          bot_token: botToken,
          channel_id: channelId
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({ 
          title: "Опубликовано!", 
          description: `${data.registered_count} участников отправлено в канал`
        });
      } else {
        throw new Error(data?.error || 'Ошибка публикации');
      }
    } catch (error: any) {
      console.error('Post error:', error);
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  // Post tournament results to channel
  const postResults = async () => {
    if (!tournamentId) {
      toast({ title: "Ошибка", description: "Турнир не выбран", variant: "destructive" });
      return;
    }

    setIsPosting(true);
    try {
      const { data, error } = await supabase.functions.invoke('post-tournament-results', {
        body: { 
          tournament_id: tournamentId,
          bot_token: botToken,
          channel_id: channelId
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: "Результаты опубликованы! 🎉" });
      } else {
        throw new Error(data?.error || 'Ошибка публикации');
      }
    } catch (error: any) {
      console.error('Post error:', error);
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  // Copy link
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} скопирован` });
  };

  // Generate Mini App URL with club ID
  const generateMiniAppUrl = () => {
    const url = `${window.location.origin}/telegram?club=${club?.id}`;
    setWebAppUrl(url);
    toast({ title: "URL сгенерирован" });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Брендинг
          </TabsTrigger>
          <TabsTrigger value="bot" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Бот
          </TabsTrigger>
          <TabsTrigger value="publish" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Публикации
          </TabsTrigger>
          <TabsTrigger value="miniapp" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Mini App
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="w-5 h-5 text-primary" />
                Персонализация клуба
              </CardTitle>
              <CardDescription>
                Настройте внешний вид Mini App для вашего клуба
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Логотип клуба</Label>
                <div className="flex gap-3 items-center">
                  {logoUrl ? (
                    <div 
                      className="w-16 h-16 rounded-xl overflow-hidden border"
                      style={{ borderColor: primaryColor }}
                    >
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center border-2 border-dashed"
                      style={{ borderColor: primaryColor + '40' }}
                    >
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Введите URL изображения или загрузите в Supabase Storage
                    </p>
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Основной цвет</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Фоновый цвет</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Предпросмотр</Label>
                <div 
                  className="p-4 rounded-xl border"
                  style={{ 
                    backgroundColor: secondaryColor,
                    borderColor: primaryColor + '40'
                  }}
                >
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{ backgroundColor: primaryColor + '20' }}
                      >
                        🎰
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-white">{club?.name || 'Название клуба'}</h3>
                      <p className="text-sm text-gray-400">Покерный клуб</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="text-center p-2 rounded" style={{ backgroundColor: primaryColor + '20' }}>
                      <div className="text-lg font-bold" style={{ color: primaryColor }}>0</div>
                      <div className="text-xs text-gray-400">Игроков</div>
                    </div>
                    <div className="text-center p-2 rounded" style={{ backgroundColor: primaryColor + '20' }}>
                      <div className="text-lg font-bold" style={{ color: primaryColor }}>0</div>
                      <div className="text-xs text-gray-400">Турниров</div>
                    </div>
                    <div className="text-center p-2 rounded" style={{ backgroundColor: primaryColor + '20' }}>
                      <div className="text-lg font-bold" style={{ color: primaryColor }}>0</div>
                      <div className="text-xs text-gray-400">Рейтинг</div>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={saveAllSettings} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Сохранить настройки
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bot Settings Tab */}
        <TabsContent value="bot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="w-5 h-5 text-primary" />
                Подключение Telegram бота
              </CardTitle>
              <CardDescription>
                Создайте бота через @BotFather и введите токен
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Токен бота</Label>
                <Input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                />
                <p className="text-xs text-muted-foreground">
                  Получите токен у @BotFather после создания бота
                </p>
              </div>

              <div className="space-y-2">
                <Label>ID канала / чата</Label>
                <Input
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  placeholder="@yourchannel или -1001234567890"
                />
                <p className="text-xs text-muted-foreground">
                  Username канала (@channel) или числовой ID
                </p>
              </div>

              {/* Auto-posting options */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm">Автоматические публикации</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Автопубликация регистраций</Label>
                    <p className="text-xs text-muted-foreground">
                      Публиковать список при старте турнира
                    </p>
                  </div>
                  <Switch
                    checked={autoPostRegistrations}
                    onCheckedChange={setAutoPostRegistrations}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Автопубликация результатов</Label>
                    <p className="text-xs text-muted-foreground">
                      Публиковать результаты по завершению
                    </p>
                  </div>
                  <Switch
                    checked={autoPostResults}
                    onCheckedChange={setAutoPostResults}
                  />
                </div>
              </div>

              <Button onClick={saveAllSettings} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Сохранить настройки
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Publish Tab */}
        <TabsContent value="publish" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="w-5 h-5 text-primary" />
                Публикации в канал
              </CardTitle>
              <CardDescription>
                Отправка списков регистраций и результатов турнира
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!botToken || !channelId ? (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Сначала настройте подключение к боту во вкладке "Бот"
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      onClick={postRegistrations}
                      disabled={isPosting || !tournamentId}
                      variant="outline"
                      className="h-20 flex-col"
                    >
                      {isPosting ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <Users className="w-6 h-6 mb-2" />
                          <span>Список регистраций</span>
                        </>
                      )}
                    </Button>

                    <Button 
                      onClick={postResults}
                      disabled={isPosting || !tournamentId}
                      className="h-20 flex-col bg-[#0088cc] hover:bg-[#006699]"
                    >
                      {isPosting ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <Trophy className="w-6 h-6 mb-2" />
                          <span>Результаты турнира</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {!tournamentId && (
                    <p className="text-sm text-muted-foreground text-center">
                      Выберите турнир для публикации
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mini App Tab */}
        <TabsContent value="miniapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="w-5 h-5 text-primary" />
                Telegram Mini App
              </CardTitle>
              <CardDescription>
                Настройка мини-приложения для игроков вашего клуба
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {miniAppEnabled ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="font-medium">
                    {miniAppEnabled ? 'Mini App активен' : 'Mini App не настроен'}
                  </span>
                </div>
                {miniAppEnabled && (
                  <Badge variant="outline" className="text-green-500 border-green-500/30">
                    Активен
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label>URL Mini App</Label>
                <div className="flex gap-2">
                  <Input
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://yourapp.lovable.app/telegram?club=..."
                  />
                  <Button variant="outline" size="icon" onClick={generateMiniAppUrl}>
                    <Link2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(webAppUrl, 'URL')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL автоматически включает ID вашего клуба для персонализации
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={configureBotMenuButton}
                  disabled={isConfiguring || !botToken || !webAppUrl}
                  className="h-auto py-4 flex-col"
                >
                  {isConfiguring ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Settings className="w-6 h-6 mb-2" />
                      <span>Настроить кнопку бота</span>
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => window.open(webAppUrl, '_blank')}
                  disabled={!webAppUrl}
                  className="h-auto py-4 flex-col"
                >
                  <Eye className="w-6 h-6 mb-2" />
                  <span>Предпросмотр</span>
                </Button>
              </div>

              {configResult && (
                <Alert variant={configResult.success ? "default" : "destructive"}>
                  {configResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <AlertDescription>{configResult.message}</AlertDescription>
                </Alert>
              )}

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Добавление на главный экран
                </p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Откройте бота в Telegram</li>
                  <li>Нажмите кнопку меню "🎰 Открыть"</li>
                  <li>Нажмите ⋮ в правом верхнем углу</li>
                  <li>Выберите "Добавить на главный экран"</li>
                  <li>Иконка клуба появится на рабочем столе!</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
