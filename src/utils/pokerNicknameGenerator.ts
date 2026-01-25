/**
 * Poker Nickname Generator
 * Генератор реалистичных покерных никнеймов для маскировки ботов
 */

// Популярные префиксы для покерных никнеймов
const PREFIXES = [
  'Pro', 'Lucky', 'King', 'Ace', 'Royal', 'Dark', 'Wild', 'Cool', 'Big', 'Fast',
  'Hot', 'Mad', 'Rich', 'Gold', 'Silver', 'Red', 'Blue', 'Black', 'White', 'Iron',
  'Steel', 'Crazy', 'Smart', 'Slick', 'Swift', 'Mega', 'Ultra', 'Super', 'Epic', 'Turbo'
];

// Покерные термины и слова
const POKER_WORDS = [
  'Shark', 'Fish', 'Bluff', 'Nuts', 'Dealer', 'River', 'Flop', 'Turn', 'Stack', 'Chip',
  'Bet', 'Fold', 'Call', 'Raise', 'All', 'Pot', 'Blind', 'Button', 'Hand', 'Card',
  'Pair', 'Flush', 'Straight', 'Full', 'Quad', 'Royal', 'Pocket', 'Kicker', 'Outs', 'Draw'
];

// Русские имена
const RUSSIAN_NAMES = [
  'Viktor', 'Alexey', 'Dmitry', 'Sergey', 'Andrey', 'Maxim', 'Ivan', 'Pavel', 'Nikita', 'Roman',
  'Mikhail', 'Artem', 'Denis', 'Kirill', 'Anton', 'Oleg', 'Vladislav', 'Timur', 'Ruslan', 'Ilya',
  'Anastasia', 'Maria', 'Elena', 'Natalia', 'Olga', 'Anna', 'Ekaterina', 'Irina', 'Tatiana', 'Yulia'
];

// Международные имена
const INTERNATIONAL_NAMES = [
  'John', 'Mike', 'Alex', 'Max', 'Sam', 'Chris', 'Dan', 'Tom', 'Nick', 'Jake',
  'Leo', 'Oscar', 'Felix', 'Hugo', 'Carlos', 'Marco', 'Lucas', 'Noah', 'Liam', 'James',
  'Emma', 'Sofia', 'Mia', 'Luna', 'Aria', 'Eva', 'Lily', 'Zoe', 'Ava', 'Isla'
];

// Суффиксы
const SUFFIXES = [
  'Pro', 'King', 'Star', 'Boss', 'Master', 'Ace', 'Wolf', 'Fox', 'Bear', 'Tiger',
  'Lion', 'Hawk', 'Eagle', 'Dragon', 'Phoenix', 'Knight', 'Ninja', 'Samurai', 'Viking', 'Warrior',
  '777', '888', '999', 'XX', 'XO', 'VIP', 'GG', 'WP', 'GL', 'HF'
];

// Популярные форматы никнеймов (как на PokerStars/GGPoker)
const NICKNAME_PATTERNS = [
  // Имя + число
  () => `${randomFrom(RUSSIAN_NAMES)}${randomNumber(1, 999)}`,
  () => `${randomFrom(INTERNATIONAL_NAMES)}${randomNumber(1, 999)}`,
  
  // Имя + суффикс
  () => `${randomFrom(RUSSIAN_NAMES)}_${randomFrom(SUFFIXES)}`,
  () => `${randomFrom(INTERNATIONAL_NAMES)}${randomFrom(SUFFIXES)}`,
  
  // Префикс + слово
  () => `${randomFrom(PREFIXES)}${randomFrom(POKER_WORDS)}`,
  () => `${randomFrom(PREFIXES)}_${randomFrom(POKER_WORDS)}`,
  
  // Короткий креативный
  () => `${randomFrom(PREFIXES)}${randomNumber(10, 99)}`,
  () => `x${randomFrom(INTERNATIONAL_NAMES).toLowerCase()}x`,
  
  // Составные (PokerStars style)
  () => `${randomFrom(POKER_WORDS)}${randomFrom(SUFFIXES)}${randomNumber(1, 99)}`,
  () => `The${randomFrom(POKER_WORDS)}${randomFrom(SUFFIXES)}`,
  
  // Русский стиль
  () => `${randomFrom(RUSSIAN_NAMES).toLowerCase()}_${randomNumber(1, 9999)}`,
  () => `${randomFrom(PREFIXES)}${randomFrom(RUSSIAN_NAMES)}`,
  
  // GGPoker style (Hero + ...)
  () => `Hero${randomFrom(SUFFIXES)}${randomNumber(1, 99)}`,
  () => `${randomFrom(POKER_WORDS)}Hero${randomNumber(1, 999)}`,
  
  // Животные
  () => `${randomFrom(PREFIXES)}${randomFrom(['Wolf', 'Fox', 'Bear', 'Tiger', 'Lion', 'Shark'])}`,
  () => `${randomFrom(['Wolf', 'Fox', 'Bear', 'Tiger', 'Lion', 'Shark'])}${randomNumber(1, 999)}`,
  
  // Минималистичные
  () => `${randomLetter()}${randomLetter()}${randomLetter()}${randomNumber(100, 999)}`,
  () => `${randomFrom(INTERNATIONAL_NAMES).slice(0, 3)}${randomNumber(10, 9999)}`,
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomLetter(): string {
  return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

/**
 * Генерирует уникальный покерный никнейм
 */
export function generatePokerNickname(): string {
  const pattern = randomFrom(NICKNAME_PATTERNS);
  return pattern();
}

/**
 * Генерирует массив уникальных никнеймов
 */
export function generateUniqueNicknames(count: number): string[] {
  const nicknames = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 10;
  
  while (nicknames.size < count && attempts < maxAttempts) {
    nicknames.add(generatePokerNickname());
    attempts++;
  }
  
  // Если не хватает уникальных, добавляем с числами
  while (nicknames.size < count) {
    nicknames.add(`Player${Date.now() % 10000}_${nicknames.size}`);
  }
  
  return Array.from(nicknames);
}

/**
 * Генерирует никнейм для конкретного индекса (детерминированный)
 * Используется для стабильного отображения
 */
export function generateNicknameForIndex(index: number, seed?: string): string {
  // Используем seed для стабильности
  const hash = seed ? hashCode(seed) : index;
  const patternIndex = Math.abs(hash) % NICKNAME_PATTERNS.length;
  
  // Сохраняем текущий random state и используем детерминированный
  const savedRandom = Math.random;
  let seedValue = Math.abs(hash);
  
  // Простой детерминированный random
  // @ts-ignore
  Math.random = () => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280;
  };
  
  const nickname = NICKNAME_PATTERNS[patternIndex]();
  
  // @ts-ignore
  Math.random = savedRandom;
  
  return nickname;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * Проверяет, является ли никнейм техническим (бот)
 */
export function isBotNickname(name: string): boolean {
  return name.startsWith('TestBot_') || name.startsWith('Bot_') || name.startsWith('AI_');
}

/**
 * Маскирует имя бота под реальное
 */
export function maskBotName(originalName: string): string {
  if (!isBotNickname(originalName)) {
    return originalName;
  }
  // Используем оригинальное имя как seed для стабильности
  return generateNicknameForIndex(0, originalName);
}
