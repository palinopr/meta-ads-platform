-- Fix UUID comparison issues in meta_ad_accounts and campaigns tables
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql/new

-- First, let's check the data types of the columns
SELECT 
    table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('meta_ad_accounts', 'campaigns', 'profiles')
AND column_name IN ('id', 'user_id', 'account_id', 'ad_account_id', 'campaign_id')
ORDER BY table_name, ordinal_position;

-- If account_id or user_id are UUID type but being compared with text,
-- we need to ensure proper casting or change the column type

-- Option 1: If account_id should be text (Facebook account IDs are strings)
-- Check current type first
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'meta_ad_accounts' 
AND column_name = 'account_id';

-- If it's UUID but should be TEXT, convert it:
-- ALTER TABLE public.meta_ad_accounts 
-- ALTER COLUMN account_id TYPE TEXT USING account_id::TEXT;

-- Option 2: Create a function to handle the comparison safely
CREATE OR REPLACE FUNCTION public.safe_uuid_compare(uuid_val uuid, text_val text)
RETURNS boolean AS $$
BEGIN
    -- Try to cast the text to uuid
    BEGIN
        RETURN uuid_val = text_val::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
        -- If casting fails, return false
        RETURN false;
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Option 3: Check if we're comparing the right columns
-- The issue might be in the RLS policies or in the queries
-- Let's check the RLS policies
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
WHERE tablename IN ('meta_ad_accounts', 'campaigns')
ORDER BY tablename, policyname;
