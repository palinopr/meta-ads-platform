-- Fix campaign sync issue by adding the proper unique constraint
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql/new

-- First, drop the existing unique constraint on campaign_id alone
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_campaign_id_key;

-- Add a composite unique constraint on ad_account_id and campaign_id
-- This allows the same campaign_id to exist for different ad accounts
ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_ad_account_id_campaign_id_key 
UNIQUE (ad_account_id, campaign_id);

-- Verify the constraint was created
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'public.campaigns'::regclass;

-- Test the sync by clicking "Sync from Meta" button on the campaigns page
