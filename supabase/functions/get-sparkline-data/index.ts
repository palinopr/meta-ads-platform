import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SparklineData {
  date: string
  value: number
}

interface SparklineResponse {
  totalSpend: SparklineData[]
  totalRevenue: SparklineData[]
  totalConversions: SparklineData[]
  averageRoas: SparklineData[]
  averageCPC: SparklineData[]
  averageCTR: SparklineData[]
  totalClicks: SparklineData[]
  totalImpressions: SparklineData[]
}

async function fetchMetaSparklineData(accessToken: string, accountId: string, datePreset: string = 'last_7d'): Promise<SparklineResponse> {
  const today = new Date()
  const sparklineData: SparklineResponse = {
    totalSpend: [],
    totalRevenue: [],
    totalConversions: [],
    averageRoas: [],
    averageCPC: [],
    averageCTR: [],
    totalClicks: [],
    totalImpressions: []
  }

  // Determine number of days based on date preset
  const daysToFetch = datePreset === 'last_7d' ? 7 : 
                     datePreset === 'last_30d' ? 30 : 
                     datePreset === 'last_90d' ? 90 : 7 // Default to 7 days

  // Fetch data for the specified period
  for (let i = daysToFetch - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    try {
      const fields = 'spend,clicks,impressions,ctr,cpc,actions,action_values'
      const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=${fields}&time_range={"since":"${dateStr}","until":"${dateStr}"}&access_token=${accessToken}`
      
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Meta API error for ${dateStr}: ${response.status}`)
        continue
      }
      
      const data = await response.json()
      const insights = data.data?.[0] || {}
      
      const spend = parseFloat(insights.spend || '0')
      const clicks = parseInt(insights.clicks || '0')
      const impressions = parseInt(insights.impressions || '0')
      const ctr = parseFloat(insights.ctr || '0')
      const cpc = parseFloat(insights.cpc || '0')
      
      // Calculate conversions and revenue
      let conversions = 0
      let revenue = 0
      
      if (insights.actions) {
        conversions = insights.actions
          .filter((action: any) => ['purchase', 'complete_registration', 'lead'].includes(action.action_type))
          .reduce((sum: number, action: any) => sum + parseInt(action.value || '0'), 0)
      }
      
      if (insights.action_values) {
        revenue = insights.action_values
          .filter((av: any) => av.action_type === 'purchase')
          .reduce((sum: number, av: any) => sum + parseFloat(av.value || '0'), 0)
      }
      
      const roas = spend > 0 ? revenue / spend : 0
      
      // Add to sparkline data
      sparklineData.totalSpend.push({ date: dateStr, value: spend })
      sparklineData.totalRevenue.push({ date: dateStr, value: revenue })
      sparklineData.totalConversions.push({ date: dateStr, value: conversions })
      sparklineData.averageRoas.push({ date: dateStr, value: roas })
      sparklineData.averageCPC.push({ date: dateStr, value: cpc })
      sparklineData.averageCTR.push({ date: dateStr, value: ctr })
      sparklineData.totalClicks.push({ date: dateStr, value: clicks })
      sparklineData.totalImpressions.push({ date: dateStr, value: impressions })
      
    } catch (error) {
      console.error(`Error fetching data for ${dateStr}:`, error)
    }
  }
  
  return sparklineData
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { account_id, date_preset = 'last_7d' } = await req.json()

    if (!account_id) {
      return new Response(
        JSON.stringify({ error: 'Account ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching sparkline data for account: ${account_id} with date preset: ${date_preset}`)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role to get profile data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user's Meta access token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('meta_access_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.meta_access_token) {
      return new Response(
        JSON.stringify({ error: 'Meta access token not found. Please connect your Meta account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Direct Meta API pattern - no database validation needed
    // If user has invalid token or account access, Meta API will return error

    // Fetch sparkline data from Meta API
    const sparklineData = await fetchMetaSparklineData(profile.meta_access_token, account_id, date_preset)

    console.log(`Successfully fetched sparkline data for account: ${account_id}`)

    return new Response(
      JSON.stringify(sparklineData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})