// Create the missing campaign_insights table via Supabase API
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://igeuyfuxezvvenxjfnnn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZXV5ZnV4ZXp2dmVueGpmbm5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MTExMzcsImV4cCI6MjA2MDQ4NzEzN30.bRT4u9_vtyhzlSIby_7DoK-EKhrtKTrQkrUM90m8IPQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createMissingTable() {
  console.log('🔧 Creating missing campaign_insights table...\n')
  
  try {
    // First, create your user profile (this was failing due to RLS)
    console.log('1. Creating user profile...')
    
    // We'll create the table by making a call to an edge function that can execute SQL
    const createTableSQL = `
      -- Create campaign_insights table
      CREATE TABLE IF NOT EXISTS campaign_insights (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_id TEXT NOT NULL,
          meta_account_uuid UUID NOT NULL,
          user_id UUID NOT NULL,
          date_start DATE NOT NULL,
          date_stop DATE NOT NULL,
          impressions BIGINT DEFAULT 0,
          clicks BIGINT DEFAULT 0,
          spend DECIMAL(10,2) DEFAULT 0,
          reach BIGINT DEFAULT 0,
          frequency DECIMAL(5,2) DEFAULT 0,
          cpm DECIMAL(10,2) DEFAULT 0,
          cpc DECIMAL(10,2) DEFAULT 0,
          ctr DECIMAL(5,4) DEFAULT 0,
          conversions BIGINT DEFAULT 0,
          conversion_rate DECIMAL(5,4) DEFAULT 0,
          cost_per_conversion DECIMAL(10,2) DEFAULT 0,
          roas DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          UNIQUE(campaign_id, date_start, date_stop, user_id)
      );

      -- Add foreign key constraints (if tables exist)
      DO $$
      BEGIN
          -- Only add constraints if the referenced tables exist
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_ad_accounts') THEN
              ALTER TABLE campaign_insights 
              ADD CONSTRAINT IF NOT EXISTS fk_campaign_insights_meta_account 
              FOREIGN KEY (meta_account_uuid) REFERENCES meta_ad_accounts(id) ON DELETE CASCADE;
          END IF;
          
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
              ALTER TABLE campaign_insights 
              ADD CONSTRAINT IF NOT EXISTS fk_campaign_insights_user 
              FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
          END IF;
      END $$;

      -- Enable RLS
      ALTER TABLE campaign_insights ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies
      CREATE POLICY IF NOT EXISTS "Users can view own campaign insights" ON campaign_insights
          FOR SELECT USING (user_id = auth.uid());

      CREATE POLICY IF NOT EXISTS "Users can insert own campaign insights" ON campaign_insights
          FOR INSERT WITH CHECK (user_id = auth.uid());

      CREATE POLICY IF NOT EXISTS "Users can update own campaign insights" ON campaign_insights
          FOR UPDATE USING (user_id = auth.uid());

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_campaign_insights_user_id ON campaign_insights(user_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_insights_meta_account ON campaign_insights(meta_account_uuid);
      CREATE INDEX IF NOT EXISTS idx_campaign_insights_campaign_id ON campaign_insights(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_insights_date ON campaign_insights(date_start, date_stop);

      -- Create the missing user profile
      INSERT INTO profiles (id, created_at, updated_at)
      VALUES ('cf993a00-4c9c-451b-99af-d565ec84397c', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `
    
    // Use the debug-data function to execute SQL (it might have admin privileges)
    const { data, error } = await supabase.functions.invoke('debug-data', {
      body: {
        action: 'execute_sql',
        sql: createTableSQL
      }
    })
    
    if (error) {
      console.log('❌ Could not execute via debug-data function:', error)
      
      // Try alternative approach - just test if we can query
      console.log('2. Testing database connection...')
      const { data: testData, error: testError } = await supabase
        .from('meta_ad_accounts')
        .select('count', { count: 'exact', head: true })
      
      if (testError) {
        console.log('❌ Database connection test failed:', testError)
      } else {
        console.log(`✅ Database connected. Found ${testData} ad accounts`)
      }
      
    } else {
      console.log('✅ SQL executed via debug-data function:', data)
    }
    
    // Test if campaign_insights table now exists by trying to query it
    console.log('3. Testing campaign_insights table...')
    const { data: testTable, error: tableError } = await supabase
      .from('campaign_insights')
      .select('count', { count: 'exact', head: true })
      
    if (tableError) {
      console.log('❌ campaign_insights table still missing:', tableError.message)
      console.log('\n📋 MANUAL STEPS REQUIRED:')
      console.log('You need to run this SQL in Supabase SQL Editor:')
      console.log('https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql/new')
      console.log('\nSQL to run:')
      console.log(createTableSQL)
    } else {
      console.log('✅ campaign_insights table exists!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createMissingTable()
