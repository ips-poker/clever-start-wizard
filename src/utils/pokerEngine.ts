// ==========================================
// POKER ENGINE - Professional Grade
// ==========================================
// Optimized hand evaluation with lookup tables
// Supports: Hold'em, Short Deck, PLO basics

// Масти карт
export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type Suit = typeof SUITS[number];

// Ранги карт (2-14, где 14 = Туз)
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = typeof RANKS[number];

// Short deck ranks (6+)
export const SHORT_DECK_RANKS = [6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

// Названия рангов
export const RANK_NAMES: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'T',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

export const RANK_NAMES_FULL: Record<Rank, string> = {
  2: 'Deuce', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 
  8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace'
};

// Названия мастей
export const SUIT_NAMES: Record<Suit, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠'
};

export const SUIT_NAMES_RU: Record<Suit, string> = {
  hearts: 'Черви', diamonds: 'Бубны', clubs: 'Трефы', spades: 'Пики'
};

export const SUIT_NAMES_EN: Record<Suit, string> = {
  hearts: 'Hearts', diamonds: 'Diamonds', clubs: 'Clubs', spades: 'Spades'
};

// Интерфейс карты
export interface Card {
  rank: Rank;
  suit: Suit;
  id: string; // Уникальный ID для UI
}

// Типы покерных комбинаций (от слабой к сильной)
export enum HandRank {
  HIGH_CARD = 1,
  PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10
}

// Short Deck rankings (flush beats full house)
export enum ShortDeckHandRank {
  HIGH_CARD = 1,
  PAIR = 2,
  TWO_PAIR = 3,
  STRAIGHT = 4, // Easier in short deck
  THREE_OF_A_KIND = 5, // Harder in short deck
  FULL_HOUSE = 6,
  FLUSH = 7, // Much harder in short deck
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10
}

// Названия комбинаций
export const HAND_RANK_NAMES: Record<HandRank, string> = {
  [HandRank.HIGH_CARD]: 'Старшая карта',
  [HandRank.PAIR]: 'Пара',
  [HandRank.TWO_PAIR]: 'Две пары',
  [HandRank.THREE_OF_A_KIND]: 'Тройка',
  [HandRank.STRAIGHT]: 'Стрит',
  [HandRank.FLUSH]: 'Флеш',
  [HandRank.FULL_HOUSE]: 'Фулл-хаус',
  [HandRank.FOUR_OF_A_KIND]: 'Каре',
  [HandRank.STRAIGHT_FLUSH]: 'Стрит-флеш',
  [HandRank.ROYAL_FLUSH]: 'Роял-флеш'
};

export const HAND_RANK_NAMES_EN: Record<HandRank, string> = {
  [HandRank.HIGH_CARD]: 'High Card',
  [HandRank.PAIR]: 'Pair',
  [HandRank.TWO_PAIR]: 'Two Pair',
  [HandRank.THREE_OF_A_KIND]: 'Three of a Kind',
  [HandRank.STRAIGHT]: 'Straight',
  [HandRank.FLUSH]: 'Flush',
  [HandRank.FULL_HOUSE]: 'Full House',
  [HandRank.FOUR_OF_A_KIND]: 'Four of a Kind',
  [HandRank.STRAIGHT_FLUSH]: 'Straight Flush',
  [HandRank.ROYAL_FLUSH]: 'Royal Flush'
};

// Результат оценки руки
export interface HandEvaluation {
  rank: HandRank;
  name: string;
  nameEn: string;
  cards: Card[]; // 5 лучших карт комбинации
  kickers: Card[]; // Кикеры для сравнения
  value: number; // Числовое значение для сравнения
  description: string; // Полное описание комбинации
  descriptionEn: string; // English description
  tiebreakers: number[]; // Explicit tiebreaker values for comparison
}

// ==========================================
// LOOKUP TABLES FOR FAST EVALUATION
// ==========================================

// Pre-computed prime numbers for each rank (for fast hand comparison)
const RANK_PRIMES: Record<Rank, number> = {
  2: 2, 3: 3, 4: 5, 5: 7, 6: 11, 7: 13, 8: 17, 9: 19,
  10: 23, 11: 29, 12: 31, 13: 37, 14: 41
};

// Bit representation for ranks (for straight detection)
const RANK_BITS: Record<Rank, number> = {
  2: 0x1, 3: 0x2, 4: 0x4, 5: 0x8, 6: 0x10, 7: 0x20, 8: 0x40, 9: 0x80,
  10: 0x100, 11: 0x200, 12: 0x400, 13: 0x800, 14: 0x1000
};

// Straight patterns (binary representations)
const STRAIGHT_PATTERNS = [
  0x1F00, // A-K-Q-J-T (Royal)
  0x0F80, // K-Q-J-T-9
  0x07C0, // Q-J-T-9-8
  0x03E0, // J-T-9-8-7
  0x01F0, // T-9-8-7-6
  0x00F8, // 9-8-7-6-5
  0x007C, // 8-7-6-5-4
  0x003E, // 7-6-5-4-3
  0x001F, // 6-5-4-3-2
  0x100F, // A-5-4-3-2 (Wheel) - A as low
];

// High card for each straight pattern
const STRAIGHT_HIGH_CARDS: number[] = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5];

// Short deck straight patterns (6+ deck, A-6-7-8-9 is a straight)
const SHORT_DECK_STRAIGHT_PATTERNS = [
  0x1F00, // A-K-Q-J-T
  0x0F80, // K-Q-J-T-9
  0x07C0, // Q-J-T-9-8
  0x03E0, // J-T-9-8-7
  0x01F0, // T-9-8-7-6
  0x1070, // A-9-8-7-6 (Short deck wheel)
];

const SHORT_DECK_HIGH_CARDS: number[] = [14, 13, 12, 11, 10, 9];

// Cache for hand evaluations
const handCache = new Map<string, HandEvaluation>();
const MAX_CACHE_SIZE = 10000;

// ==========================================
// ГЕНЕРАЦИЯ КОЛОДЫ
// ==========================================

/**
 * Создает стандартную колоду из 52 карт
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        rank,
        suit,
        id: `${rank}-${suit}`
      });
    }
  }
  
  return deck;
}

/**
 * Создает short deck колоду (6+, 36 карт)
 */
export function createShortDeck(): Card[] {
  const deck: Card[] = [];
  
  for (const suit of SUITS) {
    for (const rank of SHORT_DECK_RANKS) {
      deck.push({
        rank,
        suit,
        id: `${rank}-${suit}`
      });
    }
  }
  
  return deck;
}

/**
 * Перемешивает колоду (алгоритм Фишера-Йетса)
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Криптографически безопасное перемешивание
 */
export function shuffleDeckSecure(deck: Card[]): Card[] {
  const shuffled = [...deck];
  const array = new Uint32Array(shuffled.length);
  crypto.getRandomValues(array);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Multiple shuffle passes for extra security
 */
export function shuffleDeckSecureMultiPass(deck: Card[], passes: number = 3): Card[] {
  let result = [...deck];
  for (let i = 0; i < passes; i++) {
    result = shuffleDeckSecure(result);
  }
  return result;
}

// ==========================================
// РАЗДАЧА КАРТ
// ==========================================

export interface DealResult {
  dealtCards: Card[];
  remainingDeck: Card[];
}

/**
 * Раздает указанное количество карт из колоды
 */
export function dealCards(deck: Card[], count: number): DealResult {
  if (count > deck.length) {
    throw new Error(`Cannot deal ${count} cards from deck with ${deck.length} cards`);
  }
  
  return {
    dealtCards: deck.slice(0, count),
    remainingDeck: deck.slice(count)
  };
}

/**
 * Раздает карты нескольким игрокам
 */
export function dealToPlayers(
  deck: Card[], 
  playerCount: number, 
  cardsPerPlayer: number
): { playerHands: Card[][]; remainingDeck: Card[] } {
  let currentDeck = [...deck];
  const playerHands: Card[][] = [];
  
  for (let i = 0; i < playerCount; i++) {
    const { dealtCards, remainingDeck } = dealCards(currentDeck, cardsPerPlayer);
    playerHands.push(dealtCards);
    currentDeck = remainingDeck;
  }
  
  return { playerHands, remainingDeck: currentDeck };
}

/**
 * Deal community cards for Texas Hold'em
 */
export function dealCommunity(
  deck: Card[],
  phase: 'flop' | 'turn' | 'river' | 'full'
): { community: Card[]; remainingDeck: Card[] } {
  const count = phase === 'flop' ? 3 : phase === 'full' ? 5 : 1;
  // Burn card before dealing
  const afterBurn = deck.slice(1);
  const { dealtCards, remainingDeck } = dealCards(afterBurn, count);
  return { community: dealtCards, remainingDeck };
}

// ==========================================
// FAST BIT-BASED EVALUATION
// ==========================================

/**
 * Get bit representation of ranks in hand
 */
function getRankBits(cards: Card[]): number {
  let bits = 0;
  for (const card of cards) {
    bits |= RANK_BITS[card.rank];
  }
  return bits;
}

/**
 * Check if bit pattern contains a straight
 */
function findStraight(bits: number, isShortDeck: boolean = false): number {
  const patterns = isShortDeck ? SHORT_DECK_STRAIGHT_PATTERNS : STRAIGHT_PATTERNS;
  const highCards = isShortDeck ? SHORT_DECK_HIGH_CARDS : STRAIGHT_HIGH_CARDS;
  
  for (let i = 0; i < patterns.length; i++) {
    if ((bits & patterns[i]) === patterns[i]) {
      return highCards[i];
    }
  }
  return 0; // No straight
}

/**
 * Count occurrences of each rank
 */
function getRankCounts(cards: Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  }
  return counts;
}

/**
 * Count occurrences of each suit
 */
function getSuitCounts(cards: Card[]): Map<Suit, number> {
  const counts = new Map<Suit, number>();
  for (const card of cards) {
    counts.set(card.suit, (counts.get(card.suit) || 0) + 1);
  }
  return counts;
}

// ==========================================
// ОЦЕНКА КОМБИНАЦИЙ
// ==========================================

/**
 * Получает все комбинации из n карт (optimized)
 */
function getCombinations(cards: Card[], n: number): Card[][] {
  if (n === 0) return [[]];
  if (cards.length < n) return [];
  if (cards.length === n) return [cards];
  
  const result: Card[][] = [];
  
  function combine(start: number, combo: Card[]) {
    if (combo.length === n) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i <= cards.length - (n - combo.length); i++) {
      combo.push(cards[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  
  combine(0, []);
  return result;
}

/**
 * Проверяет на флеш (5 карт одной масти)
 */
function isFlush(cards: Card[]): boolean {
  return cards.every(card => card.suit === cards[0].suit);
}

/**
 * Проверяет на стрит (5 последовательных карт) - optimized
 */
function isStraight(cards: Card[], isShortDeck: boolean = false): boolean {
  const bits = getRankBits(cards);
  return findStraight(bits, isShortDeck) > 0;
}

/**
 * Получает старшую карту стрита
 */
function getStraightHighCard(cards: Card[], isShortDeck: boolean = false): number {
  const bits = getRankBits(cards);
  return findStraight(bits, isShortDeck);
}

/**
 * Получает группы карт по рангу (optimized)
 */
function getRankGroups(cards: Card[]): Map<Rank, Card[]> {
  const groups = new Map<Rank, Card[]>();
  
  for (const card of cards) {
    if (!groups.has(card.rank)) {
      groups.set(card.rank, []);
    }
    groups.get(card.rank)!.push(card);
  }
  
  return groups;
}

/**
 * Create cache key for hand
 */
function createHandKey(cards: Card[]): string {
  return cards
    .map(c => `${c.rank}${c.suit[0]}`)
    .sort()
    .join('');
}

/**
 * Вычисляет числовое значение комбинации для сравнения
 * Uses base-15 encoding for proper comparison
 */
function calculateHandValue(rank: HandRank, tiebreakers: number[]): number {
  // Base value from hand rank (multiplied by large factor)
  let value = rank * 100000000000;
  
  // Add tiebreakers in descending importance
  // Each position uses base 15 (max rank + 1)
  const multipliers = [759375, 50625, 3375, 225, 15, 1];
  
  for (let i = 0; i < Math.min(tiebreakers.length, multipliers.length); i++) {
    value += tiebreakers[i] * multipliers[i];
  }
  
  return value;
}

/**
 * Оценивает комбинацию из 5 карт (optimized)
 */
function evaluateFiveCards(cards: Card[], isShortDeck: boolean = false): HandEvaluation {
  if (cards.length !== 5) {
    throw new Error('Must evaluate exactly 5 cards');
  }
  
  // Check cache
  const cacheKey = createHandKey(cards);
  if (handCache.has(cacheKey)) {
    return handCache.get(cacheKey)!;
  }
  
  const flush = isFlush(cards);
  const straightHigh = getStraightHighCard(cards, isShortDeck);
  const straight = straightHigh > 0;
  const groups = getRankGroups(cards);
  const sortedCards = [...cards].sort((a, b) => b.rank - a.rank);
  
  // Get group sizes sorted
  const groupEntries = Array.from(groups.entries()).sort((a, b) => {
    // Sort by group size first, then by rank
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return b[0] - a[0];
  });
  const groupSizes = groupEntries.map(g => g[1].length);
  
  let result: HandEvaluation;
  
  // Роял-флеш и Стрит-флеш
  if (flush && straight) {
    const isRoyal = straightHigh === 14;
    const handRank = isRoyal ? HandRank.ROYAL_FLUSH : HandRank.STRAIGHT_FLUSH;
    
    result = {
      rank: handRank,
      name: isRoyal ? 'Роял-флеш' : 'Стрит-флеш',
      nameEn: isRoyal ? 'Royal Flush' : 'Straight Flush',
      cards: sortedCards,
      kickers: [],
      value: calculateHandValue(handRank, [straightHigh]),
      tiebreakers: [straightHigh],
      description: isRoyal 
        ? `Роял-флеш ${SUIT_NAMES[cards[0].suit]}`
        : `Стрит-флеш до ${RANK_NAMES[straightHigh as Rank]} ${SUIT_NAMES[cards[0].suit]}`,
      descriptionEn: isRoyal
        ? `Royal Flush of ${SUIT_NAMES_EN[cards[0].suit]}`
        : `${RANK_NAMES_FULL[straightHigh as Rank]}-high Straight Flush`
    };
  }
  // Каре
  else if (groupSizes[0] === 4) {
    const fourRank = groupEntries[0][0];
    const fourCards = groupEntries[0][1];
    const kicker = sortedCards.find(c => c.rank !== fourRank)!;
    
    result = {
      rank: HandRank.FOUR_OF_A_KIND,
      name: HAND_RANK_NAMES[HandRank.FOUR_OF_A_KIND],
      nameEn: HAND_RANK_NAMES_EN[HandRank.FOUR_OF_A_KIND],
      cards: fourCards,
      kickers: [kicker],
      value: calculateHandValue(HandRank.FOUR_OF_A_KIND, [fourRank, kicker.rank]),
      tiebreakers: [fourRank, kicker.rank],
      description: `Каре ${RANK_NAMES_FULL[fourRank]}`,
      descriptionEn: `Four ${RANK_NAMES_FULL[fourRank]}s`
    };
  }
  // Фулл-хаус - FIXED: Compare trips first, then pair
  else if (groupSizes[0] === 3 && groupSizes[1] === 2) {
    const threeRank = groupEntries[0][0];
    const threeCards = groupEntries[0][1];
    const pairRank = groupEntries[1][0];
    const pairCards = groupEntries[1][1];
    
    result = {
      rank: HandRank.FULL_HOUSE,
      name: HAND_RANK_NAMES[HandRank.FULL_HOUSE],
      nameEn: HAND_RANK_NAMES_EN[HandRank.FULL_HOUSE],
      cards: [...threeCards, ...pairCards],
      kickers: [],
      value: calculateHandValue(HandRank.FULL_HOUSE, [threeRank, pairRank]),
      tiebreakers: [threeRank, pairRank],
      description: `Фулл-хаус: ${RANK_NAMES_FULL[threeRank]} на ${RANK_NAMES_FULL[pairRank]}`,
      descriptionEn: `${RANK_NAMES_FULL[threeRank]}s full of ${RANK_NAMES_FULL[pairRank]}s`
    };
  }
  // Флеш
  else if (flush) {
    const tiebreakers = sortedCards.map(c => c.rank);
    result = {
      rank: HandRank.FLUSH,
      name: HAND_RANK_NAMES[HandRank.FLUSH],
      nameEn: HAND_RANK_NAMES_EN[HandRank.FLUSH],
      cards: sortedCards,
      kickers: [],
      value: calculateHandValue(HandRank.FLUSH, tiebreakers),
      tiebreakers,
      description: `Флеш ${SUIT_NAMES_RU[cards[0].suit]} до ${RANK_NAMES_FULL[sortedCards[0].rank]}`,
      descriptionEn: `${RANK_NAMES_FULL[sortedCards[0].rank]}-high ${SUIT_NAMES_EN[cards[0].suit]} Flush`
    };
  }
  // Стрит
  else if (straight) {
    result = {
      rank: HandRank.STRAIGHT,
      name: HAND_RANK_NAMES[HandRank.STRAIGHT],
      nameEn: HAND_RANK_NAMES_EN[HandRank.STRAIGHT],
      cards: sortedCards,
      kickers: [],
      value: calculateHandValue(HandRank.STRAIGHT, [straightHigh]),
      tiebreakers: [straightHigh],
      description: `Стрит до ${RANK_NAMES_FULL[straightHigh as Rank]}`,
      descriptionEn: `${RANK_NAMES_FULL[straightHigh as Rank]}-high Straight`
    };
  }
  // Тройка
  else if (groupSizes[0] === 3) {
    const threeRank = groupEntries[0][0];
    const threeCards = groupEntries[0][1];
    const kickers = sortedCards.filter(c => c.rank !== threeRank).slice(0, 2);
    const tiebreakers = [threeRank, ...kickers.map(k => k.rank)];
    
    result = {
      rank: HandRank.THREE_OF_A_KIND,
      name: HAND_RANK_NAMES[HandRank.THREE_OF_A_KIND],
      nameEn: HAND_RANK_NAMES_EN[HandRank.THREE_OF_A_KIND],
      cards: threeCards,
      kickers,
      value: calculateHandValue(HandRank.THREE_OF_A_KIND, tiebreakers),
      tiebreakers,
      description: `Тройка ${RANK_NAMES_FULL[threeRank]}`,
      descriptionEn: `Three ${RANK_NAMES_FULL[threeRank]}s`
    };
  }
  // Две пары - FIXED: Compare high pair, then low pair, then kicker
  else if (groupSizes[0] === 2 && groupSizes[1] === 2) {
    // groupEntries already sorted by size then rank
    const highPairRank = groupEntries[0][0];
    const highPairCards = groupEntries[0][1];
    const lowPairRank = groupEntries[1][0];
    const lowPairCards = groupEntries[1][1];
    const kicker = sortedCards.find(c => c.rank !== highPairRank && c.rank !== lowPairRank)!;
    
    result = {
      rank: HandRank.TWO_PAIR,
      name: HAND_RANK_NAMES[HandRank.TWO_PAIR],
      nameEn: HAND_RANK_NAMES_EN[HandRank.TWO_PAIR],
      cards: [...highPairCards, ...lowPairCards],
      kickers: [kicker],
      value: calculateHandValue(HandRank.TWO_PAIR, [highPairRank, lowPairRank, kicker.rank]),
      tiebreakers: [highPairRank, lowPairRank, kicker.rank],
      description: `Две пары: ${RANK_NAMES_FULL[highPairRank]} и ${RANK_NAMES_FULL[lowPairRank]}`,
      descriptionEn: `Two Pair, ${RANK_NAMES_FULL[highPairRank]}s and ${RANK_NAMES_FULL[lowPairRank]}s`
    };
  }
  // Пара
  else if (groupSizes[0] === 2) {
    const pairRank = groupEntries[0][0];
    const pairCards = groupEntries[0][1];
    const kickers = sortedCards.filter(c => c.rank !== pairRank).slice(0, 3);
    const tiebreakers = [pairRank, ...kickers.map(k => k.rank)];
    
    result = {
      rank: HandRank.PAIR,
      name: HAND_RANK_NAMES[HandRank.PAIR],
      nameEn: HAND_RANK_NAMES_EN[HandRank.PAIR],
      cards: pairCards,
      kickers,
      value: calculateHandValue(HandRank.PAIR, tiebreakers),
      tiebreakers,
      description: `Пара ${RANK_NAMES_FULL[pairRank]}`,
      descriptionEn: `Pair of ${RANK_NAMES_FULL[pairRank]}s`
    };
  }
  // Старшая карта
  else {
    const tiebreakers = sortedCards.map(c => c.rank);
    
    result = {
      rank: HandRank.HIGH_CARD,
      name: HAND_RANK_NAMES[HandRank.HIGH_CARD],
      nameEn: HAND_RANK_NAMES_EN[HandRank.HIGH_CARD],
      cards: [sortedCards[0]],
      kickers: sortedCards.slice(1),
      value: calculateHandValue(HandRank.HIGH_CARD, tiebreakers),
      tiebreakers,
      description: `Старшая карта ${RANK_NAMES_FULL[sortedCards[0].rank]}`,
      descriptionEn: `${RANK_NAMES_FULL[sortedCards[0].rank]} High`
    };
  }
  
  // Cache result
  if (handCache.size >= MAX_CACHE_SIZE) {
    // Clear oldest entries (simple LRU approximation)
    const keysToDelete = Array.from(handCache.keys()).slice(0, MAX_CACHE_SIZE / 2);
    keysToDelete.forEach(k => handCache.delete(k));
  }
  handCache.set(cacheKey, result);
  
  return result;
}

/**
 * Находит лучшую комбинацию из 5 карт среди любого количества карт
 */
export function evaluateHand(cards: Card[], isShortDeck: boolean = false): HandEvaluation {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate');
  }
  
  if (cards.length === 5) {
    return evaluateFiveCards(cards, isShortDeck);
  }
  
  // Перебираем все комбинации из 5 карт
  const combinations = getCombinations(cards, 5);
  let bestHand: HandEvaluation | null = null;
  
  for (const combo of combinations) {
    const evaluation = evaluateFiveCards(combo, isShortDeck);
    if (!bestHand || evaluation.value > bestHand.value) {
      bestHand = evaluation;
    }
  }
  
  return bestHand!;
}

/**
 * Evaluate Omaha hand (must use exactly 2 hole cards + 3 community)
 */
export function evaluateOmahaHand(holeCards: Card[], communityCards: Card[]): HandEvaluation {
  if (holeCards.length !== 4 || communityCards.length !== 5) {
    throw new Error('Omaha requires 4 hole cards and 5 community cards');
  }
  
  const holeCombos = getCombinations(holeCards, 2);
  const communityCombos = getCombinations(communityCards, 3);
  
  let bestHand: HandEvaluation | null = null;
  
  for (const hole of holeCombos) {
    for (const community of communityCombos) {
      const hand = evaluateFiveCards([...hole, ...community]);
      if (!bestHand || hand.value > bestHand.value) {
        bestHand = hand;
      }
    }
  }
  
  return bestHand!;
}

/**
 * Сравнивает две руки. Возвращает:
 *  1 если hand1 лучше
 * -1 если hand2 лучше
 *  0 если равны (split pot)
 */
export function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  // Use tiebreakers for precise comparison
  if (hand1.rank !== hand2.rank) {
    return hand1.rank > hand2.rank ? 1 : -1;
  }
  
  // Same rank - compare tiebreakers
  const maxLen = Math.max(hand1.tiebreakers.length, hand2.tiebreakers.length);
  for (let i = 0; i < maxLen; i++) {
    const t1 = hand1.tiebreakers[i] || 0;
    const t2 = hand2.tiebreakers[i] || 0;
    if (t1 > t2) return 1;
    if (t1 < t2) return -1;
  }
  
  return 0;
}

/**
 * Определяет победителей среди нескольких рук
 * Возвращает индексы всех победителей (для split pot)
 */
export function determineWinners(hands: HandEvaluation[]): number[] {
  if (hands.length === 0) return [];
  if (hands.length === 1) return [0];
  
  let bestIndices: number[] = [0];
  
  for (let i = 1; i < hands.length; i++) {
    const comparison = compareHands(hands[i], hands[bestIndices[0]]);
    
    if (comparison > 0) {
      // New best hand
      bestIndices = [i];
    } else if (comparison === 0) {
      // Tie - add to winners
      bestIndices.push(i);
    }
  }
  
  return bestIndices;
}

/**
 * Расширенное сравнение с детальным результатом
 */
export interface DetailedComparison {
  result: 1 | -1 | 0;
  winner: 'hand1' | 'hand2' | 'tie';
  reason: string;
  reasonEn: string;
}

export function compareHandsDetailed(hand1: HandEvaluation, hand2: HandEvaluation): DetailedComparison {
  const comparison = compareHands(hand1, hand2);
  
  if (comparison === 1) {
    if (hand1.rank > hand2.rank) {
      return {
        result: 1,
        winner: 'hand1',
        reason: `${hand1.name} бьёт ${hand2.name}`,
        reasonEn: `${hand1.nameEn} beats ${hand2.nameEn}`
      };
    }
    return {
      result: 1,
      winner: 'hand1',
      reason: `${hand1.description} бьёт ${hand2.description}`,
      reasonEn: `${hand1.descriptionEn} beats ${hand2.descriptionEn}`
    };
  }
  
  if (comparison === -1) {
    if (hand2.rank > hand1.rank) {
      return {
        result: -1,
        winner: 'hand2',
        reason: `${hand2.name} бьёт ${hand1.name}`,
        reasonEn: `${hand2.nameEn} beats ${hand1.nameEn}`
      };
    }
    return {
      result: -1,
      winner: 'hand2',
      reason: `${hand2.description} бьёт ${hand1.description}`,
      reasonEn: `${hand2.descriptionEn} beats ${hand1.descriptionEn}`
    };
  }
  
  return {
    result: 0,
    winner: 'tie',
    reason: `Полное равенство: ${hand1.description}`,
    reasonEn: `Split pot: ${hand1.descriptionEn}`
  };
}

// ==========================================
// RUN IT TWICE SUPPORT
// ==========================================

export interface RunItTwiceResult {
  board1: Card[];
  board2: Card[];
  winners1: number[]; // Indices of winners for board 1
  winners2: number[]; // Indices of winners for board 2
  hands1: HandEvaluation[];
  hands2: HandEvaluation[];
}

/**
 * Run the remaining board twice for all-in equity
 */
export function runItTwice(
  deck: Card[],
  playerHands: Card[][],
  currentCommunity: Card[]
): RunItTwiceResult {
  const cardsNeeded = 5 - currentCommunity.length;
  
  // First run
  const shuffled1 = shuffleDeckSecure(deck);
  const board1 = [...currentCommunity, ...shuffled1.slice(0, cardsNeeded)];
  
  // Second run - use different cards
  const shuffled2 = shuffleDeckSecure(deck);
  const board2 = [...currentCommunity, ...shuffled2.slice(0, cardsNeeded)];
  
  // Evaluate all hands for both boards
  const hands1 = playerHands.map(hand => evaluateHand([...hand, ...board1]));
  const hands2 = playerHands.map(hand => evaluateHand([...hand, ...board2]));
  
  return {
    board1,
    board2,
    winners1: determineWinners(hands1),
    winners2: determineWinners(hands2),
    hands1,
    hands2
  };
}

// ==========================================
// VALIDATION & TESTING
// ==========================================

/**
 * Валидация корректности сравнения рук
 */
export function validateHandComparison(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const testCases = [
    // Full House: тройка важнее пары
    { hand1: 'Ah Ad Ac 2h 2d', hand2: 'Kh Kd Kc Qh Qd', expected: 1, name: 'Full House: AAA22 > KKKQQ' },
    // Full House: одинаковая тройка, старшая пара
    { hand1: 'Ah Ad Ac Kh Kd', hand2: 'As Ac 2h 2d 2c', expected: 1, name: 'Full House: AAAKK > 222AA' },
    // Two Pair: старшая пара важнее
    { hand1: 'Ah Ad 3h 3d Kc', hand2: 'Kh Kd Qh Qd 2c', expected: 1, name: 'Two Pair: AA33 > KKQQ' },
    // Two Pair: кикер решает при равных парах
    { hand1: 'Ah Ad 3h 3d Kc', hand2: 'As Ac 3s 3c Qd', expected: 1, name: 'Two Pair: AA33K > AA33Q' },
    // Straight: wheel < обычный стрит
    { hand1: 'Ah 2d 3c 4h 5s', hand2: '2h 3d 4c 5h 6s', expected: -1, name: 'Straight: wheel < 6-high' },
    // Straight: wheel = wheel
    { hand1: 'Ah 2d 3c 4h 5s', hand2: 'As 2c 3h 4d 5c', expected: 0, name: 'Straight: wheel = wheel (split)' },
    // Pair: кикеры решают
    { hand1: 'Ah Ad Kc Qh Jd', hand2: 'As Ac Ks Qs Td', expected: 1, name: 'Pair: AAKQJ > AAKQT' },
    // High Card: все кикеры
    { hand1: 'Ah Kd Qc Jh 9s', hand2: 'As Kc Qs Js 8d', expected: 1, name: 'High Card: AKQJ9 > AKQJ8' },
    // Flush vs Straight
    { hand1: 'Ah Kh Qh Jh 9h', hand2: 'As Kd Qc Jh Ts', expected: 1, name: 'Flush > Straight' },
    // Straight Flush vs Quads
    { hand1: '9h 8h 7h 6h 5h', hand2: 'Ah Ad Ac As Kd', expected: 1, name: 'Straight Flush > Quads' },
    // Three of a Kind with kickers
    { hand1: 'Ah Ad Ac Kh Qd', hand2: 'As Ac 2h 2d 2c', expected: 1, name: 'Trips: AAA > 222' },
    // Flush: high card comparison
    { hand1: 'Ah Kh Qh Jh 9h', hand2: 'As Ks Qs Js 8s', expected: 1, name: 'Flush: AKQj9 > AKQJ8' },
  ];

  for (const tc of testCases) {
    const cards1 = parseCards(tc.hand1);
    const cards2 = parseCards(tc.hand2);
    
    if (cards1.length !== 5 || cards2.length !== 5) {
      results.push(`SKIP: ${tc.name} - invalid card format`);
      continue;
    }
    
    const hand1 = evaluateHand(cards1);
    const hand2 = evaluateHand(cards2);
    const comparison = compareHands(hand1, hand2);
    
    if (comparison === tc.expected) {
      passed++;
      results.push(`✓ PASS: ${tc.name}`);
    } else {
      failed++;
      results.push(`✗ FAIL: ${tc.name} - expected ${tc.expected}, got ${comparison}`);
      results.push(`  Hand1: ${hand1.description} (value: ${hand1.value})`);
      results.push(`  Hand2: ${hand2.description} (value: ${hand2.value})`);
    }
  }

  return { passed, failed, results };
}

// ==========================================
// УТИЛИТЫ
// ==========================================

/**
 * Форматирует карту для отображения
 */
export function formatCard(card: Card): string {
  return `${RANK_NAMES[card.rank]}${SUIT_NAMES[card.suit]}`;
}

/**
 * Форматирует массив карт
 */
export function formatCards(cards: Card[]): string {
  return cards.map(formatCard).join(' ');
}

/**
 * Получает цвет масти
 */
export function getSuitColor(suit: Suit): 'red' | 'black' {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

/**
 * Парсит строковое представление карты (например "Ah" = Ace of hearts)
 */
export function parseCard(str: string): Card | null {
  const rankMap: Record<string, Rank> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'T': 10, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  
  const suitMap: Record<string, Suit> = {
    'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades',
    '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs', '♠': 'spades'
  };
  
  if (str.length < 2) return null;
  
  const rankStr = str.slice(0, -1).toUpperCase();
  const suitStr = str.slice(-1).toLowerCase();
  
  const rank = rankMap[rankStr];
  const suit = suitMap[suitStr];
  
  if (!rank || !suit) return null;
  
  return { rank, suit, id: `${rank}-${suit}` };
}

/**
 * Парсит несколько карт из строки (например "Ah Kh Qh Jh Th")
 */
export function parseCards(str: string): Card[] {
  return str.split(/\s+/).map(parseCard).filter((c): c is Card => c !== null);
}

/**
 * Convert card to short string format
 */
export function cardToString(card: Card): string {
  return `${RANK_NAMES[card.rank]}${card.suit[0]}`;
}

/**
 * Convert array of cards to short string format
 */
export function cardsToString(cards: Card[]): string {
  return cards.map(cardToString).join(' ');
}

/**
 * Get hand strength category (for equity display)
 */
export function getHandStrengthCategory(hand: HandEvaluation): 'monster' | 'strong' | 'medium' | 'weak' | 'nothing' {
  switch (hand.rank) {
    case HandRank.ROYAL_FLUSH:
    case HandRank.STRAIGHT_FLUSH:
    case HandRank.FOUR_OF_A_KIND:
      return 'monster';
    case HandRank.FULL_HOUSE:
    case HandRank.FLUSH:
    case HandRank.STRAIGHT:
      return 'strong';
    case HandRank.THREE_OF_A_KIND:
    case HandRank.TWO_PAIR:
      return 'medium';
    case HandRank.PAIR:
      return 'weak';
    default:
      return 'nothing';
  }
}

/**
 * Clear hand evaluation cache
 */
export function clearHandCache(): void {
  handCache.clear();
}

/**
 * Get cache statistics
 */
export function getHandCacheStats(): { size: number; maxSize: number } {
  return { size: handCache.size, maxSize: MAX_CACHE_SIZE };
}
