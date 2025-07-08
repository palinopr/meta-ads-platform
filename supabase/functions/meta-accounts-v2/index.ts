import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getRateLimiter, rateLimitedFetch } from '../_shared/rate-limiter.ts'
import { getDecryptedMetaToken } from '../_shared/token-encryption.ts'
import { initializeMonitoring, withAPIMonitoring } from '../_shared/monitoring.ts'
import { withSentryMonitoring, captureBusinessError, capturePerformanceMetric, withPerformanceSpan } from '../_shared/sentry-config.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(withSentryMonitoring('meta-accounts-v2', async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  let accountCount = 0
  let success = false

  try {
    console.log('Starting meta-accounts-v2 function...')
    
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
      captureBusinessError(userError || new Error('No user found'), {
        functionName: 'meta-accounts-v2',
        businessImpact: 'medium',
        affectedRevenue: 'User cannot access ad accounts',
        customerImpact: 'Authentication failure prevents account access',
        additionalContext: { userError: userError?.message }
      })
      return new Response(
        JSON.stringify({ error: 'Unauthorized', accounts: [] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Get user's Meta access token using secure decryption
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const accessToken = await withPerformanceSpan('decrypt-meta-token', 'Decrypt Meta access token from database', async () => {
      return await getDecryptedMetaToken(supabaseAdmin, user.id)
    })

    if (!accessToken) {
      console.log('No Meta access token found for user:', user.id)
      captureBusinessError(new Error('No Meta access token found'), {
        functionName: 'meta-accounts-v2',
        businessImpact: 'high',
        affectedRevenue: 'User cannot access their ad accounts',
        customerImpact: 'Requires reconnection to Meta account',
        additionalContext: { userId: user.id, needsConnection: true }
      })
      return new Response(
        JSON.stringify({ 
          error: 'No Meta access token found. Please connect your Meta account.',
          accounts: [],
          needsConnection: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Meta access token found, length:', accessToken.length)
    console.log('Token starts with:', accessToken.substring(0, 20) + '...')
    console.log('User ID:', user.id)

    console.log('Fetching accounts from Meta API with rate limiting...')
    
    // Initialize rate limiter for this user
    const rateLimiter = getRateLimiter('me', user.id)
    
    // Check rate limit status before making request
    const rateLimitStatus = rateLimiter.getStatus()
    console.log('Rate limit status:', rateLimitStatus)
    
    if (rateLimitStatus.isBlocked) {
      console.log(`Rate limited. Blocked for ${rateLimitStatus.blockedUntilMs}ms`)
      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. Please wait ${Math.ceil(rateLimitStatus.blockedUntilMs / 1000)} seconds before retrying.`,
          accounts: [],
          rateLimited: true,
          waitTimeMs: rateLimitStatus.blockedUntilMs
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Fetch from Meta API with rate limiting and monitoring
    const metaUrl = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,account_status&limit=250&access_token=${accessToken}`
    
    const monitoredAPICall = withAPIMonitoring(
      monitor,
      user.id,
      'me',
      '/me/adaccounts',
      'GET',
      1 // Read call = 1 point
    )
    
    const { response: metaResponse, responseText } = await monitoredAPICall(async () => {
      const response = await rateLimitedFetch(metaUrl, {}, rateLimiter, false)
      const text = await response.text()
      return { response, responseText: text }
    })
    
    if (!metaResponse.ok) {
      console.error('Meta API error:', responseText)
      
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { error: { message: responseText } }
      }
      
      // Check if token is invalid
      if (errorData.error?.code === 190 || metaResponse.status === 401) {
        captureBusinessError(new Error(`Meta token expired: ${errorData.error?.message}`), {
          functionName: 'meta-accounts-v2',
          businessImpact: 'critical',
          affectedRevenue: 'User loses access to all ad accounts',
          customerImpact: 'Must reconnect Meta account to continue',
          additionalContext: { 
            errorCode: errorData.error?.code, 
            userId: user.id,
            tokenExpired: true 
          }
        })
        return new Response(
          JSON.stringify({ 
            error: 'Meta access token is invalid or expired. Please reconnect your Meta account.',
            accounts: [],
            tokenExpired: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      captureBusinessError(new Error(`Meta API error: ${errorData.error?.message}`), {
        functionName: 'meta-accounts-v2',
        businessImpact: 'high',
        affectedRevenue: 'User cannot access ad accounts',
        customerImpact: 'Meta API failure prevents account listing',
        additionalContext: { 
          errorCode: errorData.error?.code,
          errorMessage: errorData.error?.message,
          userId: user.id,
          metaError: true
        }
      })
      
      return new Response(
        JSON.stringify({ 
          error: errorData.error?.message || 'Failed to fetch Meta accounts',
          accounts: [],
          metaError: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const metaData = JSON.parse(responseText)
    console.log('Meta API raw response:', JSON.stringify(metaData, null, 2))
    console.log(`Fetched ${metaData.data?.length || 0} accounts from Meta API`)
    
    // Check if there's a paging object or any other relevant data
    if (metaData.paging) {
      console.log('Meta API paging info:', metaData.paging)
    }
    
    // Transform the data to our format
    const accounts = (metaData.data || []).map((account: any) => {
      console.log('Processing account:', account)
      return {
        account_id: account.id.replace('act_', ''), // Remove act_ prefix
        account_name: account.name || 'Unnamed Account',
        currency: account.currency || 'USD',
        status: account.account_status === 1 ? 'ACTIVE' : 'INACTIVE',
        is_active: account.account_status === 1
      }
    })
    
    console.log('Transformed accounts:', accounts)

    // Update tracking variables for performance monitoring
    accountCount = accounts.length
    success = true
    
    // Capture performance metrics
    const duration = Date.now() - startTime
    capturePerformanceMetric('fetch-meta-accounts', duration, {
      functionName: 'meta-accounts-v2',
      success: true,
      recordCount: accountCount,
      apiCalls: 1,
      additionalMetrics: {
        activeAccounts: accounts.filter(a => a.is_active).length,
        inactiveAccounts: accounts.filter(a => !a.is_active).length
      }
    })

    // Include rate limit info and monitoring data in response
    const finalRateLimitStatus = rateLimiter.getStatus()
    const usageStats = monitor.getUsageStats(user.id, 'me')
    
    return new Response(
      JSON.stringify({ 
        accounts: accounts,
        totalFetched: accounts.length,
        fromApi: true,
        rateLimitStatus: {
          utilizationPercent: Math.round(finalRateLimitStatus.utilizationPercent),
          canMakeMoreRequests: finalRateLimitStatus.canMakeRead,
          pointsUsed: finalRateLimitStatus.currentPoints,
          maxPoints: finalRateLimitStatus.maxPoints
        },
        monitoring: {
          totalRequests: usageStats.totalRequests,
          errorRate: Math.round(usageStats.errorRate * 100) / 100,
          avgResponseTime: Math.round(usageStats.avgResponseTime),
          activeAlerts: usageStats.activeAlerts.length,
          hasErrors: usageStats.recentErrors.length > 0
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error in meta-accounts-v2:', error)
    console.error('Error stack:', error.stack)
    
    // Capture performance metrics for failed request
    const duration = Date.now() - startTime
    capturePerformanceMetric('fetch-meta-accounts', duration, {
      functionName: 'meta-accounts-v2',
      success: false,
      recordCount: accountCount,
      apiCalls: 0,
      additionalMetrics: {
        errorType: error.name || 'UnknownError'
      }
    })

    // Capture unexpected error with critical business impact
    captureBusinessError(error, {
      functionName: 'meta-accounts-v2',
      businessImpact: 'critical',
      affectedRevenue: 'Complete service failure prevents account access',
      customerImpact: 'System error prevents all account operations',
      additionalContext: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        unexpectedError: true
      }
    })
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        accounts: [],
        unexpectedError: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}, { 
  category: 'meta-api',
  criticalPath: true 
}))