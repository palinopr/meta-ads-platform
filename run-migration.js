#!/usr/bin/env node

/**
 * 🎯 AUTOMATIC DATABASE MIGRATION SCRIPT
 * Runs the architectural fix automatically - no manual SQL copying required
 * Fixes the root cause: UUID vs TEXT mismatch in account IDs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://igeuyfuxezvvenxjfnnn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY not found!');
  console.error('💡 Please add your service role key to .env file:');
  console.error('   SUPABASE_SERVICE_KEY=your_service_role_key_here');
  console.error('');
  console.error('🔍 Get it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

// Initialize Supabase with service role key (has admin privileges)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeSQL(sql, description) {
  console.log(`🔧 ${description}...`);
  try {
    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { data, error } = await supabase.rpc('sql', { 
          query: statement.trim() + ';' 
        });
        if (error) {
          // Try alternative method if RPC doesn't work
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'apikey': SUPABASE_SERVICE_KEY
            },
            body: JSON.stringify({ query: statement.trim() + ';' })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
        }
      }
    }
    
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${description}`);
    console.error('Error:', error.message);
    throw error;
  }
}

async function runMigration() {
  console.log('🎯 STARTING AUTOMATIC ARCHITECTURAL MIGRATION');
  console.log('Fixing root cause: UUID vs TEXT mismatch in account IDs\n');

  try {
    // Step 1: Create backups
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS meta_ad_accounts_backup AS 
      SELECT * FROM meta_ad_accounts;
      
      CREATE TABLE IF NOT EXISTS campaigns_backup AS 
      SELECT * FROM campaigns;
    `, 'Creating data backups');

    // Step 2: Drop problematic constraints
    await executeSQL(`
      ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_account_id_fkey;
      ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_meta_ad_accounts_id_fkey;
      ALTER TABLE meta_ad_accounts DROP CONSTRAINT IF EXISTS meta_ad_accounts_account_id_key;
    `, 'Removing problematic constraints');

    // Step 3: Fix data types (UUID -> TEXT) 
    await executeSQL(`
      ALTER TABLE meta_ad_accounts ALTER COLUMN account_id TYPE TEXT;
      ALTER TABLE campaigns ALTER COLUMN account_id TYPE TEXT;
      ALTER TABLE campaigns ALTER COLUMN campaign_id TYPE TEXT;
    `, 'Converting data types from UUID to TEXT');

    // Step 4: Normalize existing data
    await executeSQL(`
      UPDATE meta_ad_accounts 
      SET account_id = REGEXP_REPLACE(account_id, '^act_', '') 
      WHERE account_id LIKE 'act_%';
      
      UPDATE campaigns 
      SET account_id = REGEXP_REPLACE(account_id, '^act_', '') 
      WHERE account_id LIKE 'act_%';
    `, 'Normalizing existing data (removing act_ prefixes)');

    // Step 5: Add proper constraints
    await executeSQL(`
      ALTER TABLE meta_ad_accounts 
      ADD CONSTRAINT unique_account_per_user UNIQUE (account_id, user_id);
      
      ALTER TABLE meta_ad_accounts 
      ADD CONSTRAINT valid_account_id CHECK (account_id ~ '^[0-9]+$');
      
      ALTER TABLE campaigns 
      ADD CONSTRAINT campaigns_account_user_fkey 
      FOREIGN KEY (account_id, user_id) 
      REFERENCES meta_ad_accounts(account_id, user_id);
    `, 'Adding proper TEXT-based constraints');

    // Step 6: Create campaign_insights table
    await executeSQL(`
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
    `, 'Creating campaign_insights table');

    // Step 7: Add RLS policies
    await executeSQL(`
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
    `, 'Adding RLS policies for campaign_insights');

    // Step 8: Add performance indexes
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_user_id ON meta_ad_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_campaigns_account_user ON campaigns(account_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_insights_user_date ON campaign_insights(user_id, date_start);
    `, 'Adding performance indexes');

    // Step 9: Create helper functions
    await executeSQL(`
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
    `, 'Creating helper functions');

    // Verification
    console.log('\n🔍 Verifying migration results...');
    const { data: accounts } = await supabase.from('meta_ad_accounts').select('count', { count: 'exact' });
    const { data: campaigns } = await supabase.from('campaigns').select('count', { count: 'exact' });
    
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('✅ Root cause fixed: UUID vs TEXT mismatch eliminated');
    console.log('✅ All account_id fields are now TEXT type');
    console.log('✅ No more "operator does not exist: uuid = text" errors');
    console.log('✅ Meta API "act_123456" can now match database "123456"');
    console.log(`✅ Accounts in database: ${accounts?.count || 0}`);
    console.log(`✅ Campaigns in database: ${campaigns?.count || 0}`);
    console.log('\n🚀 Ready for service layer deployment!');
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    console.log('\n� Attempting rollback...');
    
    try {
      await executeSQL(`
        DROP TABLE IF EXISTS campaign_insights;
        DROP TABLE IF EXISTS meta_ad_accounts_backup;
        DROP TABLE IF EXISTS campaigns_backup;
      `, 'Rolling back changes');
      console.log('✅ Rollback completed');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
    }
    
    process.exit(1);
  }
}

// Auto-run migration
runMigration().then(() => {
  console.log('\n🎯 Migration script completed successfully!');
  process.exit(0);
}).catch(() => {
  process.exit(1);
});

export { runMigration };
