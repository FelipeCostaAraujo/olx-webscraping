type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
type LogMeta = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

function getMinLevel(): LogLevel {
  const envLevel = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
  if (envLevel === 'DEBUG' || envLevel === 'INFO' || envLevel === 'WARN' || envLevel === 'ERROR') {
    return envLevel;
  }
  return 'INFO';
}

function shouldLog(level: LogLevel): boolean {
  const minLevel = getMinLevel();
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Error) return value.stack || value.message;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatMeta(meta?: LogMeta): string {
  if (!meta) return '';
  const entries = Object.entries(meta).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  const rendered = entries
    .map(([key, value]) => {
      const formatted = formatValue(value);
      if (formatted === '') return '';
      const needsQuotes = typeof value === 'string' && /\s/.test(value);
      return needsQuotes ? `${key}="${formatted}"` : `${key}=${formatted}`;
    })
    .filter(Boolean);
  if (rendered.length === 0) return '';
  return ` | ${rendered.join(' ')}`;
}

function writeLog(level: LogLevel, scope: string, message: string, meta?: LogMeta): void {
  if (!shouldLog(level)) return;
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] [${scope}] ${message}${formatMeta(meta)}`;
  if (level === 'ERROR') {
    console.error(line);
    return;
  }
  if (level === 'WARN') {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, meta?: LogMeta) => writeLog('DEBUG', scope, message, meta),
    info: (message: string, meta?: LogMeta) => writeLog('INFO', scope, message, meta),
    warn: (message: string, meta?: LogMeta) => writeLog('WARN', scope, message, meta),
    error: (message: string, meta?: LogMeta) => writeLog('ERROR', scope, message, meta),
  };
}
