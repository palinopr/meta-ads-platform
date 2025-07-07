-- RUN THIS SQL IN SUPABASE TO FIX THE UUID vs TEXT ERROR
-- This creates RPC functions that handle type casting properly

-- 1. Function to insert/update meta ad accounts
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

-- 2. Function to get campaigns for a specific account
CREATE OR REPLACE FUNCTION get_campaigns_for_account(p_account_id text)
RETURNS SETOF campaigns AS $$
DECLARE
    v_user_id uuid;
    v_ad_account_id uuid;
BEGIN
    -- Get current user ID with explicit casting
    v_user_id := (auth.uid())::uuid;
    
    -- First get the ad account ID
    SELECT id INTO v_ad_account_id
    FROM public.meta_ad_accounts
    WHERE account_id = p_account_id
    AND user_id = v_user_id
    LIMIT 1;
    
    -- If no account found, return empty set
    IF v_ad_account_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Return campaigns for this ad account
    RETURN QUERY
    SELECT c.*
    FROM public.campaigns c
    WHERE c.ad_account_id = v_ad_account_id
    ORDER BY c.created_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_campaigns_for_account TO authenticated;

-- 3. Fix RLS policies with explicit casting
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own ad accounts" ON public.meta_ad_accounts;
DROP POLICY IF EXISTS "Users can insert own ad accounts" ON public.meta_ad_accounts;
DROP POLICY IF EXISTS "Users can update own ad accounts" ON public.meta_ad_accounts;
DROP POLICY IF EXISTS "Users can delete own ad accounts" ON public.meta_ad_accounts;

-- Recreate with explicit UUID casting
CREATE POLICY "Users can view own ad accounts" ON public.meta_ad_accounts
    FOR SELECT USING ((auth.uid())::uuid = user_id);

CREATE POLICY "Users can insert own ad accounts" ON public.meta_ad_accounts
    FOR INSERT WITH CHECK ((auth.uid())::uuid = user_id);

CREATE POLICY "Users can update own ad accounts" ON public.meta_ad_accounts
    FOR UPDATE USING ((auth.uid())::uuid = user_id);

CREATE POLICY "Users can delete own ad accounts" ON public.meta_ad_accounts
    FOR DELETE USING ((auth.uid())::uuid = user_id);

-- 4. Verify everything is working
SELECT 'Functions created successfully!' as status;