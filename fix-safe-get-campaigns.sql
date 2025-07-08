-- Fix the safe_get_campaigns function to match the actual table structure

-- First, let's check the actual campaigns table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'campaigns'
ORDER BY ordinal_position;

-- Drop the old function
DROP FUNCTION IF EXISTS safe_get_campaigns(text);

-- Create updated function that matches the actual table structure
CREATE OR REPLACE FUNCTION safe_get_campaigns(p_account_id text)
RETURNS json AS $$
DECLARE
    v_user_id uuid;
    v_campaigns json;
BEGIN
    v_user_id := get_current_user_id();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'No authenticated user', 'data', '[]'::json);
    END IF;
    
    -- Get campaigns directly (campaigns table now has account_id as TEXT)
    SELECT json_agg(c.* ORDER BY c.created_time DESC) INTO v_campaigns
    FROM public.campaigns c
    WHERE c.account_id = p_account_id
    AND c.user_id = v_user_id;
    
    RETURN json_build_object(
        'success', true,
        'data', COALESCE(v_campaigns, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION safe_get_campaigns(text) TO authenticated;

-- Also update the get_campaigns_for_account function
DROP FUNCTION IF EXISTS get_campaigns_for_account(text);

CREATE OR REPLACE FUNCTION get_campaigns_for_account(p_account_id text)
RETURNS TABLE (
    id uuid,
    account_id text,
    user_id uuid,
    campaign_id text,
    name text,
    status text,
    objective text,
    daily_budget numeric,
    lifetime_budget numeric,
    created_time timestamp with time zone,
    start_time timestamp with time zone,
    stop_time timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
) AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Get current user ID with explicit casting
    v_user_id := get_current_user_id();
    
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Return campaigns for this account and user
    RETURN QUERY
    SELECT c.id, c.account_id, c.user_id, c.campaign_id, c.name, c.status, 
           c.objective, c.daily_budget, c.lifetime_budget, c.created_time, 
           c.start_time, c.stop_time, c.created_at, c.updated_at
    FROM public.campaigns c
    WHERE c.account_id = p_account_id
    AND c.user_id = v_user_id
    ORDER BY c.created_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_campaigns_for_account(text) TO authenticated;

-- Test the functions
SELECT safe_get_campaigns('787610255314938');
SELECT * FROM get_campaigns_for_account('787610255314938') LIMIT 5;

SELECT 'Functions updated successfully!' as status;