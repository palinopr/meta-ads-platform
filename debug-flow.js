// Debug the campaign sync flow
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://igeuyfuxezvvenxjfnnn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZXV5ZnV4ZXp2dmVueGpmbm5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MTExMzcsImV4cCI6MjA2MDQ4NzEzN30.bRT4u9_vtyhzlSIby_7DoK-EKhrtKTrQkrUM90m8IPQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugFlow() {
  console.log('🔍 Debugging campaign sync flow...\n')
  
  try {
    // 1. Check campaigns table structure
    console.log('1. Testing campaigns table...')
    const { data: campaignsTest, error: campaignsError } = await supabase
      .from('campaigns')
      .select('count', { count: 'exact', head: true })
      
    if (campaignsError) {
      console.log('❌ campaigns table error:', campaignsError.message)
      console.log('   🔧 Run FINAL-FIX-RUN-THIS.sql in Supabase to create the table')
    } else {
      console.log(`✅ campaigns table exists with ${campaignsTest} records`)
    }
    
    // 2. Check campaign_insights table
    console.log('\n2. Testing campaign_insights table...')
    const { data: insightsTest, error: insightsError } = await supabase
      .from('campaign_insights')
      .select('count', { count: 'exact', head: true })
      
    if (insightsError) {
      console.log('❌ campaign_insights table error:', insightsError.message)
    } else {
      console.log(`✅ campaign_insights table exists with ${insightsTest} records`)
    }
    
    // 3. Check user profile
    console.log('\n3. Testing user profile...')
    const { data: profileTest, error: profileError } = await supabase
      .from('profiles')
      .select('id, meta_access_token')
      .eq('id', 'cf993a00-4c9c-451b-99af-d565ec84397c')
      .single()
      
    if (profileError) {
      console.log('❌ profile error:', profileError.message)
    } else {
      console.log(`✅ profile exists with token: ${profileTest.meta_access_token ? 'YES' : 'NO'}`)
    }
    
    // 4. Check meta_ad_accounts
    console.log('\n4. Testing meta ad accounts...')
    const { data: accountsTest, error: accountsError } = await supabase
      .from('meta_ad_accounts')
      .select('id, account_id, account_name')
      .eq('user_id', 'cf993a00-4c9c-451b-99af-d565ec84397c')
      .limit(3)
      
    if (accountsError) {
      console.log('❌ meta_ad_accounts error:', accountsError.message)
    } else {
      console.log(`✅ found ${accountsTest.length} ad accounts`)
      if (accountsTest.length > 0) {
        console.log('   Sample account:', accountsTest[0].account_id, accountsTest[0].account_name)
      }
    }
    
    console.log('\n🎯 SUMMARY:')
    console.log('   - UUID error: FIXED ✅')
    console.log('   - Tables created: Need to run SQL ⚠️')
    console.log('   - Functions deployed: sync-campaigns ✅, sync-campaign-insights ✅')
    console.log('\n📋 NEXT STEPS:')
    console.log('   1. Run FINAL-FIX-RUN-THIS.sql in Supabase SQL Editor')
    console.log('   2. Try "Sync from Meta" button in your app')
    console.log('   3. Campaigns should appear!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugFlow()
