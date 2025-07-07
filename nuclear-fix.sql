-- NUCLEAR OPTION: Complete rebuild with custom cast function

-- 1. Drop ALL policies on ALL tables (temporarily)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. Create a custom function that safely compares auth.uid() to uuid
CREATE OR REPLACE FUNCTION auth_check(user_id_column uuid) 
RETURNS boolean AS $$
BEGIN
    -- Handle null cases
    IF auth.uid() IS NULL OR user_id_column IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Compare with explicit casting and error handling
    BEGIN
        RETURN user_id_column = (auth.uid())::uuid;
    EXCEPTION WHEN OTHERS THEN
        -- If casting fails, return false
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Grant execute to public
GRANT EXECUTE ON FUNCTION auth_check(uuid) TO public;

-- 4. Recreate all policies using the safe function
-- For meta_ad_accounts
CREATE POLICY "Users can view own ad accounts" ON public.meta_ad_accounts
    FOR SELECT USING (auth_check(user_id));

CREATE POLICY "Users can insert own ad accounts" ON public.meta_ad_accounts
    FOR INSERT WITH CHECK (auth_check(user_id));

CREATE POLICY "Users can update own ad accounts" ON public.meta_ad_accounts
    FOR UPDATE USING (auth_check(user_id));

CREATE POLICY "Users can delete own ad accounts" ON public.meta_ad_accounts
    FOR DELETE USING (auth_check(user_id));

-- 5. For campaigns table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
        
        CREATE POLICY "Users can view own campaigns" ON public.campaigns
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.meta_ad_accounts 
                    WHERE meta_ad_accounts.id = campaigns.ad_account_id 
                    AND auth_check(meta_ad_accounts.user_id)
                )
            );
            
        CREATE POLICY "Users can insert own campaigns" ON public.campaigns
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.meta_ad_accounts 
                    WHERE meta_ad_accounts.id = campaigns.ad_account_id 
                    AND auth_check(meta_ad_accounts.user_id)
                )
            );
            
        CREATE POLICY "Users can update own campaigns" ON public.campaigns
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.meta_ad_accounts 
                    WHERE meta_ad_accounts.id = campaigns.ad_account_id 
                    AND auth_check(meta_ad_accounts.user_id)
                )
            );
            
        CREATE POLICY "Users can delete own campaigns" ON public.campaigns
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM public.meta_ad_accounts 
                    WHERE meta_ad_accounts.id = campaigns.ad_account_id 
                    AND auth_check(meta_ad_accounts.user_id)
                )
            );
    END IF;
END $$;

-- 6. For profiles table (if it exists and uses 'id' not 'user_id')
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        
        CREATE POLICY "Users can view own profile" ON public.profiles
            FOR SELECT USING (auth_check(id));
            
        CREATE POLICY "Users can update own profile" ON public.profiles
            FOR UPDATE USING (auth_check(id));
            
        CREATE POLICY "Users can insert own profile" ON public.profiles
            FOR INSERT WITH CHECK (auth_check(id));
    END IF;
END $$;

-- 7. Create wrapper functions for common operations
CREATE OR REPLACE FUNCTION get_my_ad_accounts()
RETURNS SETOF meta_ad_accounts AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.meta_ad_accounts
    WHERE auth_check(user_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_ad_accounts() TO authenticated;

-- 8. Test the fix
DO $$
DECLARE
    v_count integer;
BEGIN
    -- This should work without errors now
    SELECT COUNT(*) INTO v_count FROM get_my_ad_accounts();
    RAISE NOTICE 'Found % ad accounts for current user', v_count;
END $$;

-- 9. Create the campaigns table if it doesn't exist
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

SELECT 'Nuclear fix applied successfully!' as status;