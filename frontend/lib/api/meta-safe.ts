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

export class MetaAPISafe {
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  async saveAccount(accountData: any): Promise<any> {
    const { data, error } = await this.supabase
      .rpc('safe_insert_ad_account', {
        p_account_id: accountData.account_id,
        p_account_name: accountData.account_name,
        p_currency: accountData.currency || 'USD',
        p_status: accountData.status || 'ACTIVE',
        p_is_active: accountData.is_active !== false
      })

    if (error) {
      console.error('Error saving account:', error)
      throw error
    }

    if (data?.error) {
      console.error('Function returned error:', data.error)
      throw new Error(data.error)
    }

    return data?.data
  }

  async getCampaigns(accountId: string): Promise<Campaign[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('safe_get_campaigns', {
          p_account_id: accountId
        })

      if (error) {
        console.error('Error fetching campaigns:', error)
        return []
      }

      if (data?.error) {
        console.error('Function returned error:', data.error)
        return []
      }

      return data?.data || []
    } catch (error) {
      console.error('Unexpected error in getCampaigns:', error)
      return []
    }
  }

  async checkAccountOwnership(accountId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('user_owns_account', {
          p_account_id: accountId
        })

      if (error) {
        console.error('Error checking ownership:', error)
        return false
      }

      return data === true
    } catch (error) {
      console.error('Unexpected error in checkAccountOwnership:', error)
      return false
    }
  }

  async getAdAccounts(): Promise<MetaAdAccount[]> {
    // Still use the edge function for fetching from Meta API
    const { data, error } = await this.supabase.functions.invoke('meta-accounts-v2', {
      body: { action: 'list' }
    })

    if (error) {
      console.error('Error fetching ad accounts:', error)
      throw error
    }

    return data?.accounts || []
  }
}