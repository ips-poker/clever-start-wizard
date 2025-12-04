export type PlayerLevel = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface LevelInfo {
  level: PlayerLevel;
  name: string;
  minRating: number;
  maxRating: number;
  color: string;
  gradient: string;
  icon: string;
}

export const PLAYER_LEVELS: Record<PlayerLevel, LevelInfo> = {
  bronze: {
    level: 'bronze',
    name: 'Bronze',
    minRating: 0,
    maxRating: 1199,
    color: 'text-orange-700',
    gradient: 'from-orange-700 to-orange-900',
    icon: '🥉'
  },
  silver: {
    level: 'silver',
    name: 'Silver',
    minRating: 1200,
    maxRating: 1499,
    color: 'text-gray-400',
    gradient: 'from-gray-400 to-gray-600',
    icon: '🥈'
  },
  gold: {
    level: 'gold',
    name: 'Gold',
    minRating: 1500,
    maxRating: 1799,
    color: 'text-yellow-500',
    gradient: 'from-yellow-400 to-yellow-600',
    icon: '🥇'
  },
  diamond: {
    level: 'diamond',
    name: 'Diamond',
    minRating: 1800,
    maxRating: Infinity,
    color: 'text-cyan-400',
    gradient: 'from-cyan-400 to-blue-600',
    icon: '💎'
  }
};

export function getPlayerLevel(rating: number): LevelInfo {
  if (rating >= PLAYER_LEVELS.diamond.minRating) return PLAYER_LEVELS.diamond;
  if (rating >= PLAYER_LEVELS.gold.minRating) return PLAYER_LEVELS.gold;
  if (rating >= PLAYER_LEVELS.silver.minRating) return PLAYER_LEVELS.silver;
  return PLAYER_LEVELS.bronze;
}

export function getNextLevel(currentLevel: LevelInfo): LevelInfo | null {
  const levels = Object.values(PLAYER_LEVELS);
  const currentIndex = levels.findIndex(l => l.level === currentLevel.level);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
}

export function getProgressToNextLevel(rating: number): number {
  const currentLevel = getPlayerLevel(rating);
  const nextLevel = getNextLevel(currentLevel);
  
  if (!nextLevel) return 100;
  
  const range = nextLevel.minRating - currentLevel.minRating;
  const progress = rating - currentLevel.minRating;
  
  return Math.min(100, Math.max(0, (progress / range) * 100));
}
