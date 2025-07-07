-- Complete fix for meta_ad_accounts table constraints
-- Run this entire script in Supabase SQL Editor

-- 1. First, check current constraints
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.meta_ad_accounts'::regclass;

-- 2. Drop ALL unique constraints on account_id
ALTER TABLE public.meta_ad_accounts 
DROP CONSTRAINT IF EXISTS meta_ad_accounts_account_id_key;

ALTER TABLE public.meta_ad_accounts 
DROP CONSTRAINT IF EXISTS meta_ad_accounts_account_id_user_id_key;

-- 3. Add the correct composite unique constraint
ALTER TABLE public.meta_ad_accounts 
ADD CONSTRAINT meta_ad_accounts_user_account_unique 
UNIQUE (user_id, account_id);

-- 4. Verify the constraints again
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.meta_ad_accounts'::regclass;

-- 5. Check if RLS is enabled (it should be)
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'meta_ad_accounts';

-- 6. If RLS is not enabled, enable it
ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies if they don't exist
DROP POLICY IF EXISTS "Users can view own ad accounts" ON public.meta_ad_accounts;
CREATE POLICY "Users can view own ad accounts" ON public.meta_ad_accounts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ad accounts" ON public.meta_ad_accounts;
CREATE POLICY "Users can insert own ad accounts" ON public.meta_ad_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ad accounts" ON public.meta_ad_accounts;
CREATE POLICY "Users can update own ad accounts" ON public.meta_ad_accounts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ad accounts" ON public.meta_ad_accounts;
CREATE POLICY "Users can delete own ad accounts" ON public.meta_ad_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Check the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'meta_ad_accounts'
ORDER BY ordinal_position;