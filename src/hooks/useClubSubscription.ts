import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClubSubscription, ClubSubscriptionFeatures, SUBSCRIPTION_LIMITS, SubscriptionPlan } from "@/types/club";

interface UseClubSubscriptionOptions {
  clanId?: string;
}

interface SubscriptionUsage {
  tournaments: number;
  players: number;
  staff: number;
  onlineTables: number;
}

interface SubscriptionLimits {
  canCreateTournament: boolean;
  canAddPlayer: boolean;
  canAddStaff: boolean;
  canCreateOnlineTable: boolean;
  tournamentsRemaining: number;
  playersRemaining: number;
  staffRemaining: number;
  onlineTablesRemaining: number;
}

export function useClubSubscription({ clanId }: UseClubSubscriptionOptions = {}) {
  const { data: subscription, isLoading: loadingSubscription } = useQuery({
    queryKey: ["club-subscription", clanId],
    queryFn: async (): Promise<ClubSubscription | null> => {
      if (!clanId) return null;

      const { data, error } = await supabase
        .from('club_subscriptions')
        .select('*')
        .eq('clan_id', clanId)
        .single();

      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }

      return {
        ...data,
        features: data.features as unknown as ClubSubscriptionFeatures,
        plan: data.plan as SubscriptionPlan
      } as ClubSubscription;
    },
    enabled: !!clanId,
  });

  const { data: usage, isLoading: loadingUsage } = useQuery({
    queryKey: ["club-usage", clanId],
    queryFn: async () => {
      if (!clanId) return null;

      // Подсчёт турниров клуба
      const { count: tournamentsCount } = await supabase
        .from('tournaments')
        .select('*', { count: 'exact', head: true })
        .eq('clan_id', clanId)
        .neq('status', 'completed');

      // Подсчёт членов клуба
      const { count: playersCount } = await supabase
        .from('clan_members')
        .select('*', { count: 'exact', head: true })
        .eq('clan_id', clanId);

      // Подсчёт персонала
      const { count: staffCount } = await supabase
        .from('club_staff')
        .select('*', { count: 'exact', head: true })
        .eq('clan_id', clanId)
        .eq('is_active', true);

      // Подсчёт онлайн столов (пока 0)
      const onlineTablesCount = 0;

      return {
        tournaments: tournamentsCount || 0,
        players: playersCount || 0,
        staff: staffCount || 0,
        onlineTables: onlineTablesCount
      } as SubscriptionUsage;
    },
    enabled: !!clanId,
  });

  // Расчёт лимитов
  const limits: SubscriptionLimits = {
    canCreateTournament: (usage?.tournaments || 0) < (subscription?.max_tournaments || 0),
    canAddPlayer: (usage?.players || 0) < (subscription?.max_players || 0),
    canAddStaff: (usage?.staff || 0) < (subscription?.max_staff || 0),
    canCreateOnlineTable: (usage?.onlineTables || 0) < (subscription?.max_online_tables || 0),
    tournamentsRemaining: (subscription?.max_tournaments || 0) - (usage?.tournaments || 0),
    playersRemaining: (subscription?.max_players || 0) - (usage?.players || 0),
    staffRemaining: (subscription?.max_staff || 0) - (usage?.staff || 0),
    onlineTablesRemaining: (subscription?.max_online_tables || 0) - (usage?.onlineTables || 0)
  };

  // Проверка фичей
  const hasFeature = (feature: keyof typeof SUBSCRIPTION_LIMITS['free']['features']): boolean => {
    if (!subscription) return false;
    return subscription.features[feature] || false;
  };

  // Проверка активности подписки
  const isActive = subscription?.payment_status === 'active' && 
    (!subscription.expires_at || new Date(subscription.expires_at) > new Date());

  return {
    subscription,
    usage,
    limits,
    hasFeature,
    isActive,
    loading: loadingSubscription || loadingUsage,
    plan: subscription?.plan as SubscriptionPlan || 'free'
  };
}
