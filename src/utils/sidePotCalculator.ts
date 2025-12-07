// ==========================================
// SIDE POT CALCULATOR - Расчёт побочных банков
// ==========================================

export interface PlayerContribution {
  playerId: string;
  totalBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  stack: number; // Remaining stack after all bets
}

export interface SidePot {
  amount: number;
  eligiblePlayers: string[]; // Player IDs who can win this pot
  contributors: string[]; // Player IDs who contributed to this pot
}

export interface PotResult {
  mainPot: SidePot;
  sidePots: SidePot[];
  totalPot: number;
}

/**
 * Рассчитывает основной и побочные банки
 * 
 * Алгоритм:
 * 1. Сортируем игроков по размеру их общей ставки (от меньшей к большей)
 * 2. Для каждого уровня ставки создаём отдельный банк
 * 3. Игроки, которые сбросили карты (folded), вносят в банк, но не могут выиграть
 */
export function calculateSidePots(contributions: PlayerContribution[]): PotResult {
  if (contributions.length === 0) {
    return {
      mainPot: { amount: 0, eligiblePlayers: [], contributors: [] },
      sidePots: [],
      totalPot: 0
    };
  }

  // Сортируем по размеру ставки (включая folded игроков)
  const sortedContributions = [...contributions]
    .filter(c => c.totalBet > 0)
    .sort((a, b) => a.totalBet - b.totalBet);

  if (sortedContributions.length === 0) {
    return {
      mainPot: { amount: 0, eligiblePlayers: [], contributors: [] },
      sidePots: [],
      totalPot: 0
    };
  }

  const pots: SidePot[] = [];
  let previousLevel = 0;

  // Создаём уникальные уровни ставок (только от all-in игроков)
  const allInLevels = sortedContributions
    .filter(c => c.isAllIn)
    .map(c => c.totalBet);
  
  const maxBet = Math.max(...sortedContributions.map(c => c.totalBet));
  const uniqueLevels = [...new Set([...allInLevels, maxBet])].sort((a, b) => a - b);

  for (const level of uniqueLevels) {
    const increment = level - previousLevel;
    
    if (increment <= 0) continue;

    // Собираем взносы всех игроков на этом уровне
    let potAmount = 0;
    const contributors: string[] = [];
    const eligiblePlayers: string[] = [];

    for (const contribution of sortedContributions) {
      if (contribution.totalBet >= previousLevel + 1) {
        // Игрок внёс деньги на этом уровне
        const contributionAtLevel = Math.min(contribution.totalBet - previousLevel, increment);
        potAmount += contributionAtLevel;
        contributors.push(contribution.playerId);

        // Только не-сбросившие игроки могут выиграть
        if (!contribution.isFolded && contribution.totalBet >= level) {
          eligiblePlayers.push(contribution.playerId);
        } else if (!contribution.isFolded && contribution.totalBet >= previousLevel + 1) {
          // Игрок может выиграть только если внёс полную ставку на этом уровне
          // или это его all-in уровень
          if (contribution.isAllIn && contribution.totalBet > previousLevel) {
            eligiblePlayers.push(contribution.playerId);
          }
        }
      }
    }

    // Пересчитываем eligible players корректно
    const correctEligible = sortedContributions
      .filter(c => !c.isFolded && c.totalBet >= level)
      .map(c => c.playerId);

    // Добавляем all-in игроков на их уровне
    for (const contribution of sortedContributions) {
      if (contribution.isAllIn && contribution.totalBet === level && !contribution.isFolded) {
        if (!correctEligible.includes(contribution.playerId)) {
          correctEligible.push(contribution.playerId);
        }
      }
    }

    if (potAmount > 0) {
      pots.push({
        amount: potAmount,
        eligiblePlayers: correctEligible,
        contributors
      });
    }

    previousLevel = level;
  }

  // Первый банк — основной, остальные — побочные
  const [mainPot, ...sidePots] = pots;
  const totalPot = pots.reduce((sum, pot) => sum + pot.amount, 0);

  return {
    mainPot: mainPot || { amount: 0, eligiblePlayers: [], contributors: [] },
    sidePots,
    totalPot
  };
}

/**
 * Распределяет выигрыши по банкам
 */
export interface WinnerInfo {
  playerId: string;
  handValue: number; // Числовое значение комбинации для сравнения
}

export interface PotWinner {
  potType: 'main' | 'side';
  potIndex: number;
  potAmount: number;
  winners: string[];
  amountPerWinner: number;
}

export function distributePots(
  potResult: PotResult,
  winners: WinnerInfo[]
): PotWinner[] {
  const results: PotWinner[] = [];
  
  // Функция для определения победителей банка
  const determineWinnersForPot = (pot: SidePot): string[] => {
    // Фильтруем только eligible игроков
    const eligibleWinners = winners.filter(w => pot.eligiblePlayers.includes(w.playerId));
    
    if (eligibleWinners.length === 0) return [];
    
    // Находим максимальное значение руки
    const maxValue = Math.max(...eligibleWinners.map(w => w.handValue));
    
    // Возвращаем всех с максимальным значением (split pot)
    return eligibleWinners
      .filter(w => w.handValue === maxValue)
      .map(w => w.playerId);
  };

  // Основной банк
  if (potResult.mainPot.amount > 0) {
    const potWinners = determineWinnersForPot(potResult.mainPot);
    if (potWinners.length > 0) {
      results.push({
        potType: 'main',
        potIndex: 0,
        potAmount: potResult.mainPot.amount,
        winners: potWinners,
        amountPerWinner: Math.floor(potResult.mainPot.amount / potWinners.length)
      });
    }
  }

  // Побочные банки
  potResult.sidePots.forEach((pot, index) => {
    if (pot.amount > 0) {
      const potWinners = determineWinnersForPot(pot);
      if (potWinners.length > 0) {
        results.push({
          potType: 'side',
          potIndex: index + 1,
          potAmount: pot.amount,
          winners: potWinners,
          amountPerWinner: Math.floor(pot.amount / potWinners.length)
        });
      }
    }
  });

  return results;
}

/**
 * Пример использования:
 * 
 * Ситуация: 3 игрока
 * - Игрок A: all-in 1000 фишек
 * - Игрок B: all-in 500 фишек  
 * - Игрок C: call 1000 фишек (имел больше)
 * 
 * Результат:
 * - Main pot: 500 * 3 = 1500 (все могут выиграть)
 * - Side pot: 500 * 2 = 1000 (только A и C могут выиграть)
 * 
 * Если B выиграл с лучшей рукой:
 * - B забирает main pot (1500)
 * - Лучший из A/C забирает side pot (1000)
 */

// Тесты для проверки логики
export function testSidePots(): void {
  console.log('=== Testing Side Pots ===');
  
  // Тест 1: Все одинаковые ставки
  const test1: PlayerContribution[] = [
    { playerId: 'A', totalBet: 100, isFolded: false, isAllIn: false, stack: 900 },
    { playerId: 'B', totalBet: 100, isFolded: false, isAllIn: false, stack: 900 },
    { playerId: 'C', totalBet: 100, isFolded: false, isAllIn: false, stack: 900 },
  ];
  const result1 = calculateSidePots(test1);
  console.log('Test 1 - Equal bets:', result1);
  
  // Тест 2: Один all-in с меньшим стеком
  const test2: PlayerContribution[] = [
    { playerId: 'A', totalBet: 500, isFolded: false, isAllIn: true, stack: 0 },
    { playerId: 'B', totalBet: 1000, isFolded: false, isAllIn: false, stack: 500 },
    { playerId: 'C', totalBet: 1000, isFolded: false, isAllIn: false, stack: 500 },
  ];
  const result2 = calculateSidePots(test2);
  console.log('Test 2 - One short all-in:', result2);
  // Expected: Main pot = 1500 (A,B,C), Side pot = 1000 (B,C)
  
  // Тест 3: Folded игрок
  const test3: PlayerContribution[] = [
    { playerId: 'A', totalBet: 100, isFolded: true, isAllIn: false, stack: 800 },
    { playerId: 'B', totalBet: 200, isFolded: false, isAllIn: false, stack: 800 },
    { playerId: 'C', totalBet: 200, isFolded: false, isAllIn: false, stack: 800 },
  ];
  const result3 = calculateSidePots(test3);
  console.log('Test 3 - One folded:', result3);
  // Expected: Main pot = 500 (only B,C eligible)
  
  // Тест 4: Множественные all-in
  const test4: PlayerContribution[] = [
    { playerId: 'A', totalBet: 300, isFolded: false, isAllIn: true, stack: 0 },
    { playerId: 'B', totalBet: 600, isFolded: false, isAllIn: true, stack: 0 },
    { playerId: 'C', totalBet: 1000, isFolded: false, isAllIn: false, stack: 500 },
    { playerId: 'D', totalBet: 1000, isFolded: false, isAllIn: false, stack: 500 },
  ];
  const result4 = calculateSidePots(test4);
  console.log('Test 4 - Multiple all-ins:', result4);
  // Expected: 
  // Main pot = 300*4 = 1200 (A,B,C,D)
  // Side pot 1 = 300*3 = 900 (B,C,D) 
  // Side pot 2 = 400*2 = 800 (C,D)
  
  console.log('=== Tests Complete ===');
}
