-- 🔍 DIAGNOSTIC: Find UUID vs TEXT mismatches
-- Run this in Supabase Dashboard → SQL Editor to identify the exact problem

-- Check current data types in all relevant tables
SELECT 'TABLE SCHEMA ANALYSIS' as info;

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('meta_ad_accounts', 'campaigns', 'campaign_insights', 'profiles')
AND column_name IN ('account_id', 'user_id', 'campaign_id', 'id', 'meta_access_token')
ORDER BY table_name, column_name;

-- Check foreign key constraints
SELECT 'FOREIGN KEY CONSTRAINTS' as info;

SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('meta_ad_accounts', 'campaigns', 'campaign_insights');

-- Check if tables exist and their basic structure
SELECT 'TABLE EXISTENCE CHECK' as info;

SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('meta_ad_accounts', 'campaigns', 'campaign_insights', 'profiles')
ORDER BY table_name;

-- Sample data to identify actual type issues
SELECT 'SAMPLE DATA ANALYSIS' as info;

-- Check meta_ad_accounts
SELECT 'meta_ad_accounts sample:' as table_name;
SELECT account_id, user_id, pg_typeof(account_id) as account_id_type, pg_typeof(user_id) as user_id_type
FROM meta_ad_accounts 
LIMIT 3;

-- Check campaigns if exists
SELECT 'campaigns sample:' as table_name;
SELECT campaign_id, account_id, user_id, 
       pg_typeof(campaign_id) as campaign_id_type,
       pg_typeof(account_id) as account_id_type, 
       pg_typeof(user_id) as user_id_type
FROM campaigns 
LIMIT 3;

-- Check campaign_insights if exists  
SELECT 'campaign_insights sample:' as table_name;
SELECT campaign_id, account_id, user_id,
       pg_typeof(campaign_id) as campaign_id_type,
       pg_typeof(account_id) as account_id_type,
       pg_typeof(user_id) as user_id_type
FROM campaign_insights 
LIMIT 3;

-- Final diagnosis
SELECT 'DIAGNOSIS COMPLETE' as status,
       'Check the pg_typeof() results above to identify mismatched data types' as next_step;
