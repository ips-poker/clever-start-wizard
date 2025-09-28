import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export const InstantRecalculator: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Запускаю пересчет рейтингов...');
  const { toast } = useToast();

  useEffect(() => {
    const recalculate = async () => {
      try {
        setStatus('loading');
        setMessage('Пересчитываю рейтинги турнира "EPC OPEN 2025" с новыми настройками...');
        
        const { data, error } = await supabase.functions.invoke('recalculate-tournament-ratings', {
          body: {
            tournament_id: 'd6f4a885-7b2c-4983-9946-a68c05fa0581'
          }
        });

        if (error) {
          console.error('Error recalculating ratings:', error);
          setStatus('error');
          setMessage(`Ошибка пересчета: ${error.message || 'Неизвестная ошибка'}`);
          toast({
            title: "Ошибка пересчета",
            description: error.message || 'Произошла ошибка при пересчете рейтингов',
            variant: "destructive"
          });
          return;
        }

        setStatus('success');
        setMessage(data.message || 'Рейтинги успешно пересчитаны!');
        
        toast({
          title: "Пересчет завершен!", 
          description: data.message || 'Рейтинги успешно пересчитаны для турнира "EPC OPEN 2025"',
        });

        // Показать результаты через 3 секунды
        setTimeout(() => {
          window.location.href = '/tournaments';
        }, 3000);

      } catch (error) {
        console.error('Unexpected error:', error);
        setStatus('error');
        setMessage('Произошла непредвиденная ошибка при пересчете');
        toast({
          title: "Ошибка",
          description: "Произошла непредвиденная ошибка",
          variant: "destructive"
        });
      }
    };

    recalculate();
  }, [toast]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-8 h-8 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-xl">Пересчет рейтингов</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'success' && (
            <div className="text-sm text-muted-foreground">
              <p>Применены новые настройки:</p>
              <ul className="text-xs mt-2 space-y-1">
                <li>• Пул-базированная система (1000₽ = 100 очков)</li>
                <li>• Призовой коэффициент: 0.1</li>
                <li>• Убраны бонусы за участие и ребаи</li>
              </ul>
              <p className="mt-3 text-primary">Переход к турнирам через 3 секунды...</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-sm text-muted-foreground">
              <p>Это может занять несколько секунд...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};