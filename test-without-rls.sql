-- Test approach: Temporarily disable RLS to isolate the issue

-- 1. Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'meta_ad_accounts';

-- 2. Temporarily disable RLS (for testing only!)
-- ALTER TABLE public.meta_ad_accounts DISABLE ROW LEVEL SECURITY;

-- 3. Try a direct insert (replace with your actual user ID)
-- Get user ID first:
SELECT id, email FROM auth.users LIMIT 1;

-- Then test insert:
/*
INSERT INTO public.meta_ad_accounts (
    user_id,
    account_id,
    account_name,
    currency,
    timezone_name,
    status,
    is_active
) VALUES (
    'YOUR-USER-UUID-HERE'::uuid,
    'test-account-' || gen_random_uuid()::text,
    'Test Account Without RLS',
    'USD',
    'UTC',
    'ACTIVE',
    true
) RETURNING *;
*/

-- 4. Re-enable RLS after testing
-- ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;

-- 5. Alternative: Create a function that handles the insert with proper casting
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

-- Test the function
-- SELECT insert_meta_ad_account('787610255314938', 'Test Account via Function');