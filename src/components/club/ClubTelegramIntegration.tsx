import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Smartphone
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
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [configResult, setConfigResult] = useState<any>(null);
  
  // Load saved settings
  useEffect(() => {
    if (club?.id) {
      const savedBotToken = localStorage.getItem(`club_${club.id}_bot_token`);
      const savedChannelId = localStorage.getItem(`club_${club.id}_channel_id`);
      const savedWebAppUrl = localStorage.getItem(`club_${club.id}_webapp_url`);
      
      if (savedBotToken) setBotToken(savedBotToken);
      if (savedChannelId) setChannelId(savedChannelId);
      if (savedWebAppUrl) setWebAppUrl(savedWebAppUrl);
    }
  }, [club?.id]);

  // Save settings
  const saveSettings = () => {
    if (!club?.id) return;
    
    if (botToken) localStorage.setItem(`club_${club.id}_bot_token`, botToken);
    if (channelId) localStorage.setItem(`club_${club.id}_channel_id`, channelId);
    if (webAppUrl) localStorage.setItem(`club_${club.id}_webapp_url`, webAppUrl);
    
    toast({ title: "Настройки сохранены" });
  };

  // Configure bot (set menu button with Mini App)
  const configureBotMenuButton = async () => {
    if (!botToken || !webAppUrl) {
      toast({ title: "Ошибка", description: "Заполните токен бота и URL приложения", variant: "destructive" });
      return;
    }

    setIsConfiguring(true);
    try {
      // Call Telegram API to set the menu button
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Настройки
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

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
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

              <Button onClick={saveSettings} className="w-full">
                <CheckCircle className="w-4 h-4 mr-2" />
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
                    Сначала настройте подключение к боту
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
                Настройка мини-приложения для игроков
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL Mini App</Label>
                <div className="flex gap-2">
                  <Input
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://yourapp.lovable.app/telegram"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(webAppUrl, 'URL')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Укажите URL с путем /telegram для вашего развёрнутого приложения
                </p>
              </div>

              <Button 
                onClick={configureBotMenuButton}
                disabled={isConfiguring || !botToken || !webAppUrl}
                className="w-full"
              >
                {isConfiguring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Настройка...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Настроить кнопку Mini App
                  </>
                )}
              </Button>

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
                <p className="font-medium text-sm">Инструкции:</p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Создайте бота через @BotFather</li>
                  <li>Получите токен и введите его выше</li>
                  <li>Укажите URL вашего опубликованного приложения</li>
                  <li>Нажмите "Настроить кнопку Mini App"</li>
                  <li>Добавьте бота на домашний экран Telegram</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
