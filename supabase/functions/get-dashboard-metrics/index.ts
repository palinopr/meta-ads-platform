import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MetaInsight {
  spend: string
  clicks: string
  impressions: string
  ctr: string
  cpc: string
  actions?: Array<{
    action_type: string
    value: string
  }>
}

interface MetaCampaign {
  id: string
  name: string
  status: string
}

interface AgencyMetrics {
  totalSpend: number
  totalClicks: number
  totalImpressions: number
  averageRoas: number
  activeCampaigns: number
  totalConversions: number
  averageCTR: number
  averageCPC: number
  performanceChange: {
    spend: number
    roas: number
    ctr: number
  }
  lastUpdated: string
}

async function fetchMetaInsights(accessToken: string, accountId: string): Promise<MetaInsight[]> {
  const fields = 'spend,clicks,impressions,ctr,cpc,actions'
  const datePreset = 'last_30d'
  
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${accessToken}`
  
  const response = await fetch(url)
  if (!response.ok) {
    console.error(`Meta API error for account ${accountId}: ${response.status}`)
    throw new Error(`Meta API error: ${response.status}`)
  }
  
  const data = await response.json()
  return data.data || []
}

async function fetchMetaCampaigns(accessToken: string, accountId: string): Promise<MetaCampaign[]> {
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/campaigns?fields=id,name,status&access_token=${accessToken}`
  
  const response = await fetch(url)
  if (!response.ok) {
    console.error(`Meta API error for campaigns ${accountId}: ${response.status}`)
    throw new Error(`Meta API error: ${response.status}`)
  }
  
  const data = await response.json()
  return data.data || []
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Get user's Meta access token
    const { data: profile, error: profileError } = await supabaseClient
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

    // Get user's Meta ad accounts (only store account IDs, not campaign data)
    const { data: adAccounts, error: accountsError } = await supabaseClient
      .from('meta_ad_accounts')
      .select('account_id, account_name, is_active')
      .eq('user_id', user.id)

    if (accountsError || !adAccounts || adAccounts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No Meta ad accounts found. Please connect your Meta accounts.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Aggregate metrics across all accounts using DIRECT META API calls
    let totalSpend = 0
    let totalClicks = 0
    let totalImpressions = 0
    let totalConversions = 0
    let totalActiveCampaigns = 0
    let accountsProcessed = 0
    let totalCTR = 0
    let totalCPC = 0

    console.log(`Processing ${adAccounts.length} ad accounts with Direct Meta API calls`)

    // Process each account with direct Meta API calls
    for (const account of adAccounts) {
      try {
        console.log(`Fetching data for account: ${account.account_id}`)
        
        // Fetch insights directly from Meta API
        const insights = await fetchMetaInsights(profile.meta_access_token, account.account_id)
        
        // Fetch campaigns directly from Meta API
        const campaigns = await fetchMetaCampaigns(profile.meta_access_token, account.account_id)
        
        // Aggregate insights data
        for (const insight of insights) {
          totalSpend += parseFloat(insight.spend || '0')
          totalClicks += parseInt(insight.clicks || '0')
          totalImpressions += parseInt(insight.impressions || '0')
          totalCTR += parseFloat(insight.ctr || '0')
          totalCPC += parseFloat(insight.cpc || '0')
          
          // Count conversions from actions
          if (insight.actions) {
            const conversions = insight.actions
              .filter(action => action.action_type === 'purchase' || action.action_type === 'complete_registration')
              .reduce((sum, action) => sum + parseInt(action.value || '0'), 0)
            totalConversions += conversions
          }
        }
        
        // Count active campaigns
        const activeCampaigns = campaigns.filter(campaign => campaign.status === 'ACTIVE').length
        totalActiveCampaigns += activeCampaigns
        
        accountsProcessed++
        
      } catch (error) {
        console.error(`Error fetching data for account ${account.account_id}:`, error)
        // Continue processing other accounts
      }
    }

    // Calculate averages
    const averageCTR = accountsProcessed > 0 ? totalCTR / accountsProcessed : 0
    const averageCPC = accountsProcessed > 0 ? totalCPC / accountsProcessed : 0
    const averageROAS = totalSpend > 0 ? (totalConversions * 50) / totalSpend : 0 // Assuming £50 avg order value

    // Calculate performance changes (mock data for now - would need historical comparison)
    const performanceChange = {
      spend: Math.random() * 20 - 10, // Random between -10% and +10%
      roas: Math.random() * 10 - 5,   // Random between -5% and +5%
      ctr: Math.random() * 6 - 3      // Random between -3% and +3%
    }

    const agencyMetrics: AgencyMetrics = {
      totalSpend: Math.round(totalSpend),
      totalClicks,
      totalImpressions,
      averageRoas: Math.round(averageROAS * 100) / 100,
      activeCampaigns: totalActiveCampaigns,
      totalConversions,
      averageCTR: Math.round(averageCTR * 100) / 100,
      averageCPC: Math.round(averageCPC * 100) / 100,
      performanceChange,
      lastUpdated: new Date().toISOString()
    }

    console.log(`Processed ${accountsProcessed} accounts, returning metrics:`, agencyMetrics)

    return new Response(
      JSON.stringify(agencyMetrics),
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
