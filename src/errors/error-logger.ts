import { KeycloakError } from "./keycloak-errors.js";

/**
 * Log level for error messages
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  timestamp: number;
  level: LogLevel;
  error: KeycloakError;
  context?: Record<string, unknown>;
}

/**
 * Interface for error logging implementations
 */
export interface ErrorLogger {
  /**
   * Log an error
   */
  log(entry: ErrorLogEntry): void;
  
  /**
   * Get all logged errors
   */
  getErrors(): ErrorLogEntry[];
  
  /**
   * Clear all logged errors
   */
  clear(): void;
}

/**
 * Console-based error logger (default implementation)
 */
export class ConsoleErrorLogger implements ErrorLogger {
  private errors: ErrorLogEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = 100) {
    this.maxEntries = maxEntries;
  }

  log(entry: ErrorLogEntry): void {
    // Add to internal log
    this.errors.push(entry);
    
    // Trim if exceeds max entries
    if (this.errors.length > this.maxEntries) {
      this.errors.shift();
    }

    // Log to console
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(prefix, entry.error.userMessage, entry.error);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.error.userMessage, entry.error);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.error.userMessage, entry.error);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, entry.error.userMessage, entry.error);
        break;
    }

    if (entry.context) {
      console.log('Context:', entry.context);
    }
  }

  getErrors(): ErrorLogEntry[] {
    return [...this.errors];
  }

  clear(): void {
    this.errors = [];
  }
}

/**
 * In-memory error logger (useful for testing)
 */
export class MemoryErrorLogger implements ErrorLogger {
  private errors: ErrorLogEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = 100) {
    this.maxEntries = maxEntries;
  }

  log(entry: ErrorLogEntry): void {
    this.errors.push(entry);
    
    if (this.errors.length > this.maxEntries) {
      this.errors.shift();
    }
  }

  getErrors(): ErrorLogEntry[] {
    return [...this.errors];
  }

  clear(): void {
    this.errors = [];
  }
}

/**
 * Remote error logger (sends errors to a remote endpoint)
 */
export class RemoteErrorLogger implements ErrorLogger {
  private endpoint: string;
  private errors: ErrorLogEntry[] = [];
  private maxEntries: number;
  private batchSize: number;
  private flushInterval: number;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    endpoint: string,
    options: {
      maxEntries?: number;
      batchSize?: number;
      flushInterval?: number;
    } = {}
  ) {
    this.endpoint = endpoint;
    this.maxEntries = options.maxEntries ?? 100;
    this.batchSize = options.batchSize ?? 10;
    this.flushInterval = options.flushInterval ?? 30000; // 30 seconds

    // Start periodic flush
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  log(entry: ErrorLogEntry): void {
    this.errors.push(entry);
    
    if (this.errors.length > this.maxEntries) {
      this.errors.shift();
    }

    // Flush if batch size reached
    if (this.errors.length >= this.batchSize) {
      this.flush();
    }
  }

  getErrors(): ErrorLogEntry[] {
    return [...this.errors];
  }

  clear(): void {
    this.errors = [];
  }

  /**
   * Flush errors to remote endpoint
   */
  async flush(): Promise<void> {
    if (this.errors.length === 0) return;

    const errorsToSend = [...this.errors];
    this.errors = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors: errorsToSend.map(entry => ({
            timestamp: entry.timestamp,
            level: entry.level,
            error: entry.error.toJSON(),
            context: entry.context,
          })),
        }),
      });
    } catch (error) {
      // If sending fails, add errors back to queue
      this.errors.unshift(...errorsToSend);
      console.error('Failed to send errors to remote endpoint:', error);
    }
  }

  /**
   * Stop the periodic flush timer
   */
  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}

/**
 * Composite error logger (logs to multiple loggers)
 */
export class CompositeErrorLogger implements ErrorLogger {
  private loggers: ErrorLogger[];

  constructor(loggers: ErrorLogger[]) {
    this.loggers = loggers;
  }

  log(entry: ErrorLogEntry): void {
    for (const logger of this.loggers) {
      logger.log(entry);
    }
  }

  getErrors(): ErrorLogEntry[] {
    // Return errors from first logger
    return this.loggers[0]?.getErrors() ?? [];
  }

  clear(): void {
    for (const logger of this.loggers) {
      logger.clear();
    }
  }
}

/**
 * Default error logger instance
 */
export const defaultErrorLogger = new ConsoleErrorLogger();

// Made with Bob
