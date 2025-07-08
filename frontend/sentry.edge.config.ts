/**
 * Sentry Edge Configuration for Meta Ads Platform
 * 
 * This configuration provides comprehensive error monitoring for Next.js edge runtime,
 * including middleware, edge API routes, and edge functions.
 * 
 * Business Impact: Captures edge runtime errors that could cause routing issues,
 * monitors edge performance, and provides visibility into edge-specific problems.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Environment and release tracking
  environment: process.env.NODE_ENV || 'development',
  
  // Performance Monitoring (lower sample rate for edge)
  tracesSampleRate: 0.05, // 5% sampling for edge runtime
  
  // Edge-specific integrations
  integrations: [
    // Add edge-specific integrations here
  ],
  
  // Error filtering for edge runtime
  beforeSend: (event, hint) => {
    // Filter out non-actionable edge errors
    if (event.exception?.values?.[0]?.type === 'AbortError') {
      return null; // Don't send client cancellation errors
    }
    
    // Add edge context to errors
    event.tags = {
      ...event.tags,
      runtime: 'edge',
      node_env: process.env.NODE_ENV,
    };
    
    return event;
  },
  
  // Transaction filtering for edge
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
  
  // Edge-specific context
  initialScope: {
    tags: {
      component: 'edge',
      platform: 'nextjs',
      feature: 'meta-ads-platform',
      runtime: 'edge',
    },
  },
  
  // Debug mode (only in development)
  debug: process.env.NODE_ENV === 'development',
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
});

// Export utility functions for edge-specific error tracking
export const captureEdgeError = (error: Error, context: {
  middleware?: string;
  userId?: string;
  path?: string;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
  additionalContext?: Record<string, any>;
}) => {
  Sentry.captureException(error, {
    tags: {
      error_category: 'edge_error',
      middleware: context.middleware,
      path: context.path,
      business_impact: context.businessImpact,
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: {
      edge_context: context.additionalContext,
      timestamp: new Date().toISOString(),
    },
  });
};

export const captureMiddlewareError = (error: Error, context: {
  middleware: string;
  path: string;
  userId?: string;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
  additionalContext?: Record<string, any>;
}) => {
  Sentry.captureException(error, {
    tags: {
      error_category: 'middleware_error',
      middleware: context.middleware,
      path: context.path,
      business_impact: context.businessImpact,
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: {
      middleware_context: context.additionalContext,
      timestamp: new Date().toISOString(),
    },
  });
};

export const captureEdgePerformanceMetric = (
  operation: string,
  duration: number,
  context: {
    middleware?: string;
    path?: string;
    userId?: string;
    success: boolean;
    additionalMetrics?: Record<string, number>;
  }
) => {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `Edge ${operation} completed in ${duration}ms`,
    level: 'info',
    data: {
      operation,
      duration_ms: duration,
      middleware: context.middleware,
      path: context.path,
      user_id: context.userId,
      success: context.success,
      ...context.additionalMetrics,
    },
  });
};

export const trackEdgeBusinessEvent = (event: string, context: {
  middleware?: string;
  path?: string;
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
      middleware: context.middleware,
      path: context.path,
      action: context.action,
      result: context.result,
      user_id: context.userId,
      timestamp: new Date().toISOString(),
      ...context.additionalData,
    },
  });
};