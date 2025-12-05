import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClanInvitation {
  id: string;
  clan_id: string;
  player_id: string;
  status: string;
  created_at: string;
  clan?: {
    name: string;
    emblem_id: number;
  };
}

export function useClanRealtimeNotifications(playerId: string | null) {
  const [newInvitations, setNewInvitations] = useState<ClanInvitation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const clearNotifications = useCallback(() => {
    setNewInvitations([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!playerId) return;

    // Загружаем начальные приглашения
    const loadInitialInvitations = async () => {
      const { data } = await supabase
        .from('clan_invitations')
        .select(`
          *,
          clan:clans(name, emblem_id)
        `)
        .eq('player_id', playerId)
        .eq('status', 'pending');

      if (data && data.length > 0) {
        const formattedData = data.map(inv => ({
          ...inv,
          clan: Array.isArray(inv.clan) ? inv.clan[0] : inv.clan
        }));
        setNewInvitations(formattedData);
        setUnreadCount(formattedData.length);
      }
    };

    loadInitialInvitations();

    // Подписываемся на realtime обновления
    const channel = supabase
      .channel('clan-invitations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clan_invitations',
          filter: `player_id=eq.${playerId}`
        },
        async (payload) => {
          console.log('🔔 Новое приглашение в клан:', payload);
          
          // Загружаем данные клана
          const { data: clanData } = await supabase
            .from('clans')
            .select('name, emblem_id')
            .eq('id', payload.new.clan_id)
            .single();

          const newInvitation: ClanInvitation = {
            ...payload.new as ClanInvitation,
            clan: clanData || undefined
          };

          setNewInvitations(prev => [newInvitation, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Показываем toast уведомление
          toast.info(`Приглашение в семью "${clanData?.name || 'Неизвестная семья'}"`, {
            description: 'Вас пригласили вступить в клан!',
            action: {
              label: 'Смотреть',
              onClick: () => window.location.href = '/profile?tab=clan'
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clan_invitations',
          filter: `player_id=eq.${playerId}`
        },
        (payload) => {
          console.log('🔄 Приглашение обновлено:', payload);
          
          // Удаляем приглашение из списка если оно принято/отклонено
          if (payload.new.status !== 'pending') {
            setNewInvitations(prev => 
              prev.filter(inv => inv.id !== payload.new.id)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'clan_invitations',
          filter: `player_id=eq.${playerId}`
        },
        (payload) => {
          console.log('🗑️ Приглашение удалено:', payload);
          setNewInvitations(prev => 
            prev.filter(inv => inv.id !== payload.old.id)
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      )
      .subscribe((status) => {
        console.log('📡 Статус подписки на приглашения:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  return {
    newInvitations,
    unreadCount,
    clearNotifications
  };
}
