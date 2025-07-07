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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { account_id } = await req.json()

    // Get user's Meta access token
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('meta_access_token')
      .eq('id', user.id)
      .single()

    if (!profile?.meta_access_token) {
      return new Response(
        JSON.stringify({ error: 'No Meta access token found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify account ownership
    const { data: account } = await supabaseClient
      .from('meta_ad_accounts')
      .select('id')
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .single()

    if (!account) {
      return new Response(
        JSON.stringify({ error: 'Account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch campaigns from Meta API
    const campaignsResponse = await fetch(
      `https://graph.facebook.com/v19.0/${account_id}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time&access_token=${profile.meta_access_token}`
    )

    if (!campaignsResponse.ok) {
      throw new Error('Failed to fetch campaigns from Meta')
    }

    const campaignsData = await campaignsResponse.json()

    // Save campaigns to database
    if (campaignsData.data && campaignsData.data.length > 0) {
      const campaignsToUpsert = campaignsData.data.map((campaign: any) => ({
        ad_account_id: account.id,
        campaign_id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
        lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
        created_time: campaign.created_time,
        updated_at: new Date().toISOString()
      }))

      await supabaseClient
        .from('campaigns')
        .upsert(campaignsToUpsert, { onConflict: 'campaign_id' })

      // Fetch metrics for each campaign (last 30 days)
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      for (const campaign of campaignsData.data) {
        const metricsResponse = await fetch(
          `https://graph.facebook.com/v19.0/${campaign.id}/insights?fields=impressions,clicks,ctr,cpc,cpm,spend,conversions,cost_per_conversion&time_range={'since':'${startDate}','until':'${endDate}'}&access_token=${profile.meta_access_token}`
        )

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json()
          
          if (metricsData.data && metricsData.data.length > 0) {
            const metrics = metricsData.data[0]
            
            await supabaseClient
              .from('campaign_metrics')
              .upsert({
                campaign_id: campaign.id,
                date_start: startDate,
                date_stop: endDate,
                impressions: parseInt(metrics.impressions || 0),
                clicks: parseInt(metrics.clicks || 0),
                ctr: parseFloat(metrics.ctr || 0),
                cpc: parseFloat(metrics.cpc || 0),
                cpm: parseFloat(metrics.cpm || 0),
                spend: parseFloat(metrics.spend || 0),
                conversions: parseInt(metrics.conversions || 0),
                cost_per_conversion: parseFloat(metrics.cost_per_conversion || 0),
                roas: metrics.conversions > 0 ? (metrics.conversions * 50) / metrics.spend : 0 // Assuming $50 average order value
              }, { onConflict: 'campaign_id,date_start' })
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Sync completed successfully',
        campaigns_synced: campaignsData.data?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})