// Типы турниров с обновленной терминологией согласно договору оферты

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  
  // Организационные взносы (согласно договору оферты)
  participation_fee: number; // Организационный взнос за стандартный набор инвентаря
  reentry_fee: number; // Стоимость дополнительной аренды набора инвентаря
  additional_fee: number; // Стоимость дополнительного набора инвентаря
  
  // Количество инвентаря (фишек)
  starting_chips: number;
  reentry_chips: number;
  additional_chips: number;
  
  // Настройки турнира
  max_players: number;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number;
  timer_remaining: number;
  
  // Условия аренды дополнительного инвентаря
  reentry_end_level?: number; // До какого уровня доступна дополнительная аренда
  additional_level?: number; // На каком уровне доступен дополнительный набор
  break_start_level?: number;
  
  // Статус и даты
  status: 'scheduled' | 'registration' | 'running' | 'paused' | 'completed';
  start_time: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
  
  // Публикация
  is_published: boolean;
  is_archived: boolean;
  
  // Голосовое управление
  voice_control_enabled: boolean;
  last_voice_command?: string;
  voice_session_id?: string;
  
  // Формат мероприятия
  tournament_format: 'freezeout' | 'rebuy' | 'knockout';
}

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  player_id: string;
  
  // Статус участника
  status: 'registered' | 'playing' | 'eliminated';
  seat_number?: number;
  position?: number;
  final_position?: number;
  
  // Инвентарь
  chips: number;
  reentries: number; // Количество повторных входов
  additional_sets: number; // Количество дополнительных наборов
  
  // Время
  created_at: string;
  eliminated_at?: string;
}

export interface BlindLevel {
  id: string;
  tournament_id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

export interface TournamentPayout {
  id: string;
  tournament_id: string;
  place: number;
  percentage: number;
  rps_points: number; // RPS баллы вместо денежной суммы
}

// Статистика турнира в RPS баллах
export interface TournamentStats {
  total_participants: number;
  total_reentries: number;
  total_additional_sets: number;
  total_rps_points: number; // Общий фонд RPS баллов
  average_chips_per_player: number;
}