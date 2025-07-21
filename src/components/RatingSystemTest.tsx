import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calculator, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const RatingSystemTest = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const testRatingSystem = async () => {
    setTesting(true);
    setError(null);
    setResults(null);

    try {
      console.log('Тестирование рейтинговой системы...');
      
      // Получаем данные о регистрациях турнира IPS OPEN
      const { data: registrations, error: regError } = await supabase
        .from('tournament_registrations')
        .select('player_id, position, rebuys, addons')
        .eq('tournament_id', 'ae38d076-8143-48cb-8d4d-96a1dd7634bb')
        .not('position', 'is', null)
        .order('position');

      if (regError) throw regError;

      if (!registrations || registrations.length === 0) {
        throw new Error('Нет результатов для расчета рейтингов');
      }

      console.log(`Найдено ${registrations.length} игроков с позициями`);

      // Подготавливаем данные для edge функции
      const results = registrations.map(reg => ({
        player_id: reg.player_id,
        position: reg.position,
        rebuys: reg.rebuys || 0,
        addons: reg.addons || 0
      }));

      console.log('Данные для отправки в calculate-elo:', {
        tournament_id: 'ae38d076-8143-48cb-8d4d-96a1dd7634bb',
        results: results.slice(0, 3) // показываем только первые 3 для логов
      });

      // Вызываем edge функцию
      const { data, error: calcError } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: 'ae38d076-8143-48cb-8d4d-96a1dd7634bb',
          results: results
        }
      });

      if (calcError) {
        console.error('Ошибка от edge функции:', calcError);
        throw calcError;
      }

      console.log('Успешный ответ от calculate-elo:', data);

      // Проверяем результаты в базе данных
      const { data: gameResults } = await supabase
        .from('game_results')
        .select('*')
        .eq('tournament_id', 'ae38d076-8143-48cb-8d4d-96a1dd7634bb')
        .limit(5);

      const { data: updatedPlayers } = await supabase
        .from('players')
        .select('id, name, elo_rating, games_played, wins')
        .in('id', results.slice(0, 5).map(r => r.player_id));

      const { data: tournamentStatus } = await supabase
        .from('tournaments')
        .select('id, name, status, finished_at')
        .eq('id', 'ae38d076-8143-48cb-8d4d-96a1dd7634bb')
        .single();

      setResults({
        calculationResponse: data,
        gameResultsCount: gameResults?.length || 0,
        playersUpdated: updatedPlayers || [],
        tournamentStatus: tournamentStatus
      });

      toast({
        title: 'Тест завершен успешно!',
        description: `Рассчитаны рейтинги для ${registrations.length} игроков`,
      });

    } catch (err: any) {
      console.error('Ошибка тестирования:', err);
      setError(err.message || 'Неизвестная ошибка');
      toast({
        title: 'Ошибка тестирования',
        description: err.message || 'Неизвестная ошибка',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-poker-border shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-poker-text-primary">
            <Calculator className="h-5 w-5 text-poker-accent" />
            Тест рейтинговой системы
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-poker-text-secondary">
            Протестируем рейтинговую систему на турнире "IPS OPEN" с готовыми результатами
          </p>
          
          <Button 
            onClick={testRatingSystem}
            disabled={testing}
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Тестирование...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Запустить тест рейтинговой системы
              </>
            )}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Ошибка:</span>
              </div>
              <p className="mt-1 text-red-600">{error}</p>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Тест выполнен успешно!</span>
              </div>

              <div className="grid gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Статус турнира:</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Название:</strong> {results.tournamentStatus?.name}</p>
                    <p><strong>Статус:</strong> 
                      <Badge variant="outline" className="ml-2">
                        {results.tournamentStatus?.status}
                      </Badge>
                    </p>
                    <p><strong>Завершен:</strong> {results.tournamentStatus?.finished_at || 'Не указано'}</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Результаты расчета:</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Записей в game_results:</strong> {results.gameResultsCount}</p>
                    <p><strong>Игроков обновлено:</strong> {results.playersUpdated.length}</p>
                  </div>
                </div>

                {results.playersUpdated.length > 0 && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">Обновленные игроки (топ-5):</h4>
                    <div className="space-y-2">
                      {results.playersUpdated.map((player: any) => (
                        <div key={player.id} className="flex justify-between items-center text-sm">
                          <span>{player.name}</span>
                          <div className="flex gap-2">
                            <Badge variant="outline">ELO: {player.elo_rating}</Badge>
                            <Badge variant="outline">Игр: {player.games_played}</Badge>
                            <Badge variant="outline">Побед: {player.wins}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RatingSystemTest;