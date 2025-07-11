// Test script to directly call the get-dashboard-metrics function
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  'https://igeuyfuxezvvenxjfnnn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZXV5ZnV4ZXp2dmVueGpmbm5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5MzA3MTIsImV4cCI6MjA1MjUwNjcxMn0.vJ3lS6dPq_mGnTEp4f2rALEPsOSG8y6KGdflKuGNDKE'
);

async function testDashboardMetrics() {
  try {
    console.log('🔄 Testing get-dashboard-metrics function...');
    
    // Test with Account 37705666
    console.log('\n📊 Testing Account 37705666:');
    const response1 = await supabase.functions.invoke('get-dashboard-metrics', {
      body: { 
        account_ids: ['37705666'],
        date_preset: 'last_30d'
      }
    });
    
    console.log('Response 1:', JSON.stringify(response1, null, 2));
    
    // Test with Account 787610255314938
    console.log('\n📊 Testing Account 787610255314938:');
    const response2 = await supabase.functions.invoke('get-dashboard-metrics', {
      body: { 
        account_ids: ['787610255314938'],
        date_preset: 'last_30d'
      }
    });
    
    console.log('Response 2:', JSON.stringify(response2, null, 2));
    
    // Test with both accounts
    console.log('\n📊 Testing both accounts:');
    const response3 = await supabase.functions.invoke('get-dashboard-metrics', {
      body: { 
        account_ids: ['37705666', '787610255314938'],
        date_preset: 'last_30d'
      }
    });
    
    console.log('Response 3:', JSON.stringify(response3, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDashboardMetrics();