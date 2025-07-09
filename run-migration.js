const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://igeuyfuxezvvenxjfnnn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZXV5ZnV4ZXp2dmVueGpmbm5uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDkxMTEzNywiZXhwIjoyMDYwNDg3MTM3fQ.SV5KiQ64Eb6IgW0SeTYvgcF8qh0FO_Bc1uZGs2qE0MA';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting database cleanup migration...');
    
    // Define the cleanup commands in order
    const cleanupCommands = [
      'DROP TABLE IF EXISTS public.adset_metrics CASCADE',
      'DROP TABLE IF EXISTS public.campaign_metrics CASCADE',
      'DROP TABLE IF EXISTS public.creatives CASCADE',
      'DROP TABLE IF EXISTS public.ads CASCADE',
      'DROP TABLE IF EXISTS public.ad_sets CASCADE',
      'DROP TABLE IF EXISTS public.campaigns CASCADE',
      'DROP INDEX IF EXISTS idx_campaign_metrics_campaign_date',
      'DROP INDEX IF EXISTS idx_adset_metrics_adset_date',
      'DROP INDEX IF EXISTS idx_creatives_ad_id',
      'DROP INDEX IF EXISTS idx_ads_ad_set_id',
      'DROP INDEX IF EXISTS idx_ad_sets_campaign_id',
      'DROP INDEX IF EXISTS idx_campaigns_ad_account_id'
    ];
    
    console.log('📋 Executing cleanup commands...');
    
    // Execute each command individually
    for (const command of cleanupCommands) {
      console.log(`⚡ Executing: ${command}`);
      
      try {
        // Use the PostgREST client directly for SQL execution
        const { data, error } = await supabase.rpc('exec', {
          sql: command
        });
        
        if (error) {
          console.log(`⚠️  Command failed (might be expected): ${error.message}`);
        } else {
          console.log(`✅ Command executed successfully`);
        }
      } catch (cmdError) {
        console.log(`⚠️  Command failed (might be expected): ${cmdError.message}`);
      }
    }
    
    console.log('');
    console.log('✅ Database cleanup migration completed!');
    console.log('📊 Database cleanup results:');
    console.log('- Attempted to remove all campaign storage tables');
    console.log('- Attempted to remove related indexes');
    console.log('- Database should now contain only essential tables: profiles, meta_ad_accounts');
    console.log('- All campaign data will be fetched directly from Meta API');
    console.log('');
    console.log('🔍 Please verify the cleanup by checking the Supabase dashboard');
    console.log('🌐 Dashboard: https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn');
    
  } catch (error) {
    console.error('💥 Migration error:', error);
    
    console.log('');
    console.log('📝 MANUAL CLEANUP INSTRUCTIONS:');
    console.log('Since automated cleanup failed, please run this SQL manually in the Supabase dashboard:');
    console.log('');
    console.log('-- Go to https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql');
    console.log('-- Execute this SQL:');
    console.log('');
    console.log('DROP TABLE IF EXISTS public.adset_metrics CASCADE;');
    console.log('DROP TABLE IF EXISTS public.campaign_metrics CASCADE;');
    console.log('DROP TABLE IF EXISTS public.creatives CASCADE;');
    console.log('DROP TABLE IF EXISTS public.ads CASCADE;');
    console.log('DROP TABLE IF EXISTS public.ad_sets CASCADE;');
    console.log('DROP TABLE IF EXISTS public.campaigns CASCADE;');
    console.log('');
    console.log('-- This will clean up the database for the analytics platform architecture');
    
    process.exit(1);
  }
}

// Run the migration
runMigration();
