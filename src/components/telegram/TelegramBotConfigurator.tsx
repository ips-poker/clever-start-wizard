import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function TelegramBotConfigurator() {
  const [webAppUrl, setWebAppUrl] = useState('https://epc-poker.ru/telegram');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const configureTelegramBot = async () => {
    setIsConfiguring(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'configure-telegram-bot',
        {
          body: { web_app_url: webAppUrl }
        }
      );

      if (functionError) throw functionError;

      setResult(data);
    } catch (err: any) {
      console.error('Configuration error:', err);
      setError(err.message || 'Failed to configure Telegram bot');
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Настройка Telegram Mini App</CardTitle>
        <CardDescription>
          Автоматическая настройка бота для запуска приложения с домашнего экрана
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="webAppUrl">URL мини-приложения</Label>
          <Input
            id="webAppUrl"
            value={webAppUrl}
            onChange={(e) => setWebAppUrl(e.target.value)}
            placeholder="https://yourdomain.com/telegram-mini-app"
          />
          <p className="text-sm text-muted-foreground">
            Укажите URL вашего развернутого приложения с путем /telegram
          </p>
        </div>

        <Button 
          onClick={configureTelegramBot} 
          disabled={isConfiguring || !webAppUrl}
          className="w-full"
        >
          {isConfiguring ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Настройка...
            </>
          ) : (
            'Настроить бота'
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result?.success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">{result.message}</p>
                {result.bot_username && (
                  <p>Бот: @{result.bot_username}</p>
                )}
                <div className="mt-4">
                  <p className="font-semibold mb-2">Инструкции:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {result.instructions?.map((instruction: string, index: number) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
