import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calculator } from 'lucide-react';

interface TournamentRecalculatorProps {
  tournamentId?: string;
  tournamentName?: string;
}

export const TournamentRecalculator: React.FC<TournamentRecalculatorProps> = ({ 
  tournamentId = 'd6f4a885-7b2c-4983-9946-a68c05fa0581',
  tournamentName = 'EPC OPEN 2025'
}) => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { toast } = useToast();

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      
      toast({
        title: "Начинаю пересчет рейтингов",
        description: `Пересчитываю рейтинги для турнира "${tournamentName}" с новыми настройками пул-базированной системы...`
      });

      const { data, error } = await supabase.functions.invoke('recalculate-tournament-ratings', {
        body: {
          tournament_id: tournamentId
        }
      });

      if (error) {
        console.error('Error recalculating ratings:', error);
        toast({
          title: "Ошибка пересчета",
          description: error.message || 'Произошла ошибка при пересчете рейтингов',
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Пересчет завершен!", 
        description: data.message || `Рейтинги успешно пересчитаны для турнира "${tournamentName}"`,
        variant: "default"
      });

      // Перезагрузить страницу через 2 секунды чтобы показать новые результаты
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Ошибка",
        description: "Произошла непредвиденная ошибка",
        variant: "destructive"
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-2">Пересчет рейтингов турнира</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Турнир: <strong>{tournamentName}</strong><br/>
        Будут применены новые настройки пул-базированной системы рейтингов (призовой коэффициент 0.1, без бонусов за участие и ребаи).
      </p>
      
      <Button 
        onClick={handleRecalculate}
        disabled={isRecalculating}
        className="w-full"
      >
        {isRecalculating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Пересчитываю рейтинги...
          </>
        ) : (
          <>
            <Calculator className="w-4 h-4 mr-2" />
            Пересчитать рейтинги с новыми настройками
          </>
        )}
      </Button>
    </div>
  );
};