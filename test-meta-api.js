// Test Meta API responses with different date presets
// Run with: node test-meta-api.js

const testAccountId = '1422466891387584'; // Replace with your actual account ID
const accessToken = 'YOUR_ACCESS_TOKEN'; // Replace with your actual token

async function testMetaAPI() {
  const datePresets = ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'last_90d'];
  const fields = 'spend,clicks,impressions,ctr,cpc,cpm,actions,action_values';
  
  console.log('🚀 Testing Meta API with different date presets...\n');
  
  for (const preset of datePresets) {
    console.log(`\n📅 Testing ${preset}:`);
    console.log('━'.repeat(50));
    
    const url = `https://graph.facebook.com/v19.0/act_${testAccountId}/insights?fields=${fields}&date_preset=${preset}&access_token=${accessToken}`;
    console.log(`🌐 URL: ${url.replace(/access_token=[^&]*/, 'access_token=***')}`);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`📊 Response Status: ${response.status}`);
      
      if (data.data && data.data.length > 0) {
        const insights = data.data[0];
        console.log(`✅ Data returned:`);
        console.log(`   💰 Spend: $${insights.spend || '0'}`);
        console.log(`   👁️ Impressions: ${insights.impressions || '0'}`);
        console.log(`   👆 Clicks: ${insights.clicks || '0'}`);
        console.log(`   📈 CTR: ${insights.ctr || '0'}%`);
        console.log(`   💵 CPC: $${insights.cpc || '0'}`);
        console.log(`   📊 CPM: $${insights.cpm || '0'}`);
        
        if (insights.date_start && insights.date_stop) {
          console.log(`   📅 Date Range: ${insights.date_start} to ${insights.date_stop}`);
        }
      } else if (data.error) {
        console.log(`❌ Error: ${data.error.message}`);
      } else {
        console.log(`⚠️ No data returned`);
      }
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
  
  // Test custom date range
  console.log(`\n\n📅 Testing custom date range (last 5 days):`);
  console.log('━'.repeat(50));
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 5);
  
  const customUrl = `https://graph.facebook.com/v19.0/act_${testAccountId}/insights?fields=${fields}&time_range={"since":"${startDate.toISOString().split('T')[0]}","until":"${endDate.toISOString().split('T')[0]}"}&access_token=${accessToken}`;
  console.log(`🌐 URL: ${customUrl.replace(/access_token=[^&]*/, 'access_token=***')}`);
  
  try {
    const response = await fetch(customUrl);
    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (data.data && data.data.length > 0) {
      const insights = data.data[0];
      console.log(`✅ Data returned:`);
      console.log(`   💰 Spend: $${insights.spend || '0'}`);
      console.log(`   📅 Date Range: ${insights.date_start} to ${insights.date_stop}`);
    } else {
      console.log(`⚠️ No data returned`);
    }
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

// Check if token is provided
if (accessToken === 'YOUR_ACCESS_TOKEN') {
  console.log('❌ Please replace YOUR_ACCESS_TOKEN with your actual Meta access token');
  console.log('You can get it from the Supabase profiles table or the Meta test page');
  process.exit(1);
}

// Run the test
testMetaAPI().catch(console.error);