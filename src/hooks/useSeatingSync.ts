import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  avatar_url?: string;
}

interface Registration {
  id: string;
  player: Player;
  chips: number;
  status: string;
  seat_number?: number;
}

interface UseSeatingSyncProps {
  tournamentId: string;
  registrations: Registration[];
  onSeatingUpdate: () => void;
}

export const useSeatingSync = ({ tournamentId, registrations, onSeatingUpdate }: UseSeatingSyncProps) => {
  useEffect(() => {
    // Подписываемся на изменения в tournament_registrations
    const subscription = supabase
      .channel(`tournament_registrations_${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('🔄 Изменение в регистрациях турнира:', payload);
          
          // Обновляем данные через callback
          onSeatingUpdate();
          
          // Если игрок исключен, очищаем его место в рассадке
          if (payload.eventType === 'UPDATE' && payload.new.status === 'eliminated') {
            console.log('🪑 Игрок исключен, очищаем место в рассадке');
            
            // Обновляем localStorage для синхронизации рассадки
            const savedSeating = localStorage.getItem(`seating_${tournamentId}`);
            if (savedSeating) {
              try {
                const tables = JSON.parse(savedSeating);
                let updated = false;
                
                tables.forEach((table: any) => {
                  table.seats.forEach((seat: any) => {
                    if (seat.player_id === payload.new.player_id) {
                      seat.player_id = undefined;
                      seat.player_name = undefined;
                      seat.chips = undefined;
                      seat.status = undefined;
                      seat.elo_rating = undefined;
                      seat.avatar_url = undefined;
                      table.active_players = Math.max(0, table.active_players - 1);
                      updated = true;
                    }
                  });
                });
                
                if (updated) {
                  localStorage.setItem(`seating_${tournamentId}`, JSON.stringify(tables));
                  console.log('🪑 Рассадка обновлена в localStorage после исключения игрока');
                }
              } catch (error) {
                console.error('Ошибка при обновлении localStorage:', error);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Отписываемся от изменений в турнире');
      subscription.unsubscribe();
    };
  }, [tournamentId, onSeatingUpdate]);

  // Функция для автоматической балансировки столов после исключения игрока
  const suggestTableBalance = (remainingPlayers: Registration[]) => {
    const playersPerTable = 9;
    const totalTables = Math.ceil(remainingPlayers.length / playersPerTable);
    
    if (totalTables <= 1) return null;
    
    // Группируем игроков по столам
    const tableDistribution: { [key: number]: number } = {};
    
    remainingPlayers.forEach(player => {
      if (player.seat_number) {
        const tableNum = Math.floor((player.seat_number - 1) / playersPerTable) + 1;
        tableDistribution[tableNum] = (tableDistribution[tableNum] || 0) + 1;
      }
    });
    
    // Находим несбалансированные столы
    const tableCounts = Object.entries(tableDistribution).map(([table, count]) => ({
      table: parseInt(table),
      count
    }));
    
    const maxTable = tableCounts.reduce((max, current) => 
      current.count > max.count ? current : max
    );
    
    const minTable = tableCounts.reduce((min, current) => 
      current.count < min.count ? current : min
    );
    
    // Если разница больше 1, предлагаем балансировку
    if (maxTable.count - minTable.count > 1) {
      return {
        fromTable: maxTable.table,
        toTable: minTable.table,
        difference: maxTable.count - minTable.count
      };
    }
    
    return null;
  };

  return {
    suggestTableBalance
  };
};