-- Diagnose and fix UUID comparison errors
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql/new

-- 1. Check the actual data types of all relevant columns
SELECT 
    table_name,
    column_name, 
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('meta_ad_accounts', 'campaigns', 'profiles')
AND column_name IN ('id', 'user_id', 'account_id', 'ad_account_id', 'campaign_id')
ORDER BY table_name, ordinal_position;

-- 2. Check current constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('meta_ad_accounts', 'campaigns')
ORDER BY tc.table_name, tc.constraint_type;

-- 3. Check if there's a type mismatch in any of the queries
-- This will show the RLS policies that might be causing the issue
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text,
    with_check::text
FROM pg_policies
WHERE tablename IN ('meta_ad_accounts', 'campaigns')
AND (qual::text LIKE '%=%' OR with_check::text LIKE '%=%')
ORDER BY tablename, policyname;

-- 4. Test a simple query to reproduce the error
-- This will help identify which exact comparison is failing
DO $$
DECLARE
    test_user_id uuid;
    test_account_id text;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    -- Test different queries to find the problematic one
    RAISE NOTICE 'Testing meta_ad_accounts query...';
    PERFORM * FROM meta_ad_accounts WHERE user_id = test_user_id LIMIT 1;
    RAISE NOTICE 'meta_ad_accounts query OK';
    
    -- Get a test account_id
    SELECT account_id INTO test_account_id FROM meta_ad_accounts LIMIT 1;
    
    IF test_account_id IS NOT NULL THEN
        RAISE NOTICE 'Testing account_id comparison...';
        PERFORM * FROM meta_ad_accounts WHERE account_id = test_account_id LIMIT 1;
        RAISE NOTICE 'account_id comparison OK';
    END IF;
    
    RAISE NOTICE 'All tests passed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error: % - %', SQLSTATE, SQLERRM;
END $$;

-- 5. The actual fix - ensure proper type casting in queries
-- If the issue is in the application code, we need to ensure proper casting
-- But we can also create helper functions to handle this

-- Create a safe comparison function for UUID to text
CREATE OR REPLACE FUNCTION public.safe_uuid_text_compare(uuid_val uuid, text_val text)
RETURNS boolean AS $$
BEGIN
    -- Check if text_val is a valid UUID format
    IF text_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN uuid_val = text_val::uuid;
    ELSE
        RETURN FALSE;
    END IF;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Check if the issue is in the Edge Function or frontend code
-- Run this query to see a sample of your data
SELECT 
    ma.id::text as id,
    ma.account_id,
    ma.user_id::text as user_id,
    (SELECT COUNT(*) FROM campaigns c WHERE c.ad_account_id = ma.id) as campaign_count
FROM meta_ad_accounts ma
WHERE ma.user_id = auth.uid()
LIMIT 5;

-- 7. Potential fix: Update the unique constraint if needed
-- The issue might be with the constraint on campaigns table
-- Check what constraint exists:
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'campaigns'::regclass 
AND contype = 'u';

-- 8. The main issue seems to be in the frontend code where it's comparing UUIDs with text
-- Let's check what exact query is failing by enabling statement logging temporarily
-- Run this to see recent errors:
SELECT 
    query,
    error_severity,
    message,
    detail,
    hint,
    query_start
FROM pg_stat_activity
WHERE state = 'idle in transaction (aborted)'
OR query LIKE '%uuid%text%'
ORDER BY query_start DESC
LIMIT 10;
