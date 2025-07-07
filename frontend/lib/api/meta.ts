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
    // Use v2 temporarily for debugging
    const { data, error } = await this.supabase.functions.invoke('meta-accounts-v2')
    
    if (error) {
      console.error('Error fetching ad accounts:', error)
      throw error
    }

    // Log the response for debugging
    console.log('Ad accounts response:', data)
    
    if (data?.error) {
      console.error('API returned error:', data.error)
      if (data.tokenExpired) {
        throw new Error('Token expired. Please reconnect your Meta account.')
      }
      throw new Error(data.error)
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

    if (data?.error) {
      if (data.tokenExpired) {
        throw new Error('Meta token expired. Please reconnect your account.')
      }
      throw new Error(data.error)
    }

    return data
  }

  async getCampaigns(accountId: string): Promise<Campaign[]> {
    // First, get the meta_ad_account id for this account_id
    const { data: adAccount, error: adAccountError } = await this.supabase
      .from('meta_ad_accounts')
      .select('id')
      .eq('account_id', accountId)
      .single()

    if (adAccountError || !adAccount) {
      console.error('Error fetching ad account:', adAccountError)
      return []
    }

    // Then fetch campaigns for this ad account
    const { data, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('ad_account_id', adAccount.id)
      .order('created_time', { ascending: false })

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