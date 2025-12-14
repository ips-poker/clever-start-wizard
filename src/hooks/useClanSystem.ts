import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getEffectiveMafiaRank } from '@/utils/mafiaRanks';

export interface Clan {
  id: string;
  name: string;
  don_player_id: string;
  emblem_id: number;
  seal_id: number;
  description: string | null;
  total_rating: number;
  created_at: string;
  updated_at: string;
  don_player?: {
    id: string;
    name: string;
    avatar_url: string | null;
    elo_rating: number;
  };
  members_count?: number;
}

export interface ClanMember {
  id: string;
  clan_id: string;
  player_id: string;
  hierarchy_role: string;
  joined_at: string;
  player?: {
    id: string;
    name: string;
    avatar_url: string | null;
    elo_rating: number;
    games_played: number;
    wins: number;
  };
}

export interface ClanInvitation {
  id: string;
  clan_id: string;
  player_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  clan?: Clan;
}

interface UseClanSystemOptions {
  // Для Telegram Mini App можно передать playerId напрямую
  telegramPlayerId?: string | null;
}

export function useClanSystem(options: UseClanSystemOptions = {}) {
  const { telegramPlayerId } = options;
  const { user } = useAuth();
  const [playerData, setPlayerData] = useState<any>(null);
  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [myMembership, setMyMembership] = useState<ClanMember | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<ClanInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDon, setIsDon] = useState(false);

  // Загрузить данные игрока
  const loadPlayerData = useCallback(async () => {
    // Если передан telegramPlayerId, используем его
    if (telegramPlayerId) {
      console.log('📱 Loading player by telegramPlayerId:', telegramPlayerId);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', telegramPlayerId)
        .maybeSingle();

      if (error) {
        console.error('Error loading player by id:', error);
        return null;
      }

      if (data) {
        setPlayerData(data);
        const { rank } = getEffectiveMafiaRank(
          { gamesPlayed: data.games_played, wins: data.wins, rating: data.elo_rating },
          data.manual_rank
        );
        const isDonRank = rank.id === 'don' || rank.id === 'patriarch';
        setIsDon(isDonRank);
        return data;
      }
      return null;
    }

    // Иначе используем user_id из Supabase auth
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading player:', error);
      return null;
    }

    setPlayerData(data);
    
    // Проверяем, является ли игрок Доном по рангу (don или patriarch), учитываем manual_rank
    if (data) {
      const { rank } = getEffectiveMafiaRank(
        { gamesPlayed: data.games_played, wins: data.wins, rating: data.elo_rating },
        data.manual_rank
      );
      const isDonRank = rank.id === 'don' || rank.id === 'patriarch';
      setIsDon(isDonRank);
    }

    return data;
  }, [user?.id, telegramPlayerId]);

  // Загрузить клан игрока (если он Дон или член клана)
  const loadMyClan = useCallback(async () => {
    if (!playerData?.id) return;

    try {
      // Проверяем, является ли игрок Доном клана
      const { data: ownedClan, error: ownedError } = await supabase
        .from('clans')
        .select('*')
        .eq('don_player_id', playerData.id)
        .maybeSingle();

      if (ownedError) {
        console.error('Error loading owned clan:', ownedError);
        return;
      }

      if (ownedClan) {
        // Загружаем количество членов
        const { count } = await supabase
          .from('clan_members')
          .select('*', { count: 'exact', head: true })
          .eq('clan_id', ownedClan.id);

        setMyClan({ ...ownedClan, members_count: count || 0 });
        setMyMembership({
          id: 'don',
          clan_id: ownedClan.id,
          player_id: playerData.id,
          hierarchy_role: 'don',
          joined_at: ownedClan.created_at
        });
        return;
      }

      // Проверяем, является ли игрок членом клана
      const { data: membership, error: memberError } = await supabase
        .from('clan_members')
        .select(`
          *,
          clan:clans(*)
        `)
        .eq('player_id', playerData.id)
        .maybeSingle();

      if (memberError) {
        console.error('Error loading membership:', memberError);
        return;
      }

      if (membership) {
        setMyMembership(membership);
        if (membership.clan) {
          const { count } = await supabase
            .from('clan_members')
            .select('*', { count: 'exact', head: true })
            .eq('clan_id', membership.clan.id);
          
          setMyClan({ ...(membership.clan as Clan), members_count: count || 0 });
        }
      }
    } catch (error) {
      console.error('Error in loadMyClan:', error);
    }
  }, [playerData?.id]);

  // Загрузить приглашения
  const loadInvitations = useCallback(async () => {
    if (!playerData?.id) {
      console.log('⚠️ loadInvitations: нет playerData.id');
      return;
    }

    console.log('📨 Загружаем приглашения для игрока:', playerData.id, playerData.name);

    try {
      const { data, error } = await supabase
        .from('clan_invitations')
        .select(`
          *,
          clan:clans(*)
        `)
        .eq('player_id', playerData.id)
        .eq('status', 'pending');

      console.log('📨 Результат загрузки приглашений:', { data, error, playerId: playerData.id });

      if (error) {
        console.error('❌ Error loading invitations:', error);
        return;
      }

      if (data) {
        console.log('✅ Найдено приглашений:', data.length);
        setPendingInvitations(data as ClanInvitation[]);
      }
    } catch (error) {
      console.error('❌ Error in loadInvitations:', error);
    }
  }, [playerData?.id, playerData?.name]);

  // Создать клан
  const createClan = async (name: string, emblemId: number, sealId: number, description?: string) => {
    if (!playerData?.id || !isDon) {
      toast.error('Только игроки с рангом Дон могут создавать кланы');
      return null;
    }

    // Проверяем, нет ли уже клана
    if (myClan) {
      toast.error('Вы уже являетесь главой клана');
      return null;
    }

    const { data, error } = await supabase
      .from('clans')
      .insert({
        name,
        don_player_id: playerData.id,
        emblem_id: emblemId,
        seal_id: sealId,
        description
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Клан с таким названием уже существует');
      } else {
        toast.error('Ошибка создания клана');
      }
      return null;
    }

    // Добавляем создателя как члена клана с ролью 'don'
    const { error: memberError } = await supabase
      .from('clan_members')
      .insert({
        clan_id: data.id,
        player_id: playerData.id,
        hierarchy_role: 'don'
      });

    if (memberError) {
      console.error('Error adding don as clan member:', memberError);
      // Удаляем клан если не удалось добавить создателя
      await supabase.from('clans').delete().eq('id', data.id);
      toast.error('Ошибка создания клана');
      return null;
    }

    toast.success('Клан успешно создан!');
    await loadMyClan();
    return data;
  };

  // Обновить клан
  const updateClan = async (clanId: string, updates: Partial<Pick<Clan, 'name' | 'emblem_id' | 'seal_id' | 'description'>>) => {
    const { error } = await supabase
      .from('clans')
      .update(updates)
      .eq('id', clanId);

    if (error) {
      toast.error('Ошибка обновления клана');
      return false;
    }

    toast.success('Клан обновлён');
    await loadMyClan();
    return true;
  };

  // Пригласить игрока
  const invitePlayer = async (playerId: string) => {
    // Проверяем, что пользователь - Дон клана (либо через membership, либо как создатель)
    const isDonOfClan = myClan && (
      myMembership?.hierarchy_role === 'don' || 
      myClan.don_player_id === playerData?.id
    );
    
    if (!myClan || !isDonOfClan) {
      toast.error('Только Дон может приглашать игроков');
      return false;
    }

    // Проверяем лимит
    if ((myClan.members_count || 0) >= 20) {
      toast.error('Клан достиг максимального количества участников (20)');
      return false;
    }

    // Удаляем старые declined/expired приглашения этому игроку от этого клана
    await supabase
      .from('clan_invitations')
      .delete()
      .eq('clan_id', myClan.id)
      .eq('player_id', playerId)
      .in('status', ['declined', 'expired']);

    const { error } = await supabase
      .from('clan_invitations')
      .insert({
        clan_id: myClan.id,
        player_id: playerId
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Приглашение уже отправлено этому игроку');
      } else {
        console.error('Invite error:', error);
        toast.error('Ошибка отправки приглашения');
      }
      return false;
    }

    // Отправляем push-уведомление в Telegram
    try {
      await supabase.functions.invoke('send-clan-notification', {
        body: {
          type: 'clan_invitation',
          player_id: playerId,
          clan_name: myClan.name,
          don_name: playerData?.name
        }
      });
    } catch (notifyError) {
      console.log('Failed to send notification:', notifyError);
      // Не блокируем основной процесс
    }

    toast.success('Приглашение отправлено!');
    return true;
  };

  // Принять приглашение
  const acceptInvitation = async (invitationId: string, clanId: string) => {
    if (!playerData?.id) return false;

    // Получаем информацию о клане и Доне
    const { data: clanData } = await supabase
      .from('clans')
      .select('name, don_player_id')
      .eq('id', clanId)
      .single();

    // Обновляем статус приглашения
    const { error: updateError } = await supabase
      .from('clan_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    if (updateError) {
      toast.error('Ошибка обновления приглашения');
      return false;
    }

    // Добавляем в члены клана
    const { error: memberError } = await supabase
      .from('clan_members')
      .insert({
        clan_id: clanId,
        player_id: playerData.id,
        hierarchy_role: 'associate'
      });

    if (memberError) {
      toast.error('Ошибка вступления в клан');
      return false;
    }

    // Отправляем уведомление Дону
    if (clanData?.don_player_id) {
      try {
        await supabase.functions.invoke('send-clan-notification', {
          body: {
            type: 'invitation_accepted',
            player_id: playerData.id,
            player_name: playerData.name,
            don_player_id: clanData.don_player_id,
            clan_name: clanData.name
          }
        });
      } catch (notifyError) {
        console.log('Failed to notify don:', notifyError);
      }
    }

    toast.success('Вы вступили в клан!');
    await loadMyClan();
    await loadInvitations();
    return true;
  };

  // Отклонить приглашение
  const declineInvitation = async (invitationId: string, clanId?: string) => {
    // Получаем информацию о клане и Доне если не передан clanId
    let clanData = null;
    if (clanId) {
      const { data } = await supabase
        .from('clans')
        .select('name, don_player_id')
        .eq('id', clanId)
        .single();
      clanData = data;
    } else {
      // Получаем clan_id из приглашения
      const { data: invitation } = await supabase
        .from('clan_invitations')
        .select('clan_id')
        .eq('id', invitationId)
        .single();
      
      if (invitation?.clan_id) {
        const { data } = await supabase
          .from('clans')
          .select('name, don_player_id')
          .eq('id', invitation.clan_id)
          .single();
        clanData = data;
      }
    }

    const { error } = await supabase
      .from('clan_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId);

    if (error) {
      toast.error('Ошибка отклонения приглашения');
      return false;
    }

    // Отправляем уведомление Дону
    if (clanData?.don_player_id && playerData?.id) {
      try {
        await supabase.functions.invoke('send-clan-notification', {
          body: {
            type: 'invitation_declined',
            player_id: playerData.id,
            player_name: playerData.name,
            don_player_id: clanData.don_player_id,
            clan_name: clanData.name
          }
        });
      } catch (notifyError) {
        console.log('Failed to notify don:', notifyError);
      }
    }

    toast.success('Приглашение отклонено');
    await loadInvitations();
    return true;
  };

  // Удалить члена клана
  const removeMember = async (memberId: string) => {
    if (myMembership?.hierarchy_role !== 'don') {
      toast.error('Только Дон может удалять членов клана');
      return false;
    }

    const { error } = await supabase
      .from('clan_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast.error('Ошибка удаления члена клана');
      return false;
    }

    toast.success('Игрок удалён из клана');
    await loadMyClan();
    return true;
  };

  // Покинуть клан
  const leaveClan = async () => {
    if (!myMembership || myMembership.hierarchy_role === 'don') {
      toast.error('Дон не может покинуть свой клан');
      return false;
    }

    const { error } = await supabase
      .from('clan_members')
      .delete()
      .eq('id', myMembership.id);

    if (error) {
      toast.error('Ошибка выхода из клана');
      return false;
    }

    toast.success('Вы покинули клан');
    setMyClan(null);
    setMyMembership(null);
    return true;
  };

  // Изменить роль члена клана
  const updateMemberRole = async (memberId: string, newRole: string) => {
    if (myMembership?.hierarchy_role !== 'don') {
      toast.error('Только Дон может менять роли');
      return false;
    }

    const { error } = await supabase
      .from('clan_members')
      .update({ hierarchy_role: newRole })
      .eq('id', memberId);

    if (error) {
      toast.error('Ошибка изменения роли');
      return false;
    }

    toast.success('Роль изменена');
    return true;
  };

  // Загрузить все кланы
  const loadAllClans = async (): Promise<Clan[]> => {
    const { data, error } = await supabase
      .from('clans')
      .select(`
        *,
        don_player:players!clans_don_player_id_fkey(id, name, avatar_url, elo_rating)
      `)
      .order('total_rating', { ascending: false });

    if (error) {
      console.error('Error loading clans:', error);
      return [];
    }

    return data as Clan[];
  };

  // Загрузить членов клана
  const loadClanMembers = async (clanId: string): Promise<ClanMember[]> => {
    const { data, error } = await supabase
      .from('clan_members')
      .select(`
        *,
        player:players(id, name, avatar_url, elo_rating, games_played, wins)
      `)
      .eq('clan_id', clanId)
      .order('hierarchy_role');

    if (error) {
      console.error('Error loading clan members:', error);
      return [];
    }

    return data as ClanMember[];
  };

  // Проверить, можно ли пригласить игрока
  const canInvitePlayer = async (playerId: string): Promise<{ canInvite: boolean; reason?: string }> => {
    // Проверяем, есть ли у игрока уже клан
    const { data: existingMembership } = await supabase
      .from('clan_members')
      .select('id')
      .eq('player_id', playerId)
      .single();

    if (existingMembership) {
      return { canInvite: false, reason: 'Игрок уже состоит в клане' };
    }

    // Проверяем, есть ли у игрока свой клан
    const { data: ownedClan } = await supabase
      .from('clans')
      .select('id')
      .eq('don_player_id', playerId)
      .single();

    if (ownedClan) {
      return { canInvite: false, reason: 'Игрок является Доном другого клана' };
    }

    // Проверяем, есть ли уже приглашение
    if (myClan) {
      const { data: existingInvite } = await supabase
        .from('clan_invitations')
        .select('id')
        .eq('clan_id', myClan.id)
        .eq('player_id', playerId)
        .eq('status', 'pending')
        .single();

      if (existingInvite) {
        return { canInvite: false, reason: 'Приглашение уже отправлено' };
      }
    }

    return { canInvite: true };
  };

  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      setLoading(true);
      await loadPlayerData();
      if (isMounted) {
        setLoading(false);
      }
    };
    init();
    
    return () => {
      isMounted = false;
    };
  }, [loadPlayerData]);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (playerData && isMounted) {
        await loadMyClan();
        if (isMounted) {
          await loadInvitations();
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [playerData, loadMyClan, loadInvitations]);

  return {
    playerData,
    myClan,
    myMembership,
    pendingInvitations,
    loading,
    isDon,
    createClan,
    updateClan,
    invitePlayer,
    acceptInvitation,
    declineInvitation,
    removeMember,
    leaveClan,
    updateMemberRole,
    loadAllClans,
    loadClanMembers,
    canInvitePlayer,
    setMyClan,
    refresh: async () => {
      await loadPlayerData();
      await loadMyClan();
      await loadInvitations();
    }
  };
}
