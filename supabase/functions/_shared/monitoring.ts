// Meta API Usage Monitoring and Alerting System
// Tracks API usage patterns and alerts on anomalies

interface APIUsageMetrics {
  userId: string;
  accountId: string;
  endpoint: string;
  httpMethod: string;
  statusCode: number;
  responseTimeMs: number;
  requestPoints: number;
  rateLimitUtilization: number;
  timestamp: string;
  userAgent?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface AlertConfig {
  name: string;
  condition: (metrics: APIUsageMetrics[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldownMs: number;
  message: string;
}

interface Alert {
  id: string;
  configName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  userId: string;
  accountId?: string;
  metrics: APIUsageMetrics[];
  resolved: boolean;
  resolvedAt?: string;
}

// In-memory storage for metrics and alerts
const metricsBuffer: APIUsageMetrics[] = []
const activeAlerts = new Map<string, Alert>()
const alertCooldowns = new Map<string, number>()

// Alert configurations
const ALERT_CONFIGS: AlertConfig[] = [
  {
    name: 'high_rate_limit_usage',
    condition: (metrics) => {
      const recentMetrics = metrics.filter(m => 
        Date.now() - new Date(m.timestamp).getTime() < 60000 // Last 1 minute
      )
      return recentMetrics.some(m => m.rateLimitUtilization > 80)
    },
    severity: 'high',
    cooldownMs: 300000, // 5 minutes
    message: 'Rate limit utilization exceeded 80%'
  },
  {
    name: 'rate_limit_exceeded',
    condition: (metrics) => {
      const recentMetrics = metrics.filter(m => 
        Date.now() - new Date(m.timestamp).getTime() < 60000 // Last 1 minute
      )
      return recentMetrics.some(m => m.statusCode === 429)
    },
    severity: 'critical',
    cooldownMs: 60000, // 1 minute
    message: 'Rate limit exceeded - API calls are being throttled'
  },
  {
    name: 'high_error_rate',
    condition: (metrics) => {
      const recentMetrics = metrics.filter(m => 
        Date.now() - new Date(m.timestamp).getTime() < 300000 // Last 5 minutes
      )
      if (recentMetrics.length < 5) return false
      
      const errorRate = recentMetrics.filter(m => m.statusCode >= 400).length / recentMetrics.length
      return errorRate > 0.2 // 20% error rate
    },
    severity: 'medium',
    cooldownMs: 600000, // 10 minutes
    message: 'Error rate exceeded 20% in the last 5 minutes'
  },
  {
    name: 'slow_response_times',
    condition: (metrics) => {
      const recentMetrics = metrics.filter(m => 
        Date.now() - new Date(m.timestamp).getTime() < 180000 // Last 3 minutes
      )
      if (recentMetrics.length < 3) return false
      
      const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTimeMs, 0) / recentMetrics.length
      return avgResponseTime > 5000 // 5 seconds average
    },
    severity: 'medium',
    cooldownMs: 300000, // 5 minutes
    message: 'Average response time exceeded 5 seconds'
  },
  {
    name: 'token_expiration_errors',
    condition: (metrics) => {
      const recentMetrics = metrics.filter(m => 
        Date.now() - new Date(m.timestamp).getTime() < 60000 // Last 1 minute
      )
      return recentMetrics.some(m => m.errorCode === '190' || m.statusCode === 401)
    },
    severity: 'high',
    cooldownMs: 300000, // 5 minutes
    message: 'Meta access token appears to be expired or invalid'
  },
  {
    name: 'business_verification_required',
    condition: (metrics) => {
      const recentMetrics = metrics.filter(m => 
        Date.now() - new Date(m.timestamp).getTime() < 60000 // Last 1 minute
      )
      return recentMetrics.some(m => m.errorCode === '200' && m.errorMessage?.includes('business'))
    },
    severity: 'high',
    cooldownMs: 3600000, // 1 hour
    message: 'Business verification may be required for higher API limits'
  }
]

export class APIUsageMonitor {
  private static instance: APIUsageMonitor
  private supabaseClient: any

  private constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient
  }

  public static getInstance(supabaseClient: any): APIUsageMonitor {
    if (!APIUsageMonitor.instance) {
      APIUsageMonitor.instance = new APIUsageMonitor(supabaseClient)
    }
    return APIUsageMonitor.instance
  }

  /**
   * Record API usage metrics
   */
  public recordAPIUsage(metrics: Omit<APIUsageMetrics, 'timestamp'>): void {
    const fullMetrics: APIUsageMetrics = {
      ...metrics,
      timestamp: new Date().toISOString()
    }

    // Add to buffer
    metricsBuffer.push(fullMetrics)

    // Keep only last 1000 metrics to prevent memory issues
    if (metricsBuffer.length > 1000) {
      metricsBuffer.splice(0, metricsBuffer.length - 1000)
    }

    // Check for alerts
    this.checkAlerts(fullMetrics)

    // Log metrics for debugging
    console.log('API Usage Recorded:', {
      endpoint: fullMetrics.endpoint,
      status: fullMetrics.statusCode,
      responseTime: fullMetrics.responseTimeMs,
      rateLimitUtilization: fullMetrics.rateLimitUtilization,
      userId: fullMetrics.userId
    })
  }

  /**
   * Check if any alert conditions are met
   */
  private checkAlerts(newMetrics: APIUsageMetrics): void {
    for (const config of ALERT_CONFIGS) {
      const cooldownKey = `${config.name}:${newMetrics.userId}:${newMetrics.accountId}`
      
      // Check if we're in cooldown period
      const lastAlert = alertCooldowns.get(cooldownKey)
      if (lastAlert && Date.now() - lastAlert < config.cooldownMs) {
        continue
      }

      // Get relevant metrics for this user/account
      const userMetrics = metricsBuffer.filter(m => 
        m.userId === newMetrics.userId && 
        (m.accountId === newMetrics.accountId || !newMetrics.accountId)
      )

      // Check if alert condition is met
      if (config.condition(userMetrics)) {
        this.triggerAlert(config, newMetrics, userMetrics)
        alertCooldowns.set(cooldownKey, Date.now())
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(config: AlertConfig, triggerMetrics: APIUsageMetrics, relevantMetrics: APIUsageMetrics[]): void {
    const alert: Alert = {
      id: `${config.name}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      configName: config.name,
      severity: config.severity,
      message: config.message,
      timestamp: new Date().toISOString(),
      userId: triggerMetrics.userId,
      accountId: triggerMetrics.accountId,
      metrics: relevantMetrics.slice(-10), // Include last 10 relevant metrics
      resolved: false
    }

    activeAlerts.set(alert.id, alert)

    // Log alert
    console.warn('🚨 ALERT TRIGGERED:', {
      id: alert.id,
      severity: alert.severity,
      message: alert.message,
      userId: alert.userId,
      accountId: alert.accountId,
      metricsCount: alert.metrics.length
    })

    // Send alert notification (would integrate with external service in production)
    this.sendAlertNotification(alert)
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: Alert): Promise<void> {
    try {
      // In a real implementation, this would send to:
      // - Slack webhook
      // - Email service
      // - PagerDuty
      // - SMS service
      // - Dashboard notification system

      // For now, just log and optionally store in database
      console.log('📢 ALERT NOTIFICATION:', {
        severity: alert.severity,
        message: alert.message,
        user: alert.userId,
        time: alert.timestamp
      })

      // Store alert in database for dashboard/history
      if (this.supabaseClient) {
        await this.supabaseClient
          .from('api_usage_alerts')
          .insert({
            alert_id: alert.id,
            config_name: alert.configName,
            severity: alert.severity,
            message: alert.message,
            user_id: alert.userId,
            account_id: alert.accountId,
            metrics_snapshot: JSON.stringify(alert.metrics),
            created_at: alert.timestamp
          })
          .select()
      }

    } catch (error) {
      console.error('Failed to send alert notification:', error)
    }
  }

  /**
   * Get current API usage statistics
   */
  public getUsageStats(userId: string, accountId?: string): {
    totalRequests: number;
    errorRate: number;
    avgResponseTime: number;
    rateLimitUtilization: number;
    recentErrors: APIUsageMetrics[];
    activeAlerts: Alert[];
  } {
    const userMetrics = metricsBuffer.filter(m => 
      m.userId === userId && 
      (!accountId || m.accountId === accountId)
    )

    const recentMetrics = userMetrics.filter(m => 
      Date.now() - new Date(m.timestamp).getTime() < 3600000 // Last hour
    )

    const totalRequests = recentMetrics.length
    const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0

    const avgResponseTime = totalRequests > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.responseTimeMs, 0) / totalRequests
      : 0

    const latestRateLimitUtilization = recentMetrics.length > 0
      ? recentMetrics[recentMetrics.length - 1].rateLimitUtilization
      : 0

    const recentErrors = recentMetrics
      .filter(m => m.statusCode >= 400)
      .slice(-5) // Last 5 errors

    const userAlerts = Array.from(activeAlerts.values())
      .filter(a => a.userId === userId && !a.resolved)

    return {
      totalRequests,
      errorRate,
      avgResponseTime,
      rateLimitUtilization: latestRateLimitUtilization,
      recentErrors,
      activeAlerts: userAlerts
    }
  }

  /**
   * Get system-wide monitoring dashboard data
   */
  public getSystemStats(): {
    totalUsers: number;
    totalRequests: number;
    systemErrorRate: number;
    avgSystemResponseTime: number;
    topErrors: Array<{error: string, count: number}>;
    alertsSummary: Array<{severity: string, count: number}>;
  } {
    const recentMetrics = metricsBuffer.filter(m => 
      Date.now() - new Date(m.timestamp).getTime() < 3600000 // Last hour
    )

    const totalUsers = new Set(recentMetrics.map(m => m.userId)).size
    const totalRequests = recentMetrics.length
    const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length
    const systemErrorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0

    const avgSystemResponseTime = totalRequests > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.responseTimeMs, 0) / totalRequests
      : 0

    // Top errors
    const errorCounts = new Map<string, number>()
    recentMetrics
      .filter(m => m.statusCode >= 400)
      .forEach(m => {
        const key = m.errorMessage || `HTTP ${m.statusCode}`
        errorCounts.set(key, (errorCounts.get(key) || 0) + 1)
      })

    const topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }))

    // Alerts summary
    const alertCounts = new Map<string, number>()
    Array.from(activeAlerts.values())
      .filter(a => !a.resolved)
      .forEach(a => {
        alertCounts.set(a.severity, (alertCounts.get(a.severity) || 0) + 1)
      })

    const alertsSummary = Array.from(alertCounts.entries())
      .map(([severity, count]) => ({ severity, count }))

    return {
      totalUsers,
      totalRequests,
      systemErrorRate,
      avgSystemResponseTime,
      topErrors,
      alertsSummary
    }
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = activeAlerts.get(alertId)
    if (alert) {
      alert.resolved = true
      alert.resolvedAt = new Date().toISOString()
      activeAlerts.set(alertId, alert)
      
      console.log('✅ Alert resolved:', alertId)
      return true
    }
    return false
  }

  /**
   * Clear old metrics and resolved alerts
   */
  public cleanup(): void {
    const cutoffTime = Date.now() - 3600000 // 1 hour ago
    
    // Remove old metrics
    const oldMetricsCount = metricsBuffer.length
    metricsBuffer.splice(0, metricsBuffer.findIndex(m => 
      new Date(m.timestamp).getTime() > cutoffTime
    ))
    
    // Remove old resolved alerts
    const oldAlertsCount = activeAlerts.size
    for (const [id, alert] of activeAlerts.entries()) {
      if (alert.resolved && alert.resolvedAt && 
          new Date(alert.resolvedAt).getTime() < cutoffTime) {
        activeAlerts.delete(id)
      }
    }

    console.log(`🧹 Cleanup completed: removed ${oldMetricsCount - metricsBuffer.length} metrics, ${oldAlertsCount - activeAlerts.size} alerts`)
  }
}

/**
 * Utility function to create monitoring wrapper for API calls
 */
export function withAPIMonitoring<T>(
  monitor: APIUsageMonitor,
  userId: string,
  accountId: string,
  endpoint: string,
  httpMethod: string,
  requestPoints: number = 1
) {
  return async (apiCall: () => Promise<T>): Promise<T> => {
    const startTime = Date.now()
    let statusCode = 200
    let errorCode: string | undefined
    let errorMessage: string | undefined

    try {
      const result = await apiCall()
      return result
    } catch (error: any) {
      statusCode = error.status || 500
      errorCode = error.code?.toString()
      errorMessage = error.message
      throw error
    } finally {
      const responseTimeMs = Date.now() - startTime
      
      // This would be updated with actual rate limit info
      const rateLimitUtilization = 0 // Placeholder
      
      monitor.recordAPIUsage({
        userId,
        accountId,
        endpoint,
        httpMethod,
        statusCode,
        responseTimeMs,
        requestPoints,
        rateLimitUtilization,
        errorCode,
        errorMessage
      })
    }
  }
}

/**
 * Initialize monitoring system
 */
export function initializeMonitoring(supabaseClient: any): APIUsageMonitor {
  const monitor = APIUsageMonitor.getInstance(supabaseClient)
  
  // Set up cleanup interval (every 10 minutes)
  setInterval(() => {
    monitor.cleanup()
  }, 600000)
  
  return monitor
}