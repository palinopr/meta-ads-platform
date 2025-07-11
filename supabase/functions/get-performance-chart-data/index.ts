import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TimeSeriesDataPoint {
  date: string
  spend: number
  revenue: number
  roas: number
  conversions: number
  cpc: number
  cpm: number
  ctr: number
  impressions: number
  clicks: number
}

interface FacebookInsight {
  date_start: string
  date_stop: string
  spend: string
  impressions: string
  clicks: string
  actions?: Array<{
    action_type: string
    value: string
  }>
  action_values?: Array<{
    action_type: string
    value: string
  }>
  cpc?: string
  cpm?: string
  ctr?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { account_ids, date_preset = 'last_30d', breakdown = 'day' } = await req.json()

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

    // Aggregate data from all accounts
    const aggregatedData = new Map<string, TimeSeriesDataPoint>()

    // Fetch insights from Meta API for each account
    for (const account_id of account_ids) {
      try {
        const fields = [
          'date_start',
          'date_stop',
          'spend',
          'impressions', 
          'clicks',
          'cpc',
          'cpm',
          'ctr',
          'actions',
          'action_values'
        ].join(',')

        // Time increment based on breakdown
        const timeIncrement = breakdown === 'day' ? '1' : breakdown === 'week' ? '7' : '28'

        const metaUrl = `https://graph.facebook.com/v19.0/act_${account_id}/insights?` +
          `fields=${fields}&` +
          `date_preset=${date_preset}&` +
          `time_increment=${timeIncrement}&` +
          `access_token=${profile.meta_access_token}`

        console.log(`Fetching Meta API insights for account ${account_id}`)

        const metaResponse = await fetch(metaUrl)
        const metaData = await metaResponse.json()

        if (metaData.error) {
          console.error(`Meta API error for account ${account_id}:`, metaData.error)
          continue // Skip this account but continue with others
        }

        // Process each insight data point
        for (const insight of (metaData.data || [])) {
          const date = insight.date_start
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

          // Aggregate data by date
          const existing = aggregatedData.get(date) || {
            date,
            spend: 0,
            revenue: 0,
            roas: 0,
            conversions: 0,
            cpc: 0,
            cpm: 0,
            ctr: 0,
            impressions: 0,
            clicks: 0
          }

          existing.spend += spend
          existing.revenue += revenue
          existing.conversions += conversions
          existing.impressions += impressions
          existing.clicks += clicks

          // For averages, we'll recalculate after aggregation
          aggregatedData.set(date, existing)
        }
      } catch (error) {
        console.error(`Error fetching data for account ${account_id}:`, error)
        // Continue with other accounts
      }
    }

    // Convert to array and calculate derived metrics
    const chartData: TimeSeriesDataPoint[] = Array.from(aggregatedData.values()).map(point => {
      // Calculate ROAS
      const roas = point.spend > 0 ? point.revenue / point.spend : 0
      
      // Calculate CPC
      const cpc = point.clicks > 0 ? point.spend / point.clicks : 0
      
      // Calculate CPM
      const cpm = point.impressions > 0 ? (point.spend / point.impressions) * 1000 : 0
      
      // Calculate CTR
      const ctr = point.impressions > 0 ? (point.clicks / point.impressions) * 100 : 0

      return {
        date: point.date,
        spend: Math.round(point.spend * 100) / 100,
        revenue: Math.round(point.revenue * 100) / 100,
        roas: Math.round(roas * 100) / 100,
        conversions: point.conversions,
        cpc: Math.round(cpc * 100) / 100,
        cpm: Math.round(cpm * 100) / 100,
        ctr: Math.round(ctr * 100) / 100,
        impressions: point.impressions,
        clicks: point.clicks
      }
    })

    // Sort by date to ensure chronological order
    chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    console.log(`✅ Successfully fetched ${chartData.length} data points for performance chart`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: chartData,
        accounts_processed: account_ids.length,
        date_preset,
        breakdown,
        data_points: chartData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-performance-chart-data function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})