/**
 * Sentry Server Configuration for Meta Ads Platform
 * 
 * This configuration provides comprehensive error monitoring for the Next.js server-side
 * components, including API routes, server-side rendering, and server actions.
 * 
 * Business Impact: Captures server errors that could cause service disruptions,
 * monitors API performance, and provides visibility into server-side issues.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Environment and release tracking
  environment: process.env.NODE_ENV || 'development',
  
  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% sampling for performance monitoring
  
  // Server-specific integrations
  integrations: [
    // Add server-specific integrations here
  ],
  
  // Error filtering for server-side
  beforeSend: (event, hint) => {
    // Filter out non-actionable server errors
    if (event.exception?.values?.[0]?.type === 'AbortError') {
      return null; // Don't send client cancellation errors
    }
    
    if (event.message?.includes('ECONNRESET')) {
      return null; // Don't send connection reset errors (usually client-side)
    }
    
    // Add server context to errors
    event.tags = {
      ...event.tags,
      runtime: 'server',
      node_env: process.env.NODE_ENV,
    };
    
    return event;
  },
  
  // Transaction filtering
  beforeSendTransaction: (event) => {
    // Filter out health check and low-value transactions
    if (event.transaction?.includes('/_next/')) {
      return null;
    }
    
    if (event.transaction?.includes('/health')) {
      return null;
    }
    
    return event;
  },
  
  // Server-specific context
  initialScope: {
    tags: {
      component: 'server',
      platform: 'nextjs',
      feature: 'meta-ads-platform',
      runtime: 'nodejs',
    },
  },
  
  // Debug mode (only in development)
  debug: process.env.NODE_ENV === 'development',
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
});

// Export utility functions for server-specific error tracking
export const captureServerError = (error: Error, context: {
  endpoint?: string;
  userId?: string;
  method?: string;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
  additionalContext?: Record<string, any>;
}) => {
  Sentry.captureException(error, {
    tags: {
      error_category: 'server_error',
      endpoint: context.endpoint,
      method: context.method,
      business_impact: context.businessImpact,
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: {
      server_context: context.additionalContext,
      timestamp: new Date().toISOString(),
    },
  });
};

export const captureAPIError = (error: Error, context: {
  endpoint: string;
  method: string;
  userId?: string;
  statusCode?: number;
  responseTime?: number;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
  additionalContext?: Record<string, any>;
}) => {
  Sentry.captureException(error, {
    tags: {
      error_category: 'api_error',
      endpoint: context.endpoint,
      method: context.method,
      status_code: context.statusCode?.toString(),
      business_impact: context.businessImpact,
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: {
      response_time_ms: context.responseTime,
      api_context: context.additionalContext,
      timestamp: new Date().toISOString(),
    },
  });
};

export const captureServerPerformanceMetric = (
  operation: string,
  duration: number,
  context: {
    endpoint?: string;
    userId?: string;
    success: boolean;
    recordCount?: number;
    additionalMetrics?: Record<string, number>;
  }
) => {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `Server ${operation} completed in ${duration}ms`,
    level: 'info',
    data: {
      operation,
      duration_ms: duration,
      endpoint: context.endpoint,
      user_id: context.userId,
      success: context.success,
      record_count: context.recordCount,
      ...context.additionalMetrics,
    },
  });
};

export const trackServerBusinessEvent = (event: string, context: {
  endpoint?: string;
  userId?: string;
  action: string;
  result: 'success' | 'failure' | 'partial';
  additionalData?: Record<string, any>;
}) => {
  Sentry.addBreadcrumb({
    category: 'business',
    message: event,
    level: 'info',
    data: {
      endpoint: context.endpoint,
      action: context.action,
      result: context.result,
      user_id: context.userId,
      timestamp: new Date().toISOString(),
      ...context.additionalData,
    },
  });
};

// Performance monitoring wrapper for API routes
export const withServerPerformanceMonitoring = <T extends (...args: any[]) => any>(
  operationName: string,
  handler: T
): T => {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();

    try {
      const result = await handler(...args);
      
      // Capture performance metric
      const duration = Date.now() - startTime;
      captureServerPerformanceMetric(operationName, duration, {
        success: true,
      });
      
      return result;
    } catch (error) {
      // Capture performance metric for failed operation
      const duration = Date.now() - startTime;
      captureServerPerformanceMetric(operationName, duration, {
        success: false,
      });
      
      // Re-throw to maintain original error handling
      throw error;
    }
  }) as T;
};