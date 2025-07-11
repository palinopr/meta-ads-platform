/**
 * Production-ready logging utility with environment-based configuration
 * Replaces console.log statements with structured logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private readonly isDevelopment: boolean;
  private readonly logLevel: LogLevel;
  private readonly enableConsole: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = this.getLogLevel();
    this.enableConsole = this.isDevelopment || process.env.ENABLE_CONSOLE_LOGS === 'true';
  }

  private getLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      case 'fatal': return LogLevel.FATAL;
      default: return this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, context, metadata, userId, sessionId } = entry;
    const levelName = LogLevel[level];
    
    let formatted = `[${timestamp}] ${levelName}`;
    
    if (context) {
      formatted += ` [${context}]`;
    }
    
    if (userId) {
      formatted += ` [User: ${userId}]`;
    }
    
    if (sessionId) {
      formatted += ` [Session: ${sessionId.substring(0, 8)}...]`;
    }
    
    formatted += `: ${message}`;
    
    if (metadata && Object.keys(metadata).length > 0) {
      formatted += ` | ${JSON.stringify(metadata)}`;
    }
    
    return formatted;
  }

  private log(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    };

    // Console logging for development
    if (this.enableConsole) {
      const formatted = this.formatLogEntry(entry);
      const consoleMethod = this.getConsoleMethod(level);
      consoleMethod(formatted);
    }

    // Send to external logging service in production
    if (!this.isDevelopment) {
      this.sendToExternalService(entry);
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG: return console.debug;
      case LogLevel.INFO: return console.info;
      case LogLevel.WARN: return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL: return console.error;
      default: return console.log;
    }
  }

  private getCurrentUserId(): string | undefined {
    // Extract user ID from current context (Supabase auth)
    if (typeof window !== 'undefined') {
      // Client-side user ID extraction
      const userStr = localStorage.getItem('supabase.auth.token');
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          return parsed.user?.id;
        } catch {
          return undefined;
        }
      }
    }
    return undefined;
  }

  private getSessionId(): string | undefined {
    // Generate or retrieve session ID
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('app.session.id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('app.session.id', sessionId);
      }
      return sessionId;
    }
    return undefined;
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // Send to external logging service (e.g., Sentry, LogRocket, etc.)
    try {
      // Only send errors and above to external services to reduce noise
      if (entry.level >= LogLevel.ERROR) {
        // Implementation would depend on chosen logging service
        // For now, we'll just store it for future implementation
        console.error('[EXTERNAL_LOG]', entry);
      }
    } catch (error) {
      // Silently fail - don't let logging errors break the app
    }
  }

  // Public API methods
  public debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  public info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  public warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  public error(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, metadata);
  }

  public fatal(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context, metadata);
  }

  // API-specific logging methods
  public apiRequest(method: string, url: string, status?: number, duration?: number): void {
    this.info(`API ${method} ${url}`, 'API', {
      method,
      url,
      status,
      duration
    });
  }

  public apiError(method: string, url: string, error: any, status?: number): void {
    this.error(`API ${method} ${url} failed`, 'API', {
      method,
      url,
      error: error.message || error,
      status
    });
  }

  // Meta API specific logging
  public metaApiCall(endpoint: string, accountId?: string, success?: boolean, duration?: number): void {
    this.info(`Meta API call: ${endpoint}`, 'META_API', {
      endpoint,
      accountId,
      success,
      duration
    });
  }

  public metaApiError(endpoint: string, error: any, accountId?: string): void {
    this.error(`Meta API error: ${endpoint}`, 'META_API', {
      endpoint,
      accountId,
      error: error.message || error
    });
  }

  // User action logging
  public userAction(action: string, metadata?: Record<string, any>): void {
    this.info(`User action: ${action}`, 'USER_ACTION', metadata);
  }

  // Performance logging
  public performance(metric: string, value: number, unit: string = 'ms'): void {
    this.info(`Performance: ${metric} = ${value}${unit}`, 'PERFORMANCE', {
      metric,
      value,
      unit
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports for common use cases
export const logApiRequest = logger.apiRequest.bind(logger);
export const logApiError = logger.apiError.bind(logger);
export const logMetaApiCall = logger.metaApiCall.bind(logger);
export const logMetaApiError = logger.metaApiError.bind(logger);
export const logUserAction = logger.userAction.bind(logger);
export const logPerformance = logger.performance.bind(logger);

// Development helper - can be removed in production
export const devLog = (message: string, ...args: any[]): void => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(message, 'DEV', { args });
  }
};