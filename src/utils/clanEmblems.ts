// Конфигурация гербов и печатей кланов
export interface ClanEmblem {
  id: number;
  name: string;
  nameRu: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  icon: string;
}

export const CLAN_EMBLEMS: ClanEmblem[] = [
  {
    id: 1,
    name: 'royal_lion',
    nameRu: 'Королевский Лев',
    description: 'Символ силы и благородства',
    colors: {
      primary: '#FFD700',
      secondary: '#8B0000',
      accent: '#FFFFFF'
    },
    icon: '🦁'
  },
  {
    id: 2,
    name: 'iron_wolf',
    nameRu: 'Железный Волк',
    description: 'Символ верности и стаи',
    colors: {
      primary: '#708090',
      secondary: '#1C1C1C',
      accent: '#C0C0C0'
    },
    icon: '🐺'
  },
  {
    id: 3,
    name: 'golden_eagle',
    nameRu: 'Золотой Орёл',
    description: 'Символ власти и величия',
    colors: {
      primary: '#DAA520',
      secondary: '#000080',
      accent: '#FFFFFF'
    },
    icon: '🦅'
  },
  {
    id: 4,
    name: 'dark_dragon',
    nameRu: 'Тёмный Дракон',
    description: 'Символ могущества и тайны',
    colors: {
      primary: '#8B008B',
      secondary: '#000000',
      accent: '#FF4500'
    },
    icon: '🐉'
  },
  {
    id: 5,
    name: 'silver_phoenix',
    nameRu: 'Серебряный Феникс',
    description: 'Символ возрождения и славы',
    colors: {
      primary: '#C0C0C0',
      secondary: '#FF6347',
      accent: '#FFD700'
    },
    icon: '🔥'
  }
];

export const CLAN_SEALS: ClanEmblem[] = [
  {
    id: 1,
    name: 'crown_seal',
    nameRu: 'Печать Короны',
    description: 'Королевская печать власти',
    colors: {
      primary: '#FFD700',
      secondary: '#4B0082',
      accent: '#FFFFFF'
    },
    icon: '👑'
  },
  {
    id: 2,
    name: 'sword_seal',
    nameRu: 'Печать Меча',
    description: 'Печать воинской доблести',
    colors: {
      primary: '#C0C0C0',
      secondary: '#8B0000',
      accent: '#000000'
    },
    icon: '⚔️'
  },
  {
    id: 3,
    name: 'star_seal',
    nameRu: 'Печать Звезды',
    description: 'Печать судьбы и удачи',
    colors: {
      primary: '#4169E1',
      secondary: '#FFD700',
      accent: '#FFFFFF'
    },
    icon: '⭐'
  },
  {
    id: 4,
    name: 'skull_seal',
    nameRu: 'Печать Черепа',
    description: 'Печать бесстрашия',
    colors: {
      primary: '#1C1C1C',
      secondary: '#8B0000',
      accent: '#FFFFFF'
    },
    icon: '💀'
  },
  {
    id: 5,
    name: 'rose_seal',
    nameRu: 'Печать Розы',
    description: 'Печать благородства',
    colors: {
      primary: '#DC143C',
      secondary: '#228B22',
      accent: '#FFD700'
    },
    icon: '🌹'
  }
];

export function getEmblemById(id: number): ClanEmblem | undefined {
  return CLAN_EMBLEMS.find(e => e.id === id);
}

export function getSealById(id: number): ClanEmblem | undefined {
  return CLAN_SEALS.find(s => s.id === id);
}

// Иерархия ролей в клане
export const CLAN_HIERARCHY = {
  don: { name: 'Дон', level: 1, description: 'Глава семьи' },
  consigliere: { name: 'Консильери', level: 2, description: 'Советник Дона' },
  underboss: { name: 'Андербосс', level: 3, description: 'Заместитель Дона' },
  capo: { name: 'Капо', level: 4, description: 'Капитан' },
  soldier: { name: 'Солдат', level: 5, description: 'Боец семьи' },
  associate: { name: 'Ассоциат', level: 6, description: 'Новый член' }
} as const;

export type ClanRole = keyof typeof CLAN_HIERARCHY;
