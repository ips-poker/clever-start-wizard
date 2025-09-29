// Типы турниров с обновленной терминологией согласно договору оферты

export interface ModernTournament {
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
  tournament_format: 'freezeout' | 'reentry' | 'additional';
}

export interface ModernRegistration {
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