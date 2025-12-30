// =====================================================
// POKER HAND RANK TRANSLATIONS - English to Russian
// =====================================================

export const HAND_RANK_TRANSLATIONS: Record<string, string> = {
  'Royal Flush': 'Роял-флеш',
  'Straight Flush': 'Стрит-флеш',
  'Four of a Kind': 'Каре',
  'Full House': 'Фулл-хаус',
  'Flush': 'Флеш',
  'Straight': 'Стрит',
  'Three of a Kind': 'Сет', // Default to Set, context determines Trips
  'Set': 'Сет',
  'Trips': 'Трипс',
  'Two Pair': 'Две пары',
  'One Pair': 'Пара',
  'High Card': 'Старшая карта',
  'Winner': 'Победитель',
  'Last Standing': 'Единственный оставшийся',
  'Pair': 'Пара'
};

/**
 * Translate hand rank from English to Russian
 */
export function translateHandRank(handRank: string): string {
  if (!handRank) return '';
  
  // Check for exact match
  if (HAND_RANK_TRANSLATIONS[handRank]) {
    return HAND_RANK_TRANSLATIONS[handRank];
  }
  
  // Check if already in Russian
  const russianValues = Object.values(HAND_RANK_TRANSLATIONS);
  if (russianValues.includes(handRank)) {
    return handRank;
  }
  
  // Check for partial match (case insensitive)
  const lowerRank = handRank.toLowerCase();
  for (const [eng, rus] of Object.entries(HAND_RANK_TRANSLATIONS)) {
    if (lowerRank.includes(eng.toLowerCase())) {
      return handRank.replace(new RegExp(eng, 'gi'), rus);
    }
  }
  
  return handRank;
}

/**
 * Check if hand rank is already in Russian
 */
export function isRussianHandRank(handRank: string): boolean {
  return Object.values(HAND_RANK_TRANSLATIONS).some(rus => 
    handRank.includes(rus)
  );
}
