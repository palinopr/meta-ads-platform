import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('sync-campaigns-v3: Starting...')
    
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

    // Get user's Meta access token directly (no decryption)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('meta_access_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.meta_access_token) {
      return new Response(
        JSON.stringify({ error: 'No Meta access token found. Please reconnect your Meta account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = profile.meta_access_token

    // Get the ad account record
    const { data: adAccount, error: adAccountError } = await supabaseClient
      .from('meta_ad_accounts')
      .select('id')
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .single()

    if (adAccountError) {
      console.error('Ad account error:', adAccountError)
      return new Response(
        JSON.stringify({ error: 'Ad account not found. Please select a valid account.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching campaigns from Meta API...')
    
    // Fetch campaigns from Meta API
    const metaUrl = `https://graph.facebook.com/v19.0/act_${account_id}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,created_time,updated_time,start_time,stop_time&limit=250&access_token=${accessToken}`
    
    const metaResponse = await fetch(metaUrl)
    const responseText = await metaResponse.text()
    
    if (!metaResponse.ok) {
      console.error('Meta API error:', responseText)
      
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { error: { message: responseText } }
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorData.error?.message || 'Failed to fetch campaigns from Meta',
          metaError: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const metaData = JSON.parse(responseText)
    console.log(`Fetched ${metaData.data?.length || 0} campaigns from Meta API`)

    // Store campaigns in database
    const campaignsToInsert = (metaData.data || []).map((campaign: any) => ({
      campaign_id: campaign.id,
      account_id: adAccount.id,
      name: campaign.name,
      objective: campaign.objective || 'UNKNOWN',
      status: campaign.status || 'UNKNOWN',
      daily_budget: campaign.daily_budget ? parseInt(campaign.daily_budget) / 100 : null,
      lifetime_budget: campaign.lifetime_budget ? parseInt(campaign.lifetime_budget) / 100 : null,
      start_time: campaign.start_time || null,
      stop_time: campaign.stop_time || null,
      created_time: campaign.created_time,
      updated_time: campaign.updated_time || campaign.created_time,
      user_id: user.id
    }))

    if (campaignsToInsert.length > 0) {
      // Delete existing campaigns for this account
      const { error: deleteError } = await supabaseClient
        .from('campaigns')
        .delete()
        .eq('account_id', adAccount.id)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Error deleting existing campaigns:', deleteError)
      }

      // Insert new campaigns
      const { data: insertedCampaigns, error: insertError } = await supabaseClient
        .from('campaigns')
        .insert(campaignsToInsert)
        .select()

      if (insertError) {
        console.error('Error inserting campaigns:', insertError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to save campaigns to database',
            details: insertError.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Successfully saved ${insertedCampaigns?.length || 0} campaigns`)
    }

    // Fetch the campaigns from database to return
    const { data: campaigns, error: fetchError } = await supabaseClient
      .from('campaigns')
      .select('*')
      .eq('account_id', adAccount.id)
      .order('created_time', { ascending: false })

    if (fetchError) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch campaigns',
          details: fetchError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        campaigns: campaigns || [],
        synced: campaignsToInsert.length,
        fromApi: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error in sync-campaigns-v3:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        unexpectedError: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})