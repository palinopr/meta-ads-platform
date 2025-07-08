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
    console.log('sync-campaigns-direct: Starting...')
    
    // Parse request body
    let account_id
    try {
      const body = await req.json()
      account_id = body.account_id
    } catch (e) {
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

    // Get user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Get Meta token
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
        JSON.stringify({ error: 'No Meta access token found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = profile.meta_access_token

    // Get ad account record
    const { data: adAccount, error: adAccountError } = await supabaseClient
      .from('meta_ad_accounts')
      .select('id')
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .single()

    if (adAccountError || !adAccount) {
      return new Response(
        JSON.stringify({ error: 'Ad account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found ad account:', adAccount.id)

    // Fetch campaigns from Meta API
    console.log('Fetching campaigns from Meta...')
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
    console.log(`Meta returned ${metaData.data?.length || 0} campaigns`)

    if (!metaData.data || metaData.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          campaigns: [],
          message: 'No campaigns found in this Meta account'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transform campaigns for database
    const campaignsToInsert = metaData.data.map((campaign: any) => ({
      campaign_id: campaign.id,
      ad_account_id: adAccount.id,
      name: campaign.name || 'Unnamed Campaign',
      objective: campaign.objective || 'UNKNOWN',
      status: campaign.status || 'UNKNOWN',
      daily_budget: campaign.daily_budget ? parseInt(campaign.daily_budget) / 100 : null,
      lifetime_budget: campaign.lifetime_budget ? parseInt(campaign.lifetime_budget) / 100 : null,
      start_time: campaign.start_time || null,
      stop_time: campaign.stop_time || null,
      created_time: campaign.created_time,
      updated_time: campaign.updated_time || campaign.created_time
    }))

    console.log(`Inserting ${campaignsToInsert.length} campaigns...`)

    // Delete existing campaigns first
    const { error: deleteError } = await supabaseClient
      .from('campaigns')
      .delete()
      .eq('ad_account_id', adAccount.id)

    if (deleteError) {
      console.log('Delete error (continuing):', deleteError.message)
    }

    // Insert new campaigns
    const { data: insertedCampaigns, error: insertError } = await supabaseClient
      .from('campaigns')
      .insert(campaignsToInsert)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save campaigns',
          details: insertError.message,
          campaigns: [] // Return empty for now
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully saved ${insertedCampaigns?.length || 0} campaigns`)

    // Return campaigns with account_id field for frontend compatibility
    const campaignsWithAccountId = (insertedCampaigns || []).map((campaign: any) => ({
      ...campaign,
      account_id: account_id // Add this for frontend compatibility
    }))

    return new Response(
      JSON.stringify({ 
        success: true,
        campaigns: campaignsWithAccountId,
        synced: campaignsToInsert.length,
        fromApi: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        unexpectedError: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})