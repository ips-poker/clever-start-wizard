/**
 * API Error Handler
 * Централизованная обработка ошибок API с graceful degradation
 */

export interface ApiErrorInfo {
  type: 'network' | 'server' | 'auth' | 'rate_limit' | 'unknown';
  code?: number;
  message: string;
  userMessage: string;
  isRetryable: boolean;
  retryAfter?: number; // seconds
}

const ERROR_MESSAGES: Record<number, { message: string; isRetryable: boolean }> = {
  400: { message: 'Неверный запрос', isRetryable: false },
  401: { message: 'Требуется авторизация', isRetryable: false },
  403: { message: 'Доступ запрещен', isRetryable: false },
  404: { message: 'Данные не найдены', isRetryable: false },
  408: { message: 'Превышено время ожидания', isRetryable: true },
  429: { message: 'Слишком много запросов. Подождите немного', isRetryable: true },
  500: { message: 'Ошибка сервера. Попробуйте позже', isRetryable: true },
  502: { message: 'Сервер временно недоступен', isRetryable: true },
  503: { message: 'Сервис перегружен. Повторите через минуту', isRetryable: true },
  504: { message: 'Сервер не отвечает. Попробуйте позже', isRetryable: true },
};

// Глобальный счетчик 503 ошибок для определения массовых проблем
let consecutive503Count = 0;
let last503Time = 0;
const MAX_503_BEFORE_PAUSE = 3;
const PAUSE_DURATION_MS = 60000; // 1 минута паузы после серии 503

export function parseApiError(error: unknown): ApiErrorInfo {
  // Network error (no response)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: 'Network error',
      userMessage: 'Проблема с подключением. Проверьте интернет',
      isRetryable: true,
      retryAfter: 5,
    };
  }

  // ERR_INSUFFICIENT_RESOURCES (browser limit)
  if (error instanceof Error && error.message.includes('INSUFFICIENT_RESOURCES')) {
    return {
      type: 'network',
      message: 'Browser resource limit exceeded',
      userMessage: 'Браузер перегружен. Закройте лишние вкладки и обновите страницу',
      isRetryable: false,
    };
  }

  // Supabase error object
  if (error && typeof error === 'object' && 'code' in error) {
    const err = error as { code: string; message?: string; status?: number };
    
    if (err.status && ERROR_MESSAGES[err.status]) {
      const info = ERROR_MESSAGES[err.status];
      
      // Track 503 errors
      if (err.status === 503) {
        track503Error();
      }
      
      return {
        type: err.status >= 500 ? 'server' : 'unknown',
        code: err.status,
        message: err.message || info.message,
        userMessage: info.message,
        isRetryable: info.isRetryable && !shouldPauseRetries(),
        retryAfter: err.status === 429 ? 30 : err.status >= 500 ? 10 : undefined,
      };
    }
  }

  // HTTP Response with status
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    const info = ERROR_MESSAGES[status] || { message: 'Неизвестная ошибка', isRetryable: false };
    
    if (status === 503) {
      track503Error();
    }
    
    return {
      type: status >= 500 ? 'server' : status === 401 || status === 403 ? 'auth' : 'unknown',
      code: status,
      message: `HTTP ${status}`,
      userMessage: info.message,
      isRetryable: info.isRetryable && !shouldPauseRetries(),
      retryAfter: status >= 500 ? 10 : undefined,
    };
  }

  // Generic error
  return {
    type: 'unknown',
    message: error instanceof Error ? error.message : String(error),
    userMessage: 'Произошла ошибка. Попробуйте еще раз',
    isRetryable: true,
    retryAfter: 5,
  };
}

function track503Error(): void {
  const now = Date.now();
  
  // Reset counter if last 503 was more than 2 minutes ago
  if (now - last503Time > 120000) {
    consecutive503Count = 0;
  }
  
  consecutive503Count++;
  last503Time = now;
  
  if (consecutive503Count >= MAX_503_BEFORE_PAUSE) {
    console.warn(`[ApiError] ⚠️ ${consecutive503Count} consecutive 503 errors - pausing retries for 1 minute`);
  }
}

export function shouldPauseRetries(): boolean {
  if (consecutive503Count < MAX_503_BEFORE_PAUSE) {
    return false;
  }
  
  const now = Date.now();
  const timeSinceLast503 = now - last503Time;
  
  // Resume retries after pause duration
  if (timeSinceLast503 > PAUSE_DURATION_MS) {
    consecutive503Count = 0;
    return false;
  }
  
  return true;
}

export function getRemainingPauseTime(): number {
  if (!shouldPauseRetries()) return 0;
  
  const elapsed = Date.now() - last503Time;
  return Math.max(0, Math.ceil((PAUSE_DURATION_MS - elapsed) / 1000));
}

export function resetErrorState(): void {
  consecutive503Count = 0;
  last503Time = 0;
}

// Helper to create user-friendly error message for toasts
export function getToastMessage(error: unknown): { title: string; description: string } {
  const info = parseApiError(error);
  
  if (shouldPauseRetries()) {
    const remainingSeconds = getRemainingPauseTime();
    return {
      title: 'Сервис временно недоступен',
      description: `Повторные запросы приостановлены. Попробуйте через ${remainingSeconds} сек`,
    };
  }
  
  return {
    title: info.type === 'network' ? 'Ошибка сети' : 'Ошибка',
    description: info.userMessage,
  };
}
