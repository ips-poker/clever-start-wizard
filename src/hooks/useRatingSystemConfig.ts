import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RatingSystemConfig {
  // Профиль настроек
  profile_name: string;
  profile_description?: string;
  tournament_types?: string[]; // массив типов турниров для которых подходит профиль
  
  // Базовые настройки
  base_points: number;
  min_rating: number;
  max_rating: number;
  
  // Система очков на основе пула
  pool_based_system: boolean;  // Использовать систему распределения пула
  pool_coefficient: number;    // Коэффициент конвертации денег в очки (1000₽ = 100 очков при 0.1)
  
  // Бонусные очки
  rebuy_multiplier: number;
  addon_multiplier: number;
  double_rebuy_multiplier: number; // для двойных ребаев
  late_entry_penalty: number; // штраф за позднюю регистрацию
  
  // Призовые очки
  prize_coefficient: number; // % от призовой суммы
  min_prize_points: number;
  max_prize_points: number;
  prize_distribution_weight: number; // вес распределения призов
  
  // Позиционные бонусы
  enable_position_bonus: boolean;
  first_place_bonus: number;
  second_place_bonus: number;
  third_place_bonus: number;
  top_3_bonus: number;
  top_10_percent_bonus: number;
  top_25_percent_bonus: number;
  itm_bonus: number; // бонус за попадание в призы
  
  // Участие и время
  participation_bonus: number;
  elimination_penalty: boolean;
  bubble_bonus: number; // бонус за "пузырь"
  heads_up_bonus: number; // бонус за игру один на один
  duration_multiplier: boolean; // учет длительности турнира
  late_finish_bonus: number; // бонус за поздний финиш
  
  // Турнирные модификаторы
  field_size_modifier: boolean;
  field_size_breakpoints: number[]; // точки изменения модификатора
  buy_in_modifier: boolean;
  buy_in_tiers: { min: number; max: number; multiplier: number }[];
  
  // Специальные модификаторы
  knockout_bonus: number; // бонус за нокауты (если применимо)
  guarantee_modifier: boolean; // модификатор для гарантированных турниров
  satellite_modifier: boolean; // модификатор для сателлитов
  freeroll_modifier: number; // модификатор для фриролов
  turbo_modifier: number; // модификатор для турбо турниров
  deepstack_modifier: number; // модификатор для дипстек турниров
  
  // Прогрессия и рейтинг
  progressive_scaling: boolean;
  high_rating_dampening: number;
  skill_gap_adjustment: boolean; // учет разрыва в скилле
  rating_confidence_factor: number; // фактор уверенности в рейтинге
  volatility_control: number; // контроль волатильности изменений
  
  // Временные модификаторы
  time_of_day_modifier: boolean;
  day_of_week_modifier: boolean;
  holiday_modifier: number;
  
  // Система и валидация
  auto_apply: boolean;
  require_confirmation: boolean;
  min_players_for_rating: number;
  rating_decay: boolean; // затухание рейтинга при неактивности
  decay_rate: number;
  
  // Весовые коэффициенты для разных факторов
  weights: {
    position_weight: number;
    prize_weight: number;
    field_size_weight: number;
    buy_in_weight: number;
    duration_weight: number;
    performance_weight: number;
  };
}

export interface RatingProfile {
  id: string;
  name: string;
  description: string;
  config: RatingSystemConfig;
  tournament_types: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
  usage_count: number;
  avg_rating_change: number;
}

export const DEFAULT_CONFIG: RatingSystemConfig = {
  // Профиль настроек
  profile_name: "Профессиональный",
  profile_description: "Продвинутая конфигурация для профессиональных покерных турниров",
  tournament_types: ["standard", "freezeout", "deepstack", "turbo"],
  
  // Базовые настройки (улучшенные для профессионального использования)
  base_points: 2,
  min_rating: 100,
  max_rating: 5000,
  
  // Бонусные очки (отключены)
  rebuy_multiplier: 0,
  addon_multiplier: 0,
  double_rebuy_multiplier: 1.8,
  late_entry_penalty: 0.3,
  
  // Система очков на основе пула (pool-based system)
  pool_based_system: true, // НОВАЯ СИСТЕМА: общий пул очков распределяется между призерами  
  pool_coefficient: 0.1,   // 1000₽ = 100 очков в пул (коэффициент 0.1)
  
  // Призовые очки (для совместимости)
  prize_coefficient: 0.1,
  min_prize_points: 2,
  max_prize_points: 150,
  prize_distribution_weight: 1.2,
  
  // Позиционные бонусы (включены для профессионального использования)
  enable_position_bonus: true,
  first_place_bonus: 8,
  second_place_bonus: 5,
  third_place_bonus: 3,
  top_3_bonus: 2,
  top_10_percent_bonus: 1,
  top_25_percent_bonus: 0.5,
  itm_bonus: 2,
  
  // Участие и время
  participation_bonus: 0,
  elimination_penalty: false,
  bubble_bonus: 2,
  heads_up_bonus: 3,
  duration_multiplier: true,
  late_finish_bonus: 1.5,
  
  // Турнирные модификаторы (активированы)
  field_size_modifier: true,
  field_size_breakpoints: [25, 50, 100, 200, 500],
  buy_in_modifier: true,
  buy_in_tiers: [
    { min: 0, max: 500, multiplier: 0.8 },
    { min: 501, max: 1500, multiplier: 1.0 },
    { min: 1501, max: 5000, multiplier: 1.3 },
    { min: 5001, max: 15000, multiplier: 1.5 },
    { min: 15001, max: 999999, multiplier: 1.8 }
  ],
  
  // Специальные модификаторы
  knockout_bonus: 1.0,
  guarantee_modifier: true,
  satellite_modifier: true,
  freeroll_modifier: 0.6,
  turbo_modifier: 0.85,
  deepstack_modifier: 1.2,
  
  // Прогрессия и рейтинг (продвинутые настройки)
  progressive_scaling: true,
  high_rating_dampening: 0.75,
  skill_gap_adjustment: true,
  rating_confidence_factor: 1.1,
  volatility_control: 0.15,
  
  // Временные модификаторы
  time_of_day_modifier: false,
  day_of_week_modifier: false,
  holiday_modifier: 1.1,
  
  // Система и валидация
  auto_apply: false,
  require_confirmation: true,
  min_players_for_rating: 6,
  rating_decay: true,
  decay_rate: 0.005,
  
  // Весовые коэффициенты (сбалансированные)
  weights: {
    position_weight: 1.2,
    prize_weight: 1.0,
    field_size_weight: 0.8,
    buy_in_weight: 0.6,
    duration_weight: 0.4,
    performance_weight: 1.3
  }
};

export function useRatingSystemConfig() {
  const [config, setConfig] = useState<RatingSystemConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Пробуем загрузить из базы данных
      const { data: dbConfig } = await supabase
        .from('cms_settings')
        .select('setting_value')
        .eq('setting_key', 'rating_system_config')
        .eq('category', 'rating_system')
        .single();

      if (dbConfig?.setting_value) {
        const parsedConfig = JSON.parse(dbConfig.setting_value);
        setConfig({ ...DEFAULT_CONFIG, ...parsedConfig });
      } else {
        // Fallback к локальному хранилищу
        const savedConfig = localStorage.getItem('ratingSystemConfig');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig({ ...DEFAULT_CONFIG, ...parsedConfig });
        }
      }
    } catch (error) {
      console.error('Error loading rating system config:', error);
      
      // Fallback к локальному хранилищу
      try {
        const savedConfig = localStorage.getItem('ratingSystemConfig');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig({ ...DEFAULT_CONFIG, ...parsedConfig });
        }
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (newConfig: RatingSystemConfig) => {
    try {
      // Сохраняем в базу данных
      const { error } = await supabase
        .from('cms_settings')
        .upsert({
          setting_key: 'rating_system_config',
          setting_value: JSON.stringify(newConfig),
          setting_type: 'json',
          category: 'rating_system',
          description: 'Настройки рейтинговой системы RPS'
        });

      if (error) throw error;

      // Дублируем в локальное хранилище
      localStorage.setItem('ratingSystemConfig', JSON.stringify(newConfig));
      
      setConfig(newConfig);
      return { success: true };
    } catch (error) {
      console.error('Error saving rating system config:', error);
      
      // Fallback к локальному хранилищу
      try {
        localStorage.setItem('ratingSystemConfig', JSON.stringify(newConfig));
        setConfig(newConfig);
        return { success: true, fallback: true };
      } catch (localError) {
        return { success: false, error: localError };
      }
    }
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('ratingSystemConfig');
  };

  // Функция для расчета изменения рейтинга с учетом настроек
  const calculateRatingChange = (params: {
    position: number;
    totalPlayers: number;
    currentRating: number;
    rebuys: number;
    addons: number;
    prizeAmount: number;
    totalPrizePool: number;
    buyIn: number;
    payoutStructure: number[];
  }) => {
    let totalChange = config.base_points;

    // Очки за участие
    totalChange += config.participation_bonus;

    // Ребаи и адоны
    const rebuyAddonPoints = (params.rebuys * config.rebuy_multiplier) + (params.addons * config.addon_multiplier);
    totalChange += rebuyAddonPoints;

    // Призовые очки
    let prizePoints = 0;
    if (params.position <= params.payoutStructure.length && params.prizeAmount > 0) {
      prizePoints = Math.max(config.min_prize_points, Math.floor(params.prizeAmount * config.prize_coefficient));
      totalChange += prizePoints;
    }

    // Позиционные бонусы
    let positionBonus = 0;
    if (config.enable_position_bonus) {
      if (params.position === 1) {
        positionBonus = config.first_place_bonus;
      } else if (params.position <= 3) {
        positionBonus = config.top_3_bonus;
      }
      totalChange += positionBonus;
    }

    // Бонус за "пузырь"
    if (params.position === params.payoutStructure.length + 1) {
      totalChange += config.bubble_bonus;
    }

    // Модификаторы размера поля
    if (config.field_size_modifier) {
      const sizeMultiplier = Math.log10(params.totalPlayers) / 2;
      totalChange = Math.floor(totalChange * sizeMultiplier);
    }

    // Модификаторы бай-ина
    if (config.buy_in_modifier) {
      const buyInMultiplier = Math.log10(params.buyIn || 1000) / 3;
      totalChange = Math.floor(totalChange * buyInMultiplier);
    }

    // Прогрессивное масштабирование
    if (config.progressive_scaling && params.currentRating > 1000) {
      totalChange = Math.floor(totalChange * config.high_rating_dampening);
    }

    // Ограничения
    const newRating = Math.max(config.min_rating, Math.min(config.max_rating, params.currentRating + totalChange));
    const finalChange = newRating - params.currentRating;

    return {
      basePoints: config.base_points + config.participation_bonus,
      rebuyAddonPoints,
      prizePoints,
      positionBonus,
      bubbleBonus: params.position === params.payoutStructure.length + 1 ? config.bubble_bonus : 0,
      totalChange: finalChange,
      newRating,
      breakdown: {
        base: config.base_points,
        participation: config.participation_bonus,
        rebuys: params.rebuys * config.rebuy_multiplier,
        addons: params.addons * config.addon_multiplier,
        prize: prizePoints,
        position: positionBonus
      }
    };
  };

  return {
    config,
    isLoading,
    saveConfig,
    resetToDefaults,
    calculateRatingChange,
    reloadConfig: loadConfig
  };
}