-- Test insert directly in SQL to debug the issue
-- Run this in Supabase SQL Editor

-- First, get a user ID to test with
SELECT id, email FROM auth.users LIMIT 1;

-- Then try to insert a test account (replace the user_id with the actual UUID from above)
-- Example:
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
    'YOUR-USER-UUID-HERE',  -- Replace with actual user ID
    '787610255314938',
    'Test Account',
    'USD',
    'America/New_York',
    'ACTIVE',
    true
);
*/

-- Check if the insert worked
SELECT * FROM public.meta_ad_accounts 
WHERE account_id = '787610255314938';

-- Debug: Check the exact data types of columns
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'meta_ad_accounts'
ORDER BY ordinal_position;