type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  timestamp: string;
  env: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatLog(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    entry.context ? `[${entry.context}]` : '',
    entry.message,
  ].filter(Boolean);

  return parts.join(' ');
}

function emit(level: LogLevel, context: string, message: string, data?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    context,
    data,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? 'development',
  };

  const formatted = formatLog(entry);

  if (process.env.NODE_ENV === 'production') {
    // JSON format for production log aggregation
    const json = JSON.stringify({ ...entry, msg: formatted });
    if (level === 'error') console.error(json);
    else if (level === 'warn') console.warn(json);
    else console.log(json);
  } else {
    if (level === 'error') console.error(formatted, data ?? '');
    else if (level === 'warn') console.warn(formatted, data ?? '');
    else if (level === 'debug') console.debug(formatted, data ?? '');
    else console.log(formatted, data ?? '');
  }
}

export function createLogger(context: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => emit('debug', context, message, data),
    info: (message: string, data?: Record<string, unknown>) => emit('info', context, message, data),
    warn: (message: string, data?: Record<string, unknown>) => emit('warn', context, message, data),
    error: (message: string, data?: Record<string, unknown>) => emit('error', context, message, data),
  };
}

export const log = createLogger('app');
