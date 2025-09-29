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
  status: string;
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
    ...legacy,
    participation_fee: legacy.buy_in || 0,
    reentry_fee: legacy.rebuy_cost || 0,
    additional_fee: legacy.addon_cost || 0,
    reentry_chips: legacy.rebuy_chips || 0,
    additional_chips: legacy.addon_chips || 0,
    reentry_end_level: legacy.rebuy_end_level,
    additional_level: legacy.addon_level,
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