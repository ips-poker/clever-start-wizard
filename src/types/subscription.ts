// Stripe subscription types for clubs

export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';

export interface SubscriptionTier {
  id: SubscriptionPlan;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  priceId: string;
  productId: string;
  limits: {
    max_tournaments: number;
    max_players: number;
    max_staff: number;
    max_online_tables: number;
  };
  features: {
    voice_control: boolean;
    online_poker: boolean;
    analytics: boolean;
    api_access: boolean;
  };
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionPlan, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Бесплатный',
    description: 'Для начинающих клубов',
    price: 0,
    interval: 'month',
    priceId: '',
    productId: '',
    limits: {
      max_tournaments: 3,
      max_players: 20,
      max_staff: 2,
      max_online_tables: 0
    },
    features: {
      voice_control: false,
      online_poker: false,
      analytics: false,
      api_access: false
    }
  },
  basic: {
    id: 'basic',
    name: 'Базовый',
    description: 'До 10 турниров, 50 игроков, 5 сотрудников',
    price: 2500,
    interval: 'month',
    priceId: 'price_1SwSWAQcOGwBnQZtyIMLZIss',
    productId: 'prod_TuH4sVzVZW1mSl',
    limits: {
      max_tournaments: 10,
      max_players: 50,
      max_staff: 5,
      max_online_tables: 1
    },
    features: {
      voice_control: true,
      online_poker: false,
      analytics: true,
      api_access: false
    }
  },
  pro: {
    id: 'pro',
    name: 'Профессиональный',
    description: 'До 30 турниров, 200 игроков, 10 сотрудников',
    price: 5000,
    interval: 'month',
    priceId: 'price_1SwSXjQcOGwBnQZt1tePlJgS',
    productId: 'prod_TuH5mJS4890hdp',
    limits: {
      max_tournaments: 30,
      max_players: 200,
      max_staff: 10,
      max_online_tables: 5
    },
    features: {
      voice_control: true,
      online_poker: true,
      analytics: true,
      api_access: true
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Корпоративный',
    description: 'До 1000 турниров, 2500 игроков, полный функционал',
    price: 60000,
    interval: 'year',
    priceId: 'price_1SwSZVQcOGwBnQZtJhchA1yQ',
    productId: 'prod_TuH7t0hpODtNi5',
    limits: {
      max_tournaments: 1000,
      max_players: 2500,
      max_staff: 50,
      max_online_tables: 20
    },
    features: {
      voice_control: true,
      online_poker: true,
      analytics: true,
      api_access: true
    }
  }
};

export const formatPrice = (tier: SubscriptionTier): string => {
  if (tier.price === 0) return 'Бесплатно';
  const formatted = new Intl.NumberFormat('ru-RU').format(tier.price);
  return `${formatted} ₽/${tier.interval === 'month' ? 'мес' : 'год'}`;
};
