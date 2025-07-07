-- Comprehensive fix for ALL RLS policies that might have UUID vs text issues

-- 1. First, let's check what policies exist
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public';

-- 2. Drop ALL policies on meta_ad_accounts (using CASCADE to handle dependencies)
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'meta_ad_accounts'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.meta_ad_accounts', pol.policyname);
    END LOOP;
END $$;

-- 3. Drop policies on other tables that might have user_id comparisons
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT DISTINCT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (qual::text LIKE '%user_id%' OR with_check::text LIKE '%user_id%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 4. Recreate policies for meta_ad_accounts with explicit casting
CREATE POLICY "Users can view own ad accounts" ON public.meta_ad_accounts
    FOR SELECT USING ((auth.uid())::uuid = user_id);

CREATE POLICY "Users can insert own ad accounts" ON public.meta_ad_accounts
    FOR INSERT WITH CHECK ((auth.uid())::uuid = user_id);

CREATE POLICY "Users can update own ad accounts" ON public.meta_ad_accounts
    FOR UPDATE USING ((auth.uid())::uuid = user_id);

CREATE POLICY "Users can delete own ad accounts" ON public.meta_ad_accounts
    FOR DELETE USING ((auth.uid())::uuid = user_id);

-- 5. Check and recreate policies for campaigns table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;
        DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.campaigns;
        DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
        DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;
        
        -- Create new policies with proper casting
        CREATE POLICY "Users can view own campaigns" ON public.campaigns
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.meta_ad_accounts 
                    WHERE meta_ad_accounts.id = campaigns.ad_account_id 
                    AND (auth.uid())::uuid = meta_ad_accounts.user_id
                )
            );
            
        CREATE POLICY "Users can insert own campaigns" ON public.campaigns
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.meta_ad_accounts 
                    WHERE meta_ad_accounts.id = campaigns.ad_account_id 
                    AND (auth.uid())::uuid = meta_ad_accounts.user_id
                )
            );
            
        CREATE POLICY "Users can update own campaigns" ON public.campaigns
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.meta_ad_accounts 
                    WHERE meta_ad_accounts.id = campaigns.ad_account_id 
                    AND (auth.uid())::uuid = meta_ad_accounts.user_id
                )
            );
            
        CREATE POLICY "Users can delete own campaigns" ON public.campaigns
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM public.meta_ad_accounts 
                    WHERE meta_ad_accounts.id = campaigns.ad_account_id 
                    AND (auth.uid())::uuid = meta_ad_accounts.user_id
                )
            );
    END IF;
END $$;

-- 6. Fix profiles table policies if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
        
        -- Recreate with proper casting
        CREATE POLICY "Users can view own profile" ON public.profiles
            FOR SELECT USING ((auth.uid())::uuid = id);
            
        CREATE POLICY "Users can update own profile" ON public.profiles
            FOR UPDATE USING ((auth.uid())::uuid = id);
            
        CREATE POLICY "Users can insert own profile" ON public.profiles
            FOR INSERT WITH CHECK ((auth.uid())::uuid = id);
    END IF;
END $$;

-- 7. Verify the fix
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. Test with a simple insert (you'll need to replace the user_id)
-- First get a user ID
SELECT id, email FROM auth.users LIMIT 1;