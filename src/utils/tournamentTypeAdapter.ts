// Адаптер для совместимости старых и новых типов турниров

export interface LegacyTournament {
  id: string;
  name: string;
  buy_in: number;
  rebuy_cost: number;
  addon_cost: number;
  rebuy_chips: number;
  addon_chips: number;
  rebuy_end_level?: number;
  addon_level?: number;
  starting_chips: number;
  max_players: number;
  current_level: number;
  status: string;
  [key: string]: any;
}

export interface ModernTournament {
  id: string;
  name: string;
  description?: string;
  participation_fee: number;
  reentry_fee: number;
  additional_fee: number;
  reentry_chips: number;
  additional_chips: number;
  reentry_end_level?: number;
  additional_level?: number;
  starting_chips: number;
  max_players: number;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number;
  timer_remaining: number;
  break_start_level?: number;
  status: string;
  start_time: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  is_archived: boolean;
  voice_control_enabled: boolean;
  last_voice_command?: string;
  voice_session_id?: string;
  tournament_format: string;
  [key: string]: any;
}

export interface LegacyRegistration {
  id: string;
  player: any;
  chips: number;
  rebuys: number;
  addons: number;
  status: string;
  position?: number;
  seat_number?: number;
  eliminated_at?: string;
  final_position?: number;
}

export interface ModernRegistration {
  id: string;
  player: any;
  chips: number;
  reentries: number;
  additional_sets: number;
  status: string;
  position?: number;
  seat_number?: number;
  eliminated_at?: string;
  final_position?: number;
}

/**
 * Конвертирует старые данные турнира в новый формат
 */
export function adaptTournamentToModern(legacy: LegacyTournament): ModernTournament {
  return {
    id: legacy.id,
    name: legacy.name,
    description: legacy.description || '',
    participation_fee: legacy.buy_in || 0,
    reentry_fee: legacy.rebuy_cost || 0,
    additional_fee: legacy.addon_cost || 0,
    starting_chips: legacy.starting_chips,
    reentry_chips: legacy.rebuy_chips || legacy.starting_chips,
    additional_chips: legacy.addon_chips || legacy.starting_chips,
    max_players: legacy.max_players,
    current_level: legacy.current_level || 1,
    current_small_blind: legacy.current_small_blind || 100,
    current_big_blind: legacy.current_big_blind || 200,
    timer_duration: legacy.timer_duration || 1200,
    timer_remaining: legacy.timer_remaining || 1200,
    reentry_end_level: legacy.rebuy_end_level,
    additional_level: legacy.addon_level,
    break_start_level: legacy.break_start_level,
    status: legacy.status as any,
    start_time: legacy.start_time,
    finished_at: legacy.finished_at,
    created_at: legacy.created_at,
    updated_at: legacy.updated_at,
    is_published: legacy.is_published || false,
    is_archived: legacy.is_archived || false,
    voice_control_enabled: legacy.voice_control_enabled || false,
    last_voice_command: legacy.last_voice_command,
    voice_session_id: legacy.voice_session_id,
    tournament_format: legacy.tournament_format as any
  };
}

/**
 * Конвертирует старые данные регистрации в новый формат
 */
export function adaptRegistrationToModern(legacy: LegacyRegistration): ModernRegistration {
  return {
    ...legacy,
    reentries: legacy.rebuys || 0,
    additional_sets: legacy.addons || 0,
  };
}

/**
 * Конвертирует массив регистраций
 */
export function adaptRegistrationsToModern(legacyRegistrations: LegacyRegistration[]): ModernRegistration[] {
  return legacyRegistrations.map(adaptRegistrationToModern);
}