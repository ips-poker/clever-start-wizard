import { RatingSystemConfig } from '@/hooks/useRatingSystemConfig';

// Продвинутые алгоритмы рейтинговой системы для профессионального использования

export interface AdvancedRatingParams {
  position: number;
  totalPlayers: number;
  currentRating: number;
  rebuys: number;
  addons: number;
  prizeAmount: number;
  totalPrizePool: number;
  buyIn: number;
  payoutStructure: number[];
  tournamentDuration: number;
  knockouts?: number;
  averageOpponentRating?: number;
  fieldStrength?: number;
  varianceHistory?: number[];
  confidenceFactor?: number;
}

export interface AdvancedRatingResult {
  ratingChange: number;
  confidenceInterval: [number, number];
  components: {
    base: number;
    skill: number;
    variance: number;
    field: number;
    performance: number;
    momentum: number;
  };
  newRating: number;
  confidenceLevel: number;
  percentileRank: number;
}

// Система на основе модифицированного Elo с учетом специфики покера
export class AdvancedPokerRatingSystem {
  private config: RatingSystemConfig;

  constructor(config: RatingSystemConfig) {
    this.config = config;
  }

  // Главный метод расчета рейтинга
  calculateAdvancedRating(params: AdvancedRatingParams): AdvancedRatingResult {
    const components = this.calculateComponents(params);
    const ratingChange = this.aggregateComponents(components);
    const confidenceInterval = this.calculateConfidenceInterval(ratingChange, params);
    const newRating = Math.max(
      this.config.min_rating,
      Math.min(this.config.max_rating, params.currentRating + ratingChange)
    );

    return {
      ratingChange,
      confidenceInterval,
      components,
      newRating,
      confidenceLevel: this.calculateConfidenceLevel(params),
      percentileRank: this.calculatePercentileRank(newRating, params.totalPlayers)
    };
  }

  private calculateComponents(params: AdvancedRatingParams) {
    return {
      base: this.calculateBaseComponent(params),
      skill: this.calculateSkillComponent(params),
      variance: this.calculateVarianceComponent(params),
      field: this.calculateFieldComponent(params),
      performance: this.calculatePerformanceComponent(params),
      momentum: this.calculateMomentumComponent(params)
    };
  }

  // Базовый компонент (участие, ребаи, позиция)
  private calculateBaseComponent(params: AdvancedRatingParams): number {
    let base = this.config.base_points + this.config.participation_bonus;
    
    // Ребаи и аддоны
    base += params.rebuys * this.config.rebuy_multiplier;
    base += params.addons * this.config.addon_multiplier;
    
    // Позиционные бонусы с прогрессивным масштабированием
    if (this.config.enable_position_bonus) {
      const positionRatio = params.position / params.totalPlayers;
      
      if (params.position === 1) {
        base += this.config.first_place_bonus * this.getScalingFactor(params.totalPlayers);
      } else if (params.position === 2) {
        base += this.config.second_place_bonus * this.getScalingFactor(params.totalPlayers);
      } else if (params.position === 3) {
        base += this.config.third_place_bonus * this.getScalingFactor(params.totalPlayers);
      } else if (params.position <= 3) {
        base += this.config.top_3_bonus;
      } else if (positionRatio <= 0.1) {
        base += this.config.top_10_percent_bonus;
      } else if (positionRatio <= 0.25) {
        base += this.config.top_25_percent_bonus;
      }
      
      // ITM бонус
      if (params.position <= params.payoutStructure.length) {
        base += this.config.itm_bonus;
      }
      
      // Bubble бонус
      if (params.position === params.payoutStructure.length + 1) {
        base += this.config.bubble_bonus;
      }
    }

    return base;
  }

  // Скилловый компонент (на основе силы поля и ожидаемого результата)
  private calculateSkillComponent(params: AdvancedRatingParams): number {
    if (!params.averageOpponentRating) return 0;

    const ratingDiff = params.currentRating - params.averageOpponentRating;
    const expectedFinish = this.calculateExpectedFinish(ratingDiff, params.totalPlayers);
    const actualPerformance = 1 - (params.position - 1) / (params.totalPlayers - 1);
    
    const skillBonus = (actualPerformance - expectedFinish) * this.config.weights.performance_weight * 10;
    
    return Math.max(-20, Math.min(20, skillBonus));
  }

  // Компонент дисперсии (стабильность результатов)
  private calculateVarianceComponent(params: AdvancedRatingParams): number {
    if (!params.varianceHistory || params.varianceHistory.length < 5) return 0;

    const variance = this.calculateVariance(params.varianceHistory);
    const stabilityBonus = Math.max(0, 1 - variance / 100) * 3; // Бонус за стабильность
    
    return this.config.volatility_control > 0 ? stabilityBonus : 0;
  }

  // Компонент силы поля
  private calculateFieldComponent(params: AdvancedRatingParams): number {
    let fieldBonus = 0;
    
    if (this.config.field_size_modifier) {
      // Логарифмическое масштабирование для больших полей
      fieldBonus += Math.log10(params.totalPlayers) * 2;
      
      // Дополнительный бонус за очень большие поля
      if (params.totalPlayers > 500) fieldBonus += 5;
      if (params.totalPlayers > 1000) fieldBonus += 10;
    }
    
    if (this.config.buy_in_modifier) {
      // Бонус за высокие бай-ины
      const buyInTier = this.getBuyInTier(params.buyIn);
      fieldBonus += buyInTier.multiplier * 3;
    }
    
    if (params.fieldStrength) {
      // Бонус за сильное поле (высокий средний рейтинг)
      fieldBonus += (params.fieldStrength - 1) * 5;
    }

    return fieldBonus * this.config.weights.field_size_weight;
  }

  // Компонент результативности (ROI, ITM%, etc.)
  private calculatePerformanceComponent(params: AdvancedRatingParams): number {
    let performance = 0;
    
    // ROI компонент
    if (params.prizeAmount > 0) {
      const roi = (params.prizeAmount - params.buyIn) / params.buyIn;
      performance += Math.min(15, roi * 10); // Максимум 15 очков за ROI
    }
    
    // Нокауты (если применимо)
    if (params.knockouts && this.config.knockout_bonus > 0) {
      performance += params.knockouts * this.config.knockout_bonus;
    }
    
    // Длительность турнира
    if (this.config.duration_multiplier && params.tournamentDuration > 0) {
      const durationBonus = Math.min(3, params.tournamentDuration / 3600); // Макс 3 очка за длинные турниры
      performance += durationBonus;
    }

    return performance;
  }

  // Моментум компонент (последние результаты)
  private calculateMomentumComponent(params: AdvancedRatingParams): number {
    if (!params.varianceHistory || params.varianceHistory.length < 3) return 0;

    const recentResults = params.varianceHistory.slice(-5); // Последние 5 результатов
    const trend = this.calculateTrend(recentResults);
    
    // Бонус/штраф за тренд в результатах
    return Math.max(-5, Math.min(5, trend * 2));
  }

  // Агрегация всех компонентов с весами
  private aggregateComponents(components: any): number {
    const weights = this.config.weights;
    
    return (
      components.base * 1.0 +
      components.skill * weights.performance_weight +
      components.variance * 0.3 +
      components.field * weights.field_size_weight +
      components.performance * weights.prize_weight +
      components.momentum * 0.5
    );
  }

  // Расчет доверительного интервала
  private calculateConfidenceInterval(ratingChange: number, params: AdvancedRatingParams): [number, number] {
    const confidence = params.confidenceFactor || this.config.rating_confidence_factor || 1.0;
    const interval = Math.abs(ratingChange) * (2 - confidence) * 0.3;
    
    return [
      ratingChange - interval,
      ratingChange + interval
    ];
  }

  // Уровень уверенности в расчете
  private calculateConfidenceLevel(params: AdvancedRatingParams): number {
    let confidence = 0.7; // Базовый уровень
    
    // Увеличиваем уверенность для больших полей
    if (params.totalPlayers > 50) confidence += 0.1;
    if (params.totalPlayers > 100) confidence += 0.1;
    
    // Увеличиваем для высоких бай-инов
    if (params.buyIn > 5000) confidence += 0.1;
    
    // Снижаем для турбо форматов
    if (this.config.turbo_modifier < 1.0) confidence -= 0.1;
    
    return Math.min(1.0, confidence);
  }

  // Расчет перцентиля
  private calculatePercentileRank(rating: number, totalPlayers: number): number {
    // Примерное распределение рейтингов (нормальное)
    const mean = (this.config.min_rating + this.config.max_rating) / 2;
    const std = (this.config.max_rating - this.config.min_rating) / 6;
    
    // Z-score
    const z = (rating - mean) / std;
    
    // Приблизительный перцентиль через нормальное распределение
    return Math.max(0, Math.min(100, 50 + 50 * this.erf(z / Math.sqrt(2))));
  }

  // Вспомогательные методы
  private getScalingFactor(totalPlayers: number): number {
    if (totalPlayers < 25) return 0.8;
    if (totalPlayers < 50) return 1.0;
    if (totalPlayers < 100) return 1.2;
    if (totalPlayers < 200) return 1.4;
    return 1.6;
  }

  private calculateExpectedFinish(ratingDiff: number, totalPlayers: number): number {
    // Модифицированная формула Elo для мультиплеерных игр
    const k = 400; // Elo константа
    const expectedScore = 1 / (1 + Math.pow(10, -ratingDiff / k));
    return 1 - expectedScore;
  }

  private getBuyInTier(buyIn: number) {
    const tier = this.config.buy_in_tiers.find(t => buyIn >= t.min && buyIn <= t.max);
    return tier || { min: 0, max: 999999, multiplier: 1.0 };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    let trend = 0;
    for (let i = 1; i < values.length; i++) {
      trend += values[i] - values[i - 1];
    }
    
    return trend / (values.length - 1);
  }

  // Приближенная функция ошибки
  private erf(x: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }
}

// Система машинного обучения для адаптации рейтингов
export class AdaptiveRatingSystem {
  private learningRate = 0.01;
  private decay = 0.95;
  
  // Адаптивная корректировка рейтингов на основе истории
  adaptRatingBasedOnHistory(
    playerRating: number,
    recentResults: number[],
    opponentRatings: number[]
  ): number {
    if (recentResults.length < 5) return playerRating;
    
    // Расчет ожидаемых результатов vs фактических
    const expectedResults = opponentRatings.map(opp => 
      1 / (1 + Math.pow(10, (opp - playerRating) / 400))
    );
    
    // Нормализованные фактические результаты (0-1)
    const normalizedResults = recentResults.map(pos => 1 - (pos - 1) / 100);
    
    // Расчет ошибки
    let totalError = 0;
    for (let i = 0; i < Math.min(expectedResults.length, normalizedResults.length); i++) {
      totalError += Math.pow(expectedResults[i] - normalizedResults[i], 2);
    }
    
    const avgError = totalError / Math.min(expectedResults.length, normalizedResults.length);
    
    // Адаптивная корректировка
    const adjustment = this.learningRate * avgError * 100;
    
    return playerRating + (avgError > 0.5 ? -adjustment : adjustment);
  }
  
  // Динамическая корректировка K-фактора на основе стабильности
  calculateDynamicKFactor(
    baseK: number,
    variance: number,
    gamesPlayed: number,
    confidenceLevel: number
  ): number {
    let k = baseK;
    
    // Снижаем K для опытных игроков
    if (gamesPlayed > 50) k *= 0.8;
    if (gamesPlayed > 100) k *= 0.7;
    
    // Увеличиваем K для нестабильных игроков
    if (variance > 200) k *= 1.3;
    
    // Корректируем на основе уверенности
    k *= confidenceLevel;
    
    return Math.max(5, Math.min(50, k));
  }
}

// Статистический анализ и валидация
export class RatingStatistics {
  // Расчет статистической значимости изменения рейтинга
  calculateSignificance(
    oldRating: number,
    newRating: number,
    variance: number,
    sampleSize: number
  ): { isSignificant: boolean; pValue: number; confidenceLevel: number } {
    const change = Math.abs(newRating - oldRating);
    const standardError = Math.sqrt(variance / sampleSize);
    const zScore = change / standardError;
    
    // Приблизительный расчет p-value
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    
    return {
      isSignificant: pValue < 0.05,
      pValue,
      confidenceLevel: 1 - pValue
    };
  }
  
  // Проверка на аномалии в рейтингах
  detectAnomalies(ratings: number[]): number[] {
    if (ratings.length < 10) return [];
    
    const q1 = this.percentile(ratings, 25);
    const q3 = this.percentile(ratings, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return ratings.filter(rating => rating < lowerBound || rating > upperBound);
  }
  
  // Расчет процентиля
  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    
    if (Math.floor(index) === index) {
      return sorted[index];
    } else {
      const i = Math.floor(index);
      const fraction = index - i;
      return sorted[i] + (sorted[i + 1] - sorted[i]) * fraction;
    }
  }
  
  // Функция нормального распределения
  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }
  
  private erf(x: number): number {
    // Приближенная функция ошибки (упрощенная)
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }
}