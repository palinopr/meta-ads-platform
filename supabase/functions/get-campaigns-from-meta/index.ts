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

    // Get user authentication
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

    // Verify user has access to this ad account
    const { data: adAccount, error: adAccountError } = await supabaseClient
      .from('meta_ad_accounts')
      .select('account_id')
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .single()

    if (adAccountError || !adAccount) {
      return new Response(
        JSON.stringify({ error: 'Ad account not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch campaigns directly from Meta API
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

    // Transform campaigns to match our interface
    const campaigns = (metaData.data || []).map((campaign: any) => ({
      campaign_id: campaign.id,
      account_id: account_id,
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

    return new Response(
      JSON.stringify({ 
        campaigns,
        success: true,
        count: campaigns.length,
        source: 'meta_api'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        campaigns: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})