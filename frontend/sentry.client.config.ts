/**
 * Sentry Client Configuration for Meta Ads Platform
 * 
 * This configuration provides comprehensive error monitoring for the Next.js frontend,
 * including React components, client-side API calls, and user interactions.
 * 
 * Business Impact: Captures frontend errors that could cause customer churn,
 * monitors user experience issues, and provides visibility into client-side performance.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment and release tracking
  environment: process.env.NODE_ENV || 'development',
  
  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% sampling for performance monitoring
  
  // Session Replay for debugging user interactions
  replaysSessionSampleRate: 0.1, // 10% of sessions will be recorded
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors will be recorded
  
  // Integrations
  integrations: [
    // Session replay integration
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  
  // Error filtering
  beforeSend: (event, hint) => {
    // Filter out non-actionable errors
    if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
      return null; // Don't send chunk load errors (usually network issues)
    }
    
    if (event.message?.includes('ResizeObserver loop limit exceeded')) {
      return null; // Don't send common ResizeObserver warnings
    }
    
    // Add business context to errors
    if (event.user?.id) {
      event.tags = {
        ...event.tags,
        has_user_id: true,
        user_authenticated: true,
      };
    }
    
    return event;
  },
  
  // Transaction filtering
  beforeSendTransaction: (event) => {
    // Filter out health check and low-value transactions
    if (event.transaction?.includes('/_next/')) {
      return null;
    }
    
    if (event.transaction?.includes('/favicon.ico')) {
      return null;
    }
    
    return event;
  },
  
  // User context and tags
  initialScope: {
    tags: {
      component: 'frontend',
      platform: 'nextjs',
      feature: 'meta-ads-platform',
    },
  },
  
  // Debug mode (only in development)
  debug: process.env.NODE_ENV === 'development',
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
});

// Export utility functions for business-specific error tracking
export const captureUserError = (error: Error, context: {
  userId?: string;
  page: string;
  action: string;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
  additionalContext?: Record<string, any>;
}) => {
  Sentry.captureException(error, {
    tags: {
      error_category: 'user_action',
      page: context.page,
      action: context.action,
      business_impact: context.businessImpact,
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: {
      business_context: context.additionalContext,
      timestamp: new Date().toISOString(),
    },
  });
};

export const captureBusinessEvent = (event: string, context: {
  userId?: string;
  page: string;
  action: string;
  result: 'success' | 'failure' | 'partial';
  metricValue?: number;
  additionalData?: Record<string, any>;
}) => {
  Sentry.addBreadcrumb({
    category: 'business',
    message: event,
    level: 'info',
    data: {
      page: context.page,
      action: context.action,
      result: context.result,
      metric_value: context.metricValue,
      user_id: context.userId,
      timestamp: new Date().toISOString(),
      ...context.additionalData,
    },
  });
};

export const capturePerformanceMetric = (
  operation: string,
  duration: number,
  context: {
    page: string;
    userId?: string;
    success: boolean;
    additionalMetrics?: Record<string, number>;
  }
) => {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `${operation} completed in ${duration}ms`,
    level: 'info',
    data: {
      operation,
      duration_ms: duration,
      page: context.page,
      user_id: context.userId,
      success: context.success,
      ...context.additionalMetrics,
    },
  });
};

export const trackUserFlow = (flowName: string, step: string, context: {
  userId?: string;
  page: string;
  stepResult: 'started' | 'completed' | 'failed';
  additionalData?: Record<string, any>;
}) => {
  Sentry.addBreadcrumb({
    category: 'user_flow',
    message: `${flowName}: ${step}`,
    level: 'info',
    data: {
      flow_name: flowName,
      step,
      step_result: context.stepResult,
      page: context.page,
      user_id: context.userId,
      timestamp: new Date().toISOString(),
      ...context.additionalData,
    },
  });
};

// Set up global error handling for unhandled promises
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    captureUserError(new Error(event.reason), {
      page: window.location.pathname,
      action: 'unhandled_promise_rejection',
      businessImpact: 'high',
      additionalContext: {
        reason: event.reason,
        promise: event.promise,
      },
    });
  });
}