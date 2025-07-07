// Test script for sync-campaigns Edge Function
// Run this with: node test-edge-function.js

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
const USER_ACCESS_TOKEN = 'YOUR_USER_ACCESS_TOKEN'; // Get this from localStorage after login

async function testEdgeFunction() {
  try {
    console.log('Testing sync-campaigns Edge Function...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_ACCESS_TOKEN}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        account_id: 'YOUR_ACCOUNT_ID' // Replace with actual account ID
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Instructions:
console.log(`
To use this test script:
1. Replace YOUR_SUPABASE_URL with your actual Supabase URL
2. Replace YOUR_ANON_KEY with your Supabase anon key
3. Get your user access token from browser localStorage after logging in:
   - Open browser console
   - Run: localStorage.getItem('supabase.auth.token')
   - Copy the access_token value
4. Replace YOUR_ACCOUNT_ID with an actual Meta ad account ID
5. Run: node test-edge-function.js
`);

// Uncomment to run the test
// testEdgeFunction();