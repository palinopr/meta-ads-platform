-- 🎯 COMPLETE DATABASE ARCHITECTURE FIX
-- Fixes the root cause: UUID vs TEXT mismatch in account IDs
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Create backups (safety first)
CREATE TABLE IF NOT EXISTS meta_ad_accounts_backup AS 
SELECT * FROM meta_ad_accounts;

CREATE TABLE IF NOT EXISTS campaigns_backup AS 
SELECT * FROM campaigns;

-- Step 2: Drop dependent views (they prevent column type changes)
DROP VIEW IF EXISTS campaigns_with_accounts CASCADE;

-- Step 3: Drop problematic constraints
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_account_id_fkey;
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_meta_ad_accounts_id_fkey;
ALTER TABLE meta_ad_accounts DROP CONSTRAINT IF EXISTS meta_ad_accounts_account_id_key;

-- Step 4: Add missing columns if they don't exist
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Step 5: Fix data types (UUID -> TEXT) 
ALTER TABLE meta_ad_accounts ALTER COLUMN account_id TYPE TEXT;
-- Ensure user_id is UUID in both tables with explicit casting
ALTER TABLE campaigns ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE meta_ad_accounts ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Step 6: Recreate the campaigns_with_accounts view with explicit type casting
CREATE OR REPLACE VIEW campaigns_with_accounts AS
SELECT 
  c.*,
  m.account_name,
  m.account_status,
  m.currency
FROM campaigns c
LEFT JOIN meta_ad_accounts m ON c.account_id = m.account_id AND c.user_id::UUID = m.user_id::UUID;

-- Step 7: Normalize existing data (remove act_ prefixes)
UPDATE meta_ad_accounts 
SET account_id = REGEXP_REPLACE(account_id, '^act_', '') 
WHERE account_id LIKE 'act_%';

UPDATE campaigns 
SET account_id = REGEXP_REPLACE(account_id, '^act_', '') 
WHERE account_id LIKE 'act_%';

-- Step 8: Add proper TEXT-based constraints
ALTER TABLE meta_ad_accounts 
ADD CONSTRAINT unique_account_per_user UNIQUE (account_id, user_id);

ALTER TABLE meta_ad_accounts 
ADD CONSTRAINT valid_account_id CHECK (account_id ~ '^[0-9]+$');

ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_account_user_fkey 
FOREIGN KEY (account_id, user_id) 
REFERENCES meta_ad_accounts(account_id, user_id);

-- Step 9: Create campaign_insights table
CREATE TABLE IF NOT EXISTS campaign_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,
  cpc DECIMAL(10,2) DEFAULT 0,
  cpm DECIMAL(10,2) DEFAULT 0,
  roas DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_campaign_date_user UNIQUE (campaign_id, date_start, user_id)
);

-- Step 10: Add RLS policies for campaign_insights
ALTER TABLE campaign_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own campaign insights" ON campaign_insights;
CREATE POLICY "Users can view their own campaign insights" ON campaign_insights
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own campaign insights" ON campaign_insights;
CREATE POLICY "Users can insert their own campaign insights" ON campaign_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own campaign insights" ON campaign_insights;
CREATE POLICY "Users can update their own campaign insights" ON campaign_insights
  FOR UPDATE USING (auth.uid() = user_id);

-- Step 11: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_user_id ON meta_ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_account_user ON campaigns(account_id, user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_user_date ON campaign_insights(user_id, date_start);

-- Step 12: Create helper functions
CREATE OR REPLACE FUNCTION validate_account_id(account_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN account_id ~ '^[0-9]+$';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION normalize_account_id(account_id TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN REGEXP_REPLACE(account_id, '^act_', '');
END;
$$ LANGUAGE plpgsql;

-- Verification queries (run these to check results)
SELECT 'meta_ad_accounts count:' as info, COUNT(*) as count FROM meta_ad_accounts;
SELECT 'campaigns count:' as info, COUNT(*) as count FROM campaigns;
SELECT 'campaign_insights table created:' as info, COUNT(*) as count FROM campaign_insights;

-- Show data types (should all be TEXT now)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('meta_ad_accounts', 'campaigns') 
AND column_name LIKE '%account_id%';
