import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache configuration
const CACHE_TTL_MINUTES = 15
const CACHE_KEY_PREFIX = 'dashboard_metrics'

// Validate environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface DashboardMetrics {
  totalSpend: number
  totalConversions: number
  totalImpressions: number
  totalClicks: number
  avgCTR: number
  avgCPC: number
  avgROAS: number
  activeCampaigns: number
  topCampaigns: Array<{
    campaign_id: string
    name: string
    spend: number
    conversions: number
    roas: number
  }>
  recentInsights: Array<{
    date_start: string
    spend: number
    conversions: number
    ctr: number
  }>
}

// Simple in-memory cache (for Edge Function)
const cache = new Map<string, { data: any, timestamp: number }>()

function getCacheKey(userId: string, accountId?: string): string {
  return `${CACHE_KEY_PREFIX}:${userId}${accountId ? `:${accountId}` : ''}`
}

function getFromCache(key: string): any | null {
  const cached = cache.get(key)
  if (!cached) return null
  
  const isExpired = Date.now() - cached.timestamp > (CACHE_TTL_MINUTES * 60 * 1000)
  if (isExpired) {
    cache.delete(key)
    return null
  }
  
  return cached.data
}

function setCache(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

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

    // Parse query parameters
    const url = new URL(req.url)
    const account_id = url.searchParams.get('account_id')
    const force_refresh = url.searchParams.get('force_refresh') === 'true'

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

    // Check cache first (unless force refresh)
    const cacheKey = getCacheKey(user.id, account_id || undefined)
    if (!force_refresh) {
      const cachedData = getFromCache(cacheKey)
      if (cachedData) {
        console.log('Returning cached dashboard metrics')
        return new Response(
          JSON.stringify({ 
            success: true, 
            metrics: cachedData,
            cached: true,
            cache_expires_in: CACHE_TTL_MINUTES * 60 * 1000 - (Date.now() - cache.get(cacheKey)!.timestamp)
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('Fetching fresh dashboard metrics from database')

    // Build optimized queries for dashboard metrics
    let campaignInsightsQuery = supabaseAdmin
      .from('campaign_insights')
      .select(`
        campaign_id,
        spend,
        conversions,
        impressions,
        clicks,
        ctr,
        cpc,
        purchase_roas,
        date_start,
        campaigns!inner(
          name,
          ad_account_id,
          meta_ad_accounts!inner(
            user_id
          )
        )
      `)
      .eq('campaigns.meta_ad_accounts.user_id', user.id)
      .gte('date_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 30 days
      .order('date_start', { ascending: false })

    // Filter by specific account if provided
    if (account_id) {
      campaignInsightsQuery = campaignInsightsQuery.eq('campaigns.ad_account_id', account_id)
    }

    const { data: insights, error: insightsError } = await campaignInsightsQuery

    if (insightsError) {
      console.error('Error fetching insights:', insightsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch campaign insights' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get active campaigns count
    let campaignsQuery = supabaseAdmin
      .from('campaigns')
      .select('id, meta_ad_accounts!inner(user_id)')
      .eq('meta_ad_accounts.user_id', user.id)
      .eq('is_active', true)

    if (account_id) {
      campaignsQuery = campaignsQuery.eq('ad_account_id', account_id)
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
    }

    // Calculate aggregated metrics
    const totalSpend = insights?.reduce((sum, insight) => sum + (parseFloat(insight.spend?.toString() || '0')), 0) || 0
    const totalConversions = insights?.reduce((sum, insight) => sum + (parseFloat(insight.conversions?.toString() || '0')), 0) || 0
    const totalImpressions = insights?.reduce((sum, insight) => sum + (parseInt(insight.impressions?.toString() || '0')), 0) || 0
    const totalClicks = insights?.reduce((sum, insight) => sum + (parseInt(insight.clicks?.toString() || '0')), 0) || 0

    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0

    // Calculate ROAS
    const totalRevenue = insights?.reduce((sum, insight) => {
      const roas = parseFloat(insight.purchase_roas?.toString() || '0')
      const spend = parseFloat(insight.spend?.toString() || '0')
      return sum + (roas * spend)
    }, 0) || 0
    const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0

    // Get top performing campaigns (by spend)
    const campaignPerformance = new Map<string, {
      campaign_id: string
      name: string
      spend: number
      conversions: number
      roas: number
    }>()

    insights?.forEach(insight => {
      const campaignId = insight.campaign_id
      const campaignName = (insight as any).campaigns?.name || `Campaign ${campaignId}`
      const spend = parseFloat(insight.spend?.toString() || '0')
      const conversions = parseFloat(insight.conversions?.toString() || '0')
      const roas = parseFloat(insight.purchase_roas?.toString() || '0')

      if (campaignPerformance.has(campaignId)) {
        const existing = campaignPerformance.get(campaignId)!
        existing.spend += spend
        existing.conversions += conversions
        // Weighted average for ROAS
        existing.roas = existing.spend > 0 ? (existing.roas * (existing.spend - spend) + roas * spend) / existing.spend : roas
      } else {
        campaignPerformance.set(campaignId, {
          campaign_id: campaignId,
          name: campaignName,
          spend,
          conversions,
          roas
        })
      }
    })

    const topCampaigns = Array.from(campaignPerformance.values())
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5)

    // Get recent insights for trend data (last 7 days)
    const recentInsights = insights
      ?.filter(insight => {
        const insightDate = new Date(insight.date_start)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return insightDate >= sevenDaysAgo
      })
      .reduce((acc, insight) => {
        const date = insight.date_start
        const existing = acc.find(item => item.date_start === date)
        
        if (existing) {
          existing.spend += parseFloat(insight.spend?.toString() || '0')
          existing.conversions += parseFloat(insight.conversions?.toString() || '0')
          existing.ctr = parseFloat(insight.ctr?.toString() || '0') // This should be recalculated properly
        } else {
          acc.push({
            date_start: date,
            spend: parseFloat(insight.spend?.toString() || '0'),
            conversions: parseFloat(insight.conversions?.toString() || '0'),
            ctr: parseFloat(insight.ctr?.toString() || '0')
          })
        }
        
        return acc
      }, [] as Array<{ date_start: string, spend: number, conversions: number, ctr: number }>)
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()) || []

    const metrics: DashboardMetrics = {
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalConversions: Math.round(totalConversions),
      totalImpressions,
      totalClicks,
      avgCTR: Math.round(avgCTR * 100) / 100,
      avgCPC: Math.round(avgCPC * 100) / 100,
      avgROAS: Math.round(avgROAS * 100) / 100,
      activeCampaigns: campaigns?.length || 0,
      topCampaigns,
      recentInsights
    }

    // Cache the results
    setCache(cacheKey, metrics)

    return new Response(
      JSON.stringify({ 
        success: true, 
        metrics,
        cached: false,
        cache_ttl_minutes: CACHE_TTL_MINUTES
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in get-dashboard-metrics:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
