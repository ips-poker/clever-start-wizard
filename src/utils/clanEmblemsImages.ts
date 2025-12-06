// Импорты изображений гербов клана - МАФИЯ СТИЛЬ
import emblemDon from "@/assets/clan-emblems/emblem-don.png";
import emblemSkullBoss from "@/assets/clan-emblems/emblem-skull-boss.png";
import emblemTommyGuns from "@/assets/clan-emblems/emblem-tommy-guns.png";
import emblemGorilla from "@/assets/clan-emblems/emblem-gorilla.png";
import emblemCar from "@/assets/clan-emblems/emblem-car.png";

// Импорты изображений печатей клана - VINTAGE STAMP STYLE
import sealFamiglia from "@/assets/clan-seals/seal-famiglia.png";
import sealOmerta from "@/assets/clan-seals/seal-omerta.png";
import sealCosaNostra from "@/assets/clan-seals/seal-cosa-nostra.png";
import sealCapo from "@/assets/clan-seals/seal-capo.png";
import sealVendetta from "@/assets/clan-seals/seal-vendetta.png";

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

// Массив гербов с PNG изображениями - МАФИЯ СТИЛЬ
export const CLAN_EMBLEM_IMAGES: ClanEmblemImage[] = [
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
  }
];

// Массив печатей с PNG изображениями - VINTAGE STAMP STYLE
export const CLAN_SEAL_IMAGES: ClanSealImage[] = [
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
