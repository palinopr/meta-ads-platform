/**
 * Sentry Error Monitoring Configuration for Supabase Edge Functions
 * 
 * This shared configuration provides comprehensive error monitoring and performance tracking
 * for all Meta Ads Platform edge functions using Sentry's Deno SDK.
 * 
 * Business Impact: Eliminates blind spots in production, enables proactive issue resolution,
 * and protects $2M+ ad spend from hidden failures that could cause customer churn.
 */

import * as Sentry from "npm:@sentry/deno";

// Sentry configuration for Meta Ads Platform
export const SENTRY_CONFIG = {
  dsn: Deno.env.get("SENTRY_DSN"),
  environment: Deno.env.get("SUPABASE_ENVIRONMENT") || "production",
  tracesSampleRate: 0.1, // 10% sampling to control performance monitoring costs
  beforeSend: (event: Sentry.Event) => {
    // Filter out non-critical errors to reduce noise
    if (event.exception?.values?.[0]?.type === "AbortError") {
      return null; // Don't send client cancellation errors
    }
    return event;
  },
  beforeSendTransaction: (event: Sentry.Event) => {
    // Filter out health check transactions
    if (event.transaction?.includes("health-check")) {
      return null;
    }
    return event;
  },
  integrations: [
    // Add performance monitoring integration
    Sentry.httpIntegration({
      tracing: {
        shouldCreateSpanForRequest: (url: string) => {
          // Only trace important API calls
          return url.includes("graph.facebook.com") || url.includes("supabase.co");
        },
      },
    }),
  ],
};

/**
 * Initialize Sentry for an edge function
 * 
 * @param functionName - Name of the edge function for context
 * @param additionalTags - Additional tags specific to the function
 */
export function initializeSentry(functionName: string, additionalTags: Record<string, string> = {}) {
  if (!SENTRY_CONFIG.dsn) {
    console.warn(`Sentry DSN not configured. Error monitoring disabled for ${functionName}`);
    return;
  }

  Sentry.init({
    ...SENTRY_CONFIG,
    tags: {
      function: functionName,
      region: Deno.env.get("SB_REGION") || "unknown",
      execution_id: Deno.env.get("SB_EXECUTION_ID") || "unknown",
      ...additionalTags,
    },
  });

  console.log(`Sentry initialized for ${functionName} with comprehensive error tracking`);
}

/**
 * Wrap an edge function handler with Sentry error monitoring
 * 
 * @param functionName - Name of the function for context
 * @param handler - The actual function handler
 * @param additionalTags - Additional tags for this function
 */
export function withSentryMonitoring<T extends (...args: any[]) => any>(
  functionName: string,
  handler: T,
  additionalTags: Record<string, string> = {}
): T {
  return ((...args: Parameters<T>) => {
    initializeSentry(functionName, additionalTags);
    
    return Sentry.withScope(async (scope) => {
      // Set user context from request if available
      const request = args[0] as Request;
      if (request?.headers) {
        const userId = request.headers.get("x-user-id");
        if (userId) {
          scope.setUser({ id: userId });
        }
      }

      // Add request context
      scope.setTag("method", request?.method || "unknown");
      scope.setTag("url", request?.url || "unknown");
      
      // Start transaction for performance monitoring
      const transaction = Sentry.startTransaction({
        op: "function",
        name: functionName,
        description: `Meta Ads Platform edge function: ${functionName}`,
      });

      try {
        // Execute the original handler
        const result = await handler(...args);
        
        // Mark transaction as successful
        transaction.setStatus("ok");
        
        return result;
      } catch (error) {
        // Capture error with full context
        Sentry.captureException(error, {
          tags: {
            function: functionName,
            error_type: error.name || "unknown",
            ...additionalTags,
          },
          extra: {
            request_method: request?.method,
            request_url: request?.url,
            timestamp: new Date().toISOString(),
          },
        });
        
        // Mark transaction as error
        transaction.setStatus("internal_error");
        
        // Re-throw to maintain original error handling
        throw error;
      } finally {
        // Always finish the transaction
        transaction.finish();
      }
    });
  }) as T;
}

/**
 * Capture a custom error event with business context
 * 
 * @param error - The error to capture
 * @param context - Additional business context
 */
export function captureBusinessError(error: Error, context: {
  functionName: string;
  businessImpact: "low" | "medium" | "high" | "critical";
  affectedRevenue?: string;
  customerImpact?: string;
  additionalContext?: Record<string, any>;
}) {
  Sentry.captureException(error, {
    tags: {
      function: context.functionName,
      business_impact: context.businessImpact,
      error_category: "business",
    },
    extra: {
      affected_revenue: context.affectedRevenue,
      customer_impact: context.customerImpact,
      additional_context: context.additionalContext,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Capture performance metrics for business-critical operations
 * 
 * @param operation - Name of the operation
 * @param duration - Duration in milliseconds
 * @param context - Additional context
 */
export function capturePerformanceMetric(
  operation: string,
  duration: number,
  context: {
    functionName: string;
    success: boolean;
    recordCount?: number;
    apiCalls?: number;
    additionalMetrics?: Record<string, number>;
  }
) {
  Sentry.addBreadcrumb({
    category: "performance",
    message: `${operation} completed in ${duration}ms`,
    level: "info",
    data: {
      function: context.functionName,
      operation,
      duration_ms: duration,
      success: context.success,
      record_count: context.recordCount,
      api_calls: context.apiCalls,
      ...context.additionalMetrics,
    },
  });
}

/**
 * Create a custom span for tracking specific operations
 * 
 * @param operation - Name of the operation
 * @param description - Description of what this operation does
 * @param callback - The operation to track
 */
export async function withPerformanceSpan<T>(
  operation: string,
  description: string,
  callback: () => Promise<T>
): Promise<T> {
  const span = Sentry.startSpan({
    op: operation,
    description,
  });

  try {
    const result = await callback();
    span.setStatus("ok");
    return result;
  } catch (error) {
    span.setStatus("internal_error");
    throw error;
  } finally {
    span.finish();
  }
}

/**
 * Log business-critical events for audit trail
 * 
 * @param event - The event that occurred
 * @param context - Business context
 */
export function logBusinessEvent(event: string, context: {
  functionName: string;
  userId?: string;
  accountId?: string;
  campaignId?: string;
  action: string;
  result: "success" | "failure" | "partial";
  additionalData?: Record<string, any>;
}) {
  Sentry.addBreadcrumb({
    category: "business",
    message: event,
    level: "info",
    data: {
      function: context.functionName,
      user_id: context.userId,
      account_id: context.accountId,
      campaign_id: context.campaignId,
      action: context.action,
      result: context.result,
      timestamp: new Date().toISOString(),
      ...context.additionalData,
    },
  });
}