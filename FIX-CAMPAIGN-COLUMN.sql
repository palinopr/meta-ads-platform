-- Fix the safe_get_campaigns function to use correct column name
-- The campaigns table uses 'account_id' not 'ad_account_id'

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
    
    -- Get campaigns directly by account_id (not ad_account_id!)
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

SELECT 'Campaign column name fixed!' as status;
