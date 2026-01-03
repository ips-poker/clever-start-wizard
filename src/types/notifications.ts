// Tournament notification types

export type NotificationType = 
  | 'tournament_starting'
  | 'tournament_started'
  | 'level_change'
  | 'break_start'
  | 'break_end'
  | 'hand_for_hand'
  | 'bubble_burst'
  | 'final_table'
  | 'player_eliminated'
  | 'you_eliminated'
  | 'prize_won'
  | 'ticket_issued'
  | 'registration_open'
  | 'registration_closing'
  | 'rebuy_available'
  | 'addon_available'
  | 'deal_proposed'
  | 'deal_accepted'
  | 'tournament_completed'
  | 'balance_update'
  | 'system';

export interface TournamentNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  tournamentId?: string;
  tournamentName?: string;
  playerId?: string;
  data?: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  sound?: boolean;
  vibrate?: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  vibrate: boolean;
  showInApp: boolean;
  pushEnabled: boolean;
  categories: {
    tournaments: boolean;
    levels: boolean;
    eliminations: boolean;
    prizes: boolean;
    system: boolean;
  };
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sound: true,
  vibrate: true,
  showInApp: true,
  pushEnabled: false,
  categories: {
    tournaments: true,
    levels: true,
    eliminations: true,
    prizes: true,
    system: true,
  },
};

// Notification sounds
export const NOTIFICATION_SOUNDS = {
  default: '/sounds/notification.mp3',
  tournament: '/sounds/tournament.mp3',
  prize: '/sounds/prize.mp3',
  alert: '/sounds/alert.mp3',
  level: '/sounds/level.mp3',
} as const;

// Priority to color mapping
export const PRIORITY_COLORS = {
  low: 'text-muted-foreground',
  medium: 'text-foreground',
  high: 'text-amber-500',
  critical: 'text-destructive',
} as const;

// Type to icon mapping
export const NOTIFICATION_ICONS = {
  tournament_starting: 'Clock',
  tournament_started: 'Play',
  level_change: 'TrendingUp',
  break_start: 'Coffee',
  break_end: 'PlayCircle',
  hand_for_hand: 'Hand',
  bubble_burst: 'Sparkles',
  final_table: 'Crown',
  player_eliminated: 'UserMinus',
  you_eliminated: 'Skull',
  prize_won: 'Trophy',
  ticket_issued: 'Ticket',
  registration_open: 'UserPlus',
  registration_closing: 'AlertCircle',
  rebuy_available: 'RefreshCw',
  addon_available: 'Plus',
  deal_proposed: 'Handshake',
  deal_accepted: 'CheckCircle',
  tournament_completed: 'Flag',
  balance_update: 'Wallet',
  system: 'Bell',
} as const;
