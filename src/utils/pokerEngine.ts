// ==========================================
// POKER ENGINE - Базовый игровой движок
// ==========================================

// Масти карт
export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type Suit = typeof SUITS[number];

// Ранги карт (2-14, где 14 = Туз)
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = typeof RANKS[number];

// Названия рангов
export const RANK_NAMES: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

// Названия мастей
export const SUIT_NAMES: Record<Suit, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠'
};

export const SUIT_NAMES_RU: Record<Suit, string> = {
  hearts: 'Черви', diamonds: 'Бубны', clubs: 'Трефы', spades: 'Пики'
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

// Результат оценки руки
export interface HandEvaluation {
  rank: HandRank;
  name: string;
  cards: Card[]; // 5 лучших карт комбинации
  kickers: Card[]; // Кикеры для сравнения
  value: number; // Числовое значение для сравнения
  description: string; // Полное описание комбинации
}

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

// ==========================================
// ОЦЕНКА КОМБИНАЦИЙ
// ==========================================

/**
 * Получает все комбинации из n карт
 */
function getCombinations(cards: Card[], n: number): Card[][] {
  if (n === 0) return [[]];
  if (cards.length < n) return [];
  
  const [first, ...rest] = cards;
  const withFirst = getCombinations(rest, n - 1).map(combo => [first, ...combo]);
  const withoutFirst = getCombinations(rest, n);
  
  return [...withFirst, ...withoutFirst];
}

/**
 * Проверяет на флеш (5 карт одной масти)
 */
function isFlush(cards: Card[]): boolean {
  return cards.every(card => card.suit === cards[0].suit);
}

/**
 * Проверяет на стрит (5 последовательных карт)
 */
function isStraight(cards: Card[]): boolean {
  const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
  
  // Проверка на A-2-3-4-5 (wheel)
  if (ranks[4] === 14 && ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 4 && ranks[3] === 5) {
    return true;
  }
  
  // Проверка на последовательность
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Получает группы карт по рангу
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
 * Вычисляет числовое значение комбинации для сравнения
 */
function calculateHandValue(rank: HandRank, primaryCards: Card[], kickers: Card[]): number {
  let value = rank * 100000000000;
  
  // Добавляем значения основных карт
  const sortedPrimary = [...primaryCards].sort((a, b) => b.rank - a.rank);
  for (let i = 0; i < sortedPrimary.length; i++) {
    value += sortedPrimary[i].rank * Math.pow(15, 4 - i);
  }
  
  // Добавляем кикеры
  const sortedKickers = [...kickers].sort((a, b) => b.rank - a.rank);
  for (let i = 0; i < sortedKickers.length; i++) {
    value += sortedKickers[i].rank * Math.pow(15, -i - 1);
  }
  
  return value;
}

/**
 * Оценивает комбинацию из 5 карт
 */
function evaluateFiveCards(cards: Card[]): HandEvaluation {
  if (cards.length !== 5) {
    throw new Error('Must evaluate exactly 5 cards');
  }
  
  const flush = isFlush(cards);
  const straight = isStraight(cards);
  const groups = getRankGroups(cards);
  const sortedCards = [...cards].sort((a, b) => b.rank - a.rank);
  
  // Получаем группы по размеру
  const groupSizes = Array.from(groups.values()).map(g => g.length).sort((a, b) => b - a);
  
  // Роял-флеш
  if (flush && straight) {
    const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
    if (ranks[0] === 10 && ranks[4] === 14) {
      return {
        rank: HandRank.ROYAL_FLUSH,
        name: HAND_RANK_NAMES[HandRank.ROYAL_FLUSH],
        cards: sortedCards,
        kickers: [],
        value: calculateHandValue(HandRank.ROYAL_FLUSH, sortedCards, []),
        description: `Роял-флеш ${SUIT_NAMES[cards[0].suit]}`
      };
    }
    
    // Стрит-флеш
    return {
      rank: HandRank.STRAIGHT_FLUSH,
      name: HAND_RANK_NAMES[HandRank.STRAIGHT_FLUSH],
      cards: sortedCards,
      kickers: [],
      value: calculateHandValue(HandRank.STRAIGHT_FLUSH, sortedCards, []),
      description: `Стрит-флеш до ${RANK_NAMES[sortedCards[0].rank]}`
    };
  }
  
  // Каре
  if (groupSizes[0] === 4) {
    const fourOfAKind = Array.from(groups.entries()).find(([_, cards]) => cards.length === 4)!;
    const kicker = sortedCards.find(c => c.rank !== fourOfAKind[0])!;
    return {
      rank: HandRank.FOUR_OF_A_KIND,
      name: HAND_RANK_NAMES[HandRank.FOUR_OF_A_KIND],
      cards: fourOfAKind[1],
      kickers: [kicker],
      value: calculateHandValue(HandRank.FOUR_OF_A_KIND, fourOfAKind[1], [kicker]),
      description: `Каре ${RANK_NAMES[fourOfAKind[0]]}ок`
    };
  }
  
  // Фулл-хаус
  if (groupSizes[0] === 3 && groupSizes[1] === 2) {
    const threeOfAKind = Array.from(groups.entries()).find(([_, cards]) => cards.length === 3)!;
    const pair = Array.from(groups.entries()).find(([_, cards]) => cards.length === 2)!;
    return {
      rank: HandRank.FULL_HOUSE,
      name: HAND_RANK_NAMES[HandRank.FULL_HOUSE],
      cards: [...threeOfAKind[1], ...pair[1]],
      kickers: [],
      value: calculateHandValue(HandRank.FULL_HOUSE, threeOfAKind[1], pair[1]),
      description: `Фулл-хаус: ${RANK_NAMES[threeOfAKind[0]]}ки и ${RANK_NAMES[pair[0]]}ки`
    };
  }
  
  // Флеш
  if (flush) {
    return {
      rank: HandRank.FLUSH,
      name: HAND_RANK_NAMES[HandRank.FLUSH],
      cards: sortedCards,
      kickers: [],
      value: calculateHandValue(HandRank.FLUSH, sortedCards, []),
      description: `Флеш ${SUIT_NAMES_RU[cards[0].suit]} до ${RANK_NAMES[sortedCards[0].rank]}`
    };
  }
  
  // Стрит
  if (straight) {
    // Для wheel (A-2-3-4-5) старшая карта - 5
    const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
    const isWheel = ranks[4] === 14 && ranks[0] === 2;
    const highCard = isWheel ? 5 : sortedCards[0].rank;
    
    return {
      rank: HandRank.STRAIGHT,
      name: HAND_RANK_NAMES[HandRank.STRAIGHT],
      cards: sortedCards,
      kickers: [],
      value: calculateHandValue(HandRank.STRAIGHT, sortedCards, []),
      description: `Стрит до ${RANK_NAMES[highCard as Rank]}`
    };
  }
  
  // Тройка
  if (groupSizes[0] === 3) {
    const threeOfAKind = Array.from(groups.entries()).find(([_, cards]) => cards.length === 3)!;
    const kickers = sortedCards.filter(c => c.rank !== threeOfAKind[0]).slice(0, 2);
    return {
      rank: HandRank.THREE_OF_A_KIND,
      name: HAND_RANK_NAMES[HandRank.THREE_OF_A_KIND],
      cards: threeOfAKind[1],
      kickers,
      value: calculateHandValue(HandRank.THREE_OF_A_KIND, threeOfAKind[1], kickers),
      description: `Тройка ${RANK_NAMES[threeOfAKind[0]]}ок`
    };
  }
  
  // Две пары
  if (groupSizes[0] === 2 && groupSizes[1] === 2) {
    const pairs = Array.from(groups.entries())
      .filter(([_, cards]) => cards.length === 2)
      .sort((a, b) => b[0] - a[0]);
    const kicker = sortedCards.find(c => c.rank !== pairs[0][0] && c.rank !== pairs[1][0])!;
    return {
      rank: HandRank.TWO_PAIR,
      name: HAND_RANK_NAMES[HandRank.TWO_PAIR],
      cards: [...pairs[0][1], ...pairs[1][1]],
      kickers: [kicker],
      value: calculateHandValue(HandRank.TWO_PAIR, [...pairs[0][1], ...pairs[1][1]], [kicker]),
      description: `Две пары: ${RANK_NAMES[pairs[0][0]]}ки и ${RANK_NAMES[pairs[1][0]]}ки`
    };
  }
  
  // Пара
  if (groupSizes[0] === 2) {
    const pair = Array.from(groups.entries()).find(([_, cards]) => cards.length === 2)!;
    const kickers = sortedCards.filter(c => c.rank !== pair[0]).slice(0, 3);
    return {
      rank: HandRank.PAIR,
      name: HAND_RANK_NAMES[HandRank.PAIR],
      cards: pair[1],
      kickers,
      value: calculateHandValue(HandRank.PAIR, pair[1], kickers),
      description: `Пара ${RANK_NAMES[pair[0]]}ок`
    };
  }
  
  // Старшая карта
  return {
    rank: HandRank.HIGH_CARD,
    name: HAND_RANK_NAMES[HandRank.HIGH_CARD],
    cards: [sortedCards[0]],
    kickers: sortedCards.slice(1),
    value: calculateHandValue(HandRank.HIGH_CARD, [sortedCards[0]], sortedCards.slice(1)),
    description: `Старшая карта ${RANK_NAMES[sortedCards[0].rank]}`
  };
}

/**
 * Находит лучшую комбинацию из 5 карт среди любого количества карт
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate');
  }
  
  if (cards.length === 5) {
    return evaluateFiveCards(cards);
  }
  
  // Перебираем все комбинации из 5 карт
  const combinations = getCombinations(cards, 5);
  let bestHand: HandEvaluation | null = null;
  
  for (const combo of combinations) {
    const evaluation = evaluateFiveCards(combo);
    if (!bestHand || evaluation.value > bestHand.value) {
      bestHand = evaluation;
    }
  }
  
  return bestHand!;
}

/**
 * Сравнивает две руки. Возвращает:
 *  1 если hand1 лучше
 * -1 если hand2 лучше
 *  0 если равны
 */
export function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  if (hand1.value > hand2.value) return 1;
  if (hand1.value < hand2.value) return -1;
  return 0;
}

/**
 * Определяет победителей среди нескольких рук
 */
export function determineWinners(hands: HandEvaluation[]): number[] {
  if (hands.length === 0) return [];
  
  let maxValue = Math.max(...hands.map(h => h.value));
  const winners: number[] = [];
  
  hands.forEach((hand, index) => {
    if (hand.value === maxValue) {
      winners.push(index);
    }
  });
  
  return winners;
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
    'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  
  const suitMap: Record<string, Suit> = {
    'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades'
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
