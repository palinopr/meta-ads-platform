// Quick test of the sync-campaigns endpoint
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://igeuyfuxezvvenxjfnnn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZXV5ZnV4ZXp2dmVueGpmbm5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MTExMzcsImV4cCI6MjA2MDQ4NzEzN30.bRT4u9_vtyhzlSIby_7DoK-EKhrtKTrQkrUM90m8IPQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSyncEndpoint() {
  console.log('🧪 Testing sync-campaigns endpoint directly...\n')
  
  try {
    // Test account ID - use one from your debug
    const testAccountId = '37705666' // From your debug output
    
    console.log(`Testing with account ID: ${testAccountId}`)
    
    // Call the function directly
    const { data, error } = await supabase.functions.invoke('sync-campaigns', {
      body: { account_id: testAccountId }
    })
    
    if (error) {
      console.log('❌ Function Error:', error)
    } else {
      console.log('✅ Function Response:', JSON.stringify(data, null, 2))
    }
    
    // Also check what's in the campaigns table
    console.log('\n📊 Checking campaigns table...')
    const { data: campaignsData, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .limit(5)
      
    if (campaignsError) {
      console.log('❌ Campaigns table error:', campaignsError)
    } else {
      console.log(`✅ Found ${campaignsData?.length || 0} campaigns in database`)
      if (campaignsData && campaignsData.length > 0) {
        console.log('Sample campaign:', campaignsData[0])
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testSyncEndpoint()
