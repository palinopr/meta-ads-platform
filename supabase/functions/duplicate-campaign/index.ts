import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getRateLimiter, rateLimitedFetch } from '../_shared/rate-limiter.ts'
import { getDecryptedMetaToken } from '../_shared/token-encryption.ts'
import { withSentryMonitoring } from '../_shared/sentry-config.ts'

interface DuplicateCampaignData {
  campaign_id: string
  new_name?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(withSentryMonitoring('duplicate-campaign', async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('duplicate-campaign: Starting...')
    
    // Parse request body
    let duplicateData: DuplicateCampaignData
    try {
      const body = await req.json()
      duplicateData = body
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate required fields
    const { campaign_id } = duplicateData
    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: 'campaign_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Duplicating campaign:', campaign_id)

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

    // Get campaign from database to verify ownership and get details
    const { data: originalCampaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !originalCampaign) {
      console.error('Campaign error:', campaignError)
      return new Response(
        JSON.stringify({ error: 'Campaign not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Initialize rate limiter for this account/user
    const rateLimiter = getRateLimiter(originalCampaign.account_id, user.id)
    
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

    try {
      console.log('Duplicating campaign in Meta API with rate limiting...')
      
      // Generate new campaign name
      const newName = duplicateData.new_name || `${originalCampaign.name} (Copy)`
      
      // Prepare campaign data for Meta API (duplicate with new name)
      const metaCampaignData = {
        name: newName,
        objective: originalCampaign.objective,
        status: 'PAUSED', // Always create duplicates as paused for safety
        access_token: accessToken
      }

      // Add budget fields from original campaign
      if (originalCampaign.daily_budget && originalCampaign.daily_budget > 0) {
        metaCampaignData.daily_budget = Math.round(originalCampaign.daily_budget * 100) // Convert to cents
      }
      if (originalCampaign.lifetime_budget && originalCampaign.lifetime_budget > 0) {
        metaCampaignData.lifetime_budget = Math.round(originalCampaign.lifetime_budget * 100) // Convert to cents
      }

      console.log('Meta API duplicate payload:', metaCampaignData)

      const metaUrl = `https://graph.facebook.com/v19.0/act_${originalCampaign.account_id}/campaigns`
      
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
            error: errorData.error?.message || 'Failed to duplicate campaign in Meta API',
            metaError: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const metaResult = JSON.parse(responseText)
      console.log('Campaign duplicated in Meta API:', metaResult)
      
      // Store duplicated campaign in our database
      const campaignRecord = {
        campaign_id: metaResult.id,
        account_id: originalCampaign.account_id,
        user_id: user.id,
        name: newName,
        objective: originalCampaign.objective,
        status: 'PAUSED',
        daily_budget: originalCampaign.daily_budget,
        lifetime_budget: originalCampaign.lifetime_budget,
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
        return new Response(
          JSON.stringify({ 
            success: true,
            campaign: campaignRecord,
            warning: 'Campaign duplicated in Meta but may not be saved locally. Please refresh to see it.',
            metaId: metaResult.id
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
          originalCampaign: originalCampaign,
          metaId: metaResult.id,
          message: 'Campaign has been successfully duplicated',
          rateLimitStatus: {
            utilizationPercent: Math.round(finalRateLimitStatus.utilizationPercent),
            canMakeMoreRequests: finalRateLimitStatus.canMakeWrite,
            pointsUsed: finalRateLimitStatus.currentPoints,
            maxPoints: finalRateLimitStatus.maxPoints
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
      
    } catch (fetchError: any) {
      console.error('Campaign duplication error:', fetchError)
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to duplicate campaign: ${fetchError.message}`,
          fetchError: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error: any) {
    console.error('Unexpected error in duplicate-campaign:', error)
    
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