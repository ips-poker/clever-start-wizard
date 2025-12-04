export type PlayerLevel = 'rookie' | 'soldier' | 'capo' | 'consigliere' | 'don';

export interface LevelInfo {
  level: PlayerLevel;
  name: string;
  nameRu: string;
  minRating: number;
  maxRating: number;
  color: string;
  gradient: string;
  bgColor: string;
  icon: string;
  description: string;
}

export const PLAYER_LEVELS: Record<PlayerLevel, LevelInfo> = {
  rookie: {
    level: 'rookie',
    name: 'Associate',
    nameRu: 'Associate',
    minRating: 0,
    maxRating: 299,
    color: 'text-zinc-400',
    gradient: 'from-zinc-500 to-zinc-700',
    bgColor: 'bg-zinc-500/20',
    icon: '🎲',
    description: 'Новичок в синдикате'
  },
  soldier: {
    level: 'soldier',
    name: 'Soldier',
    nameRu: 'Soldier',
    minRating: 300,
    maxRating: 599,
    color: 'text-emerald-500',
    gradient: 'from-emerald-500 to-emerald-700',
    bgColor: 'bg-emerald-500/20',
    icon: '🔫',
    description: 'Доказал себя в деле'
  },
  capo: {
    level: 'capo',
    name: 'Capo',
    nameRu: 'Capo',
    minRating: 600,
    maxRating: 999,
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-blue-700',
    bgColor: 'bg-blue-500/20',
    icon: '🎩',
    description: 'Командует группой'
  },
  consigliere: {
    level: 'consigliere',
    name: 'Consigliere',
    nameRu: 'Consigliere',
    minRating: 1000,
    maxRating: 1499,
    color: 'text-purple-500',
    gradient: 'from-purple-500 to-purple-700',
    bgColor: 'bg-purple-500/20',
    icon: '📜',
    description: 'Советник семьи'
  },
  don: {
    level: 'don',
    name: 'Boss',
    nameRu: 'Boss',
    minRating: 1500,
    maxRating: Infinity,
    color: 'text-amber-400',
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    bgColor: 'bg-amber-500/20',
    icon: '👑',
    description: 'Глава семьи'
  }
};

export const LEVELS_ORDERED: LevelInfo[] = [
  PLAYER_LEVELS.rookie,
  PLAYER_LEVELS.soldier,
  PLAYER_LEVELS.capo,
  PLAYER_LEVELS.consigliere,
  PLAYER_LEVELS.don
];

export function getPlayerLevel(rating: number): LevelInfo {
  if (rating >= PLAYER_LEVELS.don.minRating) return PLAYER_LEVELS.don;
  if (rating >= PLAYER_LEVELS.consigliere.minRating) return PLAYER_LEVELS.consigliere;
  if (rating >= PLAYER_LEVELS.capo.minRating) return PLAYER_LEVELS.capo;
  if (rating >= PLAYER_LEVELS.soldier.minRating) return PLAYER_LEVELS.soldier;
  return PLAYER_LEVELS.rookie;
}

export function getNextLevel(currentLevel: LevelInfo): LevelInfo | null {
  const currentIndex = LEVELS_ORDERED.findIndex(l => l.level === currentLevel.level);
  return currentIndex < LEVELS_ORDERED.length - 1 ? LEVELS_ORDERED[currentIndex + 1] : null;
}

export function getProgressToNextLevel(rating: number): number {
  const currentLevel = getPlayerLevel(rating);
  const nextLevel = getNextLevel(currentLevel);
  
  if (!nextLevel) return 100;
  
  const range = nextLevel.minRating - currentLevel.minRating;
  const progress = rating - currentLevel.minRating;
  
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

export function getRatingToNextLevel(rating: number): number {
  const currentLevel = getPlayerLevel(rating);
  const nextLevel = getNextLevel(currentLevel);
  
  if (!nextLevel) return 0;
  
  return nextLevel.minRating - rating;
}
