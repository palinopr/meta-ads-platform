// Simple test script to check function deployment
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://igeuyfuxezvvenxjfnnn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZXV5ZnV4ZXp2dmVueGpmbm5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5MzA3MTIsImV4cCI6MjA1MjUwNjcxMn0.vJ3lS6dPq_mGnTEp4f2rALEPsOSG8y6KGdflKuGNDKE'
);

async function testFunctionExists() {
  try {
    console.log('🔄 Testing if get-dashboard-metrics function exists...');
    
    // Make a simple call to see the actual error
    const result = await supabase.functions.invoke('get-dashboard-metrics', {
      body: { account_ids: ['test'], date_preset: 'last_30d' }
    });
    
    console.log('Full response:', JSON.stringify(result, null, 2));
    
    // Check if the function exists by testing response
    if (result.error) {
      console.log('Error details:', result.error);
      console.log('Error name:', result.error.name);
      console.log('Error context:', result.error.context);
    }
    
  } catch (error) {
    console.error('❌ Caught error:', error);
  }
}

testFunctionExists();