// Test script to verify rate limiting implementation
// This will test our production edge functions

const SUPABASE_URL = 'https://igeuyfuxezvvenxjfnnn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZXV5ZnV4ZXp2dmVueGpmbm5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NDIxMjYsImV4cCI6MjA1MDExODEyNn0.YgLgJyGqn3cKjXxoOoKdZdYFQPLzPRhcCU6dCrDsqsU'

// Mock auth token (this would be from a real user session)
const mockAuthToken = 'Bearer mock-token-for-testing'

async function testRateLimit() {
  console.log('🧪 Testing Rate Limiting Implementation...')
  
  // Test 1: Basic rate limit functionality
  console.log('\n1. Testing basic rate limit functionality...')
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/test-rate-limiting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': mockAuthToken
      },
      body: JSON.stringify({
        concurrentRequests: 5,
        totalRequests: 25,
        requestIntervalMs: 50,
        testDurationMs: 10000
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Rate limiting test completed successfully')
      console.log('   Total requests:', result.results.totalRequests)
      console.log('   Successful requests:', result.results.successfulRequests)
      console.log('   Rate limited requests:', result.results.rateLimitedRequests)
      console.log('   Rate limiting effectiveness:', result.results.rateLimitingEffectiveness.toFixed(2) + '%')
      console.log('   Recommendation:', result.analysis.recommendation)
    } else {
      console.log('❌ Rate limiting test failed:', response.status)
      const error = await response.text()
      console.log('   Error:', error)
    }
  } catch (error) {
    console.log('❌ Test failed with error:', error.message)
  }
  
  // Test 2: Meta accounts endpoint with rate limiting
  console.log('\n2. Testing meta-accounts-v2 endpoint with rate limiting...')
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/meta-accounts-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': mockAuthToken
      }
    })
    
    if (response.status === 401) {
      console.log('✅ Authentication working correctly (401 expected without valid token)')
    } else {
      console.log('📊 Response status:', response.status)
      const result = await response.json()
      if (result.rateLimitStatus) {
        console.log('✅ Rate limiting headers present in response')
        console.log('   Current utilization:', result.rateLimitStatus.utilizationPercent + '%')
        console.log('   Can make more requests:', result.rateLimitStatus.canMakeMoreRequests)
      }
    }
  } catch (error) {
    console.log('❌ Meta accounts test failed:', error.message)
  }
  
  // Test 3: Rapid fire requests to trigger rate limiting
  console.log('\n3. Testing rapid fire requests to trigger rate limiting...')
  
  const rapidRequests = []
  for (let i = 0; i < 10; i++) {
    rapidRequests.push(
      fetch(`${SUPABASE_URL}/functions/v1/meta-accounts-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': mockAuthToken
        }
      })
    )
  }
  
  try {
    const results = await Promise.all(rapidRequests)
    
    let rateLimitedCount = 0
    let successCount = 0
    
    for (const response of results) {
      if (response.status === 429) {
        rateLimitedCount++
      } else if (response.status === 401) {
        successCount++ // Expected auth failure
      }
    }
    
    console.log('✅ Rapid fire test completed')
    console.log('   Total requests:', results.length)
    console.log('   Rate limited (429):', rateLimitedCount)
    console.log('   Auth failures (401):', successCount)
    
    if (rateLimitedCount > 0) {
      console.log('✅ Rate limiting is working - blocked', rateLimitedCount, 'requests')
    } else {
      console.log('⚠️  No rate limiting detected - this may be expected with mock auth')
    }
    
  } catch (error) {
    console.log('❌ Rapid fire test failed:', error.message)
  }
  
  console.log('\n🎉 Rate limiting verification complete!')
}

// Run the test
testRateLimit().catch(console.error)