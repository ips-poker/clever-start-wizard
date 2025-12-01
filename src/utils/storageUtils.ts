/**
 * Утилиты для работы с Supabase Storage URLs
 * Исправляет старые URL и обеспечивает правильный routing через Cloudflare Tunnel
 */

// Используем кастомный домен api.syndicate-poker.ru для Storage
const STORAGE_API_URL = 'https://api.syndicate-poker.ru';

/**
 * Исправляет URL изображения из Supabase Storage
 * Заменяет старые домены на актуальный API URL
 * 
 * @param url - Исходный URL изображения
 * @returns Исправленный URL с правильным доменом
 */
export const fixStorageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Если это не URL из Supabase Storage, возвращаем как есть
  if (!url.includes('/storage/v1/object/public/')) {
    return url;
  }
  
  // Извлекаем путь после домена (начиная с /storage/...)
  const storagePathMatch = url.match(/\/storage\/v1\/object\/public\/.+/);
  if (!storagePathMatch) {
    return url;
  }
  
  const storagePath = storagePathMatch[0];
  
  // Удаляем дублированные параметры ?t= (cache busting)
  let cleanPath = storagePath;
  const tMatches = storagePath.match(/\?t=\d+/g);
  if (tMatches && tMatches.length > 1) {
    // Оставляем только последний параметр ?t=
    cleanPath = storagePath.split('?t=')[0] + tMatches[tMatches.length - 1];
  }
  
  // Формируем правильный URL с нашим кастомным доменом
  const fixedUrl = `${STORAGE_API_URL}${cleanPath}`;
  
  console.log('🖼️ Fixed storage URL:', { original: url, fixed: fixedUrl });
  
  return fixedUrl;
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
