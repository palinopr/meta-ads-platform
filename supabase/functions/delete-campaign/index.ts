import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getRateLimiter, rateLimitedFetch } from '../_shared/rate-limiter.ts'
import { getDecryptedMetaToken } from '../_shared/token-encryption.ts'
import { withSentryMonitoring } from '../_shared/sentry-config.ts'

interface DeleteCampaignData {
  campaign_id: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(withSentryMonitoring('delete-campaign', async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('delete-campaign: Starting...')
    
    // Parse request body
    let deleteData: DeleteCampaignData
    try {
      const body = await req.json()
      deleteData = body
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate required fields
    const { campaign_id } = deleteData
    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: 'campaign_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Deleting campaign:', campaign_id)

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

    // Get campaign from database to verify ownership and get account_id
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      console.error('Campaign error:', campaignError)
      return new Response(
        JSON.stringify({ error: 'Campaign not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Safety check: Prevent deletion of active campaigns with significant spend
    if (campaign.status === 'ACTIVE' && (campaign.daily_budget > 100 || campaign.lifetime_budget > 500)) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot delete active campaigns with significant budget. Please pause the campaign first.',
          requiresPause: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const rateLimiter = getRateLimiter(campaign.account_id, user.id)
    
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
      console.log('Deleting campaign in Meta API with rate limiting...')
      
      // Meta API requires setting status to DELETED
      const metaUpdateData = {
        status: 'DELETED',
        access_token: accessToken
      }

      console.log('Meta API delete payload:', metaUpdateData)

      const metaUrl = `https://graph.facebook.com/v19.0/${campaign_id}`
      
      const metaResponse = await rateLimitedFetch(metaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaUpdateData)
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
            error: errorData.error?.message || 'Failed to delete campaign in Meta API',
            metaError: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const metaResult = JSON.parse(responseText)
      console.log('Campaign deleted in Meta API:', metaResult)
      
      // Update campaign status in our database (mark as deleted, don't actually delete)
      const { data: updatedCampaign, error: updateError } = await supabaseClient
        .from('campaigns')
        .update({ 
          status: 'DELETED',
          updated_time: new Date().toISOString()
        })
        .eq('campaign_id', campaign_id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Database update error:', updateError)
        return new Response(
          JSON.stringify({ 
            success: true,
            warning: 'Campaign deleted in Meta but may not be marked as deleted locally. Please refresh to see changes.',
            campaign: { ...campaign, status: 'DELETED' }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Include rate limit info in response
      const finalRateLimitStatus = rateLimiter.getStatus()
      
      return new Response(
        JSON.stringify({ 
          success: true,
          campaign: updatedCampaign,
          message: 'Campaign has been successfully deleted',
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
      console.error('Campaign deletion error:', fetchError)
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to delete campaign: ${fetchError.message}`,
          fetchError: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error: any) {
    console.error('Unexpected error in delete-campaign:', error)
    
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