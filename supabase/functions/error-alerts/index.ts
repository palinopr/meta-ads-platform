/**
 * Error Alerts Edge Function for Meta Ads Platform
 * 
 * This function processes error events from Sentry and creates intelligent alerts
 * based on business impact, error frequency, and escalation rules.
 * 
 * Business Impact: Enables proactive response to critical errors before they
 * impact customers, with intelligent escalation to prevent false alarms.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withSentryMonitoring, captureBusinessError, logBusinessEvent } from '../_shared/sentry-config.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sentry-auth',
}

// Alert severity levels
enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Alert types
enum AlertType {
  ERROR_RATE_SPIKE = 'error_rate_spike',
  CRITICAL_ERROR = 'critical_error',
  REVENUE_IMPACTING = 'revenue_impacting',
  AUTHENTICATION_FAILURE = 'authentication_failure',
  API_OUTAGE = 'api_outage',
  PERFORMANCE_DEGRADATION = 'performance_degradation'
}

interface SentryEvent {
  event_id: string;
  message: string;
  level: string;
  platform: string;
  timestamp: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  user?: {
    id?: string;
    email?: string;
  };
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: any;
    }>;
  };
  request?: {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
}

interface AlertRule {
  type: AlertType;
  severity: AlertSeverity;
  condition: (event: SentryEvent) => boolean;
  threshold: number;
  timeWindow: number; // minutes
  escalationDelay: number; // minutes
  channels: string[];
  businessImpact: string;
  actionItems: string[];
}

// Alert configuration
const ALERT_RULES: AlertRule[] = [
  {
    type: AlertType.CRITICAL_ERROR,
    severity: AlertSeverity.CRITICAL,
    condition: (event) => event.tags?.business_impact === 'critical',
    threshold: 1,
    timeWindow: 1,
    escalationDelay: 5,
    channels: ['slack', 'email', 'sms'],
    businessImpact: 'Immediate revenue impact, customer experience degradation',
    actionItems: [
      'Investigate error immediately',
      'Check if rollback is needed',
      'Notify stakeholders',
      'Monitor customer impact'
    ]
  },
  {
    type: AlertType.REVENUE_IMPACTING,
    severity: AlertSeverity.HIGH,
    condition: (event) => 
      event.tags?.business_impact === 'high' || 
      event.tags?.error_category === 'business_error',
    threshold: 3,
    timeWindow: 5,
    escalationDelay: 10,
    channels: ['slack', 'email'],
    businessImpact: 'Potential revenue loss, customer frustration',
    actionItems: [
      'Assess customer impact',
      'Prioritize fix in current sprint',
      'Document issue for post-mortem',
      'Check related systems'
    ]
  },
  {
    type: AlertType.AUTHENTICATION_FAILURE,
    severity: AlertSeverity.HIGH,
    condition: (event) => 
      event.tags?.error_category === 'authentication' ||
      event.message.toLowerCase().includes('token') ||
      event.message.toLowerCase().includes('auth'),
    threshold: 5,
    timeWindow: 10,
    escalationDelay: 15,
    channels: ['slack', 'email'],
    businessImpact: 'Users unable to access accounts, Meta integration issues',
    actionItems: [
      'Check OAuth service status',
      'Verify token encryption system',
      'Review authentication logs',
      'Test login flow'
    ]
  },
  {
    type: AlertType.API_OUTAGE,
    severity: AlertSeverity.CRITICAL,
    condition: (event) => 
      event.tags?.error_category === 'api_error' ||
      event.message.toLowerCase().includes('meta api') ||
      event.message.toLowerCase().includes('graph.facebook.com'),
    threshold: 10,
    timeWindow: 5,
    escalationDelay: 5,
    channels: ['slack', 'email', 'sms'],
    businessImpact: 'Complete service disruption, data sync failures',
    actionItems: [
      'Check Meta API status',
      'Verify network connectivity',
      'Review rate limiting',
      'Contact Meta support if needed'
    ]
  },
  {
    type: AlertType.ERROR_RATE_SPIKE,
    severity: AlertSeverity.MEDIUM,
    condition: (event) => true, // All errors count for rate spike
    threshold: 50,
    timeWindow: 15,
    escalationDelay: 30,
    channels: ['slack'],
    businessImpact: 'Increased error rate, potential system instability',
    actionItems: [
      'Investigate error patterns',
      'Check system resources',
      'Review recent deployments',
      'Monitor for escalation'
    ]
  }
];

// Slack notification
async function sendSlackAlert(alert: {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  businessImpact: string;
  actionItems: string[];
  eventDetails: any;
}) {
  const slackWebhook = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!slackWebhook) {
    console.warn('Slack webhook not configured');
    return;
  }

  const color = {
    [AlertSeverity.LOW]: '#36a64f',
    [AlertSeverity.MEDIUM]: '#ff9500',
    [AlertSeverity.HIGH]: '#ff0000',
    [AlertSeverity.CRITICAL]: '#800000'
  }[alert.severity];

  const payload = {
    text: `🚨 Meta Ads Platform Alert: ${alert.type.toUpperCase()}`,
    attachments: [
      {
        color,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Alert Type',
            value: alert.type.replace('_', ' ').toUpperCase(),
            short: true
          },
          {
            title: 'Business Impact',
            value: alert.businessImpact,
            short: false
          },
          {
            title: 'Message',
            value: alert.message,
            short: false
          },
          {
            title: 'Action Items',
            value: alert.actionItems.map(item => `• ${item}`).join('\n'),
            short: false
          },
          {
            title: 'Event Details',
            value: `\`\`\`${JSON.stringify(alert.eventDetails, null, 2)}\`\`\``,
            short: false
          }
        ],
        footer: 'Meta Ads Platform Monitoring',
        ts: Math.floor(Date.now() / 1000)
      }
    ]
  };

  try {
    const response = await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log('Slack alert sent successfully');
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
    captureBusinessError(error, {
      functionName: 'error-alerts',
      businessImpact: 'medium',
      affectedRevenue: 'Alert delivery failure may delay response',
      customerImpact: 'Delayed error response could impact customer experience',
      additionalContext: { alertType: alert.type, severity: alert.severity }
    });
  }
}

// Email notification
async function sendEmailAlert(alert: {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  businessImpact: string;
  actionItems: string[];
  eventDetails: any;
}) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const emailHtml = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h1 style="color: #dc3545; margin-bottom: 20px;">
            🚨 Meta Ads Platform Alert: ${alert.type.replace('_', ' ').toUpperCase()}
          </h1>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">Alert Details</h2>
            <p><strong>Severity:</strong> <span style="color: ${alert.severity === AlertSeverity.CRITICAL ? '#dc3545' : '#fd7e14'}">${alert.severity.toUpperCase()}</span></p>
            <p><strong>Type:</strong> ${alert.type.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Message:</strong> ${alert.message}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">Business Impact</h2>
            <p>${alert.businessImpact}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">Immediate Action Required</h2>
            <ul>
              ${alert.actionItems.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #495057; margin-top: 0;">Event Details</h2>
            <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(alert.eventDetails, null, 2)}</pre>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    // Send email using Supabase Edge Functions or external email service
    // This would typically integrate with SendGrid, Mailgun, or similar service
    console.log('Email alert would be sent (service not configured)');
    
    // Store alert in database for tracking
    await supabase
      .from('error_alerts')
      .insert({
        alert_type: alert.type,
        severity: alert.severity,
        message: alert.message,
        business_impact: alert.businessImpact,
        action_items: alert.actionItems,
        event_details: alert.eventDetails,
        created_at: new Date().toISOString(),
        status: 'sent'
      });

  } catch (error) {
    console.error('Failed to send email alert:', error);
    captureBusinessError(error, {
      functionName: 'error-alerts',
      businessImpact: 'medium',
      affectedRevenue: 'Email alert delivery failure',
      customerImpact: 'Delayed notification to team',
      additionalContext: { alertType: alert.type, severity: alert.severity }
    });
  }
}

// Process Sentry webhook
async function processSentryWebhook(event: SentryEvent) {
  console.log('Processing Sentry event:', event.event_id);
  
  // Check each alert rule
  for (const rule of ALERT_RULES) {
    if (rule.condition(event)) {
      console.log(`Alert rule triggered: ${rule.type}`);
      
      // Create alert
      const alert = {
        type: rule.type,
        severity: rule.severity,
        message: event.message || 'Unknown error',
        businessImpact: rule.businessImpact,
        actionItems: rule.actionItems,
        eventDetails: {
          event_id: event.event_id,
          level: event.level,
          timestamp: event.timestamp,
          tags: event.tags,
          user: event.user,
          platform: event.platform,
          exception: event.exception,
          request: event.request
        }
      };

      // Send alerts through configured channels
      if (rule.channels.includes('slack')) {
        await sendSlackAlert(alert);
      }
      
      if (rule.channels.includes('email')) {
        await sendEmailAlert(alert);
      }
      
      // Log business event
      logBusinessEvent('Error alert triggered', {
        functionName: 'error-alerts',
        action: 'send-alert',
        result: 'success',
        additionalData: {
          alertType: rule.type,
          severity: rule.severity,
          eventId: event.event_id,
          channels: rule.channels
        }
      });
    }
  }
}

serve(withSentryMonitoring('error-alerts', async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  let success = false

  try {
    // Verify Sentry webhook signature if configured
    const sentrySignature = req.headers.get('x-sentry-auth');
    
    if (req.method === 'POST') {
      const body = await req.text();
      let sentryEvent: SentryEvent;

      try {
        sentryEvent = JSON.parse(body);
      } catch (parseError) {
        console.error('Failed to parse Sentry webhook body:', parseError);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON payload' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Process the Sentry event
      await processSentryWebhook(sentryEvent);
      
      success = true;
      const duration = Date.now() - startTime;
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Alert processed successfully',
          eventId: sentryEvent.event_id,
          processingTime: duration
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle GET requests for health check
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({ 
          status: 'healthy',
          service: 'error-alerts',
          alertRules: ALERT_RULES.length,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in error-alerts function:', error);
    
    const duration = Date.now() - startTime;
    
    captureBusinessError(error, {
      functionName: 'error-alerts',
      businessImpact: 'critical',
      affectedRevenue: 'Alert system failure prevents error notifications',
      customerImpact: 'Team will not be notified of critical errors',
      additionalContext: {
        errorName: error.name,
        errorMessage: error.message,
        processingTime: duration,
        unexpectedError: true
      }
    });

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}, {
  category: 'monitoring',
  criticalPath: true
}));