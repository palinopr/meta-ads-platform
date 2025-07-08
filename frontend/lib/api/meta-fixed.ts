import { createClient } from '@/lib/supabase/client'

export interface MetaAdAccount {
  id: string
  account_id: string
  account_name: string
  currency: string
  timezone_name: string
  timezone_offset_hours_utc: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Campaign {
  campaign_id: string
  account_id: string
  name: string
  objective: string
  status: string
  daily_budget?: number
  lifetime_budget?: number
  start_time?: string
  stop_time?: string
  created_time: string
  updated_time: string
}

export interface CampaignMetrics {
  date: string
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  spend: number
  conversions: number
  roas: number
}

export class MetaAPIFixed {
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  async getAdAccounts(): Promise<MetaAdAccount[]> {
    const { data, error } = await this.supabase.functions.invoke('meta-accounts-v2', {
      body: { action: 'list' }
    })

    if (error) {
      console.error('Error fetching ad accounts:', error)
      throw error
    }

    return data?.accounts || []
  }

  async syncAccount(accountId: string): Promise<void> {
    const { data, error } = await this.supabase.functions.invoke('sync-campaigns', {
      body: { account_id: accountId }
    })

    if (error) {
      console.error('Error syncing account:', error)
      throw error
    }

    return data
  }

  async getCampaigns(accountId: string): Promise<Campaign[]> {
    try {
      // First try the RPC function
      const { data: rpcData, error: rpcError } = await this.supabase
        .rpc('get_campaigns_for_account', {
          p_account_id: accountId
        })

      if (!rpcError && rpcData) {
        return rpcData.map((campaign: any) => ({
          campaign_id: campaign.campaign_id,
          account_id: accountId,
          name: campaign.name,
          objective: campaign.objective,
          status: campaign.status,
          daily_budget: campaign.daily_budget || undefined,
          lifetime_budget: campaign.lifetime_budget || undefined,
          start_time: campaign.start_time || undefined,
          stop_time: campaign.stop_time || undefined,
          created_time: campaign.created_time,
          updated_time: campaign.updated_time || campaign.created_time
        }))
      }

      // If RPC fails, try the safer wrapper function
      const { data: accounts, error: accountError } = await this.supabase
        .rpc('get_my_ad_accounts')

      if (accountError) {
        console.error('Error fetching accounts:', accountError)
        return []
      }

      // Find the account we want
      const account = accounts?.find((a: any) => a.account_id === accountId)
      if (!account) {
        console.log('Account not found')
        return []
      }

      // Now fetch campaigns directly
      const { data, error } = await this.supabase
        .from('campaigns')
        .select('*')
        .eq('ad_account_id', account.id)
        .order('created_time', { ascending: false })

      if (error) {
        console.error('Error fetching campaigns:', error)
        return []
      }

      // Map the data to include account_id field and handle type differences
      return (data || []).map(campaign => ({
        campaign_id: campaign.campaign_id,
        account_id: accountId,
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        daily_budget: campaign.daily_budget || undefined,
        lifetime_budget: campaign.lifetime_budget || undefined,
        start_time: campaign.start_time || undefined,
        stop_time: campaign.stop_time || undefined,
        created_time: campaign.created_time,
        updated_time: campaign.updated_time || campaign.created_time
      }))
    } catch (error) {
      console.error('Unexpected error in getCampaigns:', error)
      return []
    }
  }

  async getCampaignMetrics(campaignId: string, startDate?: Date, endDate?: Date): Promise<CampaignMetrics[]> {
    const query = this.supabase
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date_start', { ascending: true })

    if (startDate) {
      query.gte('date_start', startDate.toISOString().split('T')[0])
    }

    if (endDate) {
      query.lte('date_start', endDate.toISOString().split('T')[0])
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching campaign metrics:', error)
      throw error
    }

    return (data || []).map(metric => ({
      date: metric.date_start,
      impressions: metric.impressions,
      clicks: metric.clicks,
      ctr: metric.ctr,
      cpc: metric.cpc,
      cpm: metric.cpm,
      spend: metric.spend,
      conversions: metric.conversions,
      roas: metric.roas
    }))
  }

  // Get real-time dashboard metrics with caching
  async getDashboardMetrics(accountId?: string, forceRefresh = false): Promise<any> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const params = new URLSearchParams()
      if (accountId) params.append('account_id', accountId)
      if (forceRefresh) params.append('force_refresh', 'true')

      const { data, error } = await this.supabase.functions.invoke('get-dashboard-metrics', {
        body: { account_id: accountId, force_refresh: forceRefresh }
      })

      if (error) {
        console.error('Error fetching dashboard metrics:', error)
        throw error
      }

      return data?.metrics || {}
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
      throw error
    }
  }

  // Sync campaign insights from Meta API
  async syncCampaignInsights(accountId: string, datePreset = 'last_30d'): Promise<any> {
    try {
      const { data, error } = await this.supabase.functions.invoke('sync-campaign-insights', {
        body: {
          account_id: accountId,
          date_preset: datePreset
        }
      })

      if (error) {
        console.error('Error syncing campaign insights:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error syncing campaign insights:', error)
      throw error
    }
  }

  // Get chart data from Meta API
  async getChartData(accountId: string, datePreset = 'last_30d'): Promise<any> {
    try {
      const { data, error } = await this.supabase.functions.invoke('get-chart-data', {
        body: {
          account_id: accountId,
          date_preset: datePreset
        }
      })

      if (error) {
        console.error('Error fetching chart data:', error)
        throw error
      }

      return data?.data || []
    } catch (error) {
      console.error('Error fetching chart data:', error)
      throw error
    }
  }
}
