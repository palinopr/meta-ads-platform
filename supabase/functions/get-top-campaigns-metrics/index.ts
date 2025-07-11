import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CampaignMetrics {
  id: string
  name: string
  status: string
  objective: string
  spend: number
  revenue: number
  roas: number
  conversions: number
  clicks: number
  impressions: number
  cpc: number
  cpm: number
  ctr: number
  account_id: string
  account_name?: string
}

interface FacebookCampaignInsight {
  campaign_id: string
  campaign_name: string
  campaign_status: string
  objective: string
  spend: string
  impressions: string
  clicks: string
  cpc?: string
  cpm?: string
  ctr?: string
  actions?: Array<{
    action_type: string
    value: string
  }>
  action_values?: Array<{
    action_type: string
    value: string
  }>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { 
      account_ids, 
      date_preset = 'last_30d', 
      sort_by = 'spend',
      limit = 10,
      status_filter = 'all' // 'all', 'active', 'paused'
    } = await req.json()

    if (!account_ids || !Array.isArray(account_ids) || account_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Account IDs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user and their access token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Meta access token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('meta_access_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.meta_access_token) {
      return new Response(
        JSON.stringify({ error: 'Meta access token not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get account names for display
    const { data: accountsData } = await supabase
      .from('meta_ad_accounts')
      .select('account_id, account_name')
      .in('account_id', account_ids)
      .eq('user_id', user.id)

    const accountNameMap = new Map(
      (accountsData || []).map(acc => [acc.account_id, acc.account_name])
    )

    // Aggregate campaigns from all accounts
    const allCampaigns: CampaignMetrics[] = []

    // Fetch campaign insights from Meta API for each account
    for (const account_id of account_ids) {
      try {
        const fields = [
          'campaign_id',
          'campaign_name',
          'campaign_status',
          'objective',
          'spend',
          'impressions', 
          'clicks',
          'cpc',
          'cpm',
          'ctr',
          'actions',
          'action_values'
        ].join(',')

        const metaUrl = `https://graph.facebook.com/v19.0/act_${account_id}/insights?` +
          `fields=${fields}&` +
          `level=campaign&` +
          `date_preset=${date_preset}&` +
          `limit=500&` + // Get more campaigns to find top performers
          `access_token=${profile.meta_access_token}`

        console.log(`Fetching campaign insights for account ${account_id}`)

        const metaResponse = await fetch(metaUrl)
        const metaData = await metaResponse.json()

        if (metaData.error) {
          console.error(`Meta API error for account ${account_id}:`, metaData.error)
          continue // Skip this account but continue with others
        }

        // Process each campaign
        for (const insight of (metaData.data || [])) {
          // Apply status filter if needed
          if (status_filter !== 'all') {
            if (status_filter === 'active' && insight.campaign_status !== 'ACTIVE') continue
            if (status_filter === 'paused' && insight.campaign_status !== 'PAUSED') continue
          }

          const spend = parseFloat(insight.spend) || 0
          const impressions = parseInt(insight.impressions) || 0
          const clicks = parseInt(insight.clicks) || 0
          const cpc = parseFloat(insight.cpc) || 0
          const cpm = parseFloat(insight.cpm) || 0
          const ctr = parseFloat(insight.ctr) || 0

          // Calculate conversions and revenue from actions
          let conversions = 0
          let revenue = 0

          if (insight.actions) {
            for (const action of insight.actions) {
              if (['purchase', 'complete_registration', 'lead', 'submit_application'].includes(action.action_type)) {
                conversions += parseInt(action.value) || 0
              }
            }
          }

          if (insight.action_values) {
            for (const actionValue of insight.action_values) {
              if (actionValue.action_type === 'purchase') {
                revenue += parseFloat(actionValue.value) || 0
              }
            }
          }

          // Calculate ROAS
          const roas = spend > 0 ? revenue / spend : 0

          allCampaigns.push({
            id: insight.campaign_id,
            name: insight.campaign_name || 'Unnamed Campaign',
            status: insight.campaign_status || 'UNKNOWN',
            objective: insight.objective || 'UNKNOWN',
            spend: Math.round(spend * 100) / 100,
            revenue: Math.round(revenue * 100) / 100,
            roas: Math.round(roas * 100) / 100,
            conversions,
            clicks,
            impressions,
            cpc: Math.round(cpc * 100) / 100,
            cpm: Math.round(cpm * 100) / 100,
            ctr: Math.round(ctr * 100) / 100,
            account_id,
            account_name: accountNameMap.get(account_id) || `Account ${account_id}`
          })
        }

        // Handle pagination if there are more results
        if (metaData.paging?.next) {
          console.log(`Note: More campaigns available for account ${account_id}, implement pagination if needed`)
        }

      } catch (error) {
        console.error(`Error fetching campaigns for account ${account_id}:`, error)
        // Continue with other accounts
      }
    }

    // Sort campaigns based on the requested metric
    const sortedCampaigns = allCampaigns.sort((a, b) => {
      switch (sort_by) {
        case 'roas':
          return b.roas - a.roas
        case 'conversions':
          return b.conversions - a.conversions
        case 'revenue':
          return b.revenue - a.revenue
        case 'clicks':
          return b.clicks - a.clicks
        case 'impressions':
          return b.impressions - a.impressions
        case 'ctr':
          return b.ctr - a.ctr
        case 'cpc':
          return a.cpc - b.cpc // Lower is better for CPC
        case 'cpm':
          return a.cpm - b.cpm // Lower is better for CPM
        case 'spend':
        default:
          return b.spend - a.spend
      }
    })

    // Get top campaigns based on limit
    const topCampaigns = sortedCampaigns.slice(0, limit)

    // Calculate summary statistics
    const summary = {
      total_campaigns: allCampaigns.length,
      active_campaigns: allCampaigns.filter(c => c.status === 'ACTIVE').length,
      total_spend: allCampaigns.reduce((sum, c) => sum + c.spend, 0),
      total_revenue: allCampaigns.reduce((sum, c) => sum + c.revenue, 0),
      total_conversions: allCampaigns.reduce((sum, c) => sum + c.conversions, 0),
      average_roas: allCampaigns.length > 0 
        ? allCampaigns.reduce((sum, c) => sum + c.roas, 0) / allCampaigns.length 
        : 0
    }

    console.log(`✅ Successfully fetched ${allCampaigns.length} campaigns from ${account_ids.length} accounts`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaigns: topCampaigns,
        summary,
        accounts_processed: account_ids.length,
        date_preset,
        sort_by,
        limit
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-top-campaigns-metrics function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})