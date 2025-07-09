-- ================================================================
-- ENTERPRISE SECURITY: AUDIT LOGS TABLE
-- ================================================================
-- Creates audit logging table for security compliance and monitoring
-- Tracks all API usage, authentication events, and security incidents
-- Essential for enterprise-grade security and compliance requirements
-- ================================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON public.audit_logs(ip_address);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Admin users can view all audit logs (for enterprise compliance)
CREATE POLICY "Admin users can view all audit logs"
    ON public.audit_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- System can insert audit logs (for Edge Functions)
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Add table comment
COMMENT ON TABLE public.audit_logs IS 'Enterprise security audit logs for compliance and monitoring';
COMMENT ON COLUMN public.audit_logs.action IS 'Action performed (e.g., campaigns_fetched, unauthorized_access)';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Additional context data (account_id, error_details, etc.)';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'Client IP address for security tracking';

-- ================================================================
-- ENTERPRISE SECURITY: RATE LIMITING TABLE
-- ================================================================
-- Creates rate limiting table for distributed rate limiting
-- Prevents API abuse and ensures fair usage across users
-- ================================================================

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL, -- IP address or user ID
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    window_end TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 minute',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON public.rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON public.rate_limits(window_end);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint_window 
ON public.rate_limits(identifier, endpoint, window_start);

-- Enable Row Level Security
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role can manage rate limits"
    ON public.rate_limits
    FOR ALL
    TO service_role
    WITH CHECK (true);

-- Add table comment
COMMENT ON TABLE public.rate_limits IS 'Rate limiting data for API security and abuse prevention';

-- ================================================================
-- ENTERPRISE SECURITY: SECURITY INCIDENTS TABLE
-- ================================================================
-- Creates security incidents table for threat monitoring
-- Tracks suspicious activities and security breaches
-- ================================================================

-- Create security_incidents table
CREATE TABLE IF NOT EXISTS public.security_incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_type TEXT NOT NULL, -- 'rate_limit_exceeded', 'unauthorized_access', 'token_theft', etc.
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_incidents_type ON public.security_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created_at ON public.security_incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_security_incidents_ip_address ON public.security_incidents(ip_address);

-- Enable Row Level Security
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- Only admin users can view security incidents
CREATE POLICY "Admin users can view security incidents"
    ON public.security_incidents
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Service role can insert security incidents
CREATE POLICY "Service role can insert security incidents"
    ON public.security_incidents
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Add table comment
COMMENT ON TABLE public.security_incidents IS 'Security incident tracking for enterprise threat monitoring';

-- ================================================================
-- ENTERPRISE SECURITY: FUNCTIONS
-- ================================================================
-- Creates utility functions for security operations
-- ================================================================

-- Function to clean up old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.rate_limits 
    WHERE window_end < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create security incident
CREATE OR REPLACE FUNCTION create_security_incident(
    p_incident_type TEXT,
    p_severity TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_ip_address TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    incident_id UUID;
BEGIN
    INSERT INTO public.security_incidents (
        incident_type,
        severity,
        description,
        metadata,
        ip_address,
        user_id
    ) VALUES (
        p_incident_type,
        p_severity,
        p_description,
        p_metadata,
        p_ip_address,
        p_user_id
    )
    RETURNING id INTO incident_id;
    
    RETURN incident_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add role column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));

-- Create index on role column
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Add comment
COMMENT ON COLUMN public.profiles.role IS 'User role for enterprise access control (user, admin, super_admin)';

-- ================================================================
-- ENTERPRISE SECURITY: COMPLETION
-- ================================================================
-- Migration complete. Database now has enterprise-grade security:
-- - Audit logging for compliance
-- - Rate limiting for abuse prevention  
-- - Security incident tracking
-- - Role-based access control
-- - Comprehensive monitoring capabilities
-- ================================================================
