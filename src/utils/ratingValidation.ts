import { RatingSystemConfig } from '@/hooks/useRatingSystemConfig';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfigValidationRules {
  minRating: { min: number; max: number };
  maxRating: { min: number; max: number };
  basePoints: { min: number; max: number };
  prizeCoefficient: { min: number; max: number };
  multipliers: { min: number; max: number };
  bonuses: { min: number; max: number };
  weights: { min: number; max: number };
}

export const DEFAULT_VALIDATION_RULES: ConfigValidationRules = {
  minRating: { min: 50, max: 500 },
  maxRating: { min: 2000, max: 10000 },
  basePoints: { min: 0, max: 50 },
  prizeCoefficient: { min: 0.0001, max: 0.1 },
  multipliers: { min: 0, max: 10 },
  bonuses: { min: 0, max: 100 },
  weights: { min: 0, max: 5 }
};

export function validateRatingConfig(config: RatingSystemConfig, rules: ConfigValidationRules = DEFAULT_VALIDATION_RULES): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Базовые проверки
  if (config.min_rating >= config.max_rating) {
    errors.push('Минимальный рейтинг должен быть меньше максимального');
  }

  if (config.min_rating < rules.minRating.min || config.min_rating > rules.minRating.max) {
    errors.push(`Минимальный рейтинг должен быть между ${rules.minRating.min} и ${rules.minRating.max}`);
  }

  if (config.max_rating < rules.maxRating.min || config.max_rating > rules.maxRating.max) {
    errors.push(`Максимальный рейтинг должен быть между ${rules.maxRating.min} и ${rules.maxRating.max}`);
  }

  if (config.base_points < rules.basePoints.min || config.base_points > rules.basePoints.max) {
    errors.push(`Базовые очки должны быть между ${rules.basePoints.min} и ${rules.basePoints.max}`);
  }

  // Проверки коэффициентов
  if (config.prize_coefficient < rules.prizeCoefficient.min || config.prize_coefficient > rules.prizeCoefficient.max) {
    errors.push(`Коэффициент призовых должен быть между ${rules.prizeCoefficient.min} и ${rules.prizeCoefficient.max}`);
  }

  if (config.rebuy_multiplier < rules.multipliers.min || config.rebuy_multiplier > rules.multipliers.max) {
    errors.push(`Множитель ребаев должен быть между ${rules.multipliers.min} и ${rules.multipliers.max}`);
  }

  if (config.addon_multiplier < rules.multipliers.min || config.addon_multiplier > rules.multipliers.max) {
    errors.push(`Множитель аддонов должен быть между ${rules.multipliers.min} и ${rules.multipliers.max}`);
  }

  // Проверки бонусов
  if (config.first_place_bonus < rules.bonuses.min || config.first_place_bonus > rules.bonuses.max) {
    errors.push(`Бонус за 1 место должен быть между ${rules.bonuses.min} и ${rules.bonuses.max}`);
  }

  // Проверки весов
  if (config.weights) {
    Object.entries(config.weights).forEach(([key, value]) => {
      if (value < rules.weights.min || value > rules.weights.max) {
        errors.push(`Вес ${key} должен быть между ${rules.weights.min} и ${rules.weights.max}`);
      }
    });

    // Проверка суммы весов
    const totalWeight = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) {
      errors.push('Сумма всех весов не может быть равна нулю');
    }
  }

  // Предупреждения
  if (config.prize_coefficient > 0.01) {
    warnings.push('Высокий коэффициент призовых может привести к дисбалансу рейтингов');
  }

  if (config.base_points === 0 && config.participation_bonus === 0) {
    warnings.push('Отсутствие базовых очков может демотивировать участие в турнирах');
  }

  if (config.first_place_bonus > config.base_points * 10) {
    warnings.push('Слишком большой бонус за первое место может создать чрезмерную волатильность');
  }

  // Проверка логических противоречий
  if (config.high_rating_dampening > 1) {
    errors.push('Коэффициент затухания высокого рейтинга не может быть больше 1');
  }

  if (config.volatility_control < 0 || config.volatility_control > 1) {
    errors.push('Контроль волатильности должен быть между 0 и 1');
  }

  // Проверка модификаторов турниров
  if (config.freeroll_modifier < 0 || config.freeroll_modifier > 2) {
    warnings.push('Модификатор фрироллов рекомендуется держать между 0 и 2');
  }

  if (config.turbo_modifier < 0.5 || config.turbo_modifier > 1.5) {
    warnings.push('Модификатор турбо турниров рекомендуется держать между 0.5 и 1.5');
  }

  // Проверка структуры бай-инов
  if (config.buy_in_tiers && config.buy_in_tiers.length > 0) {
    const sortedTiers = [...config.buy_in_tiers].sort((a, b) => a.min - b.min);
    
    for (let i = 0; i < sortedTiers.length - 1; i++) {
      if (sortedTiers[i].max >= sortedTiers[i + 1].min) {
        errors.push('Диапазоны бай-инов не должны пересекаться');
        break;
      }
    }
    
    if (sortedTiers[0].min !== 0) {
      warnings.push('Первый диапазон бай-инов должен начинаться с 0');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateProfileIntegrity(config: RatingSystemConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Проверка целостности профиля
  if (!config.profile_name || config.profile_name.trim().length === 0) {
    errors.push('Название профиля не может быть пустым');
  }

  if (!config.tournament_types || config.tournament_types.length === 0) {
    warnings.push('Рекомендуется указать типы турниров для профиля');
  }

  // Проверка несовместимых настроек
  if (config.elimination_penalty && config.participation_bonus > config.base_points) {
    warnings.push('Штраф за выбывание может конфликтовать с высоким бонусом за участие');
  }

  if (config.progressive_scaling && config.high_rating_dampening < 0.5) {
    warnings.push('Низкое затухание при прогрессивном масштабировании может создать экспоненциальный рост рейтингов');
  }

  // Проверка временных модификаторов
  if (config.time_of_day_modifier && config.day_of_week_modifier) {
    warnings.push('Использование нескольких временных модификаторов может усложнить понимание системы');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function getConfigurationHealthScore(config: RatingSystemConfig): number {
  const validation = validateRatingConfig(config);
  const integrity = validateProfileIntegrity(config);
  
  let score = 100;
  
  // Вычитаем очки за ошибки и предупреждения
  score -= validation.errors.length * 20;
  score -= validation.warnings.length * 5;
  score -= integrity.errors.length * 15;
  score -= integrity.warnings.length * 3;
  
  // Бонусы за хорошие практики
  if (config.weights && Object.values(config.weights).every(w => w > 0)) {
    score += 5; // Все веса установлены
  }
  
  if (config.buy_in_tiers && config.buy_in_tiers.length >= 3) {
    score += 5; // Хорошая структура бай-инов
  }
  
  if (config.enable_position_bonus && config.first_place_bonus > 0) {
    score += 5; // Включены позиционные бонусы
  }
  
  return Math.max(0, Math.min(100, score));
}

export function suggestConfigImprovements(config: RatingSystemConfig): string[] {
  const suggestions: string[] = [];
  
  if (config.base_points < 1) {
    suggestions.push('Рассмотрите увеличение базовых очков для стимулирования участия');
  }
  
  if (!config.enable_position_bonus) {
    suggestions.push('Включите позиционные бонусы для награждения хороших результатов');
  }
  
  if (config.prize_coefficient < 0.0005) {
    suggestions.push('Увеличьте коэффициент призовых для большей мотивации');
  }
  
  if (config.volatility_control === 0) {
    suggestions.push('Добавьте контроль волатильности для стабилизации рейтингов');
  }
  
  if (!config.field_size_modifier && !config.buy_in_modifier) {
    suggestions.push('Включите модификаторы размера поля или бай-ина для более точной оценки');
  }
  
  if (config.weights && Object.values(config.weights).every(w => w === 1)) {
    suggestions.push('Настройте веса факторов в соответствии с вашими приоритетами');
  }
  
  return suggestions;
}