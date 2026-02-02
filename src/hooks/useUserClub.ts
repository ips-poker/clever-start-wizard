import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Club, ClubSubscription, ClubSubscriptionFeatures, ClubRole, SubscriptionPlan } from "@/types/club";

interface UserClubData {
  club: Club | null;
  subscription: ClubSubscription | null;
  role: ClubRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isDirector: boolean;
  canManageTournaments: boolean;
  canManageStaff: boolean;
  loading: boolean;
  error: Error | null;
}

export function useUserClub(): UserClubData {
  const { data, isLoading, error } = useQuery({
    queryKey: ["user-club"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Получаем clan_id пользователя через RPC
      const { data: clanId, error: clanError } = await supabase
        .rpc('get_user_clan_id', { p_user_id: user.id });

      if (clanError) {
        console.error("Error getting user clan:", clanError);
        return null;
      }

      if (!clanId) return null;

      // Получаем данные клуба
      const { data: club, error: clubError } = await supabase
        .from('clans')
        .select('*')
        .eq('id', clanId)
        .single();

      if (clubError) {
        console.error("Error getting club:", clubError);
        return null;
      }

      // Получаем подписку
      const { data: subscriptionData } = await supabase
        .from('club_subscriptions')
        .select('*')
        .eq('clan_id', clanId)
        .single();

      // Преобразуем подписку к правильному типу
      const subscription: ClubSubscription | null = subscriptionData ? {
        ...subscriptionData,
        features: subscriptionData.features as unknown as ClubSubscriptionFeatures,
        plan: subscriptionData.plan as SubscriptionPlan
      } : null;

      // Получаем роль пользователя
      const { data: roleData } = await supabase
        .rpc('get_club_role', { p_user_id: user.id, p_clan_id: clanId });

      return {
        club,
        subscription,
        role: roleData as ClubRole | null
      };
    },
    staleTime: 1000 * 60 * 5, // 5 минут
  });

  const role = data?.role || null;
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;
  const isDirector = role === 'director' || isAdmin;

  return {
    club: data?.club || null,
    subscription: data?.subscription as ClubSubscription | null,
    role,
    isOwner,
    isAdmin,
    isDirector,
    canManageTournaments: isDirector,
    canManageStaff: isAdmin,
    loading: isLoading,
    error: error as Error | null
  };
}
