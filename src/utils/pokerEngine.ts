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
 * Использует систему с большими множителями для корректного сравнения
 * 
 * Формат value: RRPPPPPPKKKKK
 * R - ранг комбинации (1-10)
 * P - значения primary cards (до 5 карт)
 * K - значения кикеров (до 5 карт)
 */
function calculateHandValue(rank: HandRank, primaryCards: Card[], kickers: Card[]): number {
  // Базовое значение ранга комбинации (множитель 10^12)
  let value = rank * 1000000000000;
  
  // Сортируем primary cards по убыванию
  const sortedPrimary = [...primaryCards].sort((a, b) => b.rank - a.rank);
  
  // Primary cards: каждая карта умножается на уменьшающийся множитель
  // Позиция 0: 15^8, Позиция 1: 15^6, Позиция 2: 15^4, Позиция 3: 15^2, Позиция 4: 15^0
  const primaryMultipliers = [2562890625, 11390625, 50625, 225, 1];
  for (let i = 0; i < sortedPrimary.length && i < 5; i++) {
    value += sortedPrimary[i].rank * primaryMultipliers[i];
  }
  
  // Сортируем кикеры по убыванию
  const sortedKickers = [...kickers].sort((a, b) => b.rank - a.rank);
  
  // Кикеры: используем меньшие множители чтобы не перекрывать primary
  // Суммарный вес кикеров должен быть меньше минимального веса primary карты
  const kickerMultipliers = [14400, 960, 64, 4, 1];
  for (let i = 0; i < sortedKickers.length && i < 5; i++) {
    value += sortedKickers[i].rank * kickerMultipliers[i];
  }
  
  return value;
}

/**
 * Специальное сравнение для Straight (учёт wheel)
 */
function getStraightHighCard(cards: Card[]): number {
  const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
  // Wheel: A-2-3-4-5 - старшая карта 5
  if (ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 4 && ranks[3] === 5 && ranks[4] === 14) {
    return 5;
  }
  return Math.max(...ranks);
}

/**
 * Вычисляет значение для Straight с учётом wheel
 */
function calculateStraightValue(rank: HandRank, cards: Card[]): number {
  const highCard = getStraightHighCard(cards);
  return rank * 1000000000000 + highCard * 2562890625;
}

/**
 * Вычисляет значение для Full House
 * Тройка сравнивается первой, затем пара
 */
function calculateFullHouseValue(threeRank: Rank, pairRank: Rank): number {
  return HandRank.FULL_HOUSE * 1000000000000 + threeRank * 2562890625 + pairRank * 11390625;
}

/**
 * Вычисляет значение для Two Pair
 * Старшая пара, младшая пара, затем кикер
 */
function calculateTwoPairValue(highPairRank: Rank, lowPairRank: Rank, kickerRank: Rank): number {
  return HandRank.TWO_PAIR * 1000000000000 + highPairRank * 2562890625 + lowPairRank * 11390625 + kickerRank * 50625;
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
  
  // Роял-флеш и Стрит-флеш
  if (flush && straight) {
    const highCard = getStraightHighCard(cards);
    
    // Роял-флеш: T-J-Q-K-A одной масти
    if (highCard === 14) {
      const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
      if (ranks[0] === 10) {
        return {
          rank: HandRank.ROYAL_FLUSH,
          name: HAND_RANK_NAMES[HandRank.ROYAL_FLUSH],
          cards: sortedCards,
          kickers: [],
          value: calculateStraightValue(HandRank.ROYAL_FLUSH, cards),
          description: `Роял-флеш ${SUIT_NAMES[cards[0].suit]}`
        };
      }
    }
    
    // Стрит-флеш (включая wheel flush A-2-3-4-5)
    return {
      rank: HandRank.STRAIGHT_FLUSH,
      name: HAND_RANK_NAMES[HandRank.STRAIGHT_FLUSH],
      cards: sortedCards,
      kickers: [],
      value: calculateStraightValue(HandRank.STRAIGHT_FLUSH, cards),
      description: `Стрит-флеш до ${RANK_NAMES[highCard as Rank]}`
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
  
  // Фулл-хаус - сравниваем сначала тройку, потом пару
  if (groupSizes[0] === 3 && groupSizes[1] === 2) {
    const threeOfAKind = Array.from(groups.entries()).find(([_, cards]) => cards.length === 3)!;
    const pair = Array.from(groups.entries()).find(([_, cards]) => cards.length === 2)!;
    // Для Full House: тройка важнее пары, поэтому тройка в primary, пара в kickers
    return {
      rank: HandRank.FULL_HOUSE,
      name: HAND_RANK_NAMES[HandRank.FULL_HOUSE],
      cards: [...threeOfAKind[1], ...pair[1]],
      kickers: [],
      value: calculateFullHouseValue(threeOfAKind[0], pair[0]),
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
  
  // Стрит - используем специальную функцию для wheel
  if (straight) {
    const highCard = getStraightHighCard(cards);
    
    return {
      rank: HandRank.STRAIGHT,
      name: HAND_RANK_NAMES[HandRank.STRAIGHT],
      cards: sortedCards,
      kickers: [],
      value: calculateStraightValue(HandRank.STRAIGHT, cards),
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
  
  // Две пары - используем специальную функцию для корректного сравнения
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
      value: calculateTwoPairValue(pairs[0][0], pairs[1][0], kicker.rank),
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
 *  0 если равны (split pot)
 */
export function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  // Сначала сравниваем ранг комбинации
  if (hand1.rank > hand2.rank) return 1;
  if (hand1.rank < hand2.rank) return -1;
  
  // Ранги равны - сравниваем по value (уже учитывает все нюансы)
  if (hand1.value > hand2.value) return 1;
  if (hand1.value < hand2.value) return -1;
  
  return 0;
}

/**
 * Определяет победителей среди нескольких рук
 * Возвращает индексы всех победителей (для split pot)
 */
export function determineWinners(hands: HandEvaluation[]): number[] {
  if (hands.length === 0) return [];
  if (hands.length === 1) return [0];
  
  let bestHandIndex = 0;
  const winners: number[] = [0];
  
  for (let i = 1; i < hands.length; i++) {
    const comparison = compareHands(hands[i], hands[bestHandIndex]);
    
    if (comparison > 0) {
      // Новая рука лучше
      bestHandIndex = i;
      winners.length = 0;
      winners.push(i);
    } else if (comparison === 0) {
      // Равные руки - добавляем к победителям
      winners.push(i);
    }
  }
  
  return winners;
}

/**
 * Расширенное сравнение с детальным результатом
 */
export interface DetailedComparison {
  result: 1 | -1 | 0;
  winner: 'hand1' | 'hand2' | 'tie';
  reason: string;
}

export function compareHandsDetailed(hand1: HandEvaluation, hand2: HandEvaluation): DetailedComparison {
  // Сравниваем ранг комбинации
  if (hand1.rank > hand2.rank) {
    return {
      result: 1,
      winner: 'hand1',
      reason: `${hand1.name} бьёт ${hand2.name}`
    };
  }
  if (hand1.rank < hand2.rank) {
    return {
      result: -1,
      winner: 'hand2',
      reason: `${hand2.name} бьёт ${hand1.name}`
    };
  }
  
  // Равные ранги - сравниваем по value
  if (hand1.value > hand2.value) {
    return {
      result: 1,
      winner: 'hand1',
      reason: `${hand1.description} бьёт ${hand2.description}`
    };
  }
  if (hand1.value < hand2.value) {
    return {
      result: -1,
      winner: 'hand2',
      reason: `${hand2.description} бьёт ${hand1.description}`
    };
  }
  
  return {
    result: 0,
    winner: 'tie',
    reason: `Полное равенство: ${hand1.description}`
  };
}

/**
 * Валидация корректности сравнения рук (для тестирования)
 */
export function validateHandComparison(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const testCases = [
    // Full House: тройка важнее пары
    { 
      hand1: 'Ah Ad Ac 2h 2d', // AAA22
      hand2: 'Kh Kd Kc Qh Qd', // KKKQQ
      expected: 1,
      name: 'Full House: AAA22 > KKKQQ'
    },
    // Two Pair: старшая пара важнее
    {
      hand1: 'Ah Ad 3h 3d Kc', // AA33K
      hand2: 'Kh Kd Qh Qd 2c', // KKQQ2
      expected: 1,
      name: 'Two Pair: AA33 > KKQQ'
    },
    // Two Pair: кикер решает при равных парах
    {
      hand1: 'Ah Ad 3h 3d Kc', // AA33K
      hand2: 'As Ac 3s 3c Qd', // AA33Q
      expected: 1,
      name: 'Two Pair: AA33K > AA33Q (кикер)'
    },
    // Straight: wheel < обычный стрит
    {
      hand1: 'Ah 2d 3c 4h 5s', // wheel A-5
      hand2: '2h 3d 4c 5h 6s', // 2-6
      expected: -1,
      name: 'Straight: wheel < 6-high'
    },
    // Pair: кикеры решают
    {
      hand1: 'Ah Ad Kc Qh Jd', // AAKQj
      hand2: 'As Ac Ks Qs Td', // AAKQT
      expected: 1,
      name: 'Pair: AAKQJ > AAKQT (кикер)'
    },
    // High Card: все кикеры
    {
      hand1: 'Ah Kd Qc Jh 9s',
      hand2: 'As Kc Qs Js 8d',
      expected: 1,
      name: 'High Card: AKQJ9 > AKQJ8'
    },
  ];

  for (const tc of testCases) {
    const cards1 = parseCards(tc.hand1);
    const cards2 = parseCards(tc.hand2);
    
    if (cards1.length !== 5 || cards2.length !== 5) {
      results.push(`SKIP: ${tc.name} - неверный формат карт`);
      continue;
    }
    
    const hand1 = evaluateHand(cards1);
    const hand2 = evaluateHand(cards2);
    const comparison = compareHands(hand1, hand2);
    
    if (comparison === tc.expected) {
      passed++;
      results.push(`PASS: ${tc.name}`);
    } else {
      failed++;
      results.push(`FAIL: ${tc.name} - ожидалось ${tc.expected}, получено ${comparison}`);
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
