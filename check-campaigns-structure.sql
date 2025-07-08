-- Check the actual campaigns table structure to understand the issue

-- 1. Check if campaigns table exists and its structure
SELECT 'CAMPAIGNS TABLE STRUCTURE' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'campaigns'
ORDER BY ordinal_position;

-- 2. Check constraints on campaigns table
SELECT 'CAMPAIGNS CONSTRAINTS' as info;
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.campaigns'::regclass;

-- 3. Check sample data
SELECT 'SAMPLE CAMPAIGNS DATA' as info;
SELECT 
    id,
    account_id,
    user_id,
    campaign_id,
    name,
    status
FROM campaigns
LIMIT 5;

-- 4. Count campaigns by account
SELECT 'CAMPAIGNS BY ACCOUNT' as info;
SELECT 
    account_id,
    COUNT(*) as campaign_count
FROM campaigns
GROUP BY account_id
ORDER BY campaign_count DESC
LIMIT 10;