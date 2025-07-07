-- Debug campaign sync issues
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql/new

-- 0. First check the actual structure of meta_ad_accounts table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'meta_ad_accounts'
ORDER BY ordinal_position;

-- 1. Check existing constraints on campaigns table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.campaigns'::regclass
ORDER BY conname;

-- 2. Check if there are any campaigns in the database
SELECT 
    COUNT(*) as total_campaigns,
    COUNT(DISTINCT ad_account_id) as unique_accounts
FROM public.campaigns;

-- 3. Check if meta_ad_accounts exist for the current user (without account_name for now)
SELECT 
    id,
    account_id,
    user_id
FROM public.meta_ad_accounts
WHERE user_id = auth.uid()
LIMIT 10;

-- 4. Check if there are any campaigns for your accounts
SELECT 
    c.id,
    c.campaign_id,
    c.name,
    c.status,
    c.ad_account_id,
    ma.account_id as meta_account_id
FROM public.campaigns c
JOIN public.meta_ad_accounts ma ON ma.id = c.ad_account_id
WHERE ma.user_id = auth.uid()
LIMIT 10;

-- 5. Check for any orphaned campaigns (campaigns without valid ad_account_id)
SELECT COUNT(*) as orphaned_campaigns
FROM public.campaigns c
WHERE NOT EXISTS (
    SELECT 1 FROM public.meta_ad_accounts ma 
    WHERE ma.id = c.ad_account_id
);

-- 6. Test RLS policies - try to insert a test campaign (will rollback)
BEGIN;
-- First get an ad account id
WITH account AS (
    SELECT id FROM public.meta_ad_accounts WHERE user_id = auth.uid() LIMIT 1
)
INSERT INTO public.campaigns (
    ad_account_id,
    campaign_id,
    name,
    status,
    objective,
    created_time
) 
SELECT 
    id,
    'test_campaign_' || extract(epoch from now())::text,
    'Test Campaign',
    'PAUSED',
    'LINK_CLICKS',
    now()
FROM account
RETURNING *;
ROLLBACK;
