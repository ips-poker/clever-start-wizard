// ==========================================
// EQUITY CALCULATOR - Professional Monte Carlo
// ==========================================

import { 
  Card, 
  createDeck, 
  evaluateHand, 
  HandEvaluation,
  parseCard,
  evaluateOmahaHand,
  getHandStrengthCategory
} from './pokerEngine';

export interface PlayerEquity {
  playerId: string;
  equity: number; // 0-100%
  winCount: number;
  tieCount: number;
  handStrength?: string;
  strengthCategory?: 'monster' | 'strong' | 'medium' | 'weak' | 'nothing';
}

export interface EquityResult {
  players: PlayerEquity[];
  simulationsRun: number;
  calculationTimeMs: number;
  confidence: number; // Statistical confidence level
}

export type GameType = 'holdem' | 'omaha' | 'shortdeck';

interface EquityOptions {
  simulations?: number;
  gameType?: GameType;
  timeout?: number; // Max calculation time in ms
}

/**
 * Парсит строку карты в объект Card
 */
function parseCardString(cardStr: string): Card | null {
  if (!cardStr || cardStr.length < 2) return null;
  return parseCard(cardStr);
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
 * Быстрое перемешивание массива (Fisher-Yates with crypto)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  const randomValues = new Uint32Array(result.length);
  crypto.getRandomValues(randomValues);
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Calculate confidence interval for equity (95% confidence)
 */
function calculateConfidence(wins: number, samples: number): number {
  if (samples === 0) return 0;
  const p = wins / samples;
  const z = 1.96; // 95% confidence
  const marginOfError = z * Math.sqrt((p * (1 - p)) / samples);
  return Math.min(100, Math.max(0, (1 - marginOfError * 2) * 100));
}

/**
 * Рассчитывает эквити для всех игроков методом Monte Carlo
 * Professional implementation with timeout support and game type options
 */
export function calculateEquity(
  playerHands: { playerId: string; cards: string[] }[],
  communityCards: string[] = [],
  options: EquityOptions = {}
): EquityResult {
  const {
    simulations = 10000,
    gameType = 'holdem',
    timeout = 5000
  } = options;
  
  const startTime = performance.now();
  const timeoutTime = startTime + timeout;
  
  // Парсим все карты
  const parsedHands = playerHands.map(ph => ({
    playerId: ph.playerId,
    cards: parseCards(ph.cards)
  }));
  
  const parsedCommunity = parseCards(communityCards);
  
  // Validate hands
  const minCards = gameType === 'omaha' ? 4 : 2;
  if (parsedHands.some(ph => ph.cards.length < minCards)) {
    return {
      players: playerHands.map(ph => ({
        playerId: ph.playerId,
        equity: 100 / playerHands.length,
        winCount: 0,
        tieCount: 0
      })),
      simulationsRun: 0,
      calculationTimeMs: 0,
      confidence: 0
    };
  }
  
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
  
  let simulationsRun = 0;
  
  // Monte Carlo симуляция с поддержкой timeout
  for (let sim = 0; sim < simulations; sim++) {
    // Check timeout every 100 iterations
    if (sim % 100 === 0 && performance.now() > timeoutTime) {
      break;
    }
    
    // Перемешиваем оставшуюся колоду
    const shuffled = shuffleArray(remainingDeck);
    
    // Добираем community cards
    const fullCommunity = [...parsedCommunity, ...shuffled.slice(0, cardsNeeded)];
    
    // Оцениваем руки всех игроков
    const evaluations: { playerId: string; value: number; hand: HandEvaluation }[] = [];
    
    for (const ph of parsedHands) {
      let hand: HandEvaluation;
      
      if (gameType === 'omaha') {
        hand = evaluateOmahaHand(ph.cards, fullCommunity);
      } else {
        const allCards = [...ph.cards, ...fullCommunity];
        hand = evaluateHand(allCards, gameType === 'shortdeck');
      }
      
      evaluations.push({ playerId: ph.playerId, value: hand.value, hand });
    }
    
    // Находим лучшую руку
    const bestValue = Math.max(...evaluations.map(e => e.value));
    const winnersThisHand = evaluations.filter(e => e.value === bestValue);
    
    if (winnersThisHand.length === 1) {
      // Один победитель
      wins[winnersThisHand[0].playerId]++;
    } else {
      // Тай - несколько победителей
      winnersThisHand.forEach(w => {
        ties[w.playerId]++;
      });
    }
    
    simulationsRun++;
  }
  
  // Рассчитываем эквити
  const players: PlayerEquity[] = parsedHands.map(ph => {
    const winCount = wins[ph.playerId];
    const tieCount = ties[ph.playerId];
    // Для тай делим на количество участников
    const avgTieWinners = parsedHands.length > 1 ? 
      (tieCount / Math.max(1, parsedHands.filter(h => ties[h.playerId] > 0).length)) : 
      0;
    const effectiveWins = winCount + (avgTieWinners / 2);
    const equity = simulationsRun > 0 ? (effectiveWins / simulationsRun) * 100 : 0;
    
    // Текущая сила руки если есть community cards
    let handStrength: string | undefined;
    let strengthCategory: PlayerEquity['strengthCategory'];
    
    if (parsedCommunity.length >= 3 && ph.cards.length >= 2) {
      try {
        let currentHand: HandEvaluation;
        if (gameType === 'omaha' && parsedCommunity.length === 5) {
          currentHand = evaluateOmahaHand(ph.cards, parsedCommunity);
        } else if (gameType !== 'omaha') {
          currentHand = evaluateHand([...ph.cards, ...parsedCommunity], gameType === 'shortdeck');
        } else {
          currentHand = evaluateHand([...ph.cards.slice(0, 2), ...parsedCommunity]);
        }
        handStrength = currentHand.name;
        strengthCategory = getHandStrengthCategory(currentHand);
      } catch {
        handStrength = undefined;
      }
    }
    
    return {
      playerId: ph.playerId,
      equity: Math.round(equity * 10) / 10, // 1 decimal place
      winCount,
      tieCount,
      handStrength,
      strengthCategory
    };
  });
  
  const calculationTimeMs = performance.now() - startTime;
  const confidence = calculateConfidence(
    Math.max(...Object.values(wins)),
    simulationsRun
  );
  
  return {
    players,
    simulationsRun,
    calculationTimeMs: Math.round(calculationTimeMs),
    confidence: Math.round(confidence)
  };
}

/**
 * Быстрый расчёт эквити для all-in ситуации
 */
export function calculateEquityFast(
  playerHands: { playerId: string; cards: string[] }[],
  communityCards: string[] = [],
  gameType: GameType = 'holdem'
): EquityResult {
  return calculateEquity(playerHands, communityCards, { 
    simulations: 5000, 
    gameType,
    timeout: 2000 
  });
}

/**
 * Точный расчёт эквити (больше симуляций)
 */
export function calculateEquityPrecise(
  playerHands: { playerId: string; cards: string[] }[],
  communityCards: string[] = [],
  gameType: GameType = 'holdem'
): EquityResult {
  return calculateEquity(playerHands, communityCards, { 
    simulations: 50000, 
    gameType,
    timeout: 10000 
  });
}

/**
 * Pre-flop equity using pre-computed tables (approximate)
 */
export function calculatePreFlopEquity(
  hand1: string[], // e.g., ["Ah", "Kh"]
  hand2: string[]
): { equity1: number; equity2: number } {
  // Simplified pre-flop equity based on hand rankings
  const parseHand = (cards: string[]) => {
    if (cards.length < 2) return { rank1: 0, rank2: 0, suited: false };
    const c1 = parseCardString(cards[0]);
    const c2 = parseCardString(cards[1]);
    if (!c1 || !c2) return { rank1: 0, rank2: 0, suited: false };
    return {
      rank1: Math.max(c1.rank, c2.rank),
      rank2: Math.min(c1.rank, c2.rank),
      suited: c1.suit === c2.suit,
      paired: c1.rank === c2.rank
    };
  };
  
  const h1 = parseHand(hand1);
  const h2 = parseHand(hand2);
  
  // Simple heuristic scoring
  const scoreHand = (h: ReturnType<typeof parseHand>) => {
    let score = h.rank1 + h.rank2 * 0.8;
    if (h.paired) score += 10;
    if (h.suited) score += 3;
    if (h.rank1 - h.rank2 <= 2) score += 2; // Connectors
    return score;
  };
  
  const score1 = scoreHand(h1);
  const score2 = scoreHand(h2);
  const total = score1 + score2;
  
  return {
    equity1: Math.round((score1 / total) * 100),
    equity2: Math.round((score2 / total) * 100)
  };
}

/**
 * Проверяет, является ли ситуация all-in (все активные игроки в олл-ин)
 */
export function isAllInSituation(
  players: { isAllIn: boolean; isFolded: boolean; stack?: number }[]
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

/**
 * Calculate pot odds percentage
 */
export function calculatePotOdds(callAmount: number, potSize: number): number {
  if (callAmount <= 0) return 0;
  return Math.round((callAmount / (potSize + callAmount)) * 100);
}

/**
 * Determine if call is +EV based on equity and pot odds
 */
export function isPositiveEV(equity: number, potOdds: number): boolean {
  return equity > potOdds;
}

/**
 * Calculate implied odds adjustment
 */
export function calculateImpliedOdds(
  equity: number,
  potOdds: number,
  expectedFutureWinnings: number,
  callAmount: number
): boolean {
  const adjustedOdds = (callAmount / (callAmount + expectedFutureWinnings)) * 100;
  return equity > adjustedOdds;
}
