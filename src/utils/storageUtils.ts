/**
 * Утилиты для работы с Supabase Storage URLs и аватарками
 * Исправляет старые URL и обеспечивает правильный routing через Cloudflare Tunnel
 */

import { resolveAvatarUrl } from './avatarResolver';
import { getSupabaseBaseUrl } from '@/integrations/supabase/urls';

// По умолчанию используем прямой Supabase URL (прокси часто падает под нагрузкой)
const STORAGE_API_URL = getSupabaseBaseUrl();

/**
 * Исправляет URL изображения из Supabase Storage
 * Заменяет старые домены на актуальный API URL
 * Также обрабатывает аватарки с устаревшими Vite-хешами
 * 
 * @param url - Исходный URL изображения
 * @param fallbackId - ID игрока для генерации фолбэк-аватарки
 * @returns Исправленный URL с правильным доменом
 */
export const fixStorageUrl = (url: string | null | undefined, fallbackId?: string): string => {
  if (!url) {
    // Если URL пустой, возвращаем дефолтную аватарку
    return fallbackId ? resolveAvatarUrl(null, fallbackId) : '';
  }
  
  // Если это Telegram аватарка - использовать как есть
  if (url.startsWith('https://t.me/')) {
    return url;
  }
  
  // Если это внешний URL (не Vite-хешированный путь) - проверяем storage
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Если это URL из Supabase Storage - исправляем домен
    if (url.includes('/storage/v1/object/public/')) {
      const storagePathMatch = url.match(/\/storage\/v1\/object\/public\/.+/);
      if (storagePathMatch) {
        const storagePath = storagePathMatch[0];
        
        // Удаляем дублированные параметры ?t= (cache busting)
        let cleanPath = storagePath;
        const tMatches = storagePath.match(/\?t=\d+/g);
        if (tMatches && tMatches.length > 1) {
          cleanPath = storagePath.split('?t=')[0] + tMatches[tMatches.length - 1];
        }
        
        return `${STORAGE_API_URL}${cleanPath}`;
      }
    }
    // Любой другой внешний URL - использовать как есть
    return url;
  }
  
  // Если это локальный путь (Vite-хешированный или poker-avatar) - используем resolveAvatarUrl
  // Это обрабатывает:
  // - /assets/poker-avatar-10-C9wYQiw9.png (устаревшие Vite-хеши)
  // - poker-avatar-10.png
  // - /src/assets/avatars/poker-avatar-10.png
  return resolveAvatarUrl(url, fallbackId);
};

/**
 * Добавляет cache-busting параметр к URL
 * Полезно для принудительного обновления изображений
 * 
 * @param url - URL изображения
 * @returns URL с параметром ?t=timestamp
 */
export const addCacheBusting = (url: string): string => {
  if (!url) return '';
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};
