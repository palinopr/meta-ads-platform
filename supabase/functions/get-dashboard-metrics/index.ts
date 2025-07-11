import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface MetaInsight {
  spend: string
  clicks: string
  impressions: string
  ctr: string
  cpc: string
  cpm?: string
  actions?: Array<{
    action_type: string
    value: string
  }>
  action_values?: Array<{
    action_type: string
    value: string
  }>
}

interface MetaCampaign {
  id: string
  name: string
  status: string
  objective?: string
}

interface DashboardMetrics {
  // Main KPIs
  totalSpend: number
  totalRevenue: number
  averageRoas: number
  totalConversions: number
  
  // Engagement metrics
  totalClicks: number
  totalImpressions: number
  averageCTR: number
  averageCPC: number
  averageCPM: number
  
  // Campaign info
  totalCampaigns: number
  activeCampaigns: number
  pausedCampaigns: number
  
  // Performance changes (comparing with previous period)
  performanceChange: {
    spend: number
    revenue: number
    roas: number
    conversions: number
    ctr: number
    cpc: number
  }
  
  // Account info
  totalAccounts: number
  activeAccounts: number
  
  // Metadata
  dateRange: string
  lastUpdated: string
}

async function fetchMetaInsights(accessToken: string, accountId: string, datePreset: string): Promise<{current: MetaInsight[], previous: MetaInsight[]}> {
  const fields = 'spend,clicks,impressions,ctr,cpc,cpm,actions,action_values'
  
  // Fetch current period
  const currentUrl = `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${accessToken}`
  
  const currentResponse = await fetch(currentUrl)
  if (!currentResponse.ok) {
    console.error(`Meta API error for account ${accountId}: ${currentResponse.status}`)
    throw new Error(`Meta API error: ${currentResponse.status}`)
  }
  
  const currentData = await currentResponse.json()
  
  // Fetch previous period for comparison
  let previousData = { data: [] }
  try {
    // For comparison, we'll use a custom date range for the previous period
    const previousPreset = getPreviousDatePreset(datePreset)
    if (previousPreset) {
      const previousUrl = `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=${fields}&date_preset=${previousPreset}&access_token=${accessToken}`
      const previousResponse = await fetch(previousUrl)
      if (previousResponse.ok) {
        previousData = await previousResponse.json()
      }
    }
  } catch (error) {
    console.error('Error fetching previous period data:', error)
  }
  
  return {
    current: currentData.data || [],
    previous: previousData.data || []
  }
}

// Helper function to get previous period date preset
function getPreviousDatePreset(currentPreset: string): string | null {
  // This is a simplified version - in production, you'd calculate exact previous periods
  const presetMap: { [key: string]: string } = {
    'today': 'yesterday',
    'yesterday': 'yesterday',
    'last_7d': 'last_14d',
    'last_14d': 'last_28d',
    'last_30d': 'last_60d',
    'last_90d': 'last_180d'
  }
  return presetMap[currentPreset] || null
}

async function fetchMetaAdAccounts(accessToken: string, accountIds?: string[]): Promise<Array<{account_id: string, account_name: string, is_active: boolean}>> {
  try {
    // Fetch user's ad accounts directly from Meta API
    const url = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}&limit=1000`
    
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Meta API error for ad accounts: ${response.status}`)
      throw new Error(`Meta API error: ${response.status}`)
    }
    
    const data = await response.json()
    const allAccounts = (data.data || []).map((account: any) => ({
      account_id: account.id.replace('act_', ''), // Remove act_ prefix
      account_name: account.name,
      is_active: account.account_status === 1 // 1 = ACTIVE, 2 = DISABLED, etc.
    }))
    
    // Filter by specific account IDs if provided
    if (accountIds && accountIds.length > 0) {
      const filteredAccounts = allAccounts.filter(account => accountIds.includes(account.account_id))
      console.log(`Filtered ${filteredAccounts.length} accounts from ${allAccounts.length} total accounts`)
      return filteredAccounts
    }
    
    console.log(`Fetched ${allAccounts.length} ad accounts directly from Meta API`)
    return allAccounts
  } catch (error) {
    console.error('Error fetching Meta ad accounts:', error)
    throw error
  }
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
    // Parse request body
    const { 
      account_ids, 
      date_preset = 'last_30d' 
    } = await req.json()

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

    // Get user's Meta ad accounts directly from Meta API (Direct API Pattern)
    let adAccounts
    try {
      console.log(`Fetching ad accounts from Meta API for user: ${user.id}`)
      console.log(`Requested account IDs: ${account_ids ? account_ids.join(', ') : 'ALL'}`)
      
      adAccounts = await fetchMetaAdAccounts(profile.meta_access_token, account_ids)
      
      if (!adAccounts || adAccounts.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No Meta ad accounts found or accessible with current permissions.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log(`Processing ${adAccounts.length} ad accounts from Meta API`)
    } catch (error) {
      console.error('Error fetching ad accounts from Meta API:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch ad accounts from Meta API. Please check your Meta connection.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize aggregation variables for current and previous periods
    let currentMetrics = {
      spend: 0,
      revenue: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
      ctr_sum: 0,
      cpc_sum: 0,
      cpm_sum: 0,
    }
    
    let previousMetrics = {
      spend: 0,
      revenue: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
      ctr_sum: 0,
      cpc_sum: 0,
    }
    
    let totalCampaigns = 0
    let activeCampaigns = 0
    let pausedCampaigns = 0
    let accountsProcessed = 0
    let activeAccountsCount = 0

    console.log(`Processing ${adAccounts.length} ad accounts with Direct Meta API calls`)

    // Process each account with direct Meta API calls
    for (const account of adAccounts) {
      try {
        console.log(`Fetching data for account: ${account.account_id}`)
        
        // Track active accounts
        if (account.is_active) {
          activeAccountsCount++
        }
        
        // Fetch insights directly from Meta API (current and previous periods)
        const { current: currentInsights, previous: previousInsights } = await fetchMetaInsights(
          profile.meta_access_token, 
          account.account_id,
          date_preset
        )
        
        // Fetch campaigns directly from Meta API
        const campaigns = await fetchMetaCampaigns(profile.meta_access_token, account.account_id)
        
        // Process current period insights
        for (const insight of currentInsights) {
          currentMetrics.spend += parseFloat(insight.spend || '0')
          currentMetrics.clicks += parseInt(insight.clicks || '0')
          currentMetrics.impressions += parseInt(insight.impressions || '0')
          currentMetrics.ctr_sum += parseFloat(insight.ctr || '0')
          currentMetrics.cpc_sum += parseFloat(insight.cpc || '0')
          currentMetrics.cpm_sum += parseFloat(insight.cpm || '0')
          
          // Count conversions and revenue from actions
          if (insight.actions) {
            const conversions = insight.actions
              .filter(action => ['purchase', 'complete_registration', 'lead', 'submit_application'].includes(action.action_type))
              .reduce((sum, action) => sum + parseInt(action.value || '0'), 0)
            currentMetrics.conversions += conversions
          }
          
          if (insight.action_values) {
            const revenue = insight.action_values
              .filter(av => av.action_type === 'purchase')
              .reduce((sum, av) => sum + parseFloat(av.value || '0'), 0)
            currentMetrics.revenue += revenue
          }
        }
        
        // Process previous period insights
        for (const insight of previousInsights) {
          previousMetrics.spend += parseFloat(insight.spend || '0')
          previousMetrics.clicks += parseInt(insight.clicks || '0')
          previousMetrics.impressions += parseInt(insight.impressions || '0')
          previousMetrics.conversions += insight.actions?.filter(a => 
            ['purchase', 'complete_registration', 'lead'].includes(a.action_type)
          ).reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0
          previousMetrics.revenue += insight.action_values?.filter(av => 
            av.action_type === 'purchase'
          ).reduce((sum, av) => sum + parseFloat(av.value || '0'), 0) || 0
        }
        
        // Count campaigns by status
        totalCampaigns += campaigns.length
        activeCampaigns += campaigns.filter(c => c.status === 'ACTIVE').length
        pausedCampaigns += campaigns.filter(c => c.status === 'PAUSED').length
        
        accountsProcessed++
        
      } catch (error) {
        console.error(`Error fetching data for account ${account.account_id}:`, error)
        // Continue processing other accounts
      }
    }

    // Calculate averages and performance changes
    const averageCTR = accountsProcessed > 0 ? currentMetrics.ctr_sum / accountsProcessed : 0
    const averageCPC = accountsProcessed > 0 ? currentMetrics.cpc_sum / accountsProcessed : 0
    const averageCPM = accountsProcessed > 0 ? currentMetrics.cpm_sum / accountsProcessed : 0
    const averageROAS = currentMetrics.spend > 0 ? currentMetrics.revenue / currentMetrics.spend : 0

    // Calculate performance changes (percentage)
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100 * 100) / 100
    }

    const performanceChange = {
      spend: calculateChange(currentMetrics.spend, previousMetrics.spend),
      revenue: calculateChange(currentMetrics.revenue, previousMetrics.revenue),
      roas: calculateChange(
        currentMetrics.spend > 0 ? currentMetrics.revenue / currentMetrics.spend : 0,
        previousMetrics.spend > 0 ? previousMetrics.revenue / previousMetrics.spend : 0
      ),
      conversions: calculateChange(currentMetrics.conversions, previousMetrics.conversions),
      ctr: calculateChange(averageCTR, previousMetrics.ctr_sum / accountsProcessed),
      cpc: calculateChange(averageCPC, previousMetrics.cpc_sum / accountsProcessed) * -1 // Negative is good for CPC
    }

    const dashboardMetrics: DashboardMetrics = {
      // Main KPIs
      totalSpend: Math.round(currentMetrics.spend * 100) / 100,
      totalRevenue: Math.round(currentMetrics.revenue * 100) / 100,
      averageRoas: Math.round(averageROAS * 100) / 100,
      totalConversions: currentMetrics.conversions,
      
      // Engagement metrics
      totalClicks: currentMetrics.clicks,
      totalImpressions: currentMetrics.impressions,
      averageCTR: Math.round(averageCTR * 100) / 100,
      averageCPC: Math.round(averageCPC * 100) / 100,
      averageCPM: Math.round(averageCPM * 100) / 100,
      
      // Campaign info
      totalCampaigns,
      activeCampaigns,
      pausedCampaigns,
      
      // Performance changes
      performanceChange,
      
      // Account info
      totalAccounts: adAccounts.length,
      activeAccounts: activeAccountsCount,
      
      // Metadata
      dateRange: date_preset,
      lastUpdated: new Date().toISOString()
    }

    console.log(`Processed ${accountsProcessed} accounts, returning metrics:`, dashboardMetrics)

    return new Response(
      JSON.stringify(dashboardMetrics),
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
