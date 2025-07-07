-- Run this in Supabase SQL Editor to fix the constraints

-- First, drop the problematic unique constraint if it exists
ALTER TABLE public.meta_ad_accounts 
DROP CONSTRAINT IF EXISTS meta_ad_accounts_account_id_key;

-- Add the composite unique constraint
ALTER TABLE public.meta_ad_accounts 
DROP CONSTRAINT IF EXISTS meta_ad_accounts_account_id_user_id_key;

ALTER TABLE public.meta_ad_accounts 
ADD CONSTRAINT meta_ad_accounts_account_id_user_id_key 
UNIQUE (account_id, user_id);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'meta_ad_accounts'
ORDER BY ordinal_position;

-- Check existing constraints
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.meta_ad_accounts'::regclass;