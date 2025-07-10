-- ================================================================
-- PHASE 1: AGENCY DATABASE SCHEMA
-- ================================================================
-- Creates comprehensive agency multi-tenancy system with:
-- - Complete agency data isolation using RLS
-- - Employee management with role-based access control
-- - Client account management with granular permissions
-- - Professional agency hierarchy: Owner > Manager > Viewer
-- ================================================================

-- ================================================================
-- CORE AGENCY TABLES
-- ================================================================

-- 1. Agencies table (company information)
CREATE TABLE IF NOT EXISTS public.agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Employees table (agency staff)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'viewer')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
    invited_by UUID REFERENCES employees(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, agency_id)
);

-- 3. Client accounts table (client business information)
CREATE TABLE IF NOT EXISTS public.client_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    meta_account_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
    billing_contact TEXT,
    notes TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agency_id, meta_account_id)
);

-- 4. Employee client access (permission mapping)
CREATE TABLE IF NOT EXISTS public.employee_client_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    client_account_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{
        "view": true,
        "edit": false,
        "manage": false,
        "export": false,
        "billing": false
    }',
    granted_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, client_account_id)
);

-- ================================================================
-- PERFORMANCE INDEXES
-- ================================================================

-- Agencies indexes
CREATE INDEX IF NOT EXISTS idx_agencies_owner_user_id ON public.agencies(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_agencies_slug ON public.agencies(slug);
CREATE INDEX IF NOT EXISTS idx_agencies_status ON public.agencies(status);

-- Employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_agency_id ON public.employees(agency_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_invited_by ON public.employees(invited_by);

-- Client accounts indexes
CREATE INDEX IF NOT EXISTS idx_client_accounts_agency_id ON public.client_accounts(agency_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_meta_account_id ON public.client_accounts(meta_account_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_status ON public.client_accounts(status);

-- Employee client access indexes
CREATE INDEX IF NOT EXISTS idx_employee_client_access_employee_id ON public.employee_client_access(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_client_access_client_account_id ON public.employee_client_access(client_account_id);
CREATE INDEX IF NOT EXISTS idx_employee_client_access_granted_by ON public.employee_client_access(granted_by);

-- ================================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================================

-- Enable RLS on all agency tables
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_client_access ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- AGENCIES RLS POLICIES
-- ================================================================

-- Users can view agencies where they are employees
CREATE POLICY "Users can view their agencies"
    ON public.agencies
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.agency_id = agencies.id
            AND employees.user_id = auth.uid()
            AND employees.status = 'active'
        )
    );

-- Agency owners can update their agencies
CREATE POLICY "Agency owners can update their agencies"
    ON public.agencies
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.agency_id = agencies.id
            AND employees.user_id = auth.uid()
            AND employees.role = 'owner'
            AND employees.status = 'active'
        )
    );

-- Users can create agencies (becomes owner automatically via trigger)
CREATE POLICY "Users can create agencies"
    ON public.agencies
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_user_id);

-- ================================================================
-- EMPLOYEES RLS POLICIES
-- ================================================================

-- Users can view employees in their agencies
CREATE POLICY "Users can view agency employees"
    ON public.employees
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees emp
            WHERE emp.agency_id = employees.agency_id
            AND emp.user_id = auth.uid()
            AND emp.status = 'active'
        )
    );

-- Agency owners and managers can manage employees
CREATE POLICY "Agency owners and managers can manage employees"
    ON public.employees
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees emp
            WHERE emp.agency_id = employees.agency_id
            AND emp.user_id = auth.uid()
            AND emp.role IN ('owner', 'manager')
            AND emp.status = 'active'
        )
    );

-- Users can update their own employee record (for joining, activity tracking)
CREATE POLICY "Users can update their own employee record"
    ON public.employees
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- ================================================================
-- CLIENT ACCOUNTS RLS POLICIES
-- ================================================================

-- Users can view client accounts in their agencies with proper access
CREATE POLICY "Users can view accessible client accounts"
    ON public.client_accounts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees emp
            LEFT JOIN public.employee_client_access eca ON emp.id = eca.employee_id
            WHERE emp.user_id = auth.uid()
            AND emp.agency_id = client_accounts.agency_id
            AND emp.status = 'active'
            AND (
                emp.role = 'owner' -- Owners see all clients
                OR (eca.client_account_id = client_accounts.id AND (eca.permissions->>'view')::boolean = true)
            )
        )
    );

-- Agency owners and managers can manage client accounts
CREATE POLICY "Agency owners and managers can manage client accounts"
    ON public.client_accounts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees emp
            WHERE emp.agency_id = client_accounts.agency_id
            AND emp.user_id = auth.uid()
            AND emp.role IN ('owner', 'manager')
            AND emp.status = 'active'
        )
    );

-- ================================================================
-- EMPLOYEE CLIENT ACCESS RLS POLICIES
-- ================================================================

-- Users can view access records for their agencies
CREATE POLICY "Users can view client access in their agencies"
    ON public.employee_client_access
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees emp
            JOIN public.client_accounts ca ON ca.id = employee_client_access.client_account_id
            WHERE emp.user_id = auth.uid()
            AND emp.agency_id = ca.agency_id
            AND emp.status = 'active'
        )
    );

-- Agency owners and managers can manage client access
CREATE POLICY "Agency owners and managers can manage client access"
    ON public.employee_client_access
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees emp
            JOIN public.client_accounts ca ON ca.id = employee_client_access.client_account_id
            WHERE emp.user_id = auth.uid()
            AND emp.agency_id = ca.agency_id
            AND emp.role IN ('owner', 'manager')
            AND emp.status = 'active'
        )
    );

-- ================================================================
-- UTILITY FUNCTIONS
-- ================================================================

-- Function to create agency with owner employee record
CREATE OR REPLACE FUNCTION create_agency_with_owner(
    p_name TEXT,
    p_slug TEXT,
    p_subscription_tier TEXT DEFAULT 'starter'
)
RETURNS UUID AS $$
DECLARE
    agency_id UUID;
    employee_id UUID;
BEGIN
    -- Create agency
    INSERT INTO public.agencies (name, slug, owner_user_id, subscription_tier)
    VALUES (p_name, p_slug, auth.uid(), p_subscription_tier)
    RETURNING id INTO agency_id;
    
    -- Create owner employee record
    INSERT INTO public.employees (user_id, agency_id, role, status, joined_at)
    VALUES (auth.uid(), agency_id, 'owner', 'active', NOW())
    RETURNING id INTO employee_id;
    
    -- Log agency creation
    INSERT INTO public.audit_logs (user_id, action, metadata)
    VALUES (
        auth.uid(),
        'agency_created',
        jsonb_build_object(
            'agency_id', agency_id,
            'agency_name', p_name,
            'employee_id', employee_id
        )
    );
    
    RETURN agency_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invite employee to agency
CREATE OR REPLACE FUNCTION invite_employee(
    p_agency_id UUID,
    p_email TEXT,
    p_role TEXT DEFAULT 'viewer'
)
RETURNS UUID AS $$
DECLARE
    inviter_employee_id UUID;
    invited_user_id UUID;
    employee_id UUID;
BEGIN
    -- Verify inviter has permission (owner or manager)
    SELECT id INTO inviter_employee_id
    FROM public.employees
    WHERE user_id = auth.uid()
    AND agency_id = p_agency_id
    AND role IN ('owner', 'manager')
    AND status = 'active';
    
    IF inviter_employee_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Only agency owners and managers can invite employees';
    END IF;
    
    -- Check if user exists
    SELECT id INTO invited_user_id
    FROM auth.users
    WHERE email = p_email;
    
    -- Create pending employee record
    INSERT INTO public.employees (
        user_id,
        agency_id,
        role,
        status,
        invited_by,
        invited_at
    ) VALUES (
        invited_user_id,
        p_agency_id,
        p_role,
        'pending',
        inviter_employee_id,
        NOW()
    )
    RETURNING id INTO employee_id;
    
    -- Log employee invitation
    INSERT INTO public.audit_logs (user_id, action, metadata)
    VALUES (
        auth.uid(),
        'employee_invited',
        jsonb_build_object(
            'agency_id', p_agency_id,
            'invited_email', p_email,
            'role', p_role,
            'employee_id', employee_id
        )
    );
    
    RETURN employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant client access to employee
CREATE OR REPLACE FUNCTION grant_client_access(
    p_employee_id UUID,
    p_client_account_id UUID,
    p_permissions JSONB DEFAULT '{"view": true, "edit": false, "manage": false, "export": false, "billing": false}'
)
RETURNS UUID AS $$
DECLARE
    granter_employee_id UUID;
    access_id UUID;
    agency_id UUID;
BEGIN
    -- Get agency_id from client account
    SELECT ca.agency_id INTO agency_id
    FROM public.client_accounts ca
    WHERE ca.id = p_client_account_id;
    
    -- Verify granter has permission (owner or manager in same agency)
    SELECT id INTO granter_employee_id
    FROM public.employees
    WHERE user_id = auth.uid()
    AND agency_id = agency_id
    AND role IN ('owner', 'manager')
    AND status = 'active';
    
    IF granter_employee_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Only agency owners and managers can grant client access';
    END IF;
    
    -- Create or update access record
    INSERT INTO public.employee_client_access (
        employee_id,
        client_account_id,
        permissions,
        granted_by
    ) VALUES (
        p_employee_id,
        p_client_account_id,
        p_permissions,
        granter_employee_id
    )
    ON CONFLICT (employee_id, client_account_id)
    DO UPDATE SET
        permissions = p_permissions,
        granted_by = granter_employee_id,
        updated_at = NOW()
    RETURNING id INTO access_id;
    
    -- Log access grant
    INSERT INTO public.audit_logs (user_id, action, metadata)
    VALUES (
        auth.uid(),
        'client_access_granted',
        jsonb_build_object(
            'employee_id', p_employee_id,
            'client_account_id', p_client_account_id,
            'permissions', p_permissions,
            'access_id', access_id
        )
    );
    
    RETURN access_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's agency context
CREATE OR REPLACE FUNCTION get_user_agency_context()
RETURNS TABLE (
    agency_id UUID,
    agency_name TEXT,
    agency_slug TEXT,
    employee_role TEXT,
    employee_status TEXT,
    subscription_tier TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as agency_id,
        a.name as agency_name,
        a.slug as agency_slug,
        e.role as employee_role,
        e.status as employee_status,
        a.subscription_tier
    FROM public.agencies a
    JOIN public.employees e ON a.id = e.agency_id
    WHERE e.user_id = auth.uid()
    AND e.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- TRIGGER FUNCTIONS
-- ================================================================

-- Update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_agencies_updated_at
    BEFORE UPDATE ON public.agencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_accounts_updated_at
    BEFORE UPDATE ON public.client_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_client_access_updated_at
    BEFORE UPDATE ON public.employee_client_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- EXTEND EXISTING TABLES FOR AGENCY INTEGRATION
-- ================================================================

-- Add agency_id to meta_ad_accounts table for multi-agency support
ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;

-- Create index for agency_id on meta_ad_accounts
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_agency_id ON public.meta_ad_accounts(agency_id);

-- Update RLS policy for meta_ad_accounts to include agency context
DROP POLICY IF EXISTS "Users can only access their own ad accounts" ON public.meta_ad_accounts;

CREATE POLICY "Users can access ad accounts in their agencies"
    ON public.meta_ad_accounts
    FOR ALL
    TO authenticated
    USING (
        -- Direct user ownership (backward compatibility)
        user_id = auth.uid()
        OR
        -- Agency-based access
        EXISTS (
            SELECT 1 FROM public.employees emp
            WHERE emp.user_id = auth.uid()
            AND emp.agency_id = meta_ad_accounts.agency_id
            AND emp.status = 'active'
        )
    );

-- ================================================================
-- TABLE COMMENTS
-- ================================================================

COMMENT ON TABLE public.agencies IS 'Agency companies with multi-tenant isolation';
COMMENT ON TABLE public.employees IS 'Agency staff with role-based access control';
COMMENT ON TABLE public.client_accounts IS 'Client business accounts linked to Meta ad accounts';
COMMENT ON TABLE public.employee_client_access IS 'Granular client access permissions per employee';

COMMENT ON COLUMN public.agencies.slug IS 'URL-friendly unique identifier for agency';
COMMENT ON COLUMN public.agencies.subscription_tier IS 'Agency subscription level (starter, professional, enterprise)';
COMMENT ON COLUMN public.employees.role IS 'Employee role: owner (full access), manager (client management), viewer (read-only)';
COMMENT ON COLUMN public.employees.status IS 'Employee status: active, inactive, pending (invitation)';
COMMENT ON COLUMN public.client_accounts.meta_account_id IS 'Facebook/Meta ad account ID';
COMMENT ON COLUMN public.employee_client_access.permissions IS 'JSON object with granular permissions (view, edit, manage, export, billing)';

-- ================================================================
-- PHASE 1 COMPLETION
-- ================================================================
-- Migration complete. Database now supports:
-- ✅ Complete agency multi-tenancy with data isolation
-- ✅ Employee management with invitation system
-- ✅ Role-based access control (Owner > Manager > Viewer)
-- ✅ Client account management with granular permissions
-- ✅ Audit logging integration for compliance
-- ✅ Performance optimized with proper indexes
-- ✅ Backward compatibility with existing data
-- ✅ Utility functions for common operations
-- ================================================================
