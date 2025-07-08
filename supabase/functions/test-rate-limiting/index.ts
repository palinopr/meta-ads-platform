import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getRateLimiter } from '../_shared/rate-limiter.ts'
import { initializeMonitoring } from '../_shared/monitoring.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoadTestConfig {
  concurrentRequests: number;
  totalRequests: number;
  requestIntervalMs: number;
  testDurationMs: number;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{ type: string; count: number; message: string }>;
  rateLimitingEffectiveness: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting rate limiting load test...')
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            Authorization: req.headers.get('Authorization')! 
          } 
        } 
      }
    )

    // Initialize monitoring system
    const monitor = initializeMonitoring(supabaseClient)

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('User error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse test configuration
    let testConfig: LoadTestConfig
    try {
      const body = await req.json()
      testConfig = {
        concurrentRequests: body.concurrentRequests || 10,
        totalRequests: body.totalRequests || 100,
        requestIntervalMs: body.requestIntervalMs || 100,
        testDurationMs: body.testDurationMs || 30000
      }
    } catch (e) {
      testConfig = {
        concurrentRequests: 10,
        totalRequests: 100,
        requestIntervalMs: 100,
        testDurationMs: 30000
      }
    }

    console.log('Load test configuration:', testConfig)

    // Initialize rate limiter for testing
    const rateLimiter = getRateLimiter('test-account', user.id)

    // Test results tracking
    const results: LoadTestResult = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitedRequests: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      errors: [],
      rateLimitingEffectiveness: 0
    }

    const responseTimes: number[] = []
    const errorCounts = new Map<string, number>()

    // Function to simulate API request
    async function simulateRequest(requestId: number): Promise<{
      success: boolean;
      responseTime: number;
      error?: string;
      rateLimited?: boolean;
    }> {
      const startTime = Date.now()
      
      try {
        // Check rate limit
        const limitCheck = rateLimiter.canMakeRequest(false)
        
        if (!limitCheck.allowed) {
          // Rate limited - this is expected behavior
          return {
            success: false,
            responseTime: Date.now() - startTime,
            error: 'Rate limited',
            rateLimited: true
          }
        }

        // Record the request
        rateLimiter.recordRequest(false)

        // Record in monitoring
        monitor.recordAPIUsage({
          userId: user.id,
          accountId: 'test-account',
          endpoint: '/test-rate-limiting',
          httpMethod: 'GET',
          statusCode: 200,
          responseTimeMs: Date.now() - startTime,
          requestPoints: 1,
          rateLimitUtilization: rateLimiter.getStatus().utilizationPercent
        })

        // Simulate API processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100))

        return {
          success: true,
          responseTime: Date.now() - startTime
        }

      } catch (error: any) {
        return {
          success: false,
          responseTime: Date.now() - startTime,
          error: error.message || 'Unknown error'
        }
      }
    }

    // Run load test
    console.log('Starting load test execution...')
    const startTime = Date.now()
    
    const promises: Promise<any>[] = []
    
    // Create concurrent request batches
    for (let batch = 0; batch < Math.ceil(testConfig.totalRequests / testConfig.concurrentRequests); batch++) {
      const batchPromises: Promise<any>[] = []
      
      for (let i = 0; i < testConfig.concurrentRequests && results.totalRequests < testConfig.totalRequests; i++) {
        const requestId = results.totalRequests++
        
        batchPromises.push(
          simulateRequest(requestId).then(result => {
            responseTimes.push(result.responseTime)
            
            if (result.success) {
              results.successfulRequests++
            } else {
              results.failedRequests++
              
              if (result.rateLimited) {
                results.rateLimitedRequests++
              }
              
              if (result.error) {
                const count = errorCounts.get(result.error) || 0
                errorCounts.set(result.error, count + 1)
              }
            }
          })
        )
      }
      
      // Wait for current batch to complete
      await Promise.all(batchPromises)
      
      // Wait between batches
      if (batch < Math.ceil(testConfig.totalRequests / testConfig.concurrentRequests) - 1) {
        await new Promise(resolve => setTimeout(resolve, testConfig.requestIntervalMs))
      }
      
      // Check if we've exceeded test duration
      if (Date.now() - startTime > testConfig.testDurationMs) {
        console.log('Test duration exceeded, stopping...')
        break
      }
    }

    const totalDuration = Date.now() - startTime

    // Calculate results
    results.averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0

    results.requestsPerSecond = results.totalRequests / (totalDuration / 1000)

    results.errors = Array.from(errorCounts.entries()).map(([type, count]) => ({
      type,
      count,
      message: `${count} requests failed with: ${type}`
    }))

    // Calculate rate limiting effectiveness
    // Higher percentage means rate limiting is working well
    results.rateLimitingEffectiveness = results.totalRequests > 0 
      ? (results.rateLimitedRequests / results.totalRequests) * 100
      : 0

    // Get final rate limiter status
    const finalRateLimitStatus = rateLimiter.getStatus()
    
    // Get monitoring stats
    const usageStats = monitor.getUsageStats(user.id, 'test-account')

    console.log('Load test completed:', {
      duration: totalDuration,
      totalRequests: results.totalRequests,
      successRate: (results.successfulRequests / results.totalRequests) * 100,
      rateLimitingEffectiveness: results.rateLimitingEffectiveness
    })

    return new Response(
      JSON.stringify({
        testConfig,
        results,
        duration: totalDuration,
        rateLimitStatus: {
          utilizationPercent: Math.round(finalRateLimitStatus.utilizationPercent),
          currentPoints: finalRateLimitStatus.currentPoints,
          maxPoints: finalRateLimitStatus.maxPoints,
          isBlocked: finalRateLimitStatus.isBlocked,
          canMakeRead: finalRateLimitStatus.canMakeRead,
          canMakeWrite: finalRateLimitStatus.canMakeWrite
        },
        monitoring: {
          totalRequests: usageStats.totalRequests,
          errorRate: usageStats.errorRate,
          avgResponseTime: usageStats.avgResponseTime,
          activeAlerts: usageStats.activeAlerts.length,
          recentErrors: usageStats.recentErrors.length
        },
        analysis: {
          rateLimitingWorking: results.rateLimitingEffectiveness > 0,
          systemStable: results.failedRequests / results.totalRequests < 0.5,
          averageResponseTimeGood: results.averageResponseTime < 1000,
          requestsPerSecondAchieved: results.requestsPerSecond,
          recommendation: results.rateLimitingEffectiveness > 20 
            ? 'Rate limiting is working effectively'
            : 'Rate limiting may need adjustment - too few requests were limited'
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Load test error:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Load test failed',
        type: error.name,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})