export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  duration?: number;
  context?: Record<string, string>;
  metadata?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void;
  setContext(context: Record<string, string>): void;
}

class StructuredLogger implements Logger {
  private context: Record<string, string> = {};
  private minLevel: LogLevel;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatLog(level: LogLevel, message: string, metadata?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...Object.keys(this.context).length > 0 && { context: this.context },
      ...(metadata && Object.keys(metadata).length > 0 && { metadata }),
    };

    return entry;
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    const log = this.formatLog('debug', message, metadata);
    console.debug(JSON.stringify(log));
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    const log = this.formatLog('info', message, metadata);
    console.info(JSON.stringify(log));
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    const log = this.formatLog('warn', message, metadata);
    console.warn(JSON.stringify(log));
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;
    const log: LogEntry = {
      ...this.formatLog('error', message, metadata),
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
    };
    console.error(JSON.stringify(log));
  }

  setContext(context: Record<string, string>): void {
    this.context = { ...this.context, ...context };
  }
}

// Factory function
export function createLogger(minLevel?: LogLevel): Logger {
  const level = minLevel || (process.env.LOG_LEVEL as LogLevel) || 'info';
  return new StructuredLogger(level);
}

// Default logger
export const logger = createLogger();
