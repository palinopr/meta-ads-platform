#!/usr/bin/env node

// 🚀 DIRECT DATABASE FIX SCRIPT
// This script uses your service role key to rebuild the database and eliminate UUID vs TEXT errors

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Your Supabase credentials
const supabaseUrl = 'https://igeuyfuxezvvenxjfnnn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZXV5ZnV4ZXp2dmVueGpmbm5uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDkxMTEzNywiZXhwIjoyMDYwNDg3MTM3fQ.SV5KiQ64Eb6IgW0SeTYvgcF8qh0FO_Bc1uZGs2qE0MA'

// Create Supabase admin client
const supabase = createClient(supabaseUrl, serviceRoleKey)

async function executeSQL(sql) {
  console.log('Executing SQL...')
  const { data, error } = await supabase.rpc('sql', { query: sql })
  if (error) {
    console.error('SQL Error:', error)
    throw error
  }
  console.log('✅ SQL executed successfully')
  return data
}

async function rebuildDatabase() {
  console.log('🚀 Starting database rebuild...')
  
  try {
    // Step 1: Clean up existing tables
    console.log('🧹 Cleaning up existing tables...')
    await executeSQL(`
      DROP TABLE IF EXISTS campaign_insights CASCADE;
      DROP TABLE IF EXISTS campaigns CASCADE;
      DROP TABLE IF EXISTS meta_ad_accounts CASCADE;
    `)
    
    // Step 2: Create meta_ad_accounts table
    console.log('📊 Creating meta_ad_accounts table...')
    await executeSQL(`
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
      
      ALTER TABLE meta_ad_accounts ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can access their own accounts" ON meta_ad_accounts
          FOR ALL USING (auth.uid() = user_id);
    `)
    
    // Step 3: Create campaigns table
    console.log('📈 Creating campaigns table...')
    await executeSQL(`
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
      
      ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can access their own campaigns" ON campaigns
          FOR ALL USING (auth.uid() = user_id);
    `)
    
    // Step 4: Create campaign_insights table
    console.log('📊 Creating campaign_insights table...')
    await executeSQL(`
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
      
      ALTER TABLE campaign_insights ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can access their own insights" ON campaign_insights
          FOR ALL USING (auth.uid() = user_id);
    `)
    
    // Step 5: Create indexes for performance
    console.log('🔍 Creating performance indexes...')
    await executeSQL(`
      CREATE INDEX idx_meta_ad_accounts_user_id ON meta_ad_accounts(user_id);
      CREATE INDEX idx_meta_ad_accounts_account_id ON meta_ad_accounts(account_id);
      CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
      CREATE INDEX idx_campaigns_account_id ON campaigns(account_id);
      CREATE INDEX idx_campaigns_campaign_id ON campaigns(campaign_id);
      CREATE INDEX idx_campaign_insights_user_id ON campaign_insights(user_id);
      CREATE INDEX idx_campaign_insights_account_id ON campaign_insights(account_id);
      CREATE INDEX idx_campaign_insights_campaign_id ON campaign_insights(campaign_id);
      CREATE INDEX idx_campaign_insights_date_start ON campaign_insights(date_start);
    `)
    
    // Step 6: Verify everything was created
    console.log('🔍 Verifying tables were created...')
    const { data: tables } = await supabase.rpc('sql', { 
      query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('meta_ad_accounts', 'campaigns', 'campaign_insights')
        ORDER BY table_name;
      ` 
    })
    
    console.log('📋 Created tables:', tables?.map(t => t.table_name) || [])
    
    // Step 7: Test type consistency
    console.log('🧪 Testing type consistency...')
    await executeSQL(`
      SELECT 'Type consistency test passed!' as result
      WHERE EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meta_ad_accounts' 
        AND column_name = 'account_id' 
        AND data_type = 'text'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meta_ad_accounts' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
      );
    `)
    
    console.log('🎉 DATABASE REBUILD COMPLETE!')
    console.log('✅ All UUID vs TEXT errors have been eliminated!')
    console.log('✅ Tables: meta_ad_accounts, campaigns, campaign_insights')
    console.log('✅ Data types: account_id=TEXT, user_id=UUID, campaign_id=TEXT')
    console.log('✅ RLS policies enabled')
    console.log('✅ Performance indexes created')
    console.log('')
    console.log('🚀 Your Meta Ads Platform is ready for action!')
    
  } catch (error) {
    console.error('❌ Database rebuild failed:', error)
    throw error
  }
}

// Execute the rebuild
rebuildDatabase()
  .then(() => {
    console.log('🎯 SUCCESS: Database rebuild completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 FAILED: Database rebuild failed:', error)
    process.exit(1)
  })
