/**
 * Hook for masking bot names in UI
 * Маскировка имен ботов для других игроков
 */

import { useMemo } from 'react';
import { maskBotName, isBotNickname } from '@/utils/pokerNicknameGenerator';

interface PlayerLike {
  id: string;
  name: string;
  [key: string]: any;
}

/**
 * Кэш замаскированных имен для стабильности отображения
 */
const maskedNameCache = new Map<string, string>();

/**
 * Получает замаскированное имя с кэшированием
 */
export function getMaskedName(playerId: string, originalName: string): string {
  if (!isBotNickname(originalName)) {
    return originalName;
  }
  
  // Кэшируем по ID игрока для стабильности
  const cacheKey = playerId;
  if (maskedNameCache.has(cacheKey)) {
    return maskedNameCache.get(cacheKey)!;
  }
  
  const maskedName = maskBotName(originalName);
  maskedNameCache.set(cacheKey, maskedName);
  return maskedName;
}

/**
 * Маскирует имя игрока если это бот
 */
export function useMaskedPlayerName(playerId: string, originalName: string): string {
  return useMemo(() => {
    return getMaskedName(playerId, originalName);
  }, [playerId, originalName]);
}

/**
 * Маскирует массив игроков
 */
export function useMaskedPlayers<T extends PlayerLike>(players: T[]): T[] {
  return useMemo(() => {
    return players.map(player => ({
      ...player,
      name: getMaskedName(player.id, player.name),
    }));
  }, [players]);
}

/**
 * Проверяет, является ли игрок ботом (для внутренней логики)
 */
export function useIsBot(playerName: string): boolean {
  return useMemo(() => isBotNickname(playerName), [playerName]);
}
