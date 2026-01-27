// ============================================
// FULLSCREEN POKER TABLE - PPPoker Premium Style
// ============================================
// Полноэкранный овальный стол как в PPPoker

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PokerPlayer } from '@/hooks/useNodePokerTable';
import { resolveAvatarUrl } from '@/utils/avatarResolver';
import { usePokerPreferences, TABLE_THEMES, CARD_BACKS } from '@/hooks/usePokerPreferences';
import { getMaskedName } from '@/hooks/useMaskedPlayerName';
import syndikateLogo from '@/assets/syndikate-logo-main.png';
import { SmoothAvatarTimer } from './SmoothAvatarTimer';
import { PPPokerChipStack } from './PPPokerChipStack';
import { PotChips } from './RealisticPokerChip';
import { SyndikateTableBackground } from './SyndikateTableBackground';
import { 
  CyberpunkTableGlow, 
  MafiaTableGlow, 
  WesternTableGlow, 
  CosmicTableGlow, 
  NeonVegasTableGlow, 
  MatrixTableGlow, 
  MinimalElegantTableGlow 
} from './table-styles';
import { PPPokerCompactCards } from './PPPokerCompactCards';
import { PPPokerHeroCards } from './PPPokerHeroCards';
import { PPPokerCommunityCards } from './PPPokerCommunityCards';
import { CommunityCardAnimation } from './CommunityCardAnimation';
import { ProfessionalCommunityCards } from './ProfessionalCommunityCards';
import { PPPokerPotDisplay } from './PPPokerPotDisplay';
import { PPPokerActionBadge } from './PPPokerActionBadge';
import { PPPokerLevelBadge } from './PPPokerLevelBadge';
import { PokerStarsHUDPopup } from './hud/PokerStarsHUDPopup';
// PotCollectionAnimation removed - using BetCollectionAnimation only for performance
import { WinnerChipCascade } from './WinnerChipCascade';
import { BetCollectionAnimation } from './EnhancedBetCollectionAnimation';
import { BurnCardAnimation } from './BurnCardAnimation';
// ProfessionalShowdown and WinnerAnnouncement removed - using PlayerSeat showdown highlighting
import { usePhaseAnimation } from '@/hooks/usePhaseAnimation';
import { getHandStrengthName } from '@/utils/handEvaluator';
// POKERSTARS-STYLE SIT-OUT INDICATORS
import { SitOutIndicator, SitOutOverlay } from './SitOutIndicator';
import { WaitForBBIndicator } from './WaitForBBIndicator';
import { CARD_DEAL_TIMINGS, HAND_TRANSITION_TIMINGS } from '@/config/pokerTimings';

// ============= SUIT CONFIGURATION =============
const SUITS = {
  h: { symbol: '♥', color: '#ef4444', name: 'hearts' },
  d: { symbol: '♦', color: '#3b82f6', name: 'diamonds' },
  c: { symbol: '♣', color: '#22c55e', name: 'clubs' },
  s: { symbol: '♠', color: '#1e293b', name: 'spades' }
} as const;

// ============= SEAT POSITIONS FOR VERTICAL OVAL TABLE =============
// Позиции для разного количества игроков вокруг вертикального овала
// Hero всегда внизу по центру, остальные симметрично вдоль борта

// ============= SEAT POSITIONS - CALIBRATED TO TABLE RAIL =============
// Все позиции точно на бортике овального стола
// Стол для popup: left/right margin = 20%, top/bottom = 6%
// Бортик: left ~24%, right ~76%, top ~10%, bottom ~90%
// Центр аватара должен быть на центре бортика

// POPUP/DESKTOP POSITIONS - стандартный стол (fallback defaults)
const DEFAULT_SEAT_POSITIONS_BY_COUNT: Record<number, Array<{ x: number; y: number }>> = {
  2: [
    { x: 50, y: 87 },   // Seat 0 - Hero (bottom center on rail)
    { x: 50, y: 13 },   // Seat 1 - Top center on rail
  ],
  3: [
    { x: 50, y: 87 },   // Seat 0 - Hero (bottom center)
    { x: 24, y: 50 },   // Seat 1 - Left center on rail
    { x: 76, y: 50 },   // Seat 2 - Right center on rail
  ],
  4: [
    { x: 50, y: 87 },   // Seat 0 - Hero (bottom center)
    { x: 24, y: 50 },   // Seat 1 - Left middle on rail
    { x: 50, y: 13 },   // Seat 2 - Top center on rail
    { x: 76, y: 50 },   // Seat 3 - Right middle on rail
  ],
  5: [
    { x: 50, y: 87 },   // Seat 0 - Hero (bottom center)
    { x: 24, y: 65 },   // Seat 1 - Left bottom on rail
    { x: 24, y: 35 },   // Seat 2 - Left top on rail
    { x: 76, y: 35 },   // Seat 3 - Right top on rail
    { x: 76, y: 65 },   // Seat 4 - Right bottom on rail
  ],
  6: [
    { x: 50, y: 87 },   // Seat 0 - Hero (bottom center on rail)
    { x: 24, y: 65 },   // Seat 1 - Left bottom on rail
    { x: 24, y: 35 },   // Seat 2 - Left top on rail
    { x: 50, y: 13 },   // Seat 3 - Top center on rail
    { x: 76, y: 35 },   // Seat 4 - Right top on rail
    { x: 76, y: 65 },   // Seat 5 - Right bottom on rail
  ],
  7: [
    { x: 50, y: 87 },   // Seat 0 - Hero (bottom center)
    { x: 24, y: 68 },   // Seat 1 - Left bottom on rail
    { x: 24, y: 50 },   // Seat 2 - Left middle on rail
    { x: 24, y: 32 },   // Seat 3 - Left top on rail
    { x: 76, y: 32 },   // Seat 4 - Right top on rail
    { x: 76, y: 50 },   // Seat 5 - Right middle on rail
    { x: 76, y: 68 },   // Seat 6 - Right bottom on rail
  ],
  8: [
    { x: 50, y: 87 },   // Seat 0 - Hero (bottom center)
    { x: 24, y: 68 },   // Seat 1 - Left bottom on rail
    { x: 24, y: 50 },   // Seat 2 - Left middle on rail
    { x: 24, y: 32 },   // Seat 3 - Left top on rail
    { x: 50, y: 13 },   // Seat 4 - Top center on rail
    { x: 76, y: 32 },   // Seat 5 - Right top on rail
    { x: 76, y: 50 },   // Seat 6 - Right middle on rail
    { x: 76, y: 68 },   // Seat 7 - Right bottom on rail
  ],
  9: [
    { x: 50, y: 87 },   // Seat 0 - Hero (bottom center)
    { x: 22, y: 74 },   // Seat 1 - Left bottom on rail
    { x: 22, y: 54 },   // Seat 2 - Left middle-bottom on rail
    { x: 22, y: 34 },   // Seat 3 - Left middle-top on rail
    { x: 40, y: 13 },   // Seat 4 - Top left on rail
    { x: 60, y: 13 },   // Seat 5 - Top right on rail
    { x: 78, y: 34 },   // Seat 6 - Right middle-top on rail
    { x: 78, y: 54 },   // Seat 7 - Right middle-bottom on rail
    { x: 78, y: 74 },   // Seat 8 - Right bottom on rail
  ],
};

// ============= TELEGRAM MINI APP - WIDER TABLE POSITIONS =============
// Стол для Telegram: left/right margin = 14%, top/bottom = 10%
// Бортик: left ~14%, right ~86%, top ~10%, bottom ~90%
// Аватары точно на центре бортика для идеального размещения
const DEFAULT_TELEGRAM_SEAT_POSITIONS_BY_COUNT: Record<number, Array<{ x: number; y: number }>> = {
  2: [
    { x: 50, y: 86 },   // Seat 0 - Hero (bottom center on rail)
    { x: 50, y: 14 },   // Seat 1 - Top center on rail
  ],
  3: [
    { x: 50, y: 86 },   // Seat 0 - Hero (bottom center)
    { x: 14, y: 50 },   // Seat 1 - Left center on rail
    { x: 86, y: 50 },   // Seat 2 - Right center on rail
  ],
  4: [
    { x: 50, y: 86 },   // Seat 0 - Hero (bottom center)
    { x: 14, y: 50 },   // Seat 1 - Left middle on rail
    { x: 50, y: 14 },   // Seat 2 - Top center on rail
    { x: 86, y: 50 },   // Seat 3 - Right middle on rail
  ],
  5: [
    { x: 50, y: 86 },   // Seat 0 - Hero (bottom center)
    { x: 14, y: 64 },   // Seat 1 - Left bottom on rail
    { x: 14, y: 36 },   // Seat 2 - Left top on rail
    { x: 86, y: 36 },   // Seat 3 - Right top on rail
    { x: 86, y: 64 },   // Seat 4 - Right bottom on rail
  ],
  6: [
    { x: 50, y: 86 },   // Seat 0 - Hero (bottom center on rail)
    { x: 14, y: 64 },   // Seat 1 - Left bottom on rail
    { x: 14, y: 36 },   // Seat 2 - Left top on rail
    { x: 50, y: 14 },   // Seat 3 - Top center on rail
    { x: 86, y: 36 },   // Seat 4 - Right top on rail
    { x: 86, y: 64 },   // Seat 5 - Right bottom on rail
  ],
  7: [
    { x: 50, y: 86 },   // Seat 0 - Hero (bottom center)
    { x: 14, y: 68 },   // Seat 1 - Left bottom on rail
    { x: 14, y: 50 },   // Seat 2 - Left middle on rail
    { x: 14, y: 32 },   // Seat 3 - Left top on rail
    { x: 86, y: 32 },   // Seat 4 - Right top on rail
    { x: 86, y: 50 },   // Seat 5 - Right middle on rail
    { x: 86, y: 68 },   // Seat 6 - Right bottom on rail
  ],
  8: [
    { x: 50, y: 86 },   // Seat 0 - Hero (bottom center)
    { x: 14, y: 68 },   // Seat 1 - Left bottom on rail
    { x: 14, y: 50 },   // Seat 2 - Left middle on rail
    { x: 14, y: 32 },   // Seat 3 - Left top on rail
    { x: 50, y: 14 },   // Seat 4 - Top center on rail
    { x: 86, y: 32 },   // Seat 5 - Right top on rail
    { x: 86, y: 50 },   // Seat 6 - Right middle on rail
    { x: 86, y: 68 },   // Seat 7 - Right bottom on rail
  ],
  9: [
    { x: 50, y: 86 },   // Seat 0 - Hero (bottom center)
    { x: 12, y: 74 },   // Seat 1 - Left bottom on rail
    { x: 12, y: 54 },   // Seat 2 - Left middle-bottom on rail
    { x: 12, y: 34 },   // Seat 3 - Left middle-top on rail
    { x: 38, y: 14 },   // Seat 4 - Top left on rail
    { x: 62, y: 14 },   // Seat 5 - Top right on rail
    { x: 88, y: 34 },   // Seat 6 - Right middle-top on rail
    { x: 88, y: 54 },   // Seat 7 - Right middle-bottom on rail
    { x: 88, y: 74 },   // Seat 8 - Right bottom on rail
  ],
};

// ============= LOAD CALIBRATED POSITIONS =============
// Калибратор в админке сохраняет позиции в localStorage и синхронизирует через Supabase
// В Telegram mini-app localStorage изолирован, поэтому используем глобальный кеш

// Глобальный кеш для калибровки (заполняется через syncCalibrationFromSupabase)
let globalCalibrationCache: { 
  positions: { desktop: Record<number, Array<{ x: number; y: number }>>; telegram: Record<number, Array<{ x: number; y: number }>> } | null;
  betOffsets: { desktop: Record<number, Array<{ x: number; y: number }>>; telegram: Record<number, Array<{ x: number; y: number }>> } | null;
  loaded: boolean;
} = { positions: null, betOffsets: null, loaded: false };

// Экспортируем функцию для установки кеша из хука
export function setGlobalCalibrationCache(
  positions: { desktop: Record<number, Array<{ x: number; y: number }>>; telegram: Record<number, Array<{ x: number; y: number }>> } | null,
  betOffsets: { desktop: Record<number, Array<{ x: number; y: number }>>; telegram: Record<number, Array<{ x: number; y: number }>> } | null
) {
  globalCalibrationCache = { positions, betOffsets, loaded: true };
}

function getCalibrationConfig(): { desktop: Record<number, Array<{ x: number; y: number }>>; telegram: Record<number, Array<{ x: number; y: number }>> } | null {
  // Сначала проверяем глобальный кеш (загруженный из Supabase)
  if (globalCalibrationCache.loaded && globalCalibrationCache.positions) {
    return globalCalibrationCache.positions;
  }
  
  // Fallback на localStorage (для desktop)
  try {
    const saved = localStorage.getItem('syndikate_seat_positions');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object' && parsed.desktop && parsed.telegram) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// Калибратор ставок - смещения фишек от позиции аватара
function getBetOffsetsConfig(): { desktop: Record<number, Array<{ x: number; y: number }>>; telegram: Record<number, Array<{ x: number; y: number }>> } | null {
  // Сначала проверяем глобальный кеш (загруженный из Supabase)
  if (globalCalibrationCache.loaded && globalCalibrationCache.betOffsets) {
    return globalCalibrationCache.betOffsets;
  }
  
  // Fallback на localStorage (для desktop)
  try {
    const saved = localStorage.getItem('syndikate_bet_offsets');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object' && parsed.desktop && parsed.telegram) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// Функция получения позиций с учётом калибровки
function getCalibratedPositions(mode: 'desktop' | 'telegram'): Record<number, Array<{ x: number; y: number }>> {
  const calibration = getCalibrationConfig();
  if (calibration && calibration[mode]) {
    // Мержим с defaults на случай если не все количества игроков откалиброваны
    const defaults = mode === 'desktop' ? DEFAULT_SEAT_POSITIONS_BY_COUNT : DEFAULT_TELEGRAM_SEAT_POSITIONS_BY_COUNT;
    return { ...defaults, ...calibration[mode] };
  }
  return mode === 'desktop' ? DEFAULT_SEAT_POSITIONS_BY_COUNT : DEFAULT_TELEGRAM_SEAT_POSITIONS_BY_COUNT;
}

// Функция получения смещений ставок
function getCalibratedBetOffsets(mode: 'desktop' | 'telegram'): Record<number, Array<{ x: number; y: number }>> | null {
  const config = getBetOffsetsConfig();
  if (config && config[mode]) {
    return config[mode];
  }
  return null;
}

// Определение контекста Telegram
function isTelegramMiniApp(): boolean {
  // В Telegram WebApp объект WebApp существует всегда, но initData иногда может быть пустым (особенно в dev/preview).
  const hasWebAppObject = !!(window as any).Telegram?.WebApp;
  if (hasWebAppObject) return true;

  // Фоллбек по URL-параметрам/роутам (когда SDK прокидывает параметры без window.Telegram)
  const href = window.location.href;
  const path = window.location.pathname;
  const looksLikeTelegramUrl =
    href.includes('tgWebApp') ||
    href.includes('tgWebAppData=') ||
    path.startsWith('/telegram') ||
    path.startsWith('/telegram-mini-app');

  return looksLikeTelegramUrl;
}

// Функция получения смещения ставки для конкретного места (динамическая)
export function getBetOffset(
  seatIndex: number, 
  playerCount: number, 
  forTelegram?: boolean
): { x: number; y: number } | null {
  const isTelegram = forTelegram ?? isTelegramMiniApp();
  const offsets = getCalibratedBetOffsets(isTelegram ? 'telegram' : 'desktop');
  
  if (offsets && offsets[playerCount] && offsets[playerCount][seatIndex]) {
    return offsets[playerCount][seatIndex];
  }
  return null; // Вернёт null если нет калибровки - компонент использует дефолтную логику
}

// Функция получения позиций по количеству игроков (динамическая загрузка из localStorage)
function getSeatPositions(playerCount: number, forTelegram?: boolean): Array<{ x: number; y: number }> {
  const isTelegram = forTelegram ?? isTelegramMiniApp();
  const mode = isTelegram ? 'telegram' : 'desktop';
  const positions = getCalibratedPositions(mode);
  const defaults = isTelegram ? DEFAULT_TELEGRAM_SEAT_POSITIONS_BY_COUNT : DEFAULT_SEAT_POSITIONS_BY_COUNT;
  
  if (playerCount <= 2) return positions[2] || defaults[2];
  if (playerCount >= 9) return positions[9] || defaults[9];
  return positions[playerCount] || defaults[playerCount] || positions[6] || defaults[6];
}

// ============= PREMIUM POKER CARD with personalization =============
// Helper function to generate pattern CSS
const getCardBackPattern = (pattern: string, color: string): React.CSSProperties => {
  const colorWithAlpha = color + '20';
  switch (pattern) {
    case 'grid':
      return { backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px), repeating-linear-gradient(90deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px)` };
    case 'diamonds':
      return { backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px), repeating-linear-gradient(-45deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px)` };
    case 'dots':
      return { backgroundImage: `radial-gradient(circle, ${colorWithAlpha} 2px, transparent 2px)`, backgroundSize: '8px 8px' };
    case 'diagonal':
      return { backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, ${colorWithAlpha} 4px, ${colorWithAlpha} 5px)` };
    case 'circles':
      return { backgroundImage: `radial-gradient(circle, transparent 4px, ${colorWithAlpha} 4px, ${colorWithAlpha} 5px, transparent 5px)`, backgroundSize: '12px 12px' };
    case 'waves':
      return { backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${colorWithAlpha} 3px, ${colorWithAlpha} 4px), repeating-linear-gradient(60deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px)` };
    default:
      return { backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px), repeating-linear-gradient(90deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px)` };
  }
};

interface PremiumCardProps {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  delay?: number;
  isWinning?: boolean;
  cardBackColors?: { accent: string; pattern: string };
  cardStyle?: 'classic' | 'modern' | 'fourcolor' | 'jumbo';
}

const PremiumCard = memo(function PremiumCard({
  card,
  faceDown = false,
  size = 'md',
  delay = 0,
  isWinning = false,
  cardBackColors,
  cardStyle = 'classic'
}: PremiumCardProps) {
  const sizeConfig = {
    xs: { w: 32, h: 44, rank: 'text-[11px]', suit: 'text-[9px]', center: 'text-base' },
    sm: { w: 40, h: 56, rank: 'text-sm', suit: 'text-xs', center: 'text-lg' },
    md: { w: 52, h: 72, rank: 'text-base', suit: 'text-sm', center: 'text-2xl' },
    lg: { w: 64, h: 88, rank: cardStyle === 'jumbo' ? 'text-2xl' : 'text-lg', suit: cardStyle === 'jumbo' ? 'text-lg' : 'text-base', center: 'text-3xl' },
  };
  
  const cfg = sizeConfig[size];
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS;
  
  // Four-color deck support
  const FOUR_COLOR_SUITS = {
    h: { symbol: '♥', color: '#ef4444', name: 'hearts' },   // Red
    d: { symbol: '♦', color: '#3b82f6', name: 'diamonds' }, // Blue
    c: { symbol: '♣', color: '#22c55e', name: 'clubs' },    // Green
    s: { symbol: '♠', color: '#1e293b', name: 'spades' }    // Black
  };
  
  const suitInfo = cardStyle === 'fourcolor' ? FOUR_COLOR_SUITS[suitChar] : SUITS[suitChar] || SUITS.s;
  
  // Card back colors from preferences
  const accentColor = cardBackColors?.accent || '#ff7a00';
  const patternType = cardBackColors?.pattern || 'grid';

  if (faceDown) {
    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.3, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        transition={{ delay: delay * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
        className="rounded-lg shadow-xl relative overflow-hidden"
        style={{
          width: cfg.w,
          height: cfg.h,
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid #e5e7eb',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)'
        }}
      >
        {/* Pattern */}
        <div 
          className="absolute inset-0"
          style={getCardBackPattern(patternType, accentColor)}
        />
        {/* Border frame */}
        <div className="absolute inset-1 border rounded-sm" style={{ borderColor: `${accentColor}30` }} />
        <div className="absolute inset-2 border rounded-sm" style={{ borderColor: `${accentColor}20` }} />
        {/* Center S logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className="font-display font-black text-xl"
            style={{ color: accentColor, opacity: 0.5 }}
          >
            S
          </span>
        </div>
        {/* Corner ornaments */}
        <div className="absolute top-1 left-1 w-2 h-2 border-l-2 border-t-2" style={{ borderColor: `${accentColor}40` }} />
        <div className="absolute top-1 right-1 w-2 h-2 border-r-2 border-t-2" style={{ borderColor: `${accentColor}40` }} />
        <div className="absolute bottom-1 left-1 w-2 h-2 border-l-2 border-b-2" style={{ borderColor: `${accentColor}40` }} />
        <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2" style={{ borderColor: `${accentColor}40` }} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.3, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ delay: delay * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
      className="rounded-lg shadow-xl relative flex flex-col"
      style={{
        width: cfg.w,
        height: cfg.h,
        background: 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)',
        border: isWinning ? '3px solid #fbbf24' : '2px solid #e2e8f0',
        boxShadow: isWinning 
          ? '0 0 30px rgba(251,191,36,0.6), 0 8px 24px rgba(0,0,0,0.3)'
          : '0 8px 24px rgba(0,0,0,0.25)'
      }}
    >
      {/* Top-left corner - Rank left, Suit right (horizontal) */}
      <div className="absolute top-1 left-1.5 flex items-center gap-1 leading-none">
        <span className={cn(cfg.rank, 'font-bold')} style={{ color: suitInfo.color }}>{rank}</span>
        <span className={cfg.suit} style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cfg.center} style={{ color: suitInfo.color, opacity: 0.15 }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Bottom-right corner - Suit left, Rank right (horizontal, rotated 180°) */}
      <div className="absolute bottom-1 right-1.5 flex items-center gap-1 leading-none rotate-180">
        <span className={cn(cfg.rank, 'font-bold')} style={{ color: suitInfo.color }}>{rank}</span>
        <span className={cfg.suit} style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Glossy effect */}
      <div className="absolute inset-0 pointer-events-none rounded-lg"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)' }}
      />
    </motion.div>
  );
});

// ============= TIMER RING (now uses SmoothAvatarTimer) =============
// Timer ring is now imported from SmoothAvatarTimer component for 60fps smooth animation

// ============= PLAYER SEAT with personalized cards =============
interface PlayerSeatProps {
  player: PokerPlayer | null;
  position: { x: number; y: number };
  seatNumber: number;
  isHero: boolean;
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
  isCurrentTurn: boolean;
  turnTimeRemaining?: number;
  turnTimeTotal?: number;
  isTimeBankActive?: boolean; // POKERSTARS-STYLE: Time bank phase
  heroCards?: string[];
  communityCards?: string[];
  gamePhase?: string;
  canJoin?: boolean;
  onSeatClick?: (seatNumber: number) => void;
  lastAction?: string;
  showdownPlayers?: Array<{ playerId: string; seatNumber: number; holeCards: string[]; handName?: string }>;
  showdownWinners?: Array<{ playerId: string; amount: number; handName?: string }>;
  bigBlind?: number;
  displayFormat?: 'bb' | 'chips';
  // POKERSTARS-STYLE: Sequential card dealing sync
  dealOrder?: number; // Order in which this player receives cards (0 = first from dealer)
  handId?: string;    // Unique hand ID to reset animations on new hands
}

// ============= ACTION BADGE - PPPoker style status above player =============
const ActionBadge = memo(function ActionBadge({ 
  action, 
  amount 
}: { 
  action: string | null | undefined; 
  amount?: number;
}) {
  if (!action) return null;
  
  const actionConfig: Record<string, { label: string; bg: string; text: string }> = {
    fold: { label: 'Фолд', bg: 'bg-gray-600', text: 'text-white' },
    check: { label: 'Чек', bg: 'bg-blue-500', text: 'text-white' },
    call: { label: 'Колл', bg: 'bg-emerald-500', text: 'text-white' },
    bet: { label: 'Бет', bg: 'bg-amber-500', text: 'text-black' },
    raise: { label: 'Рейз', bg: 'bg-amber-500', text: 'text-black' },
    allin: { label: 'ОЛЛ-ИН', bg: 'bg-red-500', text: 'text-white' },
  };
  
  const config = actionConfig[action.toLowerCase()] || { label: action, bg: 'bg-gray-500', text: 'text-white' };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.8 }}
      className={cn(
        "absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-lg z-30",
        config.bg, config.text
      )}
    >
      {config.label}
      {amount && amount > 0 && ` ${amount.toLocaleString()}`}
    </motion.div>
  );
});

// OpponentCards now uses PPPokerCompactCards component

const PlayerSeat = memo(function PlayerSeat({
  player,
  position,
  seatNumber,
  isHero,
  isDealer,
  isSB,
  isBB,
  isCurrentTurn,
  turnTimeRemaining,
  turnTimeTotal = 15,
  isTimeBankActive = false,
  heroCards,
  communityCards = [],
  gamePhase = 'waiting',
  canJoin = false,
  onSeatClick,
  lastAction,
  showdownPlayers,
  showdownWinners,
  bigBlind = 20,
  displayFormat = 'chips',
  // POKERSTARS-STYLE: Sequential card dealing
  dealOrder = 0,
  handId
}: PlayerSeatProps & { lastAction?: string }) {
  // Avatar sizes - same for all players
  const avatarSize = 56;
  
  // HUD hover state - MUST be called before any conditional returns!
  const [showHUD, setShowHUD] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ------------------------------
  // POKERSTARS: Stable handId for card dealing
  // ------------------------------
  // Keep a stable reference so transient server flickers don't break animations.
  // The actual "animate once per hand" guard is inside PPPokerCompactCards.
  const stableHandIdRef = useRef<string | undefined>(undefined);
  
  // CRITICAL: Only update stableHandId when we get a NEW valid handId
  // This prevents flickering when server briefly sends undefined
  if (handId && handId !== stableHandIdRef.current) {
    stableHandIdRef.current = handId;
  }
  const stableHandId = stableHandIdRef.current;

  // -------------------------------------------------
  // POKERSTARS-STYLE: One-shot deal pulse (per hand)
  // -------------------------------------------------
  // Problem:
  // - If we tie animateDeal to `gamePhase === 'preflop'`, it can retrigger after actions
  //   when transient server snapshots flicker phase/handId.
  // Fix:
  // - Generate a short "deal pulse" only once per handId.
  // - Keep cards hidden until the pulse starts (shuffle/deal moment).

  const [dealPulse, setDealPulse] = useState(false);
  const [dealCompleted, setDealCompleted] = useState(false);

  // Always clear deal state when we're between hands.
  // This prevents "leftover" opponent cards from staying visible while the next hand is initializing.
  useEffect(() => {
    if (gamePhase !== 'waiting') return;
    setDealPulse(false);
    setDealCompleted(false);
  }, [gamePhase]);

  useEffect(() => {
    if (!stableHandId) return;

    // Reset for new hand
    setDealPulse(false);
    setDealCompleted(false);

    // Align with shuffle -> deal
    const startDelayMs = HAND_TRANSITION_TIMINGS.shuffleAnimation;
    const pulseStart = window.setTimeout(() => {
      setDealPulse(true);
    }, startDelayMs);

    // Pulse duration: long enough for 2-card fan animation to finish
    const pulseDurationMs =
      CARD_DEAL_TIMINGS.cardDealDuration +
      CARD_DEAL_TIMINGS.perHoleCard * 2 +
      200;

    const pulseEnd = window.setTimeout(() => {
      setDealPulse(false);
      setDealCompleted(true);
    }, startDelayMs + pulseDurationMs);

    return () => {
      window.clearTimeout(pulseStart);
      window.clearTimeout(pulseEnd);
    };
  }, [stableHandId]);

  // Drive opponent mini-cards:
  // - animate only during dealPulse (once per hand)
  // - remain visible after deal (even in preflop) but never animate again
  const shouldAnimateCompactDeal = dealPulse;
  const shouldShowAfterDeal = dealCompleted && gamePhase !== 'waiting';
  
  // Format stack based on display preference
  const formatStack = (stack: number): string => {
    if (displayFormat === 'bb') {
      const bb = stack / bigBlind;
      if (bb >= 100) return `${Math.round(bb)} BB`;
      if (bb >= 10) return `${bb.toFixed(1)} BB`;
      return `${bb.toFixed(1)} BB`;
    }
    return stack.toLocaleString();
  };
  
  // Check if this player is a winner from showdownWinners prop (more reliable than player.isWinner)
  const isWinner = useMemo(() => {
    if (!player) return false;
    if ((player as any).isWinner) return true;
    if (showdownWinners && showdownWinners.length > 0) {
      return showdownWinners.some(w => w.playerId === player.playerId);
    }
    return false;
  }, [player, showdownWinners]);
  
  // Empty seat
  if (!player) {
    return (
      <motion.div
        className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => canJoin && onSeatClick?.(seatNumber)}
      >
        <div 
          className={cn(
            "rounded-full flex items-center justify-center transition-all",
            canJoin ? "cursor-pointer" : "cursor-default"
          )}
          style={{
            width: avatarSize,
            height: avatarSize,
            background: canJoin 
              ? 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(0,0,0,0.6) 100%)'
              : 'rgba(0,0,0,0.3)',
            border: canJoin ? '2px dashed rgba(34,197,94,0.5)' : '2px dashed rgba(255,255,255,0.15)',
          }}
        >
          <span className={cn(
            "text-xs font-medium",
            canJoin ? "text-emerald-400/80" : "text-white/30"
          )}>
            {canJoin ? 'Сесть' : ''}
          </span>
        </div>
      </motion.div>
    );
  }

  const resolvedAvatar = resolveAvatarUrl(player.avatarUrl, player.playerId);
  const isReplaceableBot = canJoin && /bot/i.test(player.name ?? '');

  // HUD hover handlers (hooks defined above, before conditional returns)
  const handleMouseEnter = () => {
    if (isHero) return;
    hoverTimeoutRef.current = setTimeout(() => setShowHUD(true), 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setShowHUD(false);
  };

  const hudPosition = position.x < 40 ? 'right' : position.x > 60 ? 'left' : position.y < 50 ? 'bottom' : 'top';

  return (
    <motion.div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2",
        isHero ? "z-20" : "z-10",
        isReplaceableBot && "cursor-pointer"
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => {
        if (isReplaceableBot) onSeatClick?.(seatNumber);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* HUD Popup on hover */}
      {!isHero && (
        <PokerStarsHUDPopup
          playerId={player.playerId}
          playerName={getMaskedName(player.playerId, player.name)}
          isVisible={showHUD}
          position={hudPosition as 'left' | 'right' | 'top' | 'bottom'}
        />
      )}

      {/* Avatar with status border and opponent cards */}
      <div className="relative">
        {/* Timer ring - UNDER cards and game elements, around avatar */}
        {isCurrentTurn && turnTimeRemaining !== undefined && !player.isFolded && (
          <div 
            className="absolute z-0 pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: avatarSize + 6,
              height: avatarSize + 6
            }}
          >
            <SmoothAvatarTimer 
              remaining={turnTimeRemaining} 
              total={turnTimeTotal}
              size={avatarSize + 6}
              strokeWidth={3}
              isTimeBankPhase={isTimeBankActive}
            />
          </div>
        )}
        
        {/* Level badge - PPPoker style (5YR, VIP, etc.) */}
        <PPPokerLevelBadge level={(player as any).level} isVIP={(player as any).isVIP} />
        
        <div 
          className={cn(
            "rounded-full overflow-hidden transition-all duration-200",
            player.isFolded && "opacity-50 grayscale"
          )}
          style={{
            width: avatarSize,
            height: avatarSize,
            border: isWinner
              ? '4px solid #fbbf24'
              : player.isAllIn
                ? '3px solid #ef4444'
                : '2px solid rgba(255,255,255,0.3)',
            boxShadow: isWinner
              ? '0 0 30px rgba(251,191,36,0.9), 0 0 60px rgba(251,191,36,0.6), 0 0 90px rgba(251,191,36,0.3)'
              : player.isAllIn
                ? '0 0 20px rgba(239,68,68,0.5)'
                : '0 6px 20px rgba(0,0,0,0.5)',
            animation: isWinner ? 'winner-glow 1.5s ease-in-out infinite' : undefined
          }}
        >
          <img 
            src={resolvedAvatar}
            alt={player.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = resolveAvatarUrl(null, player.playerId); }}
          />
          
          {/* Fold overlay */}
          {player.isFolded && !player.isSittingOut && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white/80 text-[10px] font-bold">Fold</span>
            </div>
          )}
          
          {/* POKERSTARS-STYLE: Sit-out overlay */}
          {player.isSittingOut && (
            <SitOutOverlay 
              isTournament={false} 
              showText={true} 
            />
          )}
          
          {/* Winner glow overlay */}
          {isWinner && (
            <motion.div 
              className="absolute inset-0 rounded-full pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ 
                boxShadow: 'inset 0 0 30px rgba(251,191,36,0.6)'
              }}
            />
          )}
        </div>
        
        {/* POKERSTARS-STYLE: Sit-out indicator badge (orbit counter) */}
        {player.isSittingOut && (
          <SitOutIndicator
            sitOutOrbits={player.sitOutOrbits || 0}
            maxOrbits={4}
            isTournament={false}
            size="sm"
            showOrbitCounter={true}
          />
        )}
        
        {/* POKERSTARS-STYLE: Wait for BB indicator */}
        {player.waitForBB && !player.isSittingOut && (
          <WaitForBBIndicator size="sm" />
        )}
        {/* Opponent cards - positioned at corner of avatar */}
        {/* Only show cards during active hand phases (preflop through showdown), NOT waiting */}
        {!isHero && !player.isFolded && gamePhase && ['preflop', 'flop', 'turn', 'river', 'showdown'].includes(gamePhase) && (() => {
          // Get cards from showdownPlayers if available (revealed at showdown)
          const showdownData = showdownPlayers?.find(sp => sp.playerId === player.playerId || sp.seatNumber === seatNumber);
          const revealedCards = showdownData?.holeCards;
          const hasRevealedCards = revealedCards && revealedCards.length >= 2 && revealedCards[0] !== '??' && revealedCards[1] !== '??';
          
          // Also check player.holeCards (updated by hook at showdown)
          const playerHasCards = player.holeCards && player.holeCards.length >= 2 && player.holeCards[0] !== '??' && player.holeCards[1] !== '??';
          
          // Use revealed cards from showdownPlayers first, then player.holeCards
          const displayCards = hasRevealedCards ? revealedCards : (playerHasCards ? player.holeCards : ['??', '??']);
          
          // Reveal if showdown AND we have real cards to show
          const shouldReveal = gamePhase === 'showdown' && (hasRevealedCards || playerHasCards);
          
          // Get winning card indices - from player object (calculated by hook)
          const playerWinningIndices = (player as any).winningCardIndices || [];
          
          // Debug: log showdown data
          if (shouldReveal) {
            console.log('[PlayerSeat] Showdown render:', {
              playerName: player.name,
              isWinner: (player as any).isWinner,
              winningCardIndices: playerWinningIndices,
              handName: (player as any).handName,
              displayCards
            });
          }
          
          // Position cards ON the avatar corner, pointing towards table center
          const isOnRightSide = position.x > 50;
          const isOnLeftSide = position.x <= 50;
          
          // Cards overlaid on avatar corner (towards center of table)
          // Left players: cards on RIGHT (towards table)
          // Right players: cards on LEFT (mirrored, towards table)
          let cardStyle: React.CSSProperties = {};
          
          if (isOnLeftSide) {
            // Left side players - cards on top-right of avatar
            cardStyle = { top: '-24px', right: '-10px' };
          } else {
            // Right side players - cards on top-left of avatar (mirrored)
            cardStyle = { top: '-24px', left: '-10px' };
          }
          
          return (
            <div 
              className="absolute z-5"
              style={cardStyle}
            >
              <PPPokerCompactCards 
                cards={displayCards}
                faceDown={!shouldReveal}
                isShowdown={shouldReveal}
                handName={shouldReveal ? (showdownData?.handName || (player as any).handName) : undefined}
                isWinner={(player as any).isWinner}
                winningCardIndices={playerWinningIndices}
                size="xs"
                position={position}
                handId={stableHandId}
                // POKERSTARS: Opponents start AFTER hero (200ms offset + 120ms per seat)
                dealDelay={200 + Math.max(0, dealOrder - 1) * 120}
                // POKERSTARS: Cards animate on preflop, stay static after, clear between hands
                animateDeal={shouldAnimateCompactDeal}
                showAfterDeal={shouldShowAfterDeal}
              />
            </div>
          );
        })()}
        
        {/* Dealer button - PPPoker style - positioned INSIDE table */}
        {isDealer && (
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center z-25",
              position.x > 50 ? "-left-2" : "-right-2"
            )}
            style={{
              background: 'linear-gradient(145deg, #fef3c7 0%, #fbbf24 50%, #f59e0b 100%)',
              border: '2px solid #92400e',
              boxShadow: '0 2px 8px rgba(251,191,36,0.5), inset 0 1px 2px rgba(255,255,255,0.4)'
            }}
          >
            <span className="font-black text-[10px] text-amber-900">D</span>
          </motion.div>
        )}
        
        {/* SB/BB indicator - positioned INSIDE table (opposite side from edge) */}
        {(isSB || isBB) && !isDealer && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center z-20",
              position.x > 50 ? "-left-2" : "-right-2"
            )}
            style={{
              background: isBB 
                ? 'linear-gradient(145deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(145deg, #94a3b8, #64748b)',
              border: isBB ? '1.5px solid #92400e' : '1.5px solid #475569',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }}
          >
            <span className={cn(
              "font-black text-[7px]",
              isBB ? "text-amber-900" : "text-gray-800"
            )}>{isBB ? 'BB' : 'SB'}</span>
          </motion.div>
        )}
      </div>
      
      {/* Name and stack panel - anchored to avatar center (doesn't affect seat positioning) */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-center min-w-[60px]"
        style={{
          top: avatarSize + 6,
          background: player.isAllIn 
            ? 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(20,20,20,0.95) 100%)',
          borderBottom: `2px solid ${player.isAllIn ? '#ef4444' : '#22c55e'}`
        }}
      >
        <p className="text-[9px] text-white/80 font-medium truncate max-w-[60px]">
          {getMaskedName(player.playerId, player.name)}
        </p>
        <p className={cn(
          "text-[11px] font-bold",
          player.isAllIn ? "text-white" : "text-emerald-400"
        )}>
          {player.isAllIn ? 'ALL-IN' : formatStack(player.stack)}
        </p>
      </div>
      
      {/* Hero cards - below player, not in avatar container */}
      {/* PokerStars-style: show cards even after fold (dimmed, hover to peek) */}
      {isHero && heroCards && heroCards.length > 0 && (
        <PPPokerHeroCards 
          cards={heroCards} 
          gamePhase={gamePhase} 
          communityCards={communityCards}
          // Use stabilized hand id so transient server snapshots don't retrigger hero deal logic
          handId={stableHandId}
          isWinner={(player as any).isWinner}
          winningCardIndices={(player as any).winningCardIndices || []}
          isFolded={player.isFolded}
          // CLEAN FIX: Hero must appear first.
          dealDelay={0}
        />
      )}
      
      {/* Action badge - PPPoker style */}
      <AnimatePresence>
        {lastAction && !player.isFolded && (
          <PPPokerActionBadge action={lastAction} amount={player.betAmount} />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// ============= TABLE GLOW RENDERER - Dynamic glow based on preference =============
const TableGlowRenderer = memo(function TableGlowRenderer({
  glowStyleId,
  wideMode = false
}: {
  glowStyleId: string;
  wideMode?: boolean;
}) {
  const tableInsets = {
    top: '6%',
    left: wideMode ? '10%' : '20%',
    right: wideMode ? '10%' : '20%',
    bottom: '6%'
  };

  switch (glowStyleId) {
    case 'cyberpunk':
      return (
        <CyberpunkTableGlow 
          primaryColor="#00d4ff"
          secondaryColor="#ff00ff"
          intensity={0.7}
          tableInsets={tableInsets}
        />
      );
    case 'mafia':
      return (
        <MafiaTableGlow 
          intensity={0.8}
          tableInsets={tableInsets}
        />
      );
    case 'western':
      return (
        <WesternTableGlow 
          intensity={0.8}
          tableInsets={tableInsets}
        />
      );
    case 'cosmic':
      return (
        <CosmicTableGlow 
          intensity={0.8}
          tableInsets={tableInsets}
        />
      );
    case 'vegas':
      return (
        <NeonVegasTableGlow 
          intensity={0.8}
          tableInsets={tableInsets}
        />
      );
    case 'matrix':
      return (
        <MatrixTableGlow 
          intensity={0.8}
          tableInsets={tableInsets}
        />
      );
    case 'elegant':
      return (
        <MinimalElegantTableGlow 
          intensity={0.8}
          tableInsets={tableInsets}
        />
      );
    case 'none':
    default:
      return null;
  }
});

// ============= SYNDIKATE TABLE FELT - Unique hexagonal stadium shape =============
interface SyndikateTableFeltProps {
  themeColor?: string;
  themeGradient?: string;
  wideMode?: boolean; // For Telegram Mini App - wider table
}

const SyndikateTableFelt = memo(function SyndikateTableFelt({ 
  themeColor = '#0d5c2e',
  themeGradient,
  wideMode = false
}: SyndikateTableFeltProps) {
  const { preferences } = usePokerPreferences();
  
  // Generate felt gradient from theme color
  // Wide mode uses smaller left/right margins for Telegram Mini App
  const sideMargin = wideMode ? { outer: '10%', leather: '11%', glow: '12%', inner: '13%', felt: '14%', corners: '12%' } 
                               : { outer: '20%', leather: '21%', glow: '22%', inner: '23%', felt: '24%', corners: '22%' };
  const feltGradient = themeGradient || `radial-gradient(ellipse at 50% 40%, ${themeColor} 0%, ${themeColor}dd 25%, ${themeColor}bb 45%, ${themeColor}99 65%, ${themeColor}77 85%, ${themeColor}55 100%)`;
  
  return (
    <div className="absolute inset-0 overflow-hidden will-change-auto">
      {/* OPTIMIZED: Removed heavy blur(40px) glow - using simpler gradient with wider spread */}
      <div 
        className="absolute"
        style={{
          top: '6%',
          left: sideMargin.glow,
          right: sideMargin.glow,
          bottom: '6%',
          borderRadius: '45% / 25%',
          background: `radial-gradient(ellipse at 50% 50%, ${themeColor}30 0%, ${themeColor}15 40%, transparent 70%)`
        }}
      />
      
      {/* Outer rail - dark leather with gold accents */}
      <div 
        className="absolute"
        style={{
          top: '6%',
          left: sideMargin.outer,
          right: sideMargin.outer,
          bottom: '6%',
          borderRadius: '45% / 22%',
          background: 'linear-gradient(180deg, #3a4550 0%, #2a3540 20%, #1e2830 50%, #2a3540 80%, #3a4550 100%)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.7), inset 0 1px 10px rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.05)'
        }}
      />
      
      {/* Gold ornate trim - premium accent */}
      <div 
        className="absolute"
        style={{
          top: '7%',
          left: sideMargin.leather,
          right: sideMargin.leather,
          bottom: '7%',
          borderRadius: '44% / 21%',
          background: 'linear-gradient(180deg, #c9a227 0%, #a67c00 15%, #7d5c00 30%, #55400a 50%, #7d5c00 70%, #a67c00 85%, #c9a227 100%)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), 0 0 15px rgba(201,162,39,0.15)'
        }}
      />
      
      {/* Inner dark leather padding */}
      <div 
        className="absolute"
        style={{
          top: '8%',
          left: sideMargin.inner,
          right: sideMargin.inner,
          bottom: '8%',
          borderRadius: '43% / 20%',
          background: 'linear-gradient(180deg, #2a3545 0%, #1e2835 30%, #151c25 60%, #1e2835 85%, #2a3545 100%)',
          boxShadow: 'inset 0 3px 15px rgba(0,0,0,0.6)'
        }}
      />
      
      {/* Inner gold trim line */}
      <div 
        className="absolute"
        style={{
          top: '9.5%',
          left: sideMargin.felt,
          right: sideMargin.felt,
          bottom: '9.5%',
          borderRadius: '41% / 19%',
          background: 'transparent',
          border: '2px solid rgba(201,162,39,0.4)',
          boxShadow: '0 0 8px rgba(201,162,39,0.2)'
        }}
      />
      
      {/* Main felt surface - OPTIMIZED: reduced box-shadow complexity */}
      <div 
        className="absolute"
        style={{
          top: '10%',
          left: sideMargin.felt,
          right: sideMargin.felt,
          bottom: '10%',
          borderRadius: '40% / 18%',
          background: feltGradient,
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.25)'
        }}
      >
        {/* REMOVED: Heavy SVG noise texture filter for mobile performance */}
        
        {/* Center logo - OPTIMIZED: removed drop-shadow filter */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
          <img src={syndikateLogo} alt="" className="w-28 h-auto opacity-[0.08]"/>
          <span className="text-white/[0.04] font-black text-xl tracking-[0.4em] uppercase">
            Poker
          </span>
        </div>
        
        {/* Decorative horizontal line */}
        <div className="absolute top-1/2 -translate-y-1/2 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"/>
        
        {/* REMOVED: Corner decorations for mobile performance */}
      </div>
      
      {/* Ambient glow from pot area - OPTIMIZED: removed blur filter, using larger gradient */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 w-48 h-32 pointer-events-none"
        style={{
          top: '35%',
          background: 'radial-gradient(ellipse, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0.03) 40%, transparent 60%)'
        }}
      />
      
      {/* Dynamic table glow based on user preference */}
      <TableGlowRenderer 
        glowStyleId={preferences.tableGlowStyle}
        wideMode={wideMode}
      />
    </div>
  );
});

// ============= COMMUNITY CARDS with personalization =============
const CommunityCards = memo(function CommunityCards({ 
  cards, 
  phase,
  winningCardIndices = []
}: { 
  cards: string[]; 
  phase: string;
  winningCardIndices?: number[];
}) {
  const { currentCardBack, preferences } = usePokerPreferences();
  const visibleCount = phase === 'flop' ? 3 : phase === 'turn' ? 4 : (phase === 'river' || phase === 'showdown') ? 5 : 0;
  const isShowdown = phase === 'showdown';
  const hasWinningInfo = winningCardIndices.length > 0;

  return (
    <div className="flex items-center justify-center gap-1">
      {[0, 1, 2, 3, 4].map((idx) => {
        const isVisible = idx < visibleCount;
        const card = cards[idx];
        const isWinning = winningCardIndices.includes(idx);
        const isDimmed = isShowdown && hasWinningInfo && !isWinning;
        
        return (
          <AnimatePresence key={idx}>
            {isVisible && card ? (
              <motion.div
                initial={{ y: -80, opacity: 0, rotateX: 90 }}
                animate={{ y: 0, opacity: isDimmed ? 0.6 : 1, rotateX: 0 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ 
                  delay: idx * (preferences.fastAnimations ? 0.08 : 0.15), 
                  type: 'spring', 
                  stiffness: preferences.fastAnimations ? 300 : 200, 
                  damping: 20 
                }}
              >
                <PremiumCard 
                  card={card} 
                  size="md" 
                  delay={0} 
                  isWinning={isShowdown && isWinning}
                  cardBackColors={{ accent: currentCardBack.accentColor, pattern: currentCardBack.pattern }}
                  cardStyle={preferences.cardStyle}
                />
              </motion.div>
            ) : (
              <div 
                key={`empty-${idx}`}
                className="rounded-md border border-dashed border-white/10"
                style={{ width: 48, height: 66 }}
              />
            )}
          </AnimatePresence>
        );
      })}
    </div>
  );
});

// ============= POT DISPLAY - PPPoker style with premium 3D chips =============
const PotDisplay = memo(function PotDisplay({ 
  pot, 
  blinds,
  displayFormat = 'chips'
}: { 
  pot: number; 
  blinds: string;
  displayFormat?: 'bb' | 'chips';
}) {
  if (pot === 0) return null;
  
  // Parse big blind from blinds string (e.g., "10/20" -> 20)
  const bigBlind = parseInt(blinds.split('/')[1]) || 20;
  
  // Format pot based on display preference
  const formatPot = (amount: number): string => {
    if (displayFormat === 'bb') {
      const bb = amount / bigBlind;
      if (bb >= 100) return `${Math.round(bb)} BB`;
      if (bb >= 10) return `${bb.toFixed(1)} BB`;
      return `${bb.toFixed(1)} BB`;
    }
    return amount.toLocaleString();
  };
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Pot amount with premium 3D chip stack */}
      <div className="flex items-center gap-3">
        {/* Premium 3D Chip stack from RealisticPokerChip */}
        <PotChips 
          amount={pot} 
          bigBlind={bigBlind} 
          size={26} 
          animated 
        />
        
        {/* Pot amount - golden text */}
        <span 
          className="font-bold text-[17px]"
          style={{
            color: '#fbbf24',
            textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(251,191,36,0.3)'
          }}
        >
          {formatPot(pot)}
        </span>
      </div>
      
      {/* Blinds info - PPPoker Russian style */}
      <span 
        className="text-white/90 text-[12px] font-medium"
        style={{
          textShadow: '0 1px 3px rgba(0,0,0,0.8)'
        }}
      >
        Блайнды: {blinds}
      </span>
    </motion.div>
  );
});
// ============= TOURNAMENT INFO BAR (compact PPPoker style) =============
interface TournamentInfoBarProps {
  currentLevel?: number;
  smallBlind: number;
  bigBlind: number;
  ante?: number;
  timeToNextLevel?: number;
  remainingPlayers?: number;
  totalPlayers?: number;
  tournamentName?: string;
}

const TournamentInfoBar = memo(function TournamentInfoBar({
  currentLevel = 1,
  smallBlind,
  bigBlind,
  ante,
  timeToNextLevel = 0,
  remainingPlayers = 0,
  totalPlayers = 0,
  tournamentName
}: TournamentInfoBarProps) {
  const isLowTime = timeToNextLevel > 0 && timeToNextLevel <= 60;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-center gap-3 px-4 py-2 rounded-full"
      style={{
        background: 'linear-gradient(180deg, rgba(15,20,25,0.9) 0%, rgba(5,10,15,0.95) 100%)',
        border: '1px solid rgba(34,197,94,0.25)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
      }}
    >
      {/* Level badge */}
      <div className="flex items-center gap-1.5">
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px]"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
        >
          {currentLevel}
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-emerald-400 font-bold text-xs">
            {smallBlind.toLocaleString()}/{bigBlind.toLocaleString()}
          </span>
          {ante && ante > 0 && (
            <span className="text-white/50 text-[8px]">
              ante {ante}
            </span>
          )}
        </div>
      </div>
      
      {/* Divider */}
      <div className="w-px h-5 bg-white/10" />
      
      {/* Timer */}
      {timeToNextLevel > 0 && (
        <>
          <div className={cn(
            "flex items-center gap-1 font-mono font-bold text-xs",
            isLowTime ? "text-red-400" : "text-white"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", isLowTime ? "bg-red-400 animate-pulse" : "bg-emerald-400")} />
            {formatTime(timeToNextLevel)}
          </div>
          <div className="w-px h-5 bg-white/10" />
        </>
      )}
      
      {/* Players */}
      {totalPlayers > 0 && (
        <div className="flex items-center gap-1 text-white text-xs">
          <span className="text-blue-400">👤</span>
          <span>{remainingPlayers}/{totalPlayers}</span>
        </div>
      )}
    </motion.div>
  );
});

// ============= MAIN TABLE COMPONENT =============
export interface FullscreenPokerTableProps {
  tableState: any;
  players: PokerPlayer[];
  heroSeat: number | null;
  heroCards: string[];
  communityCards: string[];
  pot: number;
  phase: string;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentPlayerSeat: number | null;
  turnTimeRemaining?: number;
  turnTimeTotal?: number;
  isTimeBankActive?: boolean; // POKERSTARS-STYLE: Time bank phase indicator
  smallBlind: number;
  bigBlind: number;
  canJoinTable: boolean;
  onSeatClick: (seatNumber: number) => void;
  onPotCollect?: () => void;
  // Showdown data
  showdownPlayers?: Array<{ playerId: string; seatNumber: number; holeCards: string[]; handName?: string; isFolded?: boolean }>;
  winners?: Array<{ playerId: string; amount: number; handName?: string }>;
  // Tournament info
  tournamentId?: string;
  tournamentName?: string;
  currentLevel?: number;
  levelTimeRemaining?: number;
  nextSmallBlind?: number;
  nextBigBlind?: number;
  remainingPlayers?: number;
  totalPlayers?: number;
  prizePool?: number;
  ante?: number;
  // Table configuration
  maxSeats?: number;
  wideMode?: boolean; // For Telegram Mini App - wider table
  // Professional timing from server
  betsBeingCollected?: {
    bets: Array<{ playerId: string; seatNumber: number; amount: number }>;
    timestamp: number;
  } | null;
  phaseTimings?: {
    dealDelay?: number;
    preDealDelay?: number;
    postDealDelay?: number;
    phase?: string;
  } | null;
  // Professional showdown reveals
  showdownReveals?: Array<{
    playerId: string;
    playerName: string;
    seatNumber: number;
    holeCards: string[];
    handName?: string;
    bestCards?: string[];
    revealIndex: number;
    revealDelay: number;
    isWinner: boolean;
  }>;
  // Professional winner announcement
  winnerAnnouncement?: {
    winners: Array<{
      playerId: string;
      playerName: string;
      seatNumber: number;
      amount: number;
      handName?: string;
      newStack: number;
    }>;
    pot: number;
    isSplitPot: boolean;
    potSlideDelay: number;
    highlightDuration: number;
    celebrationDuration: number;
    timestamp: number;
  } | null;
  // POKERSTARS-STYLE: Burn card animation
  activeBurnCard?: {
    phase: 'flop' | 'turn' | 'river';
    timestamp: number;
  } | null;
}

export const FullscreenPokerTable = memo(function FullscreenPokerTable({
  tableState,
  players,
  heroSeat,
  heroCards,
  communityCards,
  pot,
  phase,
  dealerSeat,
  smallBlindSeat,
  bigBlindSeat,
  currentPlayerSeat,
  turnTimeRemaining,
  turnTimeTotal,
  isTimeBankActive,
  smallBlind,
  bigBlind,
  canJoinTable,
  onSeatClick,
  onPotCollect,
  // Showdown props
  showdownPlayers,
  winners,
  // Tournament props
  tournamentId,
  tournamentName,
  currentLevel,
  levelTimeRemaining,
  remainingPlayers,
  totalPlayers,
  ante,
  // Table config
  maxSeats = 6,
  wideMode = false,
  // Professional timing from server
  betsBeingCollected,
  phaseTimings,
  showdownReveals,
  winnerAnnouncement,
  activeBurnCard
}: FullscreenPokerTableProps) {
  // DEBUG: Log tableState to verify handId is received
  console.log('[FullscreenPokerTable] RENDER:', { 
    handId: (tableState as any)?.handId,
    phase,
    dealerSeat,
    playerCount: players.length
  });
  
  // Use dynamic positions based on max seats
  // wideMode prop explicitly indicates Telegram Mini App context
  const maxPlayers = maxSeats;
  const positions = getSeatPositions(maxPlayers, wideMode);
  
  // Get personalization preferences
  const { preferences, currentTableTheme, currentCardBack } = usePokerPreferences();
  
  // Professional phase animation hook
  const { animationState, animatePhaseTransition, isAnimating: isPhaseAnimating } = usePhaseAnimation();
  
  // Track phase changes for pot collection animation
  const prevPhaseRef = useRef(phase);
  const [isCollectingBets, setIsCollectingBets] = useState(false);
  const [collectionBets, setCollectionBets] = useState<Array<{ seatPosition: { x: number; y: number }; amount: number }>>([]);
  
  // Win distribution animation state
  const [winDistribution, setWinDistribution] = useState<{ winnerSeat: number; amount: number } | null>(null);
  
  // Convert server betsBeingCollected to visual positions for animation
  const betCollectionData = useMemo(() => {
    if (!betsBeingCollected || betsBeingCollected.bets.length === 0) {
      return null;
    }
    
    return betsBeingCollected.bets.map(bet => {
      // Calculate visual position for this player
      let visualPos = 0;
      if (heroSeat !== null) {
        visualPos = (bet.seatNumber - heroSeat + maxPlayers) % maxPlayers;
      } else {
        visualPos = (bet.seatNumber + preferences.preferredSeatRotation) % maxPlayers;
      }
      const pos = positions[visualPos] || { x: 50, y: 50 };
      return {
        playerId: bet.playerId,
        seatNumber: bet.seatNumber,
        amount: bet.amount,
        position: pos
      };
    });
  }, [betsBeingCollected, heroSeat, maxPlayers, positions, preferences.preferredSeatRotation]);
  
  // Trigger win distribution animation when winners change
  useEffect(() => {
    if (winners && winners.length > 0 && phase === 'showdown') {
      const winner = winners[0];
      // Find winner's seat
      const winnerPlayer = players.find(p => p.playerId === winner.playerId);
      if (winnerPlayer) {
        // Calculate visual position
        let visualPos = 0;
        if (heroSeat !== null) {
          visualPos = (winnerPlayer.seatNumber - heroSeat + maxPlayers) % maxPlayers;
        } else {
          visualPos = (winnerPlayer.seatNumber + preferences.preferredSeatRotation) % maxPlayers;
        }
        setWinDistribution({ winnerSeat: visualPos, amount: winner.amount });
      }
    } else {
      setWinDistribution(null);
    }
  }, [winners, phase, players, heroSeat, maxPlayers, preferences.preferredSeatRotation]);
  
  
  // Detect phase change and trigger collection animation
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const phasesOrder = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const prevIndex = phasesOrder.indexOf(prevPhase);
    const currIndex = phasesOrder.indexOf(phase);
    
    // Phase advanced (not reset) - collect bets
    if (currIndex > prevIndex && prevIndex >= 0) {
      // Gather all player bets for animation
      const betsToCollect = players
        .filter(p => p.betAmount > 0)
        .map(p => {
          // Find visual position for this player
          let visualPos = 0;
          if (heroSeat !== null) {
            // Hero always at position 0 - no rotation offset when hero is seated
            visualPos = (p.seatNumber - heroSeat + maxPlayers) % maxPlayers;
          } else {
            visualPos = (p.seatNumber + preferences.preferredSeatRotation) % maxPlayers;
          }
          return {
            seatPosition: positions[visualPos],
            amount: p.betAmount
          };
        });
      
      if (betsToCollect.length > 0) {
        setCollectionBets(betsToCollect);
        setIsCollectingBets(true);
        onPotCollect?.();
      }
    }
    
    prevPhaseRef.current = phase;
  }, [phase, players, heroSeat, preferences.preferredSeatRotation, positions, maxPlayers]);
  
  
  // Build players array positioned relative to hero with rotation preference
  const positionedPlayers = useMemo(() => {
    const result: (PokerPlayer | null)[] = new Array(maxPlayers).fill(null);
    const rotationOffset = preferences.preferredSeatRotation;
    
    players.forEach(player => {
      let visualPosition: number;
      if (heroSeat !== null) {
        // Hero always at position 0 (bottom center) - no rotation offset when hero is seated
        visualPosition = (player.seatNumber - heroSeat + maxPlayers) % maxPlayers;
      } else {
        // No hero seated - apply rotation preference
        visualPosition = (player.seatNumber + rotationOffset) % maxPlayers;
      }
      result[visualPosition] = player;
    });
    
    return result;
  }, [players, heroSeat, maxPlayers, preferences.preferredSeatRotation]);
  
  // POKERSTARS-STYLE: Calculate deal order based on position from dealer
  // Cards are dealt starting from SB (seat after dealer), going clockwise
  const dealOrderMap = useMemo(() => {
    const map = new Map<number, number>(); // seatNumber -> dealOrder
    
    // Get list of occupied seats sorted by their dealing order (from dealer clockwise)
    const occupiedSeats = players
      .filter(p => p && !p.isFolded && !p.isSittingOut)
      .map(p => p.seatNumber)
      .sort((a, b) => {
        // Distance from dealer in clockwise direction
        const distA = (a - dealerSeat + maxPlayers) % maxPlayers;
        const distB = (b - dealerSeat + maxPlayers) % maxPlayers;
        return distA - distB;
      });
    
    // Assign deal order (0 = first after dealer = SB position, etc.)
    occupiedSeats.forEach((seat, index) => {
      map.set(seat, index);
    });
    
    return map;
  }, [players, dealerSeat, maxPlayers]);

  /**
   * CLEAN DEAL ORDER (UI only):
   * User expectation: hero cards appear first, then opponent compact cards start AFTER hero.
   * We keep server/game logic intact; this ONLY affects animation delays.
   */
  const dealOrderMapFromHero = useMemo(() => {
    if (heroSeat === null) return dealOrderMap;
    const heroOrder = dealOrderMap.get(heroSeat);
    const count = dealOrderMap.size;
    if (heroOrder === undefined || count <= 1) return dealOrderMap;

    const map = new Map<number, number>();
    dealOrderMap.forEach((order, seat) => {
      map.set(seat, (order - heroOrder + count) % count);
    });
    return map;
  }, [dealOrderMap, heroSeat]);
  
  // Get handId from tableState for animation reset
  const tableStateAny = tableState;
  const handId = tableStateAny?.handId as string | undefined;
  
  // Debug: log handId and dealOrderMap for synchronization verification
  React.useEffect(() => {
    if (handId) {
      console.log('[FullscreenPokerTable] Hand sync data:', {
        handId,
        dealerSeat,
        dealOrderMap: Object.fromEntries(dealOrderMap),
        playerCount: players.length
      });
    }
  }, [handId, dealerSeat, dealOrderMap, players.length]);

  return (
    <div className="relative w-full h-full">
      {/* Syndikate tech background */}
      <SyndikateTableBackground themeColor={currentTableTheme.color} />
      
      {/* Table felt overlay */}
      <SyndikateTableFelt themeColor={currentTableTheme.color} wideMode={wideMode} />
      
      
      {/* Single bet collection animation - using server timing data (removed duplicate PotCollectionAnimation) */}
      {betCollectionData && betCollectionData.length > 0 && (
        <BetCollectionAnimation
          isCollecting={true}
          betsToCollect={betCollectionData}
          onComplete={() => {
            setIsCollectingBets(false);
            setCollectionBets([]);
          }}
        />
      )}
      
      {/* Win distribution animation - Premium chips cascade (only when no bet collection in progress) */}
      {winDistribution && !betCollectionData && (
        <WinnerChipCascade
          isActive={true}
          fromPosition={{ x: 50, y: 50 }}
          toPosition={positions[winDistribution.winnerSeat]}
          amount={winDistribution.amount}
          onComplete={() => setWinDistribution(null)}
        />
      )}
      
      {/* Winner display handled directly in PlayerSeat component with handName badge */}
      
      {(() => {
        const winnerPlayer = players.find(p => (p as any).isWinner);
        const winningCommIndices = (winnerPlayer as any)?.communityCardIndices || [];
        
        return (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-10">
            <PotDisplay pot={pot} blinds={`${smallBlind}/${bigBlind}`} displayFormat={preferences.displayFormat} />
            
            {/* POKERSTARS-STYLE: Burn card animation before community cards */}
            <BurnCardAnimation 
              isActive={!!activeBurnCard}
              phase={activeBurnCard?.phase || 'flop'}
            />
            
            {/* Professional Community Cards with server timing */}
            <ProfessionalCommunityCards 
              cards={communityCards} 
              phase={phase} 
              winningCardIndices={winningCommIndices}
              phaseTimings={phaseTimings}
            />
            
            {/* Tournament info bar - shown when tournament mode */}
            {(currentLevel || totalPlayers) && (
              <TournamentInfoBar
                currentLevel={currentLevel}
                smallBlind={smallBlind}
                bigBlind={bigBlind}
                ante={ante}
                timeToNextLevel={levelTimeRemaining}
                remainingPlayers={remainingPlayers}
                totalPlayers={totalPlayers}
                tournamentName={tournamentName}
              />
            )}
          </div>
        );
      })()}
      
      {/* Player seats */}
      {positions.map((pos, idx) => {
        const player = positionedPlayers[idx];
        const actualSeatNumber = heroSeat !== null 
          ? (idx + heroSeat) % maxPlayers 
          : idx;

        const isHeroSeat = idx === 0 && heroSeat !== null;

        return (
          <React.Fragment key={`seat-${idx}`}>
            <PlayerSeat
              player={player}
              position={pos}
              seatNumber={actualSeatNumber}
              isHero={isHeroSeat}
              isDealer={player?.seatNumber === dealerSeat}
              isSB={player?.seatNumber === smallBlindSeat}
              isBB={player?.seatNumber === bigBlindSeat}
              isCurrentTurn={player?.seatNumber === currentPlayerSeat}
              turnTimeRemaining={player?.seatNumber === currentPlayerSeat ? turnTimeRemaining : undefined}
              turnTimeTotal={turnTimeTotal}
              isTimeBankActive={player?.seatNumber === currentPlayerSeat ? isTimeBankActive : false}
              heroCards={idx === 0 ? heroCards : undefined}
              communityCards={communityCards}
              gamePhase={phase}
              canJoin={canJoinTable && (!player || /bot/i.test(player.name ?? ''))}
              onSeatClick={onSeatClick}
              lastAction={(player as any)?.lastAction}
              showdownPlayers={showdownPlayers}
              showdownWinners={winners}
              bigBlind={bigBlind}
              displayFormat={preferences.displayFormat}
              dealOrder={
                player?.seatNumber !== undefined
                  ? dealOrderMapFromHero.get(player.seatNumber) ?? 0
                  : 0
              }
              handId={handId}
            />

            {/* Bet amount (incl. SB/BB fallback) - anchored to avatar center in table coordinates */}
            {(() => {
              const bet = player?.betAmount ?? 0;
              const isPreflopLike =
                phase === 'preflop' ||
                (phase === 'waiting' && communityCards.length === 0 && pot > 0);

              const blindBet =
                isPreflopLike && bet <= 0
                  ? player?.seatNumber === smallBlindSeat
                    ? smallBlind
                    : player?.seatNumber === bigBlindSeat
                      ? bigBlind
                      : 0
                  : 0;

              const amountToShow = bet > 0 ? bet : blindBet;
              if (!amountToShow || amountToShow <= 0) return null;

              return (
                <PPPokerChipStack
                  amount={amountToShow}
                  seatPosition={pos}
                  bigBlind={bigBlind}
                  animated={true}
                  isHero={isHeroSeat}
                  calibratedOffset={getBetOffset(idx, positions.length, isTelegramMiniApp())}
                  displayFormat={preferences.displayFormat}
                />
              );
            })()}
          </React.Fragment>
        );
      })}
      
      {/* Showdown highlighting is handled directly in PlayerSeat component */}
    </div>
  );
});

export default FullscreenPokerTable;