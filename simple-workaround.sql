-- SIMPLE WORKAROUND: Use security definer functions for all operations

-- 1. Function to get current user's UUID properly
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid AS $$
DECLARE
    v_uid text;
    v_uuid uuid;
BEGIN
    v_uid := auth.uid();
    
    -- Return null if no user
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Try to cast to UUID
    BEGIN
        v_uuid := v_uid::uuid;
        RETURN v_uuid;
    EXCEPTION WHEN OTHERS THEN
        -- If cast fails, try removing any extra characters
        v_uid := replace(v_uid, '-', '');
        IF length(v_uid) = 32 THEN
            -- Re-format as UUID
            v_uid := substr(v_uid, 1, 8) || '-' || 
                     substr(v_uid, 9, 4) || '-' || 
                     substr(v_uid, 13, 4) || '-' || 
                     substr(v_uid, 17, 4) || '-' || 
                     substr(v_uid, 21, 12);
            RETURN v_uid::uuid;
        END IF;
        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Simple function to check if user owns an account
CREATE OR REPLACE FUNCTION user_owns_account(p_account_id text)
RETURNS boolean AS $$
DECLARE
    v_user_id uuid;
    v_exists boolean;
BEGIN
    v_user_id := get_current_user_id();
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT EXISTS(
        SELECT 1 
        FROM public.meta_ad_accounts
        WHERE account_id = p_account_id
        AND user_id = v_user_id
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Function to insert account without RLS issues
CREATE OR REPLACE FUNCTION safe_insert_ad_account(
    p_account_id text,
    p_account_name text,
    p_currency text DEFAULT 'USD',
    p_status text DEFAULT 'ACTIVE',
    p_is_active boolean DEFAULT true
) RETURNS json AS $$
DECLARE
    v_user_id uuid;
    v_result meta_ad_accounts;
BEGIN
    v_user_id := get_current_user_id();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'No authenticated user');
    END IF;
    
    -- Try to insert
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
    ) 
    ON CONFLICT (user_id, account_id) DO UPDATE
    SET 
        account_name = EXCLUDED.account_name,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
    RETURNING * INTO v_result;
    
    RETURN json_build_object(
        'success', true,
        'data', row_to_json(v_result)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to get campaigns safely
CREATE OR REPLACE FUNCTION safe_get_campaigns(p_account_id text)
RETURNS json AS $$
DECLARE
    v_user_id uuid;
    v_ad_account_id uuid;
    v_campaigns json;
BEGIN
    v_user_id := get_current_user_id();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'No authenticated user', 'data', '[]'::json);
    END IF;
    
    -- Get ad account id
    SELECT id INTO v_ad_account_id
    FROM public.meta_ad_accounts
    WHERE account_id = p_account_id
    AND user_id = v_user_id
    LIMIT 1;
    
    IF v_ad_account_id IS NULL THEN
        RETURN json_build_object('error', 'Account not found', 'data', '[]'::json);
    END IF;
    
    -- Get campaigns
    SELECT json_agg(c.* ORDER BY c.created_time DESC) INTO v_campaigns
    FROM public.campaigns c
    WHERE c.ad_account_id = v_ad_account_id;
    
    RETURN json_build_object(
        'success', true,
        'data', COALESCE(v_campaigns, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_owns_account(text) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_insert_ad_account(text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_get_campaigns(text) TO authenticated;

-- 6. Test the functions
SELECT get_current_user_id() as current_user_id;
SELECT safe_insert_ad_account('test-123', 'Test Account') as insert_result;
SELECT safe_get_campaigns('test-123') as campaigns_result;

SELECT 'Simple workaround functions created successfully!' as status;