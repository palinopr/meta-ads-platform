import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validate environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error('Missing required environment variables')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check for authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    let body
    try {
      body = await req.json()
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { account_id } = body
    
    if (!account_id) {
      return new Response(
        JSON.stringify({ error: 'account_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Syncing campaigns for account:', account_id)

    // Check if environment variables are available
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client for auth
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { 
        global: { 
          headers: { 
            Authorization: authHeader 
          } 
        } 
      }
    )

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Meta access token using admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('meta_access_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.meta_access_token) {
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: 'No Meta access token found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the ad account record using admin client
    const { data: adAccount, error: adAccountError } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('id')
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .single()

    if (adAccountError || !adAccount) {
      console.error('Ad account error:', adAccountError)
      return new Response(
        JSON.stringify({ error: 'Ad account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch campaigns from Meta API
    const metaUrl = `https://graph.facebook.com/v19.0/act_${account_id}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time,start_time,stop_time&limit=100&access_token=${profile.meta_access_token}`
    
    const metaResponse = await fetch(metaUrl)
    
    if (!metaResponse.ok) {
      const errorData = await metaResponse.json()
      console.error('Meta API error:', errorData)
      
      if (errorData.error?.code === 190) {
        return new Response(
          JSON.stringify({ 
            error: 'Meta access token is invalid or expired',
            tokenExpired: true 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorData.error?.message || 'Failed to fetch campaigns from Meta' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const metaData = await metaResponse.json()
    console.log(`Fetched ${metaData.data?.length || 0} campaigns from Meta API`)

    // Transform and upsert campaigns
    if (metaData.data && metaData.data.length > 0) {
      const campaignsToUpsert = metaData.data.map((campaign: any) => ({
        ad_account_id: adAccount.id,
        campaign_id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null, // Convert from cents
        lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
        created_time: campaign.created_time,
        updated_time: campaign.updated_time || campaign.created_time,
        start_time: campaign.start_time || null,
        stop_time: campaign.stop_time || null,
        is_active: campaign.status === 'ACTIVE',
        updated_at: new Date().toISOString()
      }))

      // Upsert campaigns in batches
      const batchSize = 20
      const upsertedCampaigns: any[] = []
      
      for (let i = 0; i < campaignsToUpsert.length; i += batchSize) {
        const batch = campaignsToUpsert.slice(i, i + batchSize)
        const { data: batchData, error: batchError } = await supabaseAdmin
          .from('campaigns')
          .upsert(batch, { 
            onConflict: 'ad_account_id,campaign_id',
            ignoreDuplicates: false 
          })
          .select()
        
        if (batchError) {
          console.error(`Error upserting batch ${i / batchSize + 1}:`, batchError)
        } else if (batchData) {
          upsertedCampaigns.push(...batchData)
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          campaigns: upsertedCampaigns,
          totalFetched: metaData.data.length,
          totalSaved: upsertedCampaigns.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        campaigns: [],
        message: 'No campaigns found for this account'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in sync-campaigns:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})