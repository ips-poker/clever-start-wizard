import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function RecalculateRatings() {
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    
    try {
      // Найти последний турнир с результатами
      const { data: tournaments, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('id, name')
        .eq('status', 'cancelled') // используем cancelled турнир с результатами
        .order('created_at', { ascending: false })
        .limit(1);

      if (tournamentsError) throw tournamentsError;

      if (!tournaments || tournaments.length === 0) {
        toast.error('Нет турниров для пересчета');
        return;
      }

      const tournament = tournaments[0];

      // Получить результаты турнира
      const { data: registrations, error: registrationsError } = await supabase
        .from('tournament_registrations')
        .select('player_id, position, rebuys, addons')
        .eq('tournament_id', tournament.id)
        .not('position', 'is', null);

      if (registrationsError) throw registrationsError;

      if (!registrations || registrations.length === 0) {
        toast.error('Нет результатов для пересчета');
        return;
      }

      // Вызвать функцию пересчета
      const { data, error } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: tournament.id,
          results: registrations
        }
      });

      if (error) throw error;

      toast.success(`Рейтинги пересчитаны для турнира "${tournament.name}"`);
      
      // Обновить страницу через секунду
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Ошибка пересчета:', error);
      toast.error('Ошибка при пересчете рейтингов');
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <Button
      onClick={handleRecalculate}
      disabled={isRecalculating}
      className="inline-flex items-center gap-2"
      variant="outline"
    >
      {isRecalculating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Calculator className="w-4 h-4" />
      )}
      {isRecalculating ? 'Пересчитываем...' : 'Пересчитать рейтинги'}
    </Button>
  );
}