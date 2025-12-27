import { useState, useEffect, useCallback } from 'react';

// Table felt themes
export const TABLE_THEMES = [
  { id: 'classic-green', name: 'Классика', color: '#0d5c2e', gradient: 'from-[#0d5c2e] via-[#0a4a25] to-[#083d1f]' },
  { id: 'royal-blue', name: 'Роял', color: '#1e3a5f', gradient: 'from-[#1e3a5f] via-[#152d4d] to-[#0f2038]' },
  { id: 'midnight', name: 'Полночь', color: '#0a1628', gradient: 'from-[#0a1628] via-[#0d1e36] to-[#0a1628]' },
  { id: 'crimson', name: 'Кримсон', color: '#5c1a1a', gradient: 'from-[#5c1a1a] via-[#4a1515] to-[#3d1111]' },
  { id: 'purple', name: 'Аметист', color: '#3d1a5c', gradient: 'from-[#3d1a5c] via-[#2d1345] to-[#1f0d30]' },
  { id: 'gold', name: 'Золото', color: '#5c4a1a', gradient: 'from-[#5c4a1a] via-[#4a3c15] to-[#3d3011]' },
] as const;

// Card back designs - white base with accent color and unique patterns
export const CARD_BACKS = [
  { id: 'syndikate-orange', name: 'Syndikate', accentColor: '#ff7a00', pattern: 'grid' },
  { id: 'blue-diamond', name: 'Алмаз', accentColor: '#3b82f6', pattern: 'diamonds' },
  { id: 'red-classic', name: 'Классика', accentColor: '#dc2626', pattern: 'dots' },
  { id: 'green-casino', name: 'Казино', accentColor: '#16a34a', pattern: 'diagonal' },
  { id: 'purple-royal', name: 'Роял', accentColor: '#9333ea', pattern: 'circles' },
  { id: 'gold-vip', name: 'VIP', accentColor: '#ca8a04', pattern: 'waves' },
] as const;

// Card face styles
export const CARD_STYLES = [
  { id: 'classic', name: 'Классика', description: 'Стандартный дизайн' },
  { id: 'modern', name: 'Модерн', description: 'Современный минимализм' },
  { id: 'fourcolor', name: '4-цвета', description: 'Все масти разного цвета' },
  { id: 'jumbo', name: 'Jumbo', description: 'Крупные индексы' },
] as const;

// Table glow styles
export const TABLE_GLOW_STYLES = [
  { id: 'none', name: 'Без подсветки', description: 'Классический вид без эффектов', preview: '#1a1a2e' },
  { id: 'cyberpunk', name: 'Киберпанк', description: 'Hi-tech неоновое свечение', preview: '#00d4ff' },
  { id: 'mafia', name: 'Мафия', description: 'Элегантный золотой стиль', preview: '#d4a574' },
  { id: 'western', name: 'Вестерн', description: 'Тёплый медный салун', preview: '#b87333' },
  { id: 'cosmic', name: 'Космос', description: 'Глубокий космос и туманности', preview: '#9b59b6' },
  { id: 'vegas', name: 'Вегас', description: 'Яркие неоновые огни', preview: '#ff1493' },
  { id: 'matrix', name: 'Матрица', description: 'Цифровой дождь', preview: '#00ff41' },
  { id: 'elegant', name: 'Элегант', description: 'Минималистичная роскошь', preview: '#d4af37' },
] as const;

export type TableThemeId = typeof TABLE_THEMES[number]['id'];
export type CardBackId = typeof CARD_BACKS[number]['id'];
export type CardStyleId = typeof CARD_STYLES[number]['id'];
export type TableGlowStyleId = typeof TABLE_GLOW_STYLES[number]['id'];

export interface PokerPreferences {
  // Visual settings
  tableTheme: TableThemeId;
  cardBack: CardBackId;
  cardStyle: CardStyleId;
  tableGlowStyle: TableGlowStyleId;
  
  // Seat rotation (0-5 for 6-max)
  preferredSeatRotation: number;
  
  // UI preferences
  showBetAmounts: boolean;
  showPotOdds: boolean;
  showStackInBB: boolean;
  autoMuckLosingHand: boolean;
  showHandStrength: boolean;
  
  // Sound settings
  soundEnabled: boolean;
  soundVolume: number;
  
  // Animation settings
  fastAnimations: boolean;
  showConfetti: boolean;
}

const DEFAULT_PREFERENCES: PokerPreferences = {
  tableTheme: 'midnight',
  cardBack: 'syndikate-orange',
  cardStyle: 'classic',
  tableGlowStyle: 'cyberpunk',
  preferredSeatRotation: 0,
  showBetAmounts: true,
  showPotOdds: false,
  showStackInBB: false,
  autoMuckLosingHand: true,
  showHandStrength: true,
  soundEnabled: true,
  soundVolume: 0.7,
  fastAnimations: false,
  showConfetti: true,
};

const STORAGE_KEY = 'poker-preferences';

export function usePokerPreferences() {
  const [preferences, setPreferences] = useState<PokerPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load poker preferences:', e);
    }
    return DEFAULT_PREFERENCES;
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.error('Failed to save poker preferences:', e);
    }
  }, [preferences]);

  const updatePreference = useCallback(<K extends keyof PokerPreferences>(
    key: K,
    value: PokerPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  // Get current theme config
  const currentTableTheme = TABLE_THEMES.find(t => t.id === preferences.tableTheme) || TABLE_THEMES[0];
  const currentCardBack = CARD_BACKS.find(c => c.id === preferences.cardBack) || CARD_BACKS[0];
  const currentCardStyle = CARD_STYLES.find(s => s.id === preferences.cardStyle) || CARD_STYLES[0];
  const currentGlowStyle = TABLE_GLOW_STYLES.find(s => s.id === preferences.tableGlowStyle) || TABLE_GLOW_STYLES[1];

  return {
    preferences,
    setPreferences,
    updatePreference,
    resetPreferences,
    currentTableTheme,
    currentCardBack,
    currentCardStyle,
    currentGlowStyle,
    // Constants for UI
    TABLE_THEMES,
    CARD_BACKS,
    CARD_STYLES,
    TABLE_GLOW_STYLES,
  };
}
