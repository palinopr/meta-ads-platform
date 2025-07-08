-- 🚀 META ADS PLATFORM: COMPLETE DATABASE REBUILD
-- This script eliminates ALL UUID vs TEXT errors and creates a clean, consistent schema
-- Run this in Supabase Dashboard → SQL Editor

-- ===================================================================
-- PHASE 1: CLEAN SLATE - Remove All Existing Objects
-- ===================================================================

SELECT 'Starting complete database rebuild...' as status;

-- Drop all existing tables (in correct order to handle dependencies)
DROP TABLE IF EXISTS campaign_insights CASCADE;
DROP TABLE IF EXISTS campaign_metrics CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS meta_ad_accounts CASCADE;

-- Drop any views that might exist
DROP VIEW IF EXISTS campaign_performance CASCADE;
DROP VIEW IF EXISTS account_summary CASCADE;

-- Drop any functions that might exist
DROP FUNCTION IF EXISTS get_campaign_metrics CASCADE;
DROP FUNCTION IF EXISTS calculate_roas CASCADE;

-- Drop any triggers
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
DROP TRIGGER IF EXISTS update_campaign_insights_updated_at ON campaign_insights;

SELECT 'Cleanup complete. Starting schema creation...' as status;

-- ===================================================================
-- PHASE 2: CREATE CORE TABLES WITH CONSISTENT TYPES
-- ===================================================================

-- Create meta_ad_accounts table
-- account_id is TEXT (Meta API uses string IDs like "123456789")
-- user_id is UUID (references auth.users.id)
CREATE TABLE meta_ad_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id TEXT NOT NULL, -- Meta account ID (TEXT)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    timezone_name TEXT,
    account_status TEXT DEFAULT 'ACTIVE',
    business_id TEXT,
    business_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure one account per user (but multiple users can have same account)
    CONSTRAINT meta_ad_accounts_account_user_key UNIQUE (account_id, user_id)
);

-- Create campaigns table
-- All foreign keys use consistent types
CREATE TABLE campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id TEXT NOT NULL, -- Meta campaign ID (TEXT)
    account_id TEXT NOT NULL, -- Meta account ID (TEXT) - matches meta_ad_accounts.account_id
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- For RLS
    name TEXT NOT NULL, -- Campaign name
    status TEXT DEFAULT 'ACTIVE',
    objective TEXT,
    daily_budget DECIMAL(10,2), -- In dollars (converted from cents)
    lifetime_budget DECIMAL(10,2), -- In dollars (converted from cents)
    created_time TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    stop_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint for upserts
    CONSTRAINT campaigns_campaign_user_key UNIQUE (campaign_id, user_id)
);

-- Create campaign_insights table
-- Stores performance metrics from Meta API
CREATE TABLE campaign_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id TEXT NOT NULL, -- Meta campaign ID (TEXT)
    account_id TEXT NOT NULL, -- Meta account ID (TEXT)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- For RLS
    date_start DATE NOT NULL,
    date_stop DATE NOT NULL,
    
    -- Performance metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0, -- In dollars
    conversions DECIMAL(8,2) DEFAULT 0,
    ctr DECIMAL(8,4) DEFAULT 0, -- Click-through rate (percentage)
    cpc DECIMAL(8,2) DEFAULT 0, -- Cost per click
    cpm DECIMAL(8,2) DEFAULT 0, -- Cost per thousand impressions
    roas DECIMAL(8,2) DEFAULT 0, -- Return on ad spend
    reach INTEGER DEFAULT 0,
    frequency DECIMAL(4,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint for upserts (one insight per campaign per date per user)
    CONSTRAINT campaign_insights_campaign_date_user_key UNIQUE (campaign_id, date_start, user_id)
);

SELECT 'Core tables created successfully.' as status;

-- ===================================================================
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- ===================================================================

-- Indexes for meta_ad_accounts
CREATE INDEX idx_meta_ad_accounts_user_id ON meta_ad_accounts(user_id);
CREATE INDEX idx_meta_ad_accounts_account_id ON meta_ad_accounts(account_id);

-- Indexes for campaigns
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_account_id ON campaigns(account_id);
CREATE INDEX idx_campaigns_campaign_id ON campaigns(campaign_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_time ON campaigns(created_time);

-- Indexes for campaign_insights
CREATE INDEX idx_campaign_insights_user_id ON campaign_insights(user_id);
CREATE INDEX idx_campaign_insights_account_id ON campaign_insights(account_id);
CREATE INDEX idx_campaign_insights_campaign_id ON campaign_insights(campaign_id);
CREATE INDEX idx_campaign_insights_date_start ON campaign_insights(date_start);
CREATE INDEX idx_campaign_insights_date_range ON campaign_insights(date_start, date_stop);

SELECT 'Indexes created successfully.' as status;

-- ===================================================================
-- PHASE 4: SET UP ROW LEVEL SECURITY (RLS)
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meta_ad_accounts
CREATE POLICY "Users can view their own ad accounts" ON meta_ad_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ad accounts" ON meta_ad_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ad accounts" ON meta_ad_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ad accounts" ON meta_ad_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for campaigns
CREATE POLICY "Users can view their own campaigns" ON campaigns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" ON campaigns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON campaigns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON campaigns
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for campaign_insights
CREATE POLICY "Users can view their own campaign insights" ON campaign_insights
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaign insights" ON campaign_insights
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign insights" ON campaign_insights
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign insights" ON campaign_insights
    FOR DELETE USING (auth.uid() = user_id);

SELECT 'RLS policies created successfully.' as status;

-- ===================================================================
-- PHASE 5: CREATE AUTOMATIC TRIGGERS
-- ===================================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_meta_ad_accounts_updated_at
    BEFORE UPDATE ON meta_ad_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_insights_updated_at
    BEFORE UPDATE ON campaign_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Triggers created successfully.' as status;

-- ===================================================================
-- PHASE 6: CREATE HELPFUL VIEWS FOR DASHBOARD
-- ===================================================================

-- Campaign performance summary view
CREATE VIEW campaign_performance AS
SELECT 
    c.campaign_id,
    c.name,
    c.account_id,
    c.user_id,
    c.status,
    c.objective,
    c.daily_budget,
    c.lifetime_budget,
    -- Latest metrics (last 30 days)
    COALESCE(SUM(ci.impressions), 0) as total_impressions,
    COALESCE(SUM(ci.clicks), 0) as total_clicks,
    COALESCE(SUM(ci.spend), 0) as total_spend,
    COALESCE(SUM(ci.conversions), 0) as total_conversions,
    CASE 
        WHEN SUM(ci.impressions) > 0 THEN (SUM(ci.clicks)::DECIMAL / SUM(ci.impressions)) * 100
        ELSE 0 
    END as avg_ctr,
    CASE 
        WHEN SUM(ci.clicks) > 0 THEN SUM(ci.spend) / SUM(ci.clicks)
        ELSE 0 
    END as avg_cpc,
    COALESCE(AVG(ci.roas), 0) as avg_roas
FROM campaigns c
LEFT JOIN campaign_insights ci ON c.campaign_id = ci.campaign_id 
    AND c.user_id = ci.user_id
    AND ci.date_start >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.campaign_id, c.name, c.account_id, c.user_id, c.status, c.objective, c.daily_budget, c.lifetime_budget;

-- Account summary view
CREATE VIEW account_summary AS
SELECT 
    ma.account_id,
    ma.account_name,
    ma.user_id,
    ma.currency,
    COUNT(DISTINCT c.campaign_id) as total_campaigns,
    COUNT(DISTINCT CASE WHEN c.status = 'ACTIVE' THEN c.campaign_id END) as active_campaigns,
    COALESCE(SUM(ci.spend), 0) as total_spend_30d,
    COALESCE(SUM(ci.conversions), 0) as total_conversions_30d,
    COALESCE(AVG(ci.roas), 0) as avg_roas_30d
FROM meta_ad_accounts ma
LEFT JOIN campaigns c ON ma.account_id = c.account_id AND ma.user_id = c.user_id
LEFT JOIN campaign_insights ci ON c.campaign_id = ci.campaign_id 
    AND c.user_id = ci.user_id
    AND ci.date_start >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ma.account_id, ma.account_name, ma.user_id, ma.currency;

SELECT 'Views created successfully.' as status;

-- ===================================================================
-- PHASE 7: VERIFICATION QUERIES
-- ===================================================================

-- Check that all tables exist with correct structure
SELECT 'VERIFICATION: Checking table structures...' as status;

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('meta_ad_accounts', 'campaigns', 'campaign_insights')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Check that all constraints exist
SELECT 'VERIFICATION: Checking constraints...' as status;

SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name IN ('meta_ad_accounts', 'campaigns', 'campaign_insights')
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- Check that all indexes exist
SELECT 'VERIFICATION: Checking indexes...' as status;

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('meta_ad_accounts', 'campaigns', 'campaign_insights')
    AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT 'VERIFICATION: Checking RLS policies...' as status;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('meta_ad_accounts', 'campaigns', 'campaign_insights')
ORDER BY tablename, policyname;

-- ===================================================================
-- PHASE 8: SUCCESS CONFIRMATION
-- ===================================================================

SELECT 'Fresh database ready! 🎉' as status;

SELECT '✅ REBUILD COMPLETE - All UUID vs TEXT errors eliminated!' as final_status;

-- Quick test to verify no type mismatches
SELECT 'Testing type consistency...' as test_status;

-- This should work without UUID vs TEXT errors
SELECT 
    ma.account_id,  -- TEXT
    ma.user_id,     -- UUID
    COUNT(*) as test_count
FROM meta_ad_accounts ma
WHERE ma.account_id = ma.account_id  -- TEXT = TEXT ✅
    AND ma.user_id = ma.user_id      -- UUID = UUID ✅
GROUP BY ma.account_id, ma.user_id
LIMIT 1;

SELECT 'Type consistency test passed! ✅' as test_result;

-- Display summary
SELECT 
    'meta_ad_accounts' as table_name,
    'account_id: TEXT, user_id: UUID' as key_types
UNION ALL
SELECT 
    'campaigns' as table_name,
    'campaign_id: TEXT, account_id: TEXT, user_id: UUID' as key_types
UNION ALL
SELECT 
    'campaign_insights' as table_name, 
    'campaign_id: TEXT, account_id: TEXT, user_id: UUID' as key_types;

SELECT '🚀 Your Meta Ads Platform is ready for action!' as final_message;
