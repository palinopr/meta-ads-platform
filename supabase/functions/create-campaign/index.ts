import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getRateLimiter, rateLimitedFetch } from '../_shared/rate-limiter.ts'
import { getDecryptedMetaToken } from '../_shared/token-encryption.ts'
import { withSentryMonitoring } from '../_shared/sentry-config.ts'

interface CampaignData {
  account_id: string
  name: string
  objective: string
  daily_budget?: number
  lifetime_budget?: number
  status?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(withSentryMonitoring('create-campaign', async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('create-campaign: Starting...')
    
    // Parse request body
    let campaignData: CampaignData
    try {
      const body = await req.json()
      campaignData = body
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate required fields
    const { account_id, name, objective } = campaignData
    if (!account_id || !name || !objective) {
      return new Response(
        JSON.stringify({ error: 'account_id, name, and objective are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating campaign:', { account_id, name, objective })

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            Authorization: authHeader
          } 
        } 
      }
    )

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('User error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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
      return new Response(
        JSON.stringify({ error: 'No Meta access token found. Please reconnect your Meta account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has access to this ad account
    const { data: adAccount, error: adAccountError } = await supabaseClient
      .from('meta_ad_accounts')
      .select('id')
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .single()

    if (adAccountError || !adAccount) {
      console.error('Ad account error:', adAccountError)
      return new Response(
        JSON.stringify({ error: 'Ad account not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize rate limiter for this account/user
    const rateLimiter = getRateLimiter(account_id, user.id)
    
    // Check rate limit status before making request
    const rateLimitStatus = rateLimiter.getStatus()
    console.log('Rate limit status:', rateLimitStatus)
    
    if (rateLimitStatus.isBlocked) {
      console.log(`Rate limited. Blocked for ${rateLimitStatus.blockedUntilMs}ms`)
      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. Please wait ${Math.ceil(rateLimitStatus.blockedUntilMs / 1000)} seconds before retrying.`,
          rateLimited: true,
          waitTimeMs: rateLimitStatus.blockedUntilMs
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare campaign data for Meta API
    const metaCampaignData = {
      name: name,
      objective: objective,
      status: campaignData.status || 'PAUSED', // Always create as paused initially for safety
      access_token: accessToken
    }

    // Add budget fields if provided
    if (campaignData.daily_budget && campaignData.daily_budget > 0) {
      metaCampaignData.daily_budget = Math.round(campaignData.daily_budget * 100) // Convert to cents
    }
    if (campaignData.lifetime_budget && campaignData.lifetime_budget > 0) {
      metaCampaignData.lifetime_budget = Math.round(campaignData.lifetime_budget * 100) // Convert to cents
    }

    console.log('Meta API payload:', metaCampaignData)

    const metaUrl = `https://graph.facebook.com/v19.0/act_${account_id}/campaigns`
    
    const metaResponse = await rateLimitedFetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaCampaignData)
    }, rateLimiter, true) // true for write operation

    const responseText = await metaResponse.text()
    
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
            tokenExpired: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorData.error?.message || 'Failed to create campaign in Meta API',
          metaError: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const metaResult = JSON.parse(responseText)
    console.log('Campaign created in Meta API:', metaResult)
    
    // Store campaign in our database
    const campaignRecord = {
      campaign_id: metaResult.id,
      account_id: account_id,
      user_id: user.id,
      name: name,
      objective: objective,
      status: campaignData.status || 'PAUSED',
      daily_budget: campaignData.daily_budget || null,
      lifetime_budget: campaignData.lifetime_budget || null,
      start_time: null,
      stop_time: null,
      created_time: new Date().toISOString(),
      updated_time: new Date().toISOString()
    }

    const { data: insertedCampaign, error: insertError } = await supabaseClient
      .from('campaigns')
      .insert(campaignRecord)
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      // Campaign was created in Meta but not saved locally
      return new Response(
        JSON.stringify({ 
          success: true,
          campaign: campaignRecord,
          warning: 'Campaign created in Meta but may not be saved locally. Please refresh to see it.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Include rate limit info in response
    const finalRateLimitStatus = rateLimiter.getStatus()
    
    return new Response(
      JSON.stringify({ 
        success: true,
        campaign: insertedCampaign,
        metaId: metaResult.id,
        rateLimitStatus: {
          utilizationPercent: Math.round(finalRateLimitStatus.utilizationPercent),
          canMakeMoreRequests: finalRateLimitStatus.canMakeWrite,
          pointsUsed: finalRateLimitStatus.currentPoints,
          maxPoints: finalRateLimitStatus.maxPoints
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error in create-campaign:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        type: error.name,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}))
