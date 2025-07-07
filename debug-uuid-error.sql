-- Debug UUID = text error comprehensively

-- 1. Check ALL foreign key constraints that might be comparing UUID to text
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f' -- foreign key constraints
AND (conrelid::regclass::text LIKE '%meta_ad_accounts%' 
     OR confrelid::regclass::text LIKE '%meta_ad_accounts%'
     OR pg_get_constraintdef(oid)::text LIKE '%user_id%');

-- 2. Check if there are any CHECK constraints
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'c' -- check constraints
AND conrelid::regclass::text LIKE '%meta_ad_accounts%';

-- 3. Look for indexes that might be causing issues
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'meta_ad_accounts';

-- 4. Check if there are any triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'meta_ad_accounts';

-- 5. Check the auth schema for any functions that might be returning wrong type
SELECT 
    p.proname AS function_name,
    pg_get_function_result(p.oid) AS return_type,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'auth'
AND p.proname IN ('uid', 'jwt', 'role');

-- 6. Check the exact error by trying different operations
-- First, check if we can select with explicit casting
SELECT * FROM public.meta_ad_accounts 
WHERE user_id = (SELECT auth.uid())::uuid 
LIMIT 1;

-- 7. Check if the error is in a view
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND definition LIKE '%meta_ad_accounts%';

-- 8. Check default values on columns
SELECT 
    column_name,
    column_default,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'meta_ad_accounts'
AND column_default IS NOT NULL;

-- 9. Most importantly - check if auth.uid() is actually returning text
SELECT 
    auth.uid() AS uid_value,
    pg_typeof(auth.uid()) AS uid_type;

-- 10. Try a direct comparison test
DO $$
DECLARE
    v_uid text;
    v_uuid uuid;
BEGIN
    v_uid := auth.uid();
    v_uuid := v_uid::uuid;
    RAISE NOTICE 'uid as text: %, uid as uuid: %', v_uid, v_uuid;
END $$;