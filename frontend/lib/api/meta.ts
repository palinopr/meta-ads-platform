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
    try {
      console.log('Syncing campaigns for account:', accountId)
      
      const { data, error } = await this.supabase.functions.invoke('sync-campaigns', {
        body: { account_id: accountId }
      })
      
      if (error) {
        console.error('Error syncing campaigns:', error)
        throw error
      }
      
      if (data?.error) {
        console.error('Sync API returned error:', data.error)
        if (data.tokenExpired) {
          throw new Error('Token expired. Please reconnect your Meta account.')
        }
        throw new Error(data.error)
      }
      
      console.log('Sync response:', data)
      
      if (data?.success) {
        console.log(`Successfully synced ${data.totalSaved || 0} campaigns`)
      }
    } catch (error) {
      console.error('Error in syncAccount:', error)
      throw error
    }
  }

  async getCampaigns(accountId: string): Promise<Campaign[]> {
    try {
      // First, ensure the account exists in our database
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        console.error('No authenticated user')
        return []
      }

      // Use RPC function to avoid UUID type comparison issues
      const { data, error } = await this.supabase
        .rpc('get_campaigns_for_account', {
          p_account_id: accountId,
          p_user_id: user.id
        })

      if (error) {
        console.error('Error fetching campaigns:', error)
        
        // Fallback to direct query with explicit casting
        const { data: adAccounts, error: checkError } = await this.supabase
          .from('meta_ad_accounts')
          .select('id')
          .eq('account_id', accountId)
          .eq('user_id', user.id)

        console.log('Account check:', { accountId, adAccounts, checkError })

        if (checkError) {
          console.error('Error checking ad account:', checkError)
          return []
        }

        if (!adAccounts || adAccounts.length === 0) {
          console.log('Account not found in database, returning empty campaigns')
          return []
        }

        const adAccount = adAccounts[0]

        // Then fetch campaigns for this ad account
        const { data: campaigns, error: campaignError } = await this.supabase
          .from('campaigns')
          .select('*')
          .eq('ad_account_id', adAccount.id)
          .order('created_time', { ascending: false })

        if (campaignError) {
          console.error('Error fetching campaigns:', campaignError)
          return []
        }

        return campaigns || []
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

  async createCampaign(campaignData: {
    accountId: string
    name: string
    objective: string
    budgetType: 'daily' | 'lifetime'
    budget: number
    status: string
  }): Promise<Campaign> {
    try {
      console.log('Creating campaign with data:', campaignData)
      
      const { data, error } = await this.supabase.functions.invoke('create-campaign', {
        body: campaignData
      })
      
      if (error) {
        console.error('Error creating campaign:', error)
        throw error
      }
      
      if (data?.error) {
        console.error('Create campaign API returned error:', data.error)
        if (data.tokenExpired) {
          throw new Error('Token expired. Please reconnect your Meta account.')
        }
        throw new Error(data.error)
      }
      
      console.log('Campaign created successfully:', data)
      return data.campaign
    } catch (error) {
      console.error('Error in createCampaign:', error)
      throw error
    }
  }
}
