-- 🎯 NUCLEAR OPTION: FRESH DATABASE START
-- Completely rebuilds the database schema from scratch
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Drop EVERYTHING (nuclear option)
DROP VIEW IF EXISTS campaigns_with_accounts CASCADE;
DROP TABLE IF EXISTS campaign_insights CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS meta_ad_accounts CASCADE;
DROP TABLE IF EXISTS meta_ad_accounts_backup CASCADE;
DROP TABLE IF EXISTS campaigns_backup CASCADE;

-- Drop any lingering functions
DROP FUNCTION IF EXISTS validate_account_id(TEXT);
DROP FUNCTION IF EXISTS normalize_account_id(TEXT);

-- Step 2: Create meta_ad_accounts table with correct types from start
CREATE TABLE meta_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_status TEXT DEFAULT 'ACTIVE',
  currency TEXT DEFAULT 'USD',
  timezone_name TEXT DEFAULT 'America/Los_Angeles',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_account_per_user UNIQUE (account_id, user_id),
  CONSTRAINT valid_account_id CHECK (account_id ~ '^[0-9]+$')
);

-- Step 3: Create campaigns table with correct types from start
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  objective TEXT,
  daily_budget DECIMAL(10,2),
  lifetime_budget DECIMAL(10,2),
  created_time TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  stop_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_campaign_per_user UNIQUE (campaign_id, user_id),
  CONSTRAINT campaigns_account_user_fkey FOREIGN KEY (account_id, user_id) REFERENCES meta_ad_accounts(account_id, user_id) ON DELETE CASCADE
);

-- Step 4: Create campaign_insights table
CREATE TABLE campaign_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Step 5: Create the view with proper types
CREATE OR REPLACE VIEW campaigns_with_accounts AS
SELECT 
  c.*,
  m.account_name,
  m.account_status,
  m.currency
FROM campaigns c
LEFT JOIN meta_ad_accounts m ON c.account_id = m.account_id AND c.user_id = m.user_id;

-- Step 6: Enable RLS on all tables
ALTER TABLE meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_insights ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for meta_ad_accounts
CREATE POLICY "Users can view their own ad accounts" ON meta_ad_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ad accounts" ON meta_ad_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ad accounts" ON meta_ad_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ad accounts" ON meta_ad_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Step 8: Create RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns" ON campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" ON campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- Step 9: Create RLS policies for campaign_insights
CREATE POLICY "Users can view their own campaign insights" ON campaign_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaign insights" ON campaign_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign insights" ON campaign_insights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign insights" ON campaign_insights
  FOR DELETE USING (auth.uid() = user_id);

-- Step 10: Add performance indexes
CREATE INDEX idx_meta_ad_accounts_user_id ON meta_ad_accounts(user_id);
CREATE INDEX idx_meta_ad_accounts_account_id ON meta_ad_accounts(account_id);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_account_user ON campaigns(account_id, user_id);
CREATE INDEX idx_campaigns_campaign_id ON campaigns(campaign_id);
CREATE INDEX idx_campaign_insights_user_date ON campaign_insights(user_id, date_start);
CREATE INDEX idx_campaign_insights_campaign_date ON campaign_insights(campaign_id, date_start);

-- Step 11: Create helper functions
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

-- Step 12: Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meta_ad_accounts_updated_at 
  BEFORE UPDATE ON meta_ad_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at 
  BEFORE UPDATE ON campaigns 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_insights_updated_at 
  BEFORE UPDATE ON campaign_insights 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verification: Check that everything was created successfully
SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('meta_ad_accounts', 'campaigns', 'campaign_insights');

SELECT 'Data types are correct:' as info;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('meta_ad_accounts', 'campaigns', 'campaign_insights') 
AND column_name IN ('account_id', 'campaign_id', 'user_id')
ORDER BY table_name, column_name;

SELECT 'Fresh database ready! 🎉' as status;
