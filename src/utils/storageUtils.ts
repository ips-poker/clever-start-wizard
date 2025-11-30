/**
 * Утилиты для работы с Supabase Storage URLs
 * Исправляет старые URL и обеспечивает правильный routing через Cloudflare Tunnel
 */

// Определяем правильный API URL для текущего окружения
const getStorageApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Если загружено с play.syndicate-poker.ru, используем api-play
    if (hostname === 'play.syndicate-poker.ru') {
      return 'https://api-play.syndicate-poker.ru';
    }
    
    // Для локальной разработки тоже используем api-play
    if (hostname === 'localhost' || hostname.includes('lovable')) {
      return 'https://api-play.syndicate-poker.ru';
    }
  }
  
  // По умолчанию используем основной API домен
  return 'https://api.syndicate-poker.ru';
};

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
  
  const apiUrl = getStorageApiUrl();
  
  // Список старых доменов, которые нужно заменить
  const oldDomains = [
    'api.epc-poker.ru',
    'https://mokhssmnorrhohrowxvu.supabase.co',
    'http://mokhssmnorrhohrowxvu.supabase.co',
    'mokhssmnorrhohrowxvu.supabase.co'
  ];
  
  let fixedUrl = url;
  
  // Заменяем все старые домены на актуальный
  for (const oldDomain of oldDomains) {
    if (fixedUrl.includes(oldDomain)) {
      fixedUrl = fixedUrl.replace(oldDomain, apiUrl);
      break;
    }
  }
  
  // Удаляем дублированные параметры ?t= (cache busting)
  const tMatches = fixedUrl.match(/\?t=\d+/g);
  if (tMatches && tMatches.length > 1) {
    // Оставляем только первый параметр ?t=
    const firstT = tMatches[0];
    fixedUrl = fixedUrl.split('?t=')[0] + firstT;
  }
  
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
