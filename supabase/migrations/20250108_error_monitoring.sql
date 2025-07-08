-- Error Monitoring and Alerting Schema for Meta Ads Platform
-- This migration creates tables for tracking error alerts, patterns, and system health

-- Create error_alerts table for tracking all alerts sent
CREATE TABLE IF NOT EXISTS error_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    business_impact TEXT NOT NULL,
    action_items JSONB,
    event_details JSONB,
    channels_sent TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'acknowledged', 'resolved', 'escalated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_by UUID REFERENCES auth.users(id),
    escalated_count INTEGER DEFAULT 0,
    last_escalated_at TIMESTAMP WITH TIME ZONE
);

-- Create error_patterns table for tracking recurring error patterns
CREATE TABLE IF NOT EXISTS error_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_hash VARCHAR(64) NOT NULL UNIQUE,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    function_name VARCHAR(100),
    page_path VARCHAR(255),
    business_impact VARCHAR(20) NOT NULL,
    first_occurrence TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_occurrence TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    occurrence_count INTEGER DEFAULT 1,
    affected_users_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_health_metrics table for tracking overall system health
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metric_unit VARCHAR(20), -- 'percentage', 'milliseconds', 'count', etc.
    component VARCHAR(50) NOT NULL, -- 'frontend', 'backend', 'edge-functions', etc.
    environment VARCHAR(20) DEFAULT 'production',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Create error_escalation_rules table for configurable escalation rules
CREATE TABLE IF NOT EXISTS error_escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    threshold_count INTEGER NOT NULL,
    time_window_minutes INTEGER NOT NULL,
    escalation_delay_minutes INTEGER NOT NULL,
    channels JSONB NOT NULL, -- ['slack', 'email', 'sms']
    business_impact TEXT NOT NULL,
    action_items JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alert_subscriptions table for managing who gets alerts
CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    alert_type VARCHAR(50) NOT NULL,
    severity_threshold VARCHAR(20) NOT NULL CHECK (severity_threshold IN ('low', 'medium', 'high', 'critical')),
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('slack', 'email', 'sms', 'push')),
    channel_config JSONB, -- email address, phone number, slack user id, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, alert_type, channel)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_error_alerts_created_at ON error_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_alerts_severity ON error_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_error_alerts_status ON error_alerts(status);
CREATE INDEX IF NOT EXISTS idx_error_alerts_type ON error_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_error_patterns_hash ON error_patterns(pattern_hash);
CREATE INDEX IF NOT EXISTS idx_error_patterns_last_occurrence ON error_patterns(last_occurrence DESC);
CREATE INDEX IF NOT EXISTS idx_error_patterns_count ON error_patterns(occurrence_count DESC);
CREATE INDEX IF NOT EXISTS idx_error_patterns_status ON error_patterns(status);

CREATE INDEX IF NOT EXISTS idx_system_health_recorded_at ON system_health_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health_metrics(component);
CREATE INDEX IF NOT EXISTS idx_system_health_metric_name ON system_health_metrics(metric_name);

CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_user_id ON alert_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_active ON alert_subscriptions(is_active);

-- Create RLS policies for security
ALTER TABLE error_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for error_alerts - admins can see all, users can only see their own
CREATE POLICY "error_alerts_admin_all" ON error_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "error_alerts_user_own" ON error_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('user', 'admin')
        )
    );

-- RLS policies for error_patterns - read-only for authenticated users
CREATE POLICY "error_patterns_read" ON error_patterns
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "error_patterns_admin_write" ON error_patterns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS policies for system_health_metrics - read-only for authenticated users
CREATE POLICY "system_health_read" ON system_health_metrics
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "system_health_admin_write" ON system_health_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS policies for error_escalation_rules - read for all, write for admins
CREATE POLICY "escalation_rules_read" ON error_escalation_rules
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "escalation_rules_admin_write" ON error_escalation_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS policies for alert_subscriptions - users can manage their own
CREATE POLICY "alert_subscriptions_own" ON alert_subscriptions
    FOR ALL USING (user_id = auth.uid());

-- Insert default escalation rules
INSERT INTO error_escalation_rules (rule_name, alert_type, severity, threshold_count, time_window_minutes, escalation_delay_minutes, channels, business_impact, action_items) VALUES
('Critical Error Alert', 'critical_error', 'critical', 1, 1, 5, '["slack", "email", "sms"]', 'Immediate revenue impact, customer experience degradation', '["Investigate error immediately", "Check if rollback is needed", "Notify stakeholders", "Monitor customer impact"]'),
('Revenue Impact Alert', 'revenue_impacting', 'high', 3, 5, 10, '["slack", "email"]', 'Potential revenue loss, customer frustration', '["Assess customer impact", "Prioritize fix in current sprint", "Document issue for post-mortem", "Check related systems"]'),
('Authentication Failure Alert', 'authentication_failure', 'high', 5, 10, 15, '["slack", "email"]', 'Users unable to access accounts, Meta integration issues', '["Check OAuth service status", "Verify token encryption system", "Review authentication logs", "Test login flow"]'),
('API Outage Alert', 'api_outage', 'critical', 10, 5, 5, '["slack", "email", "sms"]', 'Complete service disruption, data sync failures', '["Check Meta API status", "Verify network connectivity", "Review rate limiting", "Contact Meta support if needed"]'),
('Error Rate Spike Alert', 'error_rate_spike', 'medium', 50, 15, 30, '["slack"]', 'Increased error rate, potential system instability', '["Investigate error patterns", "Check system resources", "Review recent deployments", "Monitor for escalation"]');

-- Create views for common queries
CREATE OR REPLACE VIEW error_alerts_summary AS
SELECT 
    alert_type,
    severity,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as pending_alerts,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_alerts,
    MIN(created_at) as first_alert,
    MAX(created_at) as last_alert,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) as avg_resolution_time_minutes
FROM error_alerts
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY alert_type, severity
ORDER BY total_alerts DESC;

CREATE OR REPLACE VIEW system_health_dashboard AS
SELECT 
    component,
    metric_name,
    AVG(metric_value) as avg_value,
    MAX(metric_value) as max_value,
    MIN(metric_value) as min_value,
    COUNT(*) as measurement_count,
    MAX(recorded_at) as last_recorded
FROM system_health_metrics
WHERE recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY component, metric_name
ORDER BY component, metric_name;

-- Create function to update error pattern counts
CREATE OR REPLACE FUNCTION update_error_pattern(
    p_pattern_hash VARCHAR(64),
    p_error_type VARCHAR(100),
    p_error_message TEXT,
    p_function_name VARCHAR(100),
    p_page_path VARCHAR(255),
    p_business_impact VARCHAR(20)
) RETURNS VOID AS $$
BEGIN
    INSERT INTO error_patterns (
        pattern_hash, error_type, error_message, function_name, 
        page_path, business_impact, occurrence_count
    )
    VALUES (
        p_pattern_hash, p_error_type, p_error_message, p_function_name,
        p_page_path, p_business_impact, 1
    )
    ON CONFLICT (pattern_hash) 
    DO UPDATE SET 
        last_occurrence = NOW(),
        occurrence_count = error_patterns.occurrence_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to record system health metric
CREATE OR REPLACE FUNCTION record_health_metric(
    p_metric_name VARCHAR(100),
    p_metric_value DECIMAL(10,2),
    p_metric_unit VARCHAR(20),
    p_component VARCHAR(50),
    p_environment VARCHAR(20) DEFAULT 'production',
    p_metadata JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO system_health_metrics (
        metric_name, metric_value, metric_unit, component, environment, metadata
    )
    VALUES (
        p_metric_name, p_metric_value, p_metric_unit, p_component, p_environment, p_metadata
    );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON error_alerts_summary TO authenticated;
GRANT SELECT ON system_health_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION update_error_pattern TO authenticated;
GRANT EXECUTE ON FUNCTION record_health_metric TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE error_alerts IS 'Tracks all error alerts sent through the monitoring system';
COMMENT ON TABLE error_patterns IS 'Tracks recurring error patterns for trend analysis';
COMMENT ON TABLE system_health_metrics IS 'Records system health metrics over time';
COMMENT ON TABLE error_escalation_rules IS 'Configurable rules for error escalation';
COMMENT ON TABLE alert_subscriptions IS 'User preferences for alert notifications';

COMMENT ON VIEW error_alerts_summary IS 'Summary view of error alerts for the last 7 days';
COMMENT ON VIEW system_health_dashboard IS 'System health metrics for the last 24 hours';

COMMENT ON FUNCTION update_error_pattern IS 'Updates error pattern occurrence count or creates new pattern';
COMMENT ON FUNCTION record_health_metric IS 'Records a system health metric measurement';