// Mafia hierarchy ranks system
// Интегрируется с RPS рейтингом и статистикой турниров

import avatar1 from "@/assets/avatars/poker-avatar-1.png";
import avatar2 from "@/assets/avatars/poker-avatar-2.png";
import avatar3 from "@/assets/avatars/poker-avatar-3.png";
import avatar4 from "@/assets/avatars/poker-avatar-4.png";
import avatar5 from "@/assets/avatars/poker-avatar-5.png";
import avatar6 from "@/assets/avatars/poker-avatar-6.png";
import avatar7 from "@/assets/avatars/poker-avatar-7.png";
import avatar8 from "@/assets/avatars/poker-avatar-8.png";
import avatar9 from "@/assets/avatars/poker-avatar-9.png";
import avatar10 from "@/assets/avatars/poker-avatar-10.png";

export interface MafiaRank {
  id: string;
  name: string;
  title: string;
  description: string;
  avatar: string;
  requirement: {
    type: 'games' | 'wins' | 'rating' | 'combined';
    games?: number;
    wins?: number;
    rating?: number;
  };
  color: string;
  textColor: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  rarity: 'initiate' | 'soldier' | 'captain' | 'underboss' | 'boss' | 'godfather';
  icon: string;
}

export const MAFIA_RANKS: MafiaRank[] = [
  {
    id: 'picciotto',
    name: 'Пиччотто',
    title: 'Юный солдат',
    description: 'Вступите в семью — сыграйте первый турнир',
    avatar: avatar1,
    requirement: { type: 'games', games: 1 },
    color: 'zinc',
    textColor: 'text-zinc-400',
    bgGradient: 'from-zinc-600 to-zinc-800',
    borderColor: 'border-zinc-500',
    glowColor: 'shadow-zinc-500/30',
    rarity: 'initiate',
    icon: '🃏'
  },
  {
    id: 'soldato',
    name: 'Солдато',
    title: 'Проверенный боец',
    description: 'Покажите преданность — сыграйте 3 турнира',
    avatar: avatar2,
    requirement: { type: 'games', games: 3 },
    color: 'stone',
    textColor: 'text-stone-400',
    bgGradient: 'from-stone-600 to-stone-800',
    borderColor: 'border-stone-500',
    glowColor: 'shadow-stone-500/30',
    rarity: 'initiate',
    icon: '♠️'
  },
  {
    id: 'sgarrista',
    name: 'Сгарриста',
    title: 'Правая рука капо',
    description: 'Докажите мастерство — выиграйте турнир',
    avatar: avatar3,
    requirement: { type: 'wins', wins: 1 },
    color: 'amber',
    textColor: 'text-amber-400',
    bgGradient: 'from-amber-600 to-amber-800',
    borderColor: 'border-amber-500',
    glowColor: 'shadow-amber-500/40',
    rarity: 'soldier',
    icon: '♣️'
  },
  {
    id: 'associato',
    name: 'Ассоциато',
    title: 'Уважаемый член семьи',
    description: 'Заслужите уважение — 5 турниров',
    avatar: avatar4,
    requirement: { type: 'games', games: 5 },
    color: 'orange',
    textColor: 'text-orange-400',
    bgGradient: 'from-orange-600 to-orange-800',
    borderColor: 'border-orange-500',
    glowColor: 'shadow-orange-500/40',
    rarity: 'soldier',
    icon: '♥️'
  },
  {
    id: 'caporegime',
    name: 'Капореджиме',
    title: 'Командир бригады',
    description: 'Silver уровень (1200+ RPS) И 5 игр',
    avatar: avatar5,
    requirement: { type: 'combined', rating: 1200, games: 5 },
    color: 'blue',
    textColor: 'text-blue-400',
    bgGradient: 'from-blue-600 to-blue-800',
    borderColor: 'border-blue-500',
    glowColor: 'shadow-blue-500/40',
    rarity: 'captain',
    icon: '♦️'
  },
  {
    id: 'shark',
    name: 'Шарк',
    title: 'Акула покера',
    description: '3 победы И 8 турниров',
    avatar: avatar6,
    requirement: { type: 'combined', wins: 3, games: 8 },
    color: 'purple',
    textColor: 'text-purple-400',
    bgGradient: 'from-purple-600 to-purple-800',
    borderColor: 'border-purple-500',
    glowColor: 'shadow-purple-500/50',
    rarity: 'captain',
    icon: '🦈'
  },
  {
    id: 'kapo',
    name: 'Капо',
    title: 'Глава группировки',
    description: '10 турниров И 5 побед',
    avatar: avatar7,
    requirement: { type: 'combined', games: 10, wins: 5 },
    color: 'red',
    textColor: 'text-red-400',
    bgGradient: 'from-red-600 to-red-800',
    borderColor: 'border-red-500',
    glowColor: 'shadow-red-500/50',
    rarity: 'underboss',
    icon: '🎰'
  },
  {
    id: 'konsigliere',
    name: 'Консильери',
    title: 'Правая рука Дона',
    description: 'Gold (1500+ RPS) И 10 игр И 5 побед',
    avatar: avatar8,
    requirement: { type: 'combined', rating: 1500, games: 10, wins: 5 },
    color: 'yellow',
    textColor: 'text-yellow-400',
    bgGradient: 'from-yellow-500 to-yellow-700',
    borderColor: 'border-yellow-500',
    glowColor: 'shadow-yellow-500/50',
    rarity: 'underboss',
    icon: '🎩'
  },
  {
    id: 'don',
    name: 'Дон',
    title: 'Глава семьи',
    description: '1600+ RPS И 15 турниров И 8 побед',
    avatar: avatar9,
    requirement: { type: 'combined', rating: 1600, games: 15, wins: 8 },
    color: 'rose',
    textColor: 'text-rose-400',
    bgGradient: 'from-rose-500 to-rose-700',
    borderColor: 'border-rose-500',
    glowColor: 'shadow-rose-500/60',
    rarity: 'boss',
    icon: '👑'
  },
  {
    id: 'patriarch',
    name: 'Патриарх',
    title: 'Крёстный отец покера',
    description: 'Diamond (1800+ RPS) И 20 турниров И 10 побед',
    avatar: avatar10,
    requirement: { type: 'combined', rating: 1800, games: 20, wins: 10 },
    color: 'cyan',
    textColor: 'text-cyan-300',
    bgGradient: 'from-cyan-400 via-blue-500 to-purple-600',
    borderColor: 'border-cyan-400',
    glowColor: 'shadow-cyan-400/70',
    rarity: 'godfather',
    icon: '💎'
  },
];

// Проверяет, разблокирован ли ранг
export function isRankUnlocked(rank: MafiaRank, stats: { gamesPlayed: number; wins: number; rating: number }): boolean {
  const req = rank.requirement;
  switch (req.type) {
    case 'games':
      return stats.gamesPlayed >= (req.games || 0);
    case 'wins':
      return stats.wins >= (req.wins || 0);
    case 'rating':
      return stats.rating >= (req.rating || 0);
    case 'combined':
      return (
        stats.gamesPlayed >= (req.games || 0) &&
        stats.wins >= (req.wins || 0) &&
        stats.rating >= (req.rating || 0)
      );
    default:
      return false;
  }
}

// Получает текущий ранг игрока на основе его статистики
export function getCurrentMafiaRank(stats: { gamesPlayed: number; wins: number; rating: number }): MafiaRank {
  // Идем с конца и ищем первый разблокированный ранг
  for (let i = MAFIA_RANKS.length - 1; i >= 0; i--) {
    if (isRankUnlocked(MAFIA_RANKS[i], stats)) {
      return MAFIA_RANKS[i];
    }
  }
  // Если ничего не разблокировано, возвращаем первый ранг (но не разблокированный)
  return {
    ...MAFIA_RANKS[0],
    name: 'Аутсайдер',
    title: 'Ещё не в семье',
    icon: '🎴',
    description: 'Сыграйте первый турнир, чтобы вступить в семью'
  };
}

// Получает следующий ранг для достижения
export function getNextMafiaRank(stats: { gamesPlayed: number; wins: number; rating: number }): MafiaRank | null {
  for (let i = 0; i < MAFIA_RANKS.length; i++) {
    if (!isRankUnlocked(MAFIA_RANKS[i], stats)) {
      return MAFIA_RANKS[i];
    }
  }
  return null; // Все ранги разблокированы
}

// Получает прогресс до следующего ранга
export function getMafiaRankProgress(stats: { gamesPlayed: number; wins: number; rating: number }): {
  current: MafiaRank;
  next: MafiaRank | null;
  progress: number;
  details: string[];
} {
  const current = getCurrentMafiaRank(stats);
  const next = getNextMafiaRank(stats);
  
  if (!next) {
    return { current, next: null, progress: 100, details: ['Максимальный ранг достигнут!'] };
  }
  
  const req = next.requirement;
  const progresses: number[] = [];
  const details: string[] = [];
  
  if (req.games) {
    const gameProgress = Math.min(stats.gamesPlayed / req.games, 1);
    progresses.push(gameProgress);
    details.push(`${Math.min(stats.gamesPlayed, req.games)}/${req.games} игр`);
  }
  if (req.wins) {
    const winProgress = Math.min(stats.wins / req.wins, 1);
    progresses.push(winProgress);
    details.push(`${Math.min(stats.wins, req.wins)}/${req.wins} побед`);
  }
  if (req.rating) {
    const ratingProgress = Math.min(stats.rating / req.rating, 1);
    progresses.push(ratingProgress);
    details.push(`${stats.rating}/${req.rating} RPS`);
  }
  
  const avgProgress = progresses.length > 0 
    ? (progresses.reduce((a, b) => a + b, 0) / progresses.length) * 100 
    : 0;
  
  return { current, next, progress: Math.min(avgProgress, 100), details };
}

// Получает информацию о редкости
export function getRarityInfo(rarity: string): { label: string; class: string; xp: number } {
  const info: Record<string, { label: string; class: string; xp: number }> = {
    initiate: { label: 'Инициация', class: 'bg-zinc-600/80 text-zinc-200', xp: 25 },
    soldier: { label: 'Солдат', class: 'bg-amber-600/80 text-amber-100', xp: 50 },
    captain: { label: 'Капитан', class: 'bg-blue-600/80 text-blue-100', xp: 100 },
    underboss: { label: 'Андербосс', class: 'bg-purple-600/80 text-purple-100', xp: 150 },
    boss: { label: 'Босс', class: 'bg-rose-600/80 text-rose-100', xp: 250 },
    godfather: { label: 'Крёстный отец', class: 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white', xp: 500 }
  };
  return info[rarity] || info.initiate;
}

// Получает все разблокированные ранги
export function getUnlockedRanks(stats: { gamesPlayed: number; wins: number; rating: number }): MafiaRank[] {
  return MAFIA_RANKS.filter(rank => isRankUnlocked(rank, stats));
}

// Подсчитывает общий XP от рангов
export function getTotalRankXP(stats: { gamesPlayed: number; wins: number; rating: number }): number {
  return getUnlockedRanks(stats).reduce((acc, rank) => acc + getRarityInfo(rank.rarity).xp, 0);
}
