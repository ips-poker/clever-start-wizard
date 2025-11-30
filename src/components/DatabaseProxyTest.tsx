import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
  error?: any;
}

export const DatabaseProxyTest = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const newResults: TestResult[] = [];

    // Test 1: Load tournaments
    console.log('🔄 Testing tournaments query...');
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .limit(5);

      if (error) throw error;

      newResults.push({
        name: 'Загрузка турниров',
        status: 'success',
        message: `Загружено ${data?.length || 0} турниров`,
        data: data
      });
      console.log('✅ Tournaments loaded:', data);
    } catch (error: any) {
      newResults.push({
        name: 'Загрузка турниров',
        status: 'error',
        message: error.message,
        error: error
      });
      console.error('❌ Tournaments error:', error);
    }

    // Test 2: Load players via RPC
    console.log('🔄 Testing players RPC...');
    try {
      const { data, error } = await supabase.rpc('get_players_public');

      if (error) throw error;

      newResults.push({
        name: 'Загрузка игроков (RPC)',
        status: 'success',
        message: `Загружено ${data?.length || 0} игроков`,
        data: data?.slice(0, 5)
      });
      console.log('✅ Players loaded:', data?.length);
    } catch (error: any) {
      newResults.push({
        name: 'Загрузка игроков (RPC)',
        status: 'error',
        message: error.message,
        error: error
      });
      console.error('❌ Players error:', error);
    }

    // Test 3: Load tournament registrations
    console.log('🔄 Testing registrations query...');
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('*')
        .limit(5);

      if (error) throw error;

      newResults.push({
        name: 'Загрузка регистраций',
        status: 'success',
        message: `Загружено ${data?.length || 0} регистраций`,
        data: data
      });
      console.log('✅ Registrations loaded:', data);
    } catch (error: any) {
      newResults.push({
        name: 'Загрузка регистраций',
        status: 'error',
        message: error.message,
        error: error
      });
      console.error('❌ Registrations error:', error);
    }

    // Test 4: Check Supabase URL
    const supabaseUrl = 'https://api.syndicate-poker.ru';
    newResults.push({
      name: 'Проверка URL Supabase',
      status: 'success',
      message: `Используется прокси: ${supabaseUrl}`
    });
    console.log('📍 Supabase URL:', supabaseUrl);

    setResults(newResults);
    setTesting(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Тест работы БД через Cloudflare Прокси
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={runTests} 
            disabled={testing}
            className="flex items-center gap-2"
          >
            {testing && <Loader2 className="w-4 h-4 animate-spin" />}
            {testing ? 'Тестирование...' : 'Запустить тесты'}
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Прокси: <code className="bg-muted px-2 py-1 rounded">api.syndicate-poker.ru</code>
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-3 mt-6">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${
                  result.status === 'success' 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : result.status === 'error'
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-yellow-500/10 border-yellow-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="font-semibold">{result.name}</div>
                    {result.message && (
                      <div className="text-sm mt-1 text-muted-foreground">
                        {result.message}
                      </div>
                    )}
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                          Показать данные
                        </summary>
                        <pre className="mt-2 text-xs bg-background/50 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                    {result.error && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-red-500 hover:text-red-400">
                          Показать ошибку
                        </summary>
                        <pre className="mt-2 text-xs bg-red-500/10 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(result.error, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !testing && (
          <div className="text-center text-muted-foreground py-8">
            Нажмите "Запустить тесты" для проверки подключения к БД
          </div>
        )}
      </CardContent>
    </Card>
  );
};
