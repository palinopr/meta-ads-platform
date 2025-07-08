/**
 * useErrorMonitoring Hook for Meta Ads Platform
 * 
 * Custom React hook that provides comprehensive error monitoring and business
 * event tracking throughout the application.
 * 
 * Business Impact: Enables proactive error detection and user experience monitoring
 * across all components, helping prevent customer churn and identify pain points.
 */

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@supabase/auth-helpers-react';
import { captureUserError, captureBusinessEvent, capturePerformanceMetric, trackUserFlow } from '../../sentry.client.config';

export interface ErrorMonitoringOptions {
  page: string;
  component?: string;
  feature?: string;
}

export interface BusinessEvent {
  event: string;
  action: string;
  result: 'success' | 'failure' | 'partial';
  metricValue?: number;
  additionalData?: Record<string, any>;
}

export interface UserFlowEvent {
  flowName: string;
  step: string;
  stepResult: 'started' | 'completed' | 'failed';
  additionalData?: Record<string, any>;
}

export const useErrorMonitoring = (options: ErrorMonitoringOptions) => {
  const router = useRouter();
  const user = useUser();
  
  // Capture user errors with business context
  const captureError = useCallback((error: Error, context: {
    action: string;
    businessImpact: 'low' | 'medium' | 'high' | 'critical';
    additionalContext?: Record<string, any>;
  }) => {
    captureUserError(error, {
      userId: user?.id,
      page: options.page,
      action: context.action,
      businessImpact: context.businessImpact,
      additionalContext: {
        component: options.component,
        feature: options.feature,
        router_path: router.pathname,
        router_query: router.query,
        ...context.additionalContext,
      },
    });
  }, [user?.id, options.page, options.component, options.feature, router.pathname, router.query]);

  // Track business events
  const trackEvent = useCallback((event: BusinessEvent) => {
    captureBusinessEvent(event.event, {
      userId: user?.id,
      page: options.page,
      action: event.action,
      result: event.result,
      metricValue: event.metricValue,
      additionalData: {
        component: options.component,
        feature: options.feature,
        router_path: router.pathname,
        router_query: router.query,
        ...event.additionalData,
      },
    });
  }, [user?.id, options.page, options.component, options.feature, router.pathname, router.query]);

  // Track performance metrics
  const trackPerformance = useCallback((operation: string, duration: number, context: {
    success: boolean;
    additionalMetrics?: Record<string, number>;
  }) => {
    capturePerformanceMetric(operation, duration, {
      page: options.page,
      userId: user?.id,
      success: context.success,
      additionalMetrics: {
        component: options.component ? 1 : 0,
        feature: options.feature ? 1 : 0,
        ...context.additionalMetrics,
      },
    });
  }, [options.page, user?.id, options.component, options.feature]);

  // Track user flow steps
  const trackFlow = useCallback((flow: UserFlowEvent) => {
    trackUserFlow(flow.flowName, flow.step, {
      userId: user?.id,
      page: options.page,
      stepResult: flow.stepResult,
      additionalData: {
        component: options.component,
        feature: options.feature,
        router_path: router.pathname,
        router_query: router.query,
        ...flow.additionalData,
      },
    });
  }, [user?.id, options.page, options.component, options.feature, router.pathname, router.query]);

  // Monitor async operations with automatic error handling
  const monitorAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    context: {
      operationName: string;
      businessImpact: 'low' | 'medium' | 'high' | 'critical';
      successEvent?: string;
      failureEvent?: string;
      additionalContext?: Record<string, any>;
    }
  ): Promise<T> => {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      
      // Track successful operation
      const duration = Date.now() - startTime;
      trackPerformance(context.operationName, duration, { success: true });
      
      if (context.successEvent) {
        trackEvent({
          event: context.successEvent,
          action: context.operationName,
          result: 'success',
          metricValue: duration,
          additionalData: context.additionalContext,
        });
      }
      
      return result;
    } catch (error) {
      // Track failed operation
      const duration = Date.now() - startTime;
      trackPerformance(context.operationName, duration, { success: false });
      
      if (context.failureEvent) {
        trackEvent({
          event: context.failureEvent,
          action: context.operationName,
          result: 'failure',
          metricValue: duration,
          additionalData: context.additionalContext,
        });
      }
      
      // Capture error with business context
      captureError(error as Error, {
        action: context.operationName,
        businessImpact: context.businessImpact,
        additionalContext: {
          operation_duration: duration,
          ...context.additionalContext,
        },
      });
      
      // Re-throw to maintain original error handling
      throw error;
    }
  }, [captureError, trackEvent, trackPerformance]);

  // Monitor component lifecycle
  useEffect(() => {
    // Track component mount
    trackEvent({
      event: 'Component mounted',
      action: 'component_mount',
      result: 'success',
      additionalData: {
        component: options.component,
        feature: options.feature,
      },
    });

    // Track component unmount
    return () => {
      trackEvent({
        event: 'Component unmounted',
        action: 'component_unmount',
        result: 'success',
        additionalData: {
          component: options.component,
          feature: options.feature,
        },
      });
    };
  }, [trackEvent, options.component, options.feature]);

  return {
    captureError,
    trackEvent,
    trackPerformance,
    trackFlow,
    monitorAsyncOperation,
  };
};

// Hook for monitoring API calls specifically
export const useAPIMonitoring = (options: ErrorMonitoringOptions) => {
  const { captureError, trackEvent, trackPerformance } = useErrorMonitoring(options);
  
  const monitorAPICall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    context: {
      endpoint: string;
      method: string;
      businessImpact: 'low' | 'medium' | 'high' | 'critical';
      expectedDataType?: string;
      additionalContext?: Record<string, any>;
    }
  ): Promise<T> => {
    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      
      // Track successful API call
      const duration = Date.now() - startTime;
      trackPerformance(`API ${context.method} ${context.endpoint}`, duration, { 
        success: true,
        additionalMetrics: {
          response_time: duration,
          status_code: 200,
        },
      });
      
      trackEvent({
        event: 'API call successful',
        action: `${context.method} ${context.endpoint}`,
        result: 'success',
        metricValue: duration,
        additionalData: {
          endpoint: context.endpoint,
          method: context.method,
          expected_data_type: context.expectedDataType,
          ...context.additionalContext,
        },
      });
      
      return result;
    } catch (error) {
      // Track failed API call
      const duration = Date.now() - startTime;
      trackPerformance(`API ${context.method} ${context.endpoint}`, duration, { 
        success: false,
        additionalMetrics: {
          response_time: duration,
          error_occurred: 1,
        },
      });
      
      trackEvent({
        event: 'API call failed',
        action: `${context.method} ${context.endpoint}`,
        result: 'failure',
        metricValue: duration,
        additionalData: {
          endpoint: context.endpoint,
          method: context.method,
          error_message: (error as Error).message,
          ...context.additionalContext,
        },
      });
      
      // Capture error with API context
      captureError(error as Error, {
        action: `API ${context.method} ${context.endpoint}`,
        businessImpact: context.businessImpact,
        additionalContext: {
          endpoint: context.endpoint,
          method: context.method,
          response_time: duration,
          expected_data_type: context.expectedDataType,
          ...context.additionalContext,
        },
      });
      
      // Re-throw to maintain original error handling
      throw error;
    }
  }, [captureError, trackEvent, trackPerformance]);

  return {
    monitorAPICall,
  };
};