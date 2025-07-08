// Meta API client for Facebook Marketing API integration
// This is a simplified version for frontend use

export interface MetaAdAccount {
  account_id: string;
  account_name: string;
  currency: string;
  status: string;
  is_active: boolean;
}

export interface Campaign {
  campaign_id: string;
  account_id: string;
  name: string;
  objective: string;
  status: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  stop_time?: string;
  created_time: string;
  updated_time: string;
}

export interface CampaignMetrics {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  spend: number;
  conversions: number;
  roas: number;
}

export interface MetaAPIResponse<T> {
  data: T;
  error?: string;
  success?: boolean;
}

export class MetaAPI {
  private supabaseClient: any;

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  async getAdAccounts(): Promise<MetaAPIResponse<MetaAdAccount[]>> {
    try {
      const { data, error } = await this.supabaseClient.functions.invoke('meta-accounts-v2', {
        body: {}
      });

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: data.accounts || [], success: true };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  async getCampaigns(accountId: string): Promise<MetaAPIResponse<Campaign[]>> {
    try {
      const { data, error } = await this.supabaseClient.functions.invoke('sync-campaigns-v2', {
        body: { account_id: accountId }
      });

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: data.campaigns || [], success: true };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  async syncAccount(accountId: string): Promise<MetaAPIResponse<any>> {
    try {
      const { data, error } = await this.supabaseClient.functions.invoke('sync-campaigns-v2', {
        body: { account_id: accountId }
      });

      if (error) {
        return { data: {}, error: error.message };
      }

      return { data: data || {}, success: true };
    } catch (error: any) {
      return { data: {}, error: error.message };
    }
  }
}