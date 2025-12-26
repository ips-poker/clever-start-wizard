// Centralized Supabase URL selection.
// Default: direct Supabase (most reliable). Optional: proxy via api.syndicate-poker.ru.

export const SUPABASE_PROJECT_REF = 'mokhssmnorrhohrowxvu';

export const DIRECT_SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
export const DIRECT_FUNCTIONS_WS_BASE = `wss://${SUPABASE_PROJECT_REF}.functions.supabase.co`;

export const PROXY_SUPABASE_URL = 'https://api.syndicate-poker.ru';
export const PROXY_FUNCTIONS_WS_BASE = 'wss://api.syndicate-poker.ru';

type SupabaseMode = 'direct' | 'proxy';

function safeGetLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getSupabaseMode(): SupabaseMode {
  const mode = safeGetLocalStorage('SUPABASE_MODE');
  // По умолчанию прокси для обхода блокировок на мобильных
  return mode === 'direct' ? 'direct' : 'proxy';
}

export function getSupabaseBaseUrl(): string {
  return getSupabaseMode() === 'proxy' ? PROXY_SUPABASE_URL : DIRECT_SUPABASE_URL;
}

export function getFunctionsWsUrl(path: string): string {
  const base = getSupabaseMode() === 'proxy' ? PROXY_FUNCTIONS_WS_BASE : DIRECT_FUNCTIONS_WS_BASE;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

