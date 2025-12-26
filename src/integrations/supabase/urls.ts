// Centralized Supabase URL selection.
// Default: direct Supabase (most reliable). Optional: proxy via api.syndicate-poker.ru.

export const SUPABASE_PROJECT_REF = 'mokhssmnorrhohrowxvu';

export const DIRECT_SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
export const DIRECT_FUNCTIONS_WS_BASE = `wss://${SUPABASE_PROJECT_REF}.functions.supabase.co`;

export const PROXY_SUPABASE_URL = 'https://api.syndicate-poker.ru';
export const PROXY_FUNCTIONS_WS_BASE = 'wss://api.syndicate-poker.ru';

type SupabaseMode = 'direct' | 'proxy';

// NOTE:
// Прокси-домен api.syndicate-poker.ru сейчас нестабилен (503), поэтому
// для API/Functions всегда используем прямые supabase.co endpoints.
// Если в базе/состоянии у игроков остались ссылки на storage через прокси,
// они будут переписаны на direct в avatarResolver.
export function getSupabaseMode(): SupabaseMode {
  return 'direct';
}

export function getSupabaseBaseUrl(): string {
  return DIRECT_SUPABASE_URL;
}

export function getFunctionsWsUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${DIRECT_FUNCTIONS_WS_BASE}${normalizedPath}`;
}

