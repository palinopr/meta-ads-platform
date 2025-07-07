import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { campaign_id, date_preset = 'last_30d' } = body
    
    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: 'campaign_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Syncing metrics for campaign:', campaign_id, 'with date preset:', date_preset)

    // Create Supabase clients
    const supabaseClient = createClient(
      supabaseUrl!,
      supabaseAnonKey!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const supabaseAdmin = createClient(
      supabaseUrl!,
      supabaseServiceRoleKey!
    )

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Meta access token
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

    // Get the campaign details to verify ownership
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select(`
        id,
        campaign_id,
        ad_account_id,
        meta_ad_accounts!inner(
          user_id,
          account_id
        )
      `)
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user owns this campaign
    if (campaign.meta_ad_accounts.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch metrics from Meta API
    const fields = 'date_start,date_stop,impressions,clicks,ctr,cpc,cpm,spend,conversions,conversion_values,frequency,reach'
    const metaUrl = `https://graph.facebook.com/v19.0/${campaign.campaign_id}/insights?fields=${fields}&date_preset=${date_preset}&time_increment=1&access_token=${profile.meta_access_token}`
    
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
          error: errorData.error?.message || 'Failed to fetch metrics from Meta' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const metaData = await metaResponse.json()
    console.log(`Fetched ${metaData.data?.length || 0} days of metrics from Meta API`)

    // Transform and upsert metrics
    if (metaData.data && metaData.data.length > 0) {
      const metricsToUpsert = metaData.data.map((metric: any) => {
        // Calculate ROAS if we have conversion values
        let roas = 0
        if (metric.spend && metric.conversion_values) {
          const totalValue = metric.conversion_values.reduce((sum: number, cv: any) => 
            sum + (parseFloat(cv.value) || 0), 0
          )
          roas = totalValue / (parseFloat(metric.spend) || 1)
        }

        return {
          campaign_id: campaign.id,
          date_start: metric.date_start,
          date_stop: metric.date_stop,
          impressions: parseInt(metric.impressions) || 0,
          clicks: parseInt(metric.clicks) || 0,
          ctr: parseFloat(metric.ctr) || 0,
          cpc: parseFloat(metric.cpc) || 0,
          cpm: parseFloat(metric.cpm) || 0,
          spend: parseFloat(metric.spend) || 0,
          conversions: parseInt(metric.conversions) || 0,
          conversion_rate: metric.impressions > 0 ? 
            (parseInt(metric.conversions) || 0) / parseInt(metric.impressions) * 100 : 0,
          roas: roas,
          frequency: parseFloat(metric.frequency) || 1,
          reach: parseInt(metric.reach) || 0,
          updated_at: new Date().toISOString()
        }
      })

      // Upsert metrics
      const { data: upsertedMetrics, error: upsertError } = await supabaseAdmin
        .from('campaign_metrics')
        .upsert(metricsToUpsert, { 
          onConflict: 'campaign_id,date_start',
          ignoreDuplicates: false 
        })
        .select()

      if (upsertError) {
        console.error('Error upserting metrics:', upsertError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to save metrics',
            details: upsertError 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Calculate summary statistics
      const totalSpend = metricsToUpsert.reduce((sum: number, m: any) => sum + m.spend, 0)
      const totalConversions = metricsToUpsert.reduce((sum: number, m: any) => sum + m.conversions, 0)
      const avgCtr = metricsToUpsert.reduce((sum: number, m: any) => sum + m.ctr, 0) / metricsToUpsert.length
      const avgRoas = metricsToUpsert.reduce((sum: number, m: any) => sum + m.roas, 0) / metricsToUpsert.length

      return new Response(
        JSON.stringify({ 
          success: true,
          metrics: upsertedMetrics,
          summary: {
            totalDays: metricsToUpsert.length,
            totalSpend: totalSpend.toFixed(2),
            totalConversions,
            avgCtr: avgCtr.toFixed(2),
            avgRoas: avgRoas.toFixed(2)
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        metrics: [],
        message: 'No metrics data available for this campaign'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in sync-campaign-metrics:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})