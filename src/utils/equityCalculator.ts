// ==========================================
// EQUITY CALCULATOR - Monte Carlo Симуляция
// ==========================================

import { 
  Card, 
  createDeck, 
  evaluateHand, 
  HandEvaluation,
  parseCard,
  SUITS,
  RANKS,
  Suit,
  Rank
} from './pokerEngine';

export interface PlayerEquity {
  playerId: string;
  equity: number; // 0-100%
  winCount: number;
  tieCount: number;
  handStrength?: string;
}

export interface EquityResult {
  players: PlayerEquity[];
  simulationsRun: number;
  calculationTimeMs: number;
}

/**
 * Парсит строку карты в объект Card
 */
function parseCardString(cardStr: string): Card | null {
  // Format: "Ah", "Ks", "2d" etc.
  if (!cardStr || cardStr.length < 2) return null;
  
  const rankMap: Record<string, Rank> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'T': 10, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  
  const suitMap: Record<string, Suit> = {
    'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades',
    '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs', '♠': 'spades'
  };
  
  const rankStr = cardStr.slice(0, -1).toUpperCase();
  const suitStr = cardStr.slice(-1).toLowerCase();
  
  const rank = rankMap[rankStr];
  const suit = suitMap[suitStr];
  
  if (!rank || !suit) return null;
  
  return { rank, suit, id: `${rank}-${suit}` };
}

/**
 * Парсит массив строк карт
 */
function parseCards(cardStrings: string[]): Card[] {
  return cardStrings
    .map(parseCardString)
    .filter((c): c is Card => c !== null);
}

/**
 * Создаёт колоду без указанных карт
 */
function createDeckWithoutCards(usedCards: Card[]): Card[] {
  const deck = createDeck();
  const usedIds = new Set(usedCards.map(c => c.id));
  return deck.filter(c => !usedIds.has(c.id));
}

/**
 * Быстрое перемешивание массива (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Рассчитывает эквити для всех игроков методом Monte Carlo
 * 
 * @param playerHands - Массив рук игроков [{playerId, cards: ["Ah", "Kh"]}]
 * @param communityCards - Общие карты на столе ["Qh", "Jd", "Tc"]
 * @param simulations - Количество симуляций (больше = точнее, но медленнее)
 */
export function calculateEquity(
  playerHands: { playerId: string; cards: string[] }[],
  communityCards: string[] = [],
  simulations: number = 10000
): EquityResult {
  const startTime = performance.now();
  
  // Парсим все карты
  const parsedHands = playerHands.map(ph => ({
    playerId: ph.playerId,
    cards: parseCards(ph.cards)
  }));
  
  const parsedCommunity = parseCards(communityCards);
  
  // Собираем все известные карты
  const knownCards: Card[] = [
    ...parsedCommunity,
    ...parsedHands.flatMap(ph => ph.cards)
  ];
  
  // Создаём колоду без известных карт
  const remainingDeck = createDeckWithoutCards(knownCards);
  
  // Сколько карт нужно добить до 5 community cards
  const cardsNeeded = 5 - parsedCommunity.length;
  
  // Счётчики побед и тай
  const wins: Record<string, number> = {};
  const ties: Record<string, number> = {};
  
  parsedHands.forEach(ph => {
    wins[ph.playerId] = 0;
    ties[ph.playerId] = 0;
  });
  
  // Monte Carlo симуляция
  for (let sim = 0; sim < simulations; sim++) {
    // Перемешиваем оставшуюся колоду
    const shuffled = shuffleArray(remainingDeck);
    
    // Добираем community cards
    const fullCommunity = [...parsedCommunity, ...shuffled.slice(0, cardsNeeded)];
    
    // Оцениваем руки всех игроков
    const evaluations: { playerId: string; hand: HandEvaluation }[] = [];
    
    for (const ph of parsedHands) {
      const allCards = [...ph.cards, ...fullCommunity];
      const hand = evaluateHand(allCards);
      evaluations.push({ playerId: ph.playerId, hand });
    }
    
    // Находим лучшую руку
    let bestValue = Math.max(...evaluations.map(e => e.hand.value));
    const winnersThisHand = evaluations.filter(e => e.hand.value === bestValue);
    
    if (winnersThisHand.length === 1) {
      // Один победитель
      wins[winnersThisHand[0].playerId]++;
    } else {
      // Тай - несколько победителей
      winnersThisHand.forEach(w => {
        ties[w.playerId]++;
      });
    }
  }
  
  // Рассчитываем эквити
  const players: PlayerEquity[] = parsedHands.map(ph => {
    const winCount = wins[ph.playerId];
    const tieCount = ties[ph.playerId];
    // Для тай делим на количество участников тай (примерно)
    const effectiveWins = winCount + (tieCount / 2);
    const equity = (effectiveWins / simulations) * 100;
    
    // Текущая сила руки если есть community cards
    let handStrength: string | undefined;
    if (parsedCommunity.length >= 3 && ph.cards.length >= 2) {
      try {
        const currentHand = evaluateHand([...ph.cards, ...parsedCommunity]);
        handStrength = currentHand.name;
      } catch {
        handStrength = undefined;
      }
    }
    
    return {
      playerId: ph.playerId,
      equity: Math.round(equity * 10) / 10, // 1 decimal place
      winCount,
      tieCount,
      handStrength
    };
  });
  
  const calculationTimeMs = performance.now() - startTime;
  
  return {
    players,
    simulationsRun: simulations,
    calculationTimeMs: Math.round(calculationTimeMs)
  };
}

/**
 * Быстрый расчёт эквити для all-in ситуации
 * Использует меньше симуляций для быстрого результата
 */
export function calculateEquityFast(
  playerHands: { playerId: string; cards: string[] }[],
  communityCards: string[] = []
): EquityResult {
  // Меньше симуляций для скорости, но достаточно для точности ±2%
  return calculateEquity(playerHands, communityCards, 5000);
}

/**
 * Точный расчёт эквити (больше симуляций)
 */
export function calculateEquityPrecise(
  playerHands: { playerId: string; cards: string[] }[],
  communityCards: string[] = []
): EquityResult {
  return calculateEquity(playerHands, communityCards, 50000);
}

/**
 * Проверяет, является ли ситуация all-in (все активные игроки в олл-ин)
 */
export function isAllInSituation(
  players: { isAllIn: boolean; isFolded: boolean; stack: number }[]
): boolean {
  const activePlayers = players.filter(p => !p.isFolded);
  if (activePlayers.length < 2) return false;
  
  // All-in если все, кроме максимум одного, в олл-ин
  const allInCount = activePlayers.filter(p => p.isAllIn).length;
  return allInCount >= activePlayers.length - 1;
}

/**
 * Форматирует эквити для отображения
 */
export function formatEquity(equity: number): string {
  if (equity >= 99.5) return '>99%';
  if (equity <= 0.5) return '<1%';
  return `${equity.toFixed(1)}%`;
}

/**
 * Получает цвет для эквити (для UI)
 */
export function getEquityColor(equity: number): string {
  if (equity >= 70) return 'text-green-400';
  if (equity >= 50) return 'text-yellow-400';
  if (equity >= 30) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Получает цвет фона для эквити бара
 */
export function getEquityBarColor(equity: number): string {
  if (equity >= 70) return 'bg-green-500';
  if (equity >= 50) return 'bg-yellow-500';
  if (equity >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}
