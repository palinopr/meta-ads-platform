import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getRateLimiter, rateLimitedFetch } from '../_shared/rate-limiter.ts'
import { getDecryptedMetaToken } from '../_shared/token-encryption.ts'
import { initializeMonitoring, withAPIMonitoring } from '../_shared/monitoring.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

    const accessToken = await getDecryptedMetaToken(supabaseAdmin, user.id)

    if (!accessToken) {
      console.log('No Meta access token found')
      return new Response(
        JSON.stringify({ 
          error: 'No Meta access token found. Please connect your Meta account.',
          accounts: [],
          needsConnection: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        return new Response(
          JSON.stringify({ 
            error: 'Meta access token is invalid or expired. Please reconnect your Meta account.',
            accounts: [],
            tokenExpired: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
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
    console.log(`Fetched ${metaData.data?.length || 0} accounts from Meta API`)
    
    // Transform the data to our format
    const accounts = (metaData.data || []).map((account: any) => ({
      account_id: account.id.replace('act_', ''), // Remove act_ prefix
      account_name: account.name || 'Unnamed Account',
      currency: account.currency || 'USD',
      status: account.account_status === 1 ? 'ACTIVE' : 'INACTIVE',
      is_active: account.account_status === 1
    }))

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
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        accounts: [],
        unexpectedError: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})