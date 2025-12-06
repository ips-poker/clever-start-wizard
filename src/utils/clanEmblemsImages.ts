// Импорты изображений гербов клана - МАФИЯ СТИЛЬ
import emblemDon from "@/assets/clan-emblems/emblem-don.png";
import emblemSkullBoss from "@/assets/clan-emblems/emblem-skull-boss.png";
import emblemTommyGuns from "@/assets/clan-emblems/emblem-tommy-guns.png";
import emblemGorilla from "@/assets/clan-emblems/emblem-gorilla.png";
import emblemCar from "@/assets/clan-emblems/emblem-car.png";

// Импорты изображений гербов клана - PREMIUM СТИЛЬ
import emblemRoyalLion from "@/assets/clan-emblems/emblem-royal-lion.png";
import emblemIronWolf from "@/assets/clan-emblems/emblem-iron-wolf.png";
import emblemGoldenEagle from "@/assets/clan-emblems/emblem-golden-eagle.png";
import emblemDarkDragon from "@/assets/clan-emblems/emblem-dark-dragon.png";
import emblemSilverPhoenix from "@/assets/clan-emblems/emblem-silver-phoenix.png";

// Импорты изображений печатей клана - VINTAGE STAMP STYLE
import sealFamiglia from "@/assets/clan-seals/seal-famiglia.png";
import sealOmerta from "@/assets/clan-seals/seal-omerta.png";
import sealCosaNostra from "@/assets/clan-seals/seal-cosa-nostra.png";
import sealCapo from "@/assets/clan-seals/seal-capo.png";
import sealVendetta from "@/assets/clan-seals/seal-vendetta.png";

// Импорты изображений печатей клана - PREMIUM WAX STYLE
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

// Массив гербов с PNG изображениями - МАФИЯ + PREMIUM
export const CLAN_EMBLEM_IMAGES: ClanEmblemImage[] = [
  // МАФИЯ СТИЛЬ (1-5)
  {
    id: 1,
    name: 'il_don',
    nameRu: 'Дон',
    description: 'Силуэт босса мафии',
    image: emblemDon
  },
  {
    id: 2,
    name: 'skull_boss',
    nameRu: 'Король Криминала',
    description: 'Череп босса с сигарой',
    image: emblemSkullBoss
  },
  {
    id: 3,
    name: 'tommy_guns',
    nameRu: 'Томми-Ганы',
    description: 'Скрещённые автоматы',
    image: emblemTommyGuns
  },
  {
    id: 4,
    name: 'gorilla_gangster',
    nameRu: 'Горилла',
    description: 'Гангстер-горилла',
    image: emblemGorilla
  },
  {
    id: 5,
    name: 'chicago_car',
    nameRu: 'Чикаго',
    description: 'Гангстерский кортеж',
    image: emblemCar
  },
  // PREMIUM СТИЛЬ (6-10)
  {
    id: 6,
    name: 'royal_lion',
    nameRu: 'Королевский Лев',
    description: 'Величественный лев с короной',
    image: emblemRoyalLion
  },
  {
    id: 7,
    name: 'iron_wolf',
    nameRu: 'Железный Волк',
    description: 'Свирепый стальной волк',
    image: emblemIronWolf
  },
  {
    id: 8,
    name: 'golden_eagle',
    nameRu: 'Золотой Орёл',
    description: 'Имперский золотой орёл',
    image: emblemGoldenEagle
  },
  {
    id: 9,
    name: 'dark_dragon',
    nameRu: 'Тёмный Дракон',
    description: 'Огнедышащий дракон',
    image: emblemDarkDragon
  },
  {
    id: 10,
    name: 'silver_phoenix',
    nameRu: 'Серебряный Феникс',
    description: 'Возрождающийся феникс',
    image: emblemSilverPhoenix
  }
];

// Массив печатей с PNG изображениями - VINTAGE + PREMIUM
export const CLAN_SEAL_IMAGES: ClanSealImage[] = [
  // VINTAGE STAMP STYLE (1-5)
  {
    id: 1,
    name: 'famiglia',
    nameRu: 'Famiglia',
    description: 'Печать семьи',
    image: sealFamiglia
  },
  {
    id: 2,
    name: 'omerta',
    nameRu: 'Omertà',
    description: 'Кодекс молчания',
    image: sealOmerta
  },
  {
    id: 3,
    name: 'cosa_nostra',
    nameRu: 'Cosa Nostra',
    description: 'Наше дело',
    image: sealCosaNostra
  },
  {
    id: 4,
    name: 'il_capo',
    nameRu: 'Il Capo',
    description: 'Печать босса',
    image: sealCapo
  },
  {
    id: 5,
    name: 'vendetta',
    nameRu: 'Vendetta',
    description: 'Кровная месть',
    image: sealVendetta
  },
  // PREMIUM WAX STYLE (6-10)
  {
    id: 6,
    name: 'crown',
    nameRu: 'Корона',
    description: 'Королевская власть',
    image: sealCrown
  },
  {
    id: 7,
    name: 'sword',
    nameRu: 'Мечи',
    description: 'Скрещённые клинки',
    image: sealSword
  },
  {
    id: 8,
    name: 'star',
    nameRu: 'Звезда',
    description: 'Путеводная звезда',
    image: sealStar
  },
  {
    id: 9,
    name: 'skull',
    nameRu: 'Череп',
    description: 'Знак опасности',
    image: sealSkull
  },
  {
    id: 10,
    name: 'rose',
    nameRu: 'Роза',
    description: 'Красота и шипы',
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
