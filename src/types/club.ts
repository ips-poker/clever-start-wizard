// Типы для multi-tenant системы клубов

export type ClubRole = 'owner' | 'admin' | 'director' | 'member';

export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';

export interface ClubPermissions {
  manage_tournaments: boolean;
  manage_players: boolean;
  manage_staff: boolean;
  view_analytics: boolean;
}

export interface ClubSubscriptionFeatures {
  voice_control: boolean;
  online_poker: boolean;
  analytics: boolean;
  api_access: boolean;
}

export interface ClubSubscription {
  id: string;
  clan_id: string;
  plan: SubscriptionPlan;
  max_tournaments: number;
  max_players: number;
  max_online_tables: number;
  max_staff: number;
  features: ClubSubscriptionFeatures;
  price_monthly: number;
  starts_at: string;
  expires_at: string | null;
  payment_status: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClubStaff {
  id: string;
  clan_id: string;
  player_id: string;
  role: ClubRole;
  permissions: ClubPermissions;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  player?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export interface Club {
  id: string;
  name: string;
  description: string | null;
  don_player_id: string;
  emblem_id: number;
  seal_id: number;
  total_rating: number | null;
  created_at: string;
  updated_at: string;
  // Computed
  subscription?: ClubSubscription;
  staff_count?: number;
  member_count?: number;
}

// Лимиты по тарифам
export const SUBSCRIPTION_LIMITS: Record<SubscriptionPlan, {
  max_tournaments: number;
  max_players: number;
  max_online_tables: number;
  max_staff: number;
  price_monthly: number;
  features: ClubSubscriptionFeatures;
}> = {
  free: {
    max_tournaments: 3,
    max_players: 20,
    max_online_tables: 0,
    max_staff: 2,
    price_monthly: 0,
    features: {
      voice_control: false,
      online_poker: false,
      analytics: false,
      api_access: false
    }
  },
  basic: {
    max_tournaments: 20,
    max_players: 100,
    max_online_tables: 1,
    max_staff: 5,
    price_monthly: 2990,
    features: {
      voice_control: true,
      online_poker: false,
      analytics: true,
      api_access: false
    }
  },
  pro: {
    max_tournaments: 100,
    max_players: 500,
    max_online_tables: 5,
    max_staff: 15,
    price_monthly: 7990,
    features: {
      voice_control: true,
      online_poker: true,
      analytics: true,
      api_access: true
    }
  },
  enterprise: {
    max_tournaments: 999999,
    max_players: 999999,
    max_online_tables: 999999,
    max_staff: 999999,
    price_monthly: 14990,
    features: {
      voice_control: true,
      online_poker: true,
      analytics: true,
      api_access: true
    }
  }
};

// Названия ролей на русском
export const ROLE_NAMES: Record<ClubRole, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  director: 'Директор',
  member: 'Участник'
};

// Названия тарифов на русском
export const PLAN_NAMES: Record<SubscriptionPlan, string> = {
  free: 'Бесплатный',
  basic: 'Базовый',
  pro: 'Профессиональный',
  enterprise: 'Корпоративный'
};
