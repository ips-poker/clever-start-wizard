import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  name: string;
  elo_rating: number;
}

interface TestResult {
  player_id: string;
  player_name: string;
  position: number;
  rebuys: number;
  addons: number;
}

const RatingSystemTestNew = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const createTestResults = async () => {
    setIsLoading(true);
    try {
      // Получаем игроков из последнего завершенного турнира
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'finished')
        .order('finished_at', { ascending: false })
        .limit(1)
        .single();

      if (!tournament) {
        throw new Error('Нет завершенных турниров для тестирования');
      }

      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select(`
          player_id,
          rebuys,
          addons,
          players(name)
        `)
        .eq('tournament_id', tournament.id);

      if (!registrations || registrations.length === 0) {
        throw new Error('Нет участников в последнем турнире');
      }

      // Создаем корректные позиции (эмулируем вылеты в порядке):
      // Последний в списке = 1 место (победитель)
      // Предпоследний = 2 место и т.д.
      const testResults: TestResult[] = registrations.map((reg, index) => ({
        player_id: reg.player_id,
        player_name: reg.players?.name || 'Unknown',
        position: registrations.length - index, // Инвертируем позиции
        rebuys: reg.rebuys || 0,
        addons: reg.addons || 0
      }));

      // Сортируем по позиции для отображения (1 место первым)
      testResults.sort((a, b) => a.position - b.position);

      setResults(testResults);

      toast({
        title: "Тестовые результаты созданы",
        description: `${testResults.length} игроков с корректными позициями`
      });

    } catch (error) {
      console.error('Error creating test results:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testRatingCalculation = async () => {
    if (results.length === 0) {
      toast({
        title: "Ошибка",
        description: "Сначала создайте тестовые результаты",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Получаем последний турнир
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'finished')
        .order('finished_at', { ascending: false })
        .limit(1)
        .single();

      if (!tournament) {
        throw new Error('Нет турнира для тестирования');
      }

      console.log('🧪 ТЕСТ РЕЙТИНГОВОЙ СИСТЕМЫ:', {
        tournament_id: tournament.id,
        tournament_name: tournament.name,
        results_count: results.length,
        results: results.map(r => `${r.player_name}: position ${r.position}`)
      });

      // Отправляем результаты в функцию расчета
      const calculateResults = results.map(r => ({
        player_id: r.player_id,
        position: r.position,
        rebuys: r.rebuys,
        addons: r.addons
      }));

      const { data, error } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: tournament.id,
          results: calculateResults
        }
      });

      if (error) {
        console.error('Ошибка от calculate-elo:', error);
        throw error;
      }

      console.log('✅ Успешный ответ от calculate-elo:', data);

      // Проверяем созданные результаты
      const { data: gameResults } = await supabase
        .from('game_results')
        .select(`
          *,
          players(name)
        `)
        .eq('tournament_id', tournament.id)
        .order('position');

      console.log('📊 Результаты в базе данных:', gameResults);

      toast({
        title: "Тест завершен успешно",
        description: `Результаты для ${gameResults?.length || 0} игроков сохранены`
      });

    } catch (error) {
      console.error('Error testing rating calculation:', error);
      toast({
        title: "Ошибка теста",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPositionBadge = (position: number) => {
    if (position === 1) return <Badge className="bg-yellow-500">🥇 1 место</Badge>;
    if (position === 2) return <Badge className="bg-gray-400">🥈 2 место</Badge>;
    if (position === 3) return <Badge className="bg-amber-600">🥉 3 место</Badge>;
    return <Badge variant="outline">{position} место</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧪 Тест рейтинговой системы RPS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={createTestResults}
            disabled={isLoading}
            variant="outline"
          >
            1. Создать тестовые результаты
          </Button>
          <Button 
            onClick={testRatingCalculation}
            disabled={isLoading || results.length === 0}
          >
            2. Протестировать расчет рейтингов
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Тестовые результаты турнира:</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {results.map((result) => (
                <div key={result.player_id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {getPositionBadge(result.position)}
                    <span className="font-medium">{result.player_name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ребаи: {result.rebuys} | Адоны: {result.addons}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg border">
          <h4 className="font-medium mb-2">📋 Как работает тест:</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Берем участников последнего завершенного турнира</li>
            <li>Присваиваем корректные позиции (последний в списке = 1 место)</li>
            <li>Отправляем данные в функцию calculate-elo</li>
            <li>Проверяем, что рейтинги рассчитались правильно</li>
          </ol>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border">
          <h4 className="font-medium mb-2">⚠️ Важно:</h4>
          <p className="text-sm">
            Позиции в покере: кто последний вылетел из игры = 1 место (победитель).
            Рейтинг RPS начинается с базы 100 очков, не 1200.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RatingSystemTestNew;