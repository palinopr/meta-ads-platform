/**
 * Centralized error handling utilities
 * Provides consistent error handling patterns across the application
 */

import { logger } from './logger';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  timestamp: string;
  userFriendly: boolean;
}

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  META_API = 'META_API',
  SUPABASE = 'SUPABASE',
  UNKNOWN = 'UNKNOWN'
}

export class AppErrorHandler {
  private static instance: AppErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  private constructor() {}

  public static getInstance(): AppErrorHandler {
    if (!AppErrorHandler.instance) {
      AppErrorHandler.instance = new AppErrorHandler();
    }
    return AppErrorHandler.instance;
  }

  /**
   * Handle and categorize errors with user-friendly messages
   */
  public handleError(error: any, context?: string): AppError {
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();
    
    // Categorize the error
    const errorType = this.categorizeError(error);
    const appError: AppError = {
      code: `${errorType}_${errorId}`,
      message: this.getUserFriendlyMessage(error, errorType),
      details: this.sanitizeErrorDetails(error),
      stack: error?.stack,
      timestamp,
      userFriendly: true
    };

    // Log the error
    logger.error(`Error handled in ${context || 'unknown context'}`, context || 'ERROR_HANDLER', {
      errorCode: appError.code,
      errorType,
      originalError: error?.message || error,
      stack: error?.stack
    });

    // Track error frequency
    this.trackError(errorType);

    return appError;
  }

  /**
   * Categorize errors based on their characteristics
   */
  private categorizeError(error: any): ErrorType {
    if (!error) return ErrorType.UNKNOWN;

    const message = error.message?.toLowerCase() || '';
    const code = error.code;
    const status = error.status || error.statusCode;

    // Network errors
    if (message.includes('network') || 
        message.includes('fetch') || 
        message.includes('connection') ||
        message.includes('timeout') ||
        status >= 500) {
      return ErrorType.NETWORK;
    }

    // Authentication errors
    if (message.includes('unauthorized') || 
        message.includes('forbidden') || 
        message.includes('token') ||
        message.includes('auth') ||
        status === 401 || status === 403) {
      return ErrorType.AUTH;
    }

    // Validation errors
    if (message.includes('validation') || 
        message.includes('invalid') || 
        message.includes('required') ||
        status === 400 || status === 422) {
      return ErrorType.VALIDATION;
    }

    // Meta API specific errors
    if (message.includes('meta') || 
        message.includes('facebook') || 
        message.includes('graph api') ||
        code === 190 || code === 4) {
      return ErrorType.META_API;
    }

    // Supabase errors
    if (message.includes('supabase') || 
        message.includes('postgres') || 
        message.includes('rls')) {
      return ErrorType.SUPABASE;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Generate user-friendly error messages
   */
  private getUserFriendlyMessage(error: any, type: ErrorType): string {
    const baseMessages = {
      [ErrorType.NETWORK]: 'Connection issue. Please check your internet connection and try again.',
      [ErrorType.AUTH]: 'Authentication required. Please log in and try again.',
      [ErrorType.VALIDATION]: 'Invalid input. Please check your data and try again.',
      [ErrorType.META_API]: 'Meta API error. Please check your Meta account connection.',
      [ErrorType.SUPABASE]: 'Database error. Please try again in a moment.',
      [ErrorType.UNKNOWN]: 'Something went wrong. Please try again.'
    };

    // Specific error handling
    const message = error?.message?.toLowerCase() || '';
    
    if (type === ErrorType.META_API) {
      if (message.includes('token') || error?.code === 190) {
        return 'Your Meta account connection has expired. Please reconnect your account.';
      }
      if (message.includes('rate limit') || error?.code === 4) {
        return 'Too many requests. Please wait a moment and try again.';
      }
      if (message.includes('permission')) {
        return 'Insufficient permissions. Please check your Meta account access.';
      }
    }

    if (type === ErrorType.AUTH) {
      if (message.includes('expired')) {
        return 'Your session has expired. Please log in again.';
      }
      if (message.includes('invalid')) {
        return 'Invalid credentials. Please check your login information.';
      }
    }

    if (type === ErrorType.NETWORK) {
      if (message.includes('timeout')) {
        return 'Request timed out. Please check your connection and try again.';
      }
      if (message.includes('offline')) {
        return 'You appear to be offline. Please check your internet connection.';
      }
    }

    return baseMessages[type];
  }

  /**
   * Sanitize error details to prevent sensitive data leakage
   */
  private sanitizeErrorDetails(error: any): any {
    if (!error) return null;

    const sensitive = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    const sanitized: any = {};

    for (const [key, value] of Object.entries(error)) {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 500) {
        sanitized[key] = value.substring(0, 500) + '...[TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Track error frequency for monitoring
   */
  private trackError(type: ErrorType): void {
    const current = this.errorCounts.get(type) || 0;
    this.errorCounts.set(type, current + 1);

    // Log if error frequency is high
    if (current >= 10) {
      logger.warn(`High error frequency detected`, 'ERROR_HANDLER', {
        errorType: type,
        count: current + 1
      });
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  /**
   * Retry mechanism for failed operations
   */
  public async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Attempting operation (${attempt}/${maxRetries})`, context);
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          logger.error(`Operation failed after ${maxRetries} attempts`, context, { error });
          break;
        }

        // Don't retry for certain error types
        const errorType = this.categorizeError(error);
        if (errorType === ErrorType.AUTH || errorType === ErrorType.VALIDATION) {
          logger.debug('Not retrying due to error type', context, { errorType });
          break;
        }

        const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        logger.debug(`Retrying in ${delay}ms`, context);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Delay helper for retry mechanism
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics for monitoring
   */
  public getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Reset error tracking
   */
  public resetStats(): void {
    this.errorCounts.clear();
  }
}

// Convenience functions
export const errorHandler = AppErrorHandler.getInstance();

export const handleError = (error: any, context?: string): AppError => {
  return errorHandler.handleError(error, context);
};

export const withRetry = <T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries?: number
): Promise<T> => {
  return errorHandler.withRetry(operation, context, maxRetries);
};

export const isNetworkError = (error: any): boolean => {
  const type = AppErrorHandler.getInstance().categorizeError(error);
  return type === ErrorType.NETWORK;
};

export const isAuthError = (error: any): boolean => {
  const type = AppErrorHandler.getInstance().categorizeError(error);
  return type === ErrorType.AUTH;
};

export const isMetaAPIError = (error: any): boolean => {
  const type = AppErrorHandler.getInstance().categorizeError(error);
  return type === ErrorType.META_API;
};

// React hook for error handling
import { useState, useCallback } from 'react';

export const useErrorHandler = () => {
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      return await withRetry(operation, context);
    } catch (err) {
      const appError = handleError(err, context);
      setError(appError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    error,
    isLoading,
    clearError,
    handleAsyncOperation
  };
};