-- FINAL COMPREHENSIVE FIX FOR ALL UUID/TEXT COMPARISON ISSUES

-- 1. Drop any existing problematic policies
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies that might have UUID comparison issues
    FOR r IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN ('meta_ad_accounts', 'campaigns', 'profiles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. Create a bulletproof auth check function
CREATE OR REPLACE FUNCTION safe_auth_check(check_id uuid) 
RETURNS boolean AS $$
DECLARE
    current_uid text;
BEGIN
    -- Get current user ID as text
    current_uid := auth.uid();
    
    -- Handle null cases
    IF current_uid IS NULL OR check_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Compare with proper casting
    RETURN check_id = current_uid::uuid;
EXCEPTION 
    WHEN invalid_text_representation THEN
        RETURN FALSE;
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Create reverse function for text columns
CREATE OR REPLACE FUNCTION safe_auth_check_text(check_id text) 
RETURNS boolean AS $$
DECLARE
    current_uid text;
BEGIN
    -- Get current user ID as text
    current_uid := auth.uid();
    
    -- Handle null cases
    IF current_uid IS NULL OR check_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Direct text comparison
    RETURN check_id = current_uid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION safe_auth_check(uuid) TO public;
GRANT EXECUTE ON FUNCTION safe_auth_check_text(text) TO public;

-- 5. Create RLS policies for meta_ad_accounts using safe function
CREATE POLICY "meta_ad_accounts_select" ON public.meta_ad_accounts
    FOR SELECT USING (safe_auth_check(user_id));

CREATE POLICY "meta_ad_accounts_insert" ON public.meta_ad_accounts
    FOR INSERT WITH CHECK (safe_auth_check(user_id));

CREATE POLICY "meta_ad_accounts_update" ON public.meta_ad_accounts
    FOR UPDATE USING (safe_auth_check(user_id));

CREATE POLICY "meta_ad_accounts_delete" ON public.meta_ad_accounts
    FOR DELETE USING (safe_auth_check(user_id));

-- 6. Create campaigns table if not exists
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

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for campaigns
CREATE POLICY "campaigns_select" ON public.campaigns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.meta_ad_accounts 
            WHERE meta_ad_accounts.id = campaigns.ad_account_id 
            AND safe_auth_check(meta_ad_accounts.user_id)
        )
    );

CREATE POLICY "campaigns_insert" ON public.campaigns
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meta_ad_accounts 
            WHERE meta_ad_accounts.id = campaigns.ad_account_id 
            AND safe_auth_check(meta_ad_accounts.user_id)
        )
    );

CREATE POLICY "campaigns_update" ON public.campaigns
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.meta_ad_accounts 
            WHERE meta_ad_accounts.id = campaigns.ad_account_id 
            AND safe_auth_check(meta_ad_accounts.user_id)
        )
    );

CREATE POLICY "campaigns_delete" ON public.campaigns
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.meta_ad_accounts 
            WHERE meta_ad_accounts.id = campaigns.ad_account_id 
            AND safe_auth_check(meta_ad_accounts.user_id)
        )
    );

-- 8. If profiles table exists, fix its policies too
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        
        CREATE POLICY "profiles_select" ON public.profiles
            FOR SELECT USING (safe_auth_check(id));
            
        CREATE POLICY "profiles_update" ON public.profiles
            FOR UPDATE USING (safe_auth_check(id));
            
        CREATE POLICY "profiles_insert" ON public.profiles
            FOR INSERT WITH CHECK (safe_auth_check(id));
    END IF;
END $$;

-- 9. Create helper view for debugging
CREATE OR REPLACE VIEW my_ad_accounts AS
SELECT * FROM public.meta_ad_accounts
WHERE safe_auth_check(user_id);

-- Grant access to the view
GRANT SELECT ON my_ad_accounts TO authenticated;

-- 10. Test the setup
DO $$
DECLARE
    v_count integer;
BEGIN
    -- This should work without errors
    SELECT COUNT(*) INTO v_count FROM my_ad_accounts;
    RAISE NOTICE 'Current user has % ad accounts', v_count;
    
    -- Test the safe functions
    RAISE NOTICE 'Current user ID: %', get_current_user_id();
    RAISE NOTICE 'Auth check test: %', safe_auth_check(get_current_user_id());
END $$;

SELECT 'Comprehensive fix applied successfully!' as status;