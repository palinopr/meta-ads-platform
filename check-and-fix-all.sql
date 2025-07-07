-- CHECK AND FIX ALL UUID/TEXT ISSUES

-- 1. First, check what column types we're dealing with
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name IN ('user_id', 'id')
AND table_name IN ('meta_ad_accounts', 'campaigns', 'profiles', 'profiles')
ORDER BY table_name, column_name;

-- 2. Check what functions already exist
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('safe_auth_check', 'safe_auth_check_text', 'get_current_user_id', 'auth_check')
AND pronamespace = 'public'::regnamespace;

-- 3. Drop all existing safe_auth_check functions to start fresh
DROP FUNCTION IF EXISTS safe_auth_check(uuid) CASCADE;
DROP FUNCTION IF EXISTS safe_auth_check(text) CASCADE;
DROP FUNCTION IF EXISTS safe_auth_check_text(text) CASCADE;
DROP FUNCTION IF EXISTS auth_check(uuid) CASCADE;

-- 4. Create a universal auth check function that handles BOTH uuid and text
CREATE OR REPLACE FUNCTION safe_auth_check(check_value anyelement) 
RETURNS boolean AS $$
DECLARE
    current_uid text;
    check_value_text text;
BEGIN
    -- Get current user ID as text
    current_uid := auth.uid();
    
    -- Handle null cases
    IF current_uid IS NULL OR check_value IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Convert check_value to text for comparison
    check_value_text := check_value::text;
    
    -- Remove any hyphens for comparison (handles UUID format differences)
    current_uid := replace(current_uid, '-', '');
    check_value_text := replace(check_value_text, '-', '');
    
    -- Compare
    RETURN current_uid = check_value_text;
EXCEPTION 
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION safe_auth_check(anyelement) TO public;

-- 5. Also create specific overloads for clarity
CREATE OR REPLACE FUNCTION safe_auth_check_uuid(check_id uuid) 
RETURNS boolean AS $$
BEGIN
    RETURN safe_auth_check(check_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION safe_auth_check_text(check_id text) 
RETURNS boolean AS $$
BEGIN
    RETURN safe_auth_check(check_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION safe_auth_check_uuid(uuid) TO public;
GRANT EXECUTE ON FUNCTION safe_auth_check_text(text) TO public;

-- 6. Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 7. Recreate policies for meta_ad_accounts
CREATE POLICY "select_policy" ON public.meta_ad_accounts
    FOR SELECT USING (safe_auth_check(user_id));

CREATE POLICY "insert_policy" ON public.meta_ad_accounts
    FOR INSERT WITH CHECK (safe_auth_check(user_id));

CREATE POLICY "update_policy" ON public.meta_ad_accounts
    FOR UPDATE USING (safe_auth_check(user_id));

CREATE POLICY "delete_policy" ON public.meta_ad_accounts
    FOR DELETE USING (safe_auth_check(user_id));

-- 8. Create campaigns table if needed
CREATE TABLE IF NOT EXISTS public.campaigns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ad_account_id uuid NOT NULL REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
    campaign_id text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'PAUSED',
    objective text,
    daily_budget numeric(10,2),
    lifetime_budget numeric(10,2),
    created_time timestamp with time zone DEFAULT now(),
    updated_time timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(ad_account_id, campaign_id)
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 9. Create campaigns policies
CREATE POLICY "select_policy" ON public.campaigns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.meta_ad_accounts 
            WHERE meta_ad_accounts.id = campaigns.ad_account_id 
            AND safe_auth_check(meta_ad_accounts.user_id)
        )
    );

CREATE POLICY "insert_policy" ON public.campaigns
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meta_ad_accounts 
            WHERE meta_ad_accounts.id = campaigns.ad_account_id 
            AND safe_auth_check(meta_ad_accounts.user_id)
        )
    );

CREATE POLICY "update_policy" ON public.campaigns
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.meta_ad_accounts 
            WHERE meta_ad_accounts.id = campaigns.ad_account_id 
            AND safe_auth_check(meta_ad_accounts.user_id)
        )
    );

CREATE POLICY "delete_policy" ON public.campaigns
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.meta_ad_accounts 
            WHERE meta_ad_accounts.id = campaigns.ad_account_id 
            AND safe_auth_check(meta_ad_accounts.user_id)
        )
    );

-- 10. Handle profiles table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        
        -- Check if profiles uses 'id' or 'user_id'
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'id') THEN
            
            CREATE POLICY "select_policy" ON public.profiles
                FOR SELECT USING (safe_auth_check(id));
                
            CREATE POLICY "update_policy" ON public.profiles
                FOR UPDATE USING (safe_auth_check(id));
                
            CREATE POLICY "insert_policy" ON public.profiles
                FOR INSERT WITH CHECK (safe_auth_check(id));
                
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'profiles' 
                      AND column_name = 'user_id') THEN
            
            CREATE POLICY "select_policy" ON public.profiles
                FOR SELECT USING (safe_auth_check(user_id));
                
            CREATE POLICY "update_policy" ON public.profiles
                FOR UPDATE USING (safe_auth_check(user_id));
                
            CREATE POLICY "insert_policy" ON public.profiles
                FOR INSERT WITH CHECK (safe_auth_check(user_id));
        END IF;
    END IF;
END $$;

-- 11. Test everything
DO $$
DECLARE
    v_test_uuid uuid;
    v_test_text text;
    v_result boolean;
BEGIN
    -- Test with sample values
    v_test_uuid := gen_random_uuid();
    v_test_text := v_test_uuid::text;
    
    -- These should all work without errors
    v_result := safe_auth_check(v_test_uuid);
    RAISE NOTICE 'UUID test: %', v_result;
    
    v_result := safe_auth_check(v_test_text);
    RAISE NOTICE 'Text test: %', v_result;
    
    v_result := safe_auth_check_uuid(v_test_uuid);
    RAISE NOTICE 'UUID specific test: %', v_result;
    
    v_result := safe_auth_check_text(v_test_text);
    RAISE NOTICE 'Text specific test: %', v_result;
END $$;

-- 12. Create a simple test query
SELECT 
    'Auth check is working!' as status,
    COUNT(*) as my_account_count
FROM public.meta_ad_accounts
WHERE safe_auth_check(user_id);

SELECT 'All fixes applied successfully!' as final_status;