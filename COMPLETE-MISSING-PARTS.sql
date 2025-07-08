-- Complete the database rebuild with missing parts
-- Run this in Supabase SQL Editor

-- 1. Add missing columns to meta_ad_accounts table
ALTER TABLE public.meta_ad_accounts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS timezone_name TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Create the missing RPC function for inserting ad accounts
CREATE OR REPLACE FUNCTION insert_meta_ad_account(
    p_account_id text,
    p_account_name text,
    p_currency text DEFAULT 'USD',
    p_status text DEFAULT 'ACTIVE',
    p_is_active boolean DEFAULT true
) RETURNS meta_ad_accounts AS $$
DECLARE
    v_user_id uuid;
    v_result meta_ad_accounts;
BEGIN
    -- Get the current user's ID with explicit casting
    v_user_id := (auth.uid())::uuid;
    
    -- Insert the account
    INSERT INTO public.meta_ad_accounts (
        user_id,
        account_id,
        account_name,
        currency,
        timezone_name,
        status,
        is_active
    ) VALUES (
        v_user_id,
        p_account_id,
        p_account_name,
        p_currency,
        'UTC',
        p_status,
        p_is_active
    ) RETURNING * INTO v_result;
    
    RETURN v_result;
EXCEPTION
    WHEN unique_violation THEN
        -- If account already exists, update it
        UPDATE public.meta_ad_accounts
        SET 
            account_name = p_account_name,
            currency = p_currency,
            status = p_status,
            is_active = p_is_active,
            updated_at = CURRENT_TIMESTAMP
        WHERE account_id = p_account_id AND user_id = v_user_id
        RETURNING * INTO v_result;
        
        RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_meta_ad_account TO authenticated;

-- 3. Create function to get dashboard metrics
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_user_id uuid)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_campaigns', COALESCE((SELECT COUNT(*) FROM campaigns WHERE user_id = p_user_id), 0),
        'total_spend', COALESCE((SELECT SUM(spend::numeric) FROM campaign_insights WHERE user_id = p_user_id), 0),
        'total_revenue', COALESCE((SELECT SUM(revenue::numeric) FROM campaign_insights WHERE user_id = p_user_id), 0),
        'total_impressions', COALESCE((SELECT SUM(impressions::bigint) FROM campaign_insights WHERE user_id = p_user_id), 0),
        'total_clicks', COALESCE((SELECT SUM(clicks::bigint) FROM campaign_insights WHERE user_id = p_user_id), 0),
        'avg_cpc', COALESCE((SELECT AVG(cpc::numeric) FROM campaign_insights WHERE user_id = p_user_id AND cpc::numeric > 0), 0),
        'avg_cpm', COALESCE((SELECT AVG(cpm::numeric) FROM campaign_insights WHERE user_id = p_user_id AND cpm::numeric > 0), 0),
        'avg_ctr', COALESCE((SELECT AVG(ctr::numeric) FROM campaign_insights WHERE user_id = p_user_id AND ctr::numeric > 0), 0)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_dashboard_metrics TO authenticated;

-- 4. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_user_status ON meta_ad_accounts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_account_status ON campaigns(account_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_user_date ON campaign_insights(user_id, date_start);

-- 5. Verify the fix
SELECT 'Tables and functions created successfully!' as status;

-- Check if the status column exists now
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'meta_ad_accounts' 
AND column_name = 'status';

-- Check if the function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'insert_meta_ad_account';

-- Show sample of meta_ad_accounts structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'meta_ad_accounts'
ORDER BY ordinal_position;
