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
  id: string
  ad_account_id: string
  campaign_id: string
  name: string
  status: string
  objective: string
  daily_budget: number | null
  lifetime_budget: number | null
  created_time: string
  updated_time?: string
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
        return rpcData
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

      return data || []
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
}