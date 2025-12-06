// Импорты изображений гербов клана
import emblemRoyalLion from "@/assets/clan-emblems/emblem-royal-lion.png";
import emblemIronWolf from "@/assets/clan-emblems/emblem-iron-wolf.png";
import emblemGoldenEagle from "@/assets/clan-emblems/emblem-golden-eagle.png";
import emblemDarkDragon from "@/assets/clan-emblems/emblem-dark-dragon.png";
import emblemSilverPhoenix from "@/assets/clan-emblems/emblem-silver-phoenix.png";

// Импорты изображений печатей клана
import sealCrown from "@/assets/clan-seals/seal-crown.png";
import sealSword from "@/assets/clan-seals/seal-sword.png";
import sealStar from "@/assets/clan-seals/seal-star.png";
import sealSkull from "@/assets/clan-seals/seal-skull.png";
import sealRose from "@/assets/clan-seals/seal-rose.png";

export interface ClanEmblemImage {
  id: number;
  name: string;
  nameRu: string;
  description: string;
  image: string;
}

export interface ClanSealImage {
  id: number;
  name: string;
  nameRu: string;
  description: string;
  image: string;
}

// Массив гербов с PNG изображениями
export const CLAN_EMBLEM_IMAGES: ClanEmblemImage[] = [
  {
    id: 1,
    name: 'royal_lion',
    nameRu: 'Королевский Лев',
    description: 'Символ силы и благородства',
    image: emblemRoyalLion
  },
  {
    id: 2,
    name: 'iron_wolf',
    nameRu: 'Железный Волк',
    description: 'Символ верности и стаи',
    image: emblemIronWolf
  },
  {
    id: 3,
    name: 'golden_eagle',
    nameRu: 'Золотой Орёл',
    description: 'Символ власти и величия',
    image: emblemGoldenEagle
  },
  {
    id: 4,
    name: 'dark_dragon',
    nameRu: 'Тёмный Дракон',
    description: 'Символ могущества и тайны',
    image: emblemDarkDragon
  },
  {
    id: 5,
    name: 'silver_phoenix',
    nameRu: 'Серебряный Феникс',
    description: 'Символ возрождения и славы',
    image: emblemSilverPhoenix
  }
];

// Массив печатей с PNG изображениями
export const CLAN_SEAL_IMAGES: ClanSealImage[] = [
  {
    id: 1,
    name: 'crown_seal',
    nameRu: 'Печать Короны',
    description: 'Королевская печать власти',
    image: sealCrown
  },
  {
    id: 2,
    name: 'sword_seal',
    nameRu: 'Печать Меча',
    description: 'Печать воинской доблести',
    image: sealSword
  },
  {
    id: 3,
    name: 'star_seal',
    nameRu: 'Печать Звезды',
    description: 'Печать судьбы и удачи',
    image: sealStar
  },
  {
    id: 4,
    name: 'skull_seal',
    nameRu: 'Печать Черепа',
    description: 'Печать бесстрашия',
    image: sealSkull
  },
  {
    id: 5,
    name: 'rose_seal',
    nameRu: 'Печать Розы',
    description: 'Печать благородства',
    image: sealRose
  }
];

// Получение герба по ID
export function getEmblemImageById(id: number): ClanEmblemImage | undefined {
  return CLAN_EMBLEM_IMAGES.find(e => e.id === id);
}

// Получение печати по ID
export function getSealImageById(id: number): ClanSealImage | undefined {
  return CLAN_SEAL_IMAGES.find(s => s.id === id);
}
