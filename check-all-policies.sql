-- Check ALL policies across ALL tables that might have UUID vs text issues

-- 1. First, check all RLS policies in the database
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
ORDER BY tablename, policyname;

-- 2. Check if there are any triggers or functions that might be causing the issue
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) LIKE '%user_id%';

-- 3. Check all constraints that involve user_id
SELECT 
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    pgc.consrc as constraint_definition
FROM information_schema.table_constraints tc
JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
WHERE tc.table_schema = 'public'
AND (pgc.consrc::text LIKE '%user_id%' OR tc.table_name = 'meta_ad_accounts');

-- 4. Check the exact column types for all tables with user_id
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'user_id'
ORDER BY table_name;

-- 5. Check if auth.uid() is being used anywhere else
SELECT 
    schemaname,
    tablename,
    policyname,
    qual,
    with_check
FROM pg_policies
WHERE (qual::text LIKE '%auth.uid()%' OR with_check::text LIKE '%auth.uid()%')
AND schemaname = 'public';

-- 6. Specifically check meta_ad_accounts policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'meta_ad_accounts';

-- 7. Check if there are any views that might be causing issues
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND view_definition LIKE '%user_id%';