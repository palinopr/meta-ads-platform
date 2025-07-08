import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ChartDataPoint {
  date: string
  spend: number
  revenue: number
  roas: number
  conversions: number
  cpc: number
  ctr: number
  impressions: number
  clicks: number
}

interface FacebookInsight {
  date_start: string
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
  ctr?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { account_id, date_preset = 'last_30d' } = await req.json()

    if (!account_id) {
      return new Response(
        JSON.stringify({ error: 'Account ID is required' }),
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

    // Fetch insights from Meta API
    const fields = [
      'date_start',
      'spend',
      'impressions', 
      'clicks',
      'cpc',
      'ctr',
      'actions',
      'action_values'
    ].join(',')

    const metaUrl = `https://graph.facebook.com/v19.0/act_${account_id}/insights?` +
      `fields=${fields}&` +
      `date_preset=${date_preset}&` +
      `time_increment=1&` +
      `access_token=${profile.meta_access_token}`

    console.log('Fetching Meta API insights for chart data:', { account_id, date_preset })

    const metaResponse = await fetch(metaUrl)
    const metaData = await metaResponse.json()

    if (metaData.error) {
      console.error('Meta API error:', metaData.error)
      return new Response(
        JSON.stringify({ error: `Meta API error: ${metaData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transform Meta API data to chart format
    const chartData: ChartDataPoint[] = (metaData.data || []).map((insight: FacebookInsight) => {
      const spend = parseFloat(insight.spend) || 0
      const impressions = parseInt(insight.impressions) || 0
      const clicks = parseInt(insight.clicks) || 0
      const cpc = parseFloat(insight.cpc) || 0
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

      return {
        date: insight.date_start,
        spend: Math.round(spend * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        roas: Math.round(roas * 100) / 100,
        conversions,
        cpc: Math.round(cpc * 100) / 100,
        ctr: Math.round(ctr * 100) / 100,
        impressions,
        clicks
      }
    })

    // Sort by date to ensure chronological order
    chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    console.log(`✅ Successfully fetched ${chartData.length} data points for chart`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: chartData,
        account_id,
        date_preset,
        data_points: chartData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-chart-data function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
