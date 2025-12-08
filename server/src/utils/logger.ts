/**
 * Simple Logger Utility
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'info'];

function formatMessage(level: LogLevel, message: string, meta?: object): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: object) {
    if (LOG_LEVELS.debug >= currentLevel) {
      console.log(formatMessage('debug', message, meta));
    }
  },
  
  info(message: string, meta?: object) {
    if (LOG_LEVELS.info >= currentLevel) {
      console.log(formatMessage('info', message, meta));
    }
  },
  
  warn(message: string, meta?: object) {
    if (LOG_LEVELS.warn >= currentLevel) {
      console.warn(formatMessage('warn', message, meta));
    }
  },
  
  error(message: string, meta?: object) {
    if (LOG_LEVELS.error >= currentLevel) {
      console.error(formatMessage('error', message, meta));
    }
  }
};
