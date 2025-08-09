import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RatingSystemConfig {
  // Базовые настройки
  base_points: number;
  min_rating: number;
  max_rating: number;
  
  // Бонусные очки
  rebuy_multiplier: number;
  addon_multiplier: number;
  
  // Призовые очки
  prize_coefficient: number; // % от призовой суммы
  min_prize_points: number;
  
  // Позиционные бонусы
  enable_position_bonus: boolean;
  first_place_bonus: number;
  top_3_bonus: number;
  
  // Участие
  participation_bonus: number;
  elimination_penalty: boolean;
  bubble_bonus: number; // бонус за "пузырь"
  
  // Турнирные модификаторы
  field_size_modifier: boolean;
  buy_in_modifier: boolean;
  
  // Прогрессия
  progressive_scaling: boolean;
  high_rating_dampening: number;
  
  // Система
  auto_apply: boolean;
  require_confirmation: boolean;
}

const DEFAULT_CONFIG: RatingSystemConfig = {
  base_points: 1,
  min_rating: 100,
  max_rating: 5000,
  rebuy_multiplier: 1.0,
  addon_multiplier: 1.0,
  prize_coefficient: 0.001,
  min_prize_points: 1,
  enable_position_bonus: true,
  first_place_bonus: 2,
  top_3_bonus: 1,
  participation_bonus: 0,
  elimination_penalty: false,
  bubble_bonus: 1,
  field_size_modifier: false,
  buy_in_modifier: false,
  progressive_scaling: false,
  high_rating_dampening: 0.8,
  auto_apply: true,
  require_confirmation: false
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