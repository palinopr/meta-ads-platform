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

interface CampaignInsight {
  campaign_id: string
  date_start: string
  date_stop: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  ctr: number
  cpc: number
  cpm: number
  cost_per_conversion: number
  purchase_roas?: number
  reach: number
  frequency: number
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

    const { account_id, date_preset = 'last_30d', campaign_ids } = body
    
    if (!account_id) {
      return new Response(
        JSON.stringify({ error: 'account_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Syncing campaign insights for account:', account_id)

    // Create Supabase clients
    const supabaseClient = createClient(
      supabaseUrl!,
      supabaseAnonKey!,
      { 
        global: { 
          headers: { 
            Authorization: authHeader 
          } 
        } 
      }
    )

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!)

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
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: 'No Meta access token found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean account ID (remove act_ prefix if present)
    const cleanAccountId = account_id.replace(/^act_/, '')
    
    // Verify account exists and user has access
    const { data: metaAccount, error: metaAccountError } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('id, account_name')
      .eq('account_id', cleanAccountId)
      .eq('user_id', user.id)
      .single()

    if (metaAccountError || !metaAccount) {
      console.error('Meta account not found:', metaAccountError)
      return new Response(
        JSON.stringify({ error: 'Meta ad account not found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found meta account:', metaAccount.id, metaAccount.account_name)

    // Get campaigns from our database or use provided campaign_ids
    let campaignsToSync: string[] = []
    
    if (campaign_ids && Array.isArray(campaign_ids)) {
      campaignsToSync = campaign_ids
    } else {
      // Fetch campaigns directly from Meta API since our database might not have them yet
      console.log('Fetching campaigns from Meta API for account:', cleanAccountId)
      
      const campaignsUrl = `https://graph.facebook.com/v19.0/act_${cleanAccountId}/campaigns?fields=id,name,status&access_token=${profile.meta_access_token}`
      
      try {
        const campaignsResponse = await fetch(campaignsUrl)
        if (!campaignsResponse.ok) {
          const errorData = await campaignsResponse.json()
          console.error('Meta campaigns API error:', errorData)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch campaigns from Meta API' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        const campaignsData = await campaignsResponse.json()
        campaignsToSync = campaignsData.data?.map((c: any) => c.id) || []
        
      } catch (error) {
        console.error('Error fetching campaigns from Meta:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch campaigns from Meta API' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (campaignsToSync.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No campaigns found for this account',
          insights: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching insights for ${campaignsToSync.length} campaigns`)

    // Fetch insights from Meta API in batches (Meta allows up to 50 campaign IDs per request)
    const batchSize = 25
    const allInsights: CampaignInsight[] = []

    for (let i = 0; i < campaignsToSync.length; i += batchSize) {
      const batch = campaignsToSync.slice(i, i + batchSize)
      const campaignIdsParam = batch.join(',')
      
      // Build Meta API insights URL
      const insightsFields = [
        'campaign_id',
        'date_start',
        'date_stop', 
        'impressions',
        'clicks',
        'spend',
        'conversions',
        'ctr',
        'cpc',
        'cpm',
        'cost_per_conversion',
        'purchase_roas',
        'reach',
        'frequency'
      ].join(',')

      const metaUrl = `https://graph.facebook.com/v19.0/insights?ids=${campaignIdsParam}&fields=${insightsFields}&date_preset=${date_preset}&level=campaign&access_token=${profile.meta_access_token}`
      
      try {
        const metaResponse = await fetch(metaUrl)
        
        if (!metaResponse.ok) {
          const errorData = await metaResponse.json()
          console.error('Meta API error for batch:', errorData)
          
          if (errorData.error?.code === 190) {
            return new Response(
              JSON.stringify({ 
                error: 'Meta access token is invalid or expired',
                tokenExpired: true 
              }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          
          // Continue with other batches if one fails
          console.warn(`Skipping batch due to error: ${errorData.error?.message}`)
          continue
        }

        const batchData = await metaResponse.json()
        
        // Process insights for each campaign in this batch
        for (const campaignId of batch) {
          const campaignInsights = batchData[campaignId]?.data || []
          
          for (const insight of campaignInsights) {
            allInsights.push({
              campaign_id: insight.campaign_id,
              date_start: insight.date_start,
              date_stop: insight.date_stop,
              impressions: parseInt(insight.impressions || '0'),
              clicks: parseInt(insight.clicks || '0'),
              spend: parseFloat(insight.spend || '0'),
              conversions: parseFloat(insight.conversions || '0'),
              ctr: parseFloat(insight.ctr || '0'),
              cpc: parseFloat(insight.cpc || '0'),
              cpm: parseFloat(insight.cpm || '0'),
              cost_per_conversion: parseFloat(insight.cost_per_conversion || '0'),
              purchase_roas: insight.purchase_roas ? parseFloat(insight.purchase_roas) : undefined,
              reach: parseInt(insight.reach || '0'),
              frequency: parseFloat(insight.frequency || '0')
            })
          }
        }
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < campaignsToSync.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
      } catch (error) {
        console.error('Error fetching insights for batch:', error)
        continue
      }
    }

    console.log(`Fetched ${allInsights.length} insight records`)

    // Store insights in database
    const savedInsights: any[] = []
    
    if (allInsights.length > 0) {
      // Prepare insights for database insertion with new schema
      const insightsToUpsert = allInsights.map(insight => ({
        campaign_id: insight.campaign_id,
        account_id: cleanAccountId, // Use TEXT account_id to match new schema
        user_id: user.id,
        date_start: insight.date_start,
        date_stop: insight.date_stop,
        impressions: insight.impressions,
        clicks: insight.clicks,
        spend: insight.spend,
        conversions: insight.conversions,
        ctr: insight.ctr,
        cpc: insight.cpc,
        cpm: insight.cpm,
        roas: insight.purchase_roas || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Upsert insights in smaller batches
      const dbBatchSize = 50
      
      for (let i = 0; i < insightsToUpsert.length; i += dbBatchSize) {
        const batch = insightsToUpsert.slice(i, i + dbBatchSize)
        
        const { data: batchData, error: batchError } = await supabaseAdmin
          .from('campaign_insights')
          .upsert(batch, { 
            onConflict: 'campaign_id,date_start,user_id',
            ignoreDuplicates: false 
          })
          .select()
        
        if (batchError) {
          console.error(`Error upserting insights batch ${i / dbBatchSize + 1}:`, batchError)
        } else if (batchData) {
          savedInsights.push(...batchData)
        }
      }
    }

    // Calculate summary metrics
    const totalSpend = allInsights.reduce((sum, insight) => sum + insight.spend, 0)
    const totalConversions = allInsights.reduce((sum, insight) => sum + insight.conversions, 0)
    const totalImpressions = allInsights.reduce((sum, insight) => sum + insight.impressions, 0)
    const totalClicks = allInsights.reduce((sum, insight) => sum + insight.clicks, 0)
    
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0
    const avgROAS = totalSpend > 0 ? (allInsights.reduce((sum, insight) => {
      const revenue = insight.purchase_roas ? insight.spend * insight.purchase_roas : 0
      return sum + revenue
    }, 0) / totalSpend) : 0

    return new Response(
      JSON.stringify({ 
        success: true,
        insights: savedInsights,
        summary: {
          totalCampaigns: campaignsToSync.length,
          totalInsights: allInsights.length,
          totalSaved: savedInsights.length,
          metrics: {
            totalSpend: Math.round(totalSpend * 100) / 100,
            totalConversions: Math.round(totalConversions),
            totalImpressions: totalImpressions,
            totalClicks: totalClicks,
            avgCTR: Math.round(avgCTR * 100) / 100,
            avgCPC: Math.round(avgCPC * 100) / 100,
            avgROAS: Math.round(avgROAS * 100) / 100
          }
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in sync-campaign-insights:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
