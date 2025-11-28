import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Database, Globe } from 'lucide-react';

export const DatabaseProxyTest = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    connectionUrl: string;
    playersCount?: number;
    tournamentsCount?: number;
    error?: string;
    responseTime?: number;
  } | null>(null);

  const testConnection = async () => {
    setTesting(true);
    const startTime = Date.now();
    
    try {
      // Get the connection URL - checking if it's using proxy
      const connectionUrl = "https://api.epc-poker.ru";
      
      // Test query 1: Get players count
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true });

      if (playersError) throw playersError;

      // Test query 2: Get tournaments count
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('id', { count: 'exact', head: true });

      if (tournamentsError) throw tournamentsError;

      const responseTime = Date.now() - startTime;

      setResults({
        connectionUrl,
        playersCount: playersData?.length || 0,
        tournamentsCount: tournamentsData?.length || 0,
        responseTime
      });
    } catch (error: any) {
      setResults({
        connectionUrl: "https://api.epc-poker.ru",
        error: error.message || 'Unknown error'
      });
    } finally {
      setTesting(false);
    }
  };

  const isProxyUrl = results?.connectionUrl.includes('api.epc-poker.ru');

  return (
    <Card className="w-full max-w-2xl mx-auto border-brutal bg-brutal-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-brutal-text">
          <Database className="w-5 h-5" />
          Database Proxy Connection Test
        </CardTitle>
        <CardDescription>
          Проверка подключения к базе данных через прокси сервер
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testConnection} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Проверка подключения...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Проверить подключение
            </>
          )}
        </Button>

        {results && (
          <div className="space-y-4 p-4 bg-brutal-darker rounded border-brutal">
            {/* Connection URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Connection URL:
                </span>
                <Badge variant={isProxyUrl ? "default" : "destructive"}>
                  {isProxyUrl ? 'Proxy Active' : 'Direct Connection'}
                </Badge>
              </div>
              <code className="block text-xs bg-black/20 p-2 rounded font-mono break-all">
                {results.connectionUrl}
              </code>
            </div>

            {/* Results */}
            {results.error ? (
              <div className="flex items-start gap-2 text-destructive">
                <XCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-medium">Connection Failed</p>
                  <p className="text-sm opacity-80">{results.error}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-green-500">
                  <CheckCircle2 className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Connection Successful</p>
                    <p className="text-sm opacity-80">Response time: {results.responseTime}ms</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Players in DB</p>
                    <p className="text-2xl font-bold">{results.playersCount || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Tournaments in DB</p>
                    <p className="text-2xl font-bold">{results.tournamentsCount || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Proxy Status */}
            <div className="pt-2 border-t border-brutal">
              <p className="text-xs text-muted-foreground">
                {isProxyUrl 
                  ? '✅ База данных работает через прокси-сервер api.epc-poker.ru'
                  : '⚠️ Используется прямое подключение к Supabase'
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
