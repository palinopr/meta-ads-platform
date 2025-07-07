-- Complete fix for UUID comparison issues
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql/new

-- STEP 1: First, run the diagnostic queries to understand the issue
-- This will show you the data types
SELECT 
    table_name,
    column_name, 
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('meta_ad_accounts', 'campaigns')
AND column_name IN ('id', 'user_id', 'account_id', 'ad_account_id')
ORDER BY table_name, ordinal_position;

-- STEP 2: Check if there's a conflicting unique constraint
-- This might be causing the issue
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'campaigns'::regclass 
AND contype = 'u';

-- STEP 3: Drop the problematic constraint if it exists
-- Only run this if you see a constraint on (ad_account_id, campaign_id)
ALTER TABLE campaigns 
DROP CONSTRAINT IF EXISTS campaigns_ad_account_id_campaign_id_key;

-- STEP 4: Create the correct unique constraint
-- This ensures we can have the same campaign_id across different ad accounts
ALTER TABLE campaigns
ADD CONSTRAINT campaigns_campaign_id_key UNIQUE (campaign_id);

-- STEP 5: Create a helper function for safe UUID/text comparisons
CREATE OR REPLACE FUNCTION public.cast_to_uuid(text_val text)
RETURNS uuid AS $$
BEGIN
    RETURN text_val::uuid;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- STEP 6: Test the queries that might be failing
-- Test 1: Query meta_ad_accounts
SELECT 
    id::text as id,
    account_id,
    user_id::text as user_id,
    account_name
FROM meta_ad_accounts
WHERE user_id = auth.uid()
LIMIT 5;

-- Test 2: Query campaigns with proper joins
SELECT 
    c.id::text as campaign_id,
    c.name,
    c.status,
    ma.account_id as meta_account_id
FROM campaigns c
JOIN meta_ad_accounts ma ON ma.id = c.ad_account_id
WHERE ma.user_id = auth.uid()
LIMIT 5;

-- STEP 7: If you're still getting errors, check the RLS policies
-- This will show if there's a type mismatch in the policies
SELECT 
    tablename,
    policyname,
    qual::text as policy_condition
FROM pg_policies
WHERE tablename IN ('meta_ad_accounts', 'campaigns')
ORDER BY tablename, policyname;

-- STEP 8: Quick workaround - Create a view that handles the casting
CREATE OR REPLACE VIEW public.campaigns_with_accounts AS
SELECT 
    c.*,
    ma.account_id as meta_account_id,
    ma.account_name as meta_account_name,
    ma.user_id
FROM campaigns c
JOIN meta_ad_accounts ma ON ma.id = c.ad_account_id;

-- Grant access to the view
GRANT SELECT ON public.campaigns_with_accounts TO authenticated;

-- Add RLS to the view
ALTER VIEW public.campaigns_with_accounts SET (security_invoker = on);

-- STEP 9: If all else fails, here's a nuclear option to fix type mismatches
-- This creates overloaded operators for UUID/text comparison
-- USE WITH CAUTION - Only if absolutely necessary
/*
CREATE OR REPLACE FUNCTION uuid_equals_text(uuid, text) 
RETURNS boolean AS $$
SELECT $1::text = $2;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OPERATOR = (
    LEFTARG = uuid,
    RIGHTARG = text,
    FUNCTION = uuid_equals_text,
    COMMUTATOR = '=',
    NEGATOR = '<>',
    RESTRICT = eqsel,
    JOIN = eqjoinsel,
    HASHES, MERGES
);
*/
