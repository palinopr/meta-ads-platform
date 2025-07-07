-- Create RPC functions to handle UUID/text comparison issues
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql/new

-- Create a function to get campaigns for a specific account
-- This avoids the UUID comparison issue by handling it in the database
CREATE OR REPLACE FUNCTION public.get_campaigns_for_account(
    p_account_id text,
    p_user_id uuid
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_campaigns_for_account(text, uuid) TO authenticated;

-- Create a function to safely get ad account by account_id
CREATE OR REPLACE FUNCTION public.get_ad_account_by_id(
    p_account_id text,
    p_user_id uuid
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
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
        ma.account_name,
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_ad_account_by_id(text, uuid) TO authenticated;

-- Alternative: Create a simpler workaround by updating the frontend to use a different query approach
-- This function returns campaigns with account info joined
CREATE OR REPLACE FUNCTION public.get_campaigns_with_account_info(
    p_user_id uuid
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
        ma.account_name,
        c.daily_budget,
        c.lifetime_budget,
        c.created_time
    FROM campaigns c
    JOIN meta_ad_accounts ma ON ma.id = c.ad_account_id
    WHERE ma.user_id = p_user_id
    ORDER BY c.created_time DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_campaigns_with_account_info(uuid) TO authenticated;

-- Test the functions
-- You can run these to verify they work:
/*
-- Test get_campaigns_for_account
SELECT * FROM get_campaigns_for_account('YOUR_ACCOUNT_ID_HERE', auth.uid());

-- Test get_ad_account_by_id
SELECT * FROM get_ad_account_by_id('YOUR_ACCOUNT_ID_HERE', auth.uid());

-- Test get_campaigns_with_account_info
SELECT * FROM get_campaigns_with_account_info(auth.uid());
*/
