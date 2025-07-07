import { createClient } from '@/lib/supabase/client'

export interface MetaAdAccount {
  id: string
  account_id: string
  account_name: string
  currency: string
  timezone_name: string
  status: string
  is_active: boolean
}

export interface Campaign {
  id: string
  campaign_id: string
  name: string
  status: string
  objective: string
  daily_budget: number | null
  lifetime_budget: number | null
  created_time: string
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

export class MetaAPI {
  private supabase = createClient()

  async getAdAccounts(): Promise<MetaAdAccount[]> {
    const { data, error } = await this.supabase.functions.invoke('meta-accounts')
    
    if (error) {
      console.error('Error fetching ad accounts:', error)
      throw error
    }

    return data?.accounts || []
  }

  async syncAccount(accountId: string): Promise<void> {
    const { data, error } = await this.supabase.functions.invoke('meta-sync', {
      body: { account_id: accountId }
    })

    if (error) {
      console.error('Error syncing account:', error)
      throw error
    }

    return data
  }

  async getCampaigns(accountId: string): Promise<Campaign[]> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select(`
        *,
        meta_ad_accounts!inner(
          id,
          account_id,
          user_id
        )
      `)
      .eq('meta_ad_accounts.account_id', accountId)

    if (error) {
      console.error('Error fetching campaigns:', error)
      throw error
    }

    return data || []
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