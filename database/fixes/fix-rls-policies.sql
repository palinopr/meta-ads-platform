-- Fix for UUID vs text type casting error in RLS policies
-- This error occurs when auth.uid() (returns text) is compared to user_id (UUID column)

-- 1. First, check the current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'meta_ad_accounts';

-- 2. Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view own ad accounts" ON public.meta_ad_accounts;
DROP POLICY IF EXISTS "Users can insert own ad accounts" ON public.meta_ad_accounts;
DROP POLICY IF EXISTS "Users can update own ad accounts" ON public.meta_ad_accounts;
DROP POLICY IF EXISTS "Users can delete own ad accounts" ON public.meta_ad_accounts;

-- 3. Recreate RLS policies with explicit UUID casting
-- auth.uid() returns text, so we need to cast it to UUID
CREATE POLICY "Users can view own ad accounts" ON public.meta_ad_accounts
    FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert own ad accounts" ON public.meta_ad_accounts
    FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own ad accounts" ON public.meta_ad_accounts
    FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own ad accounts" ON public.meta_ad_accounts
    FOR DELETE USING (auth.uid()::uuid = user_id);

-- 4. Verify the new policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'meta_ad_accounts';

-- 5. Test insert with explicit type casting
-- Get a user ID first
SELECT id, email FROM auth.users LIMIT 1;

-- Then test insert (replace the user_id with actual UUID from above)
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
    'YOUR-USER-UUID-HERE'::uuid,  -- Note the explicit ::uuid cast
    '787610255314938',
    'Test Account',
    'USD',
    'America/New_York',
    'ACTIVE',
    true
);
*/

-- 6. Check data types to ensure user_id is UUID
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'meta_ad_accounts'
AND column_name = 'user_id';