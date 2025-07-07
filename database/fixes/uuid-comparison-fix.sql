-- FINAL COMPREHENSIVE FIX FOR UUID COMPARISON ISSUES
-- Run this entire script in your Supabase SQL Editor: https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql/new
-- This will fix the "operator does not exist: uuid = text" error

-- ============================================================================
-- STEP 1: DIAGNOSTICS - Check current state and fix missing columns
-- ============================================================================

-- Check data types to understand the issue
SELECT 
    table_name,
    column_name, 
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('meta_ad_accounts', 'campaigns', 'profiles')
AND column_name IN ('id', 'user_id', 'account_id', 'ad_account_id', 'campaign_id', 'account_name')
ORDER BY table_name, ordinal_position;

-- Check if account_name column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meta_ad_accounts' 
        AND column_name = 'account_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.meta_ad_accounts ADD COLUMN account_name TEXT;
        RAISE NOTICE 'Added missing account_name column to meta_ad_accounts';
    ELSE
        RAISE NOTICE 'account_name column already exists in meta_ad_accounts';
    END IF;
END $$;

-- Check constraints that might be causing issues
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'campaigns'::regclass 
AND contype = 'u';

-- ============================================================================
-- STEP 2: FIX CONSTRAINTS - Remove problematic unique constraints
-- ============================================================================

-- Drop the problematic constraint if it exists
-- This constraint was causing issues with campaign syncing
ALTER TABLE campaigns 
DROP CONSTRAINT IF EXISTS campaigns_ad_account_id_campaign_id_key;

-- Create the correct constraint - campaign_id should be globally unique
-- since Facebook campaign IDs are unique across all accounts
ALTER TABLE campaigns
DROP CONSTRAINT IF EXISTS campaigns_campaign_id_key;

ALTER TABLE campaigns
ADD CONSTRAINT campaigns_campaign_id_key UNIQUE (campaign_id);

-- ============================================================================
-- STEP 3: CREATE HELPER FUNCTIONS - Safe UUID/text operations
-- ============================================================================

-- Function to safely cast text to UUID
CREATE OR REPLACE FUNCTION public.cast_to_uuid(text_val text)
RETURNS uuid AS $$
BEGIN
    RETURN text_val::uuid;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to safely compare UUID with text
CREATE OR REPLACE FUNCTION public.safe_uuid_text_compare(uuid_val uuid, text_val text)
RETURNS boolean AS $$
BEGIN
    -- Check if text_val is a valid UUID format
    IF text_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN uuid_val = text_val::uuid;
    ELSE
        RETURN FALSE;
    END IF;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STEP 4: CREATE RPC FUNCTIONS - Avoid frontend UUID comparison issues
-- ============================================================================

-- Main function to get campaigns for a specific account
-- This avoids the UUID comparison issue by handling it in the database
CREATE OR REPLACE FUNCTION public.get_campaigns_for_account(
    p_account_id text,
    p_user_id text
)
RETURNS TABLE (
    id uuid,
    ad_account_id uuid,
    campaign_id text,
    name text,
    status text,
    objective text,
    buying_type text,
    budget_remaining numeric,
    daily_budget numeric,
    lifetime_budget numeric,
    bid_strategy text,
    created_time timestamptz,
    updated_time timestamptz,
    start_time timestamptz,
    stop_time timestamptz,
    is_active boolean,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.ad_account_id,
        c.campaign_id,
        c.name,
        c.status,
        c.objective,
        c.buying_type,
        c.budget_remaining,
        c.daily_budget,
        c.lifetime_budget,
        c.bid_strategy,
        c.created_time,
        c.updated_time,
        c.start_time,
        c.stop_time,
        c.is_active,
        c.created_at,
        c.updated_at
    FROM campaigns c
    JOIN meta_ad_accounts ma ON ma.id = c.ad_account_id
    WHERE ma.account_id = p_account_id
    AND ma.user_id = p_user_id
    ORDER BY c.created_time DESC;
END;
$$;

-- Function to safely get ad account by account_id
CREATE OR REPLACE FUNCTION public.get_ad_account_by_id(
    p_account_id text,
    p_user_id text
)
RETURNS TABLE (
    id uuid,
    user_id text,
    account_id text,
    account_name text,
    currency text,
    timezone_name text,
    status text,
    spend_cap integer,
    is_active boolean,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ma.id,
        ma.user_id,
        ma.account_id,
        COALESCE(ma.account_name, 'Unknown Account') as account_name,
        ma.currency,
        ma.timezone_name,
        ma.status,
        ma.spend_cap,
        ma.is_active,
        ma.created_at,
        ma.updated_at
    FROM meta_ad_accounts ma
    WHERE ma.account_id = p_account_id
    AND ma.user_id = p_user_id
    LIMIT 1;
END;
$$;

-- Function to get all campaigns with account info
CREATE OR REPLACE FUNCTION public.get_campaigns_with_account_info(
    p_user_id text
)
RETURNS TABLE (
    campaign_id uuid,
    campaign_name text,
    campaign_status text,
    campaign_objective text,
    account_id text,
    account_name text,
    daily_budget numeric,
    lifetime_budget numeric,
    created_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as campaign_id,
        c.name as campaign_name,
        c.status as campaign_status,
        c.objective as campaign_objective,
        ma.account_id,
        COALESCE(ma.account_name, 'Unknown Account') as account_name,
        c.daily_budget,
        c.lifetime_budget,
        c.created_time
    FROM campaigns c
    JOIN meta_ad_accounts ma ON ma.id = c.ad_account_id
    WHERE ma.user_id = p_user_id
    ORDER BY c.created_time DESC;
END;
$$;

-- ============================================================================
-- STEP 5: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_campaigns_for_account(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ad_account_by_id(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaigns_with_account_info(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_to_uuid(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_uuid_text_compare(uuid, text) TO authenticated;

-- ============================================================================
-- STEP 6: CREATE HELPER VIEW - Alternative approach
-- ============================================================================

-- Create a view that handles the casting and joins safely
-- Using COALESCE to handle potential NULL account_name values
CREATE OR REPLACE VIEW public.campaigns_with_accounts AS
SELECT 
    c.*,
    ma.account_id as meta_account_id,
    COALESCE(ma.account_name, 'Unknown Account') as meta_account_name,
    ma.user_id
FROM campaigns c
JOIN meta_ad_accounts ma ON ma.id = c.ad_account_id;

-- Grant access to the view
GRANT SELECT ON public.campaigns_with_accounts TO authenticated;

-- Enable RLS on the view
ALTER VIEW public.campaigns_with_accounts SET (security_invoker = on);

-- ============================================================================
-- STEP 7: TEST THE FIX
-- ============================================================================

-- Test 1: Check if we can query meta_ad_accounts without issues
SELECT 
    id::text as id,
    account_id,
    user_id,
    COALESCE(account_name, 'No Name') as account_name
FROM meta_ad_accounts
WHERE user_id = auth.uid()::text
LIMIT 3;

-- Test 2: Check if we can query campaigns without issues
SELECT 
    c.id::text as campaign_id,
    c.name,
    c.status,
    ma.account_id as meta_account_id,
    COALESCE(ma.account_name, 'Unknown Account') as account_name
FROM campaigns c
JOIN meta_ad_accounts ma ON ma.id = c.ad_account_id
WHERE ma.user_id = auth.uid()::text
LIMIT 3;

-- Test 3: Test the RPC function
-- Replace 'YOUR_ACCOUNT_ID' with an actual account ID from your data
-- SELECT * FROM get_campaigns_for_account('YOUR_ACCOUNT_ID', auth.uid());

-- ============================================================================
-- STEP 8: CLEANUP AND OPTIMIZATION
-- ============================================================================

-- Refresh statistics for query planner
ANALYZE meta_ad_accounts;
ANALYZE campaigns;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Final check: Show the current constraint status
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('meta_ad_accounts', 'campaigns')
AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name, tc.constraint_name;

-- Check RLS policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('meta_ad_accounts', 'campaigns')
ORDER BY tablename, policyname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

-- Show available columns in meta_ad_accounts to verify the fix
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'meta_ad_accounts'
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'UUID comparison fix completed successfully! The following has been done:
1. Checked and added missing account_name column if needed
2. Fixed problematic unique constraints on campaigns table
3. Created helper functions for safe UUID/text operations  
4. Created RPC functions to avoid frontend type comparison issues
5. Created a campaigns_with_accounts view with safe column references
6. Granted proper permissions to authenticated users
7. Used COALESCE to handle potential NULL values safely

Your app should now work without UUID comparison errors!' as success_message;
