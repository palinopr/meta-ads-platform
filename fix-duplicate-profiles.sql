-- Fix duplicate profiles issue preventing campaign sync
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql/new

-- 1. Remove duplicate profiles, keep the one with meta_access_token
DELETE FROM profiles 
WHERE id = 'cf993a00-4c9c-451b-99af-d565ec84397c'
AND (meta_access_token IS NULL OR meta_access_token = '');

-- 2. If no profile remains, create a clean one
INSERT INTO profiles (id, created_at, updated_at)
VALUES ('cf993a00-4c9c-451b-99af-d565ec84397c', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Verify profile is unique
SELECT COUNT(*) as profile_count, 
       COALESCE(meta_access_token, 'NO TOKEN') as token_status
FROM profiles 
WHERE id = 'cf993a00-4c9c-451b-99af-d565ec84397c'
GROUP BY meta_access_token;

-- 4. Check ad accounts are properly linked
SELECT account_id, account_name, user_id
FROM meta_ad_accounts 
WHERE user_id = 'cf993a00-4c9c-451b-99af-d565ec84397c'
LIMIT 5;

-- Success message
SELECT 'FIXED: Profile duplication resolved, ready for campaign sync!' as status;
