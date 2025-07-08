-- 🚀 SIMPLE DATABASE REBUILD (Error-Resistant)
-- Run this if the main script failed

-- Step 1: Clean up any partial tables
DROP TABLE IF EXISTS campaign_insights CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS meta_ad_accounts CASCADE;

-- Step 2: Create meta_ad_accounts first
CREATE TABLE meta_ad_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    timezone_name TEXT,
    account_status TEXT DEFAULT 'ACTIVE',
    business_id TEXT,
    business_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT meta_ad_accounts_account_user_key UNIQUE (account_id, user_id)
);

-- Enable RLS
ALTER TABLE meta_ad_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can access their own accounts" ON meta_ad_accounts
    FOR ALL USING (auth.uid() = user_id);

SELECT 'meta_ad_accounts created successfully' as status;

-- Step 3: Create campaigns table
CREATE TABLE campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT campaigns_campaign_user_key UNIQUE (campaign_id, user_id)
);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can access their own campaigns" ON campaigns
    FOR ALL USING (auth.uid() = user_id);

SELECT 'campaigns created successfully' as status;

-- Step 4: Create campaign_insights table
CREATE TABLE campaign_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date_start DATE NOT NULL,
    date_stop DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    conversions DECIMAL(8,2) DEFAULT 0,
    ctr DECIMAL(8,4) DEFAULT 0,
    cpc DECIMAL(8,2) DEFAULT 0,
    cpm DECIMAL(8,2) DEFAULT 0,
    roas DECIMAL(8,2) DEFAULT 0,
    reach INTEGER DEFAULT 0,
    frequency DECIMAL(4,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT campaign_insights_campaign_date_user_key UNIQUE (campaign_id, date_start, user_id)
);

-- Enable RLS
ALTER TABLE campaign_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can access their own insights" ON campaign_insights
    FOR ALL USING (auth.uid() = user_id);

SELECT 'campaign_insights created successfully' as status;

-- Final verification
SELECT 'All tables created! Testing...' as status;

SELECT table_name, 'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('meta_ad_accounts', 'campaigns', 'campaign_insights')
ORDER BY table_name;

SELECT '✅ Simple rebuild complete!' as final_status;
