import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function RecalculateRatings() {
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    
    try {
      // Найти последний завершенный турнир
      const { data: tournaments, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('id, name, status, participation_fee, buy_in')
        .or('status.eq.completed,status.eq.finished')
        .order('created_at', { ascending: false })
        .limit(1);

      if (tournamentsError) throw tournamentsError;

      if (!tournaments || tournaments.length === 0) {
        toast.error('Нет завершенных турниров для пересчета');
        return;
      }

      const tournament = tournaments[0];

      // Получить регистрации турнира (включая позиции)
      const { data: registrations, error: registrationsError } = await supabase
        .from('tournament_registrations')
        .select('player_id, position, final_position, reentries, rebuys, additional_sets, addons, status')
        .eq('tournament_id', tournament.id);

      if (registrationsError) throw registrationsError;

      if (!registrations || registrations.length === 0) {
        toast.error('Нет участников для пересчета');
        return;
      }

      // Формируем результаты с корректными позициями
      const results = registrations.map(reg => ({
        player_id: reg.player_id,
        position: reg.final_position || reg.position || null,
        rebuys: reg.reentries || reg.rebuys || 0,
        addons: reg.additional_sets || reg.addons || 0
      })).filter(r => r.position !== null); // Только участники с позициями

      if (results.length === 0) {
        toast.error('Нет результатов с корректными позициями');
        return;
      }

      toast.info('Удаляем старые результаты...');

      // Удалить существующие результаты перед пересчетом
      const { error: deleteError } = await supabase
        .from('game_results')
        .delete()
        .eq('tournament_id', tournament.id);

      if (deleteError) {
        console.error('Ошибка при удалении результатов:', deleteError);
        toast.error('Ошибка при очистке старых результатов');
        return;
      }

      // Сбросить статистику игроков
      const playerIds = results.map(r => r.player_id);
      await supabase
        .from('players')
        .update({ 
          games_played: 0,
          wins: 0
        })
        .in('id', playerIds);

      // Сбросить статус турнира для пересчета
      await supabase
        .from('tournaments')
        .update({ status: 'registration' })
        .eq('id', tournament.id);

      toast.info('Пересчитываем рейтинги с новой пул-системой...');

      // Вызвать функцию пересчета с правильными параметрами
      const { data, error } = await supabase.functions.invoke('calculate-elo', {
        body: {
          tournament_id: tournament.id,
          results: results,
          // Настройки для pool-based системы
          use_pool_system: true,
          participation_fee: tournament.participation_fee || tournament.buy_in
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Ошибка функции пересчета: ${error.message}`);
      }

      toast.success(`Рейтинги успешно пересчитаны для турнира "${tournament.name}" с пул-системой!`);
      
      // Обновить страницу через 2 секунды
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Ошибка пересчета:', error);
      toast.error(`Ошибка при пересчете рейтингов: ${error.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Автоматический пересчет отключен для предотвращения множественных запусков
  // useEffect(() => {
  //   const autoRecalculate = async () => {
  //     // Проверяем, есть ли турнир EPC OPEN 2025 для пересчета
  //     const { data: tournaments } = await supabase
  //       .from('tournaments')
  //       .select('id, name, status')
  //       .eq('name', 'EPC OPEN 2025')
  //       .eq('status', 'finished')
  //       .limit(1);

  //     if (tournaments && tournaments.length > 0) {
  //       toast.info('Найден турнир для пересчета: EPC OPEN 2025');
  //       setTimeout(() => handleRecalculate(), 1000);
  //     }
  //   };

  //   autoRecalculate();
  // }, []);

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