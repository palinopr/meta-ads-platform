import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getRateLimiter, rateLimitedFetch } from '../_shared/rate-limiter.ts'
import { getDecryptedMetaToken } from '../_shared/token-encryption.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('sync-campaigns-v2: Starting...')
    
    // Parse request body
    let account_id
    try {
      const body = await req.json()
      account_id = body.account_id
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!account_id) {
      return new Response(
        JSON.stringify({ error: 'account_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Account ID:', account_id)

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

    // Get the ad account record
    const { data: adAccount, error: adAccountError } = await supabaseClient
      .from('meta_ad_accounts')
      .select('id')
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .single()

    if (adAccountError) {
      console.error('Ad account error:', adAccountError)
      
      // If account not found, we might need to sync accounts first
      return new Response(
        JSON.stringify({ 
          error: 'Ad account not found. Please refresh your ad accounts first.',
          details: adAccountError
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!adAccount) {
      return new Response(
        JSON.stringify({ error: 'Ad account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Ad account found:', adAccount.id)

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
          campaigns: [],
          rateLimited: true,
          waitTimeMs: rateLimitStatus.blockedUntilMs
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      console.log('Fetching campaigns from Meta API with rate limiting...')
      
      // Fetch campaigns from Meta API with rate limiting
      const campaignFields = 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time'
      const metaUrl = `https://graph.facebook.com/v19.0/act_${account_id}/campaigns?fields=${campaignFields}&limit=100&access_token=${accessToken}`
      
      const metaResponse = await rateLimitedFetch(metaUrl, {}, rateLimiter, false)
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
              campaigns: [],
              tokenExpired: true
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        return new Response(
          JSON.stringify({ 
            error: errorData.error?.message || 'Failed to fetch campaigns from Meta API',
            campaigns: [],
            metaError: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const metaData = JSON.parse(responseText)
      console.log(`Fetched ${metaData.data?.length || 0} campaigns from Meta API`)
      
      // Transform and store campaigns in database
      const campaigns = (metaData.data || []).map((campaign: any) => ({
        campaign_id: campaign.id,
        account_id: account_id,
        user_id: user.id,
        name: campaign.name || 'Unnamed Campaign',
        objective: campaign.objective || 'UNKNOWN',
        status: campaign.status || 'UNKNOWN',
        daily_budget: campaign.daily_budget ? parseInt(campaign.daily_budget) : null,
        lifetime_budget: campaign.lifetime_budget ? parseInt(campaign.lifetime_budget) : null,
        start_time: campaign.start_time || null,
        stop_time: campaign.stop_time || null,
        created_time: campaign.created_time || new Date().toISOString(),
        updated_time: campaign.updated_time || new Date().toISOString()
      }))

      // Batch insert/update campaigns in database
      if (campaigns.length > 0) {
        console.log(`Inserting ${campaigns.length} campaigns into database...`)
        
        const { data: insertedCampaigns, error: insertError } = await supabaseClient
          .from('campaigns')
          .upsert(campaigns, { 
            onConflict: 'campaign_id,user_id',
            ignoreDuplicates: false 
          })
          .select()

        if (insertError) {
          console.error('Database insert error:', insertError)
          // Continue anyway, but log the error
        } else {
          console.log(`Successfully synced ${insertedCampaigns?.length || campaigns.length} campaigns`)
        }
      }

      // Include rate limit info in response
      const finalRateLimitStatus = rateLimiter.getStatus()
      
      return new Response(
        JSON.stringify({ 
          success: true,
          campaigns: campaigns,
          totalFetched: campaigns.length,
          accountId: account_id,
          rateLimitStatus: {
            utilizationPercent: Math.round(finalRateLimitStatus.utilizationPercent),
            canMakeMoreRequests: finalRateLimitStatus.canMakeRead,
            pointsUsed: finalRateLimitStatus.currentPoints,
            maxPoints: finalRateLimitStatus.maxPoints
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
      
    } catch (fetchError: any) {
      console.error('Campaign fetch error:', fetchError)
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch campaigns: ${fetchError.message}`,
          campaigns: [],
          fetchError: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error: any) {
    console.error('Unexpected error in sync-campaigns-v2:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        type: error.name,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})