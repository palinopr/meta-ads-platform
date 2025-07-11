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
      const { data, error } = await this.supabaseClient.functions.invoke('meta-accounts-v3', {
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
      const { data, error } = await this.supabaseClient.functions.invoke('get-campaigns-from-meta', {
        body: { account_id: accountId }
      });

      if (error) {
        return { data: [], error: error.message };
      }

      const campaigns = data.campaigns || [];
      return { data: campaigns, success: true };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  // Note: Campaigns are now fetched directly from Meta API
  // No sync needed - data is always fresh from Meta

  async getCampaignMetrics(campaignId: string, startDate?: Date, endDate?: Date): Promise<MetaAPIResponse<CampaignMetrics[]>> {
    try {
      // Fetch metrics directly from Meta API (not from database)
      const { data, error } = await this.supabaseClient.functions.invoke('get-campaign-metrics-from-meta', {
        body: { 
          campaign_id: campaignId,
          start_date: startDate?.toISOString(),
          end_date: endDate?.toISOString()
        }
      });

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: data?.metrics || [], success: true };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  async createCampaign(campaignData: any): Promise<MetaAPIResponse<any>> {
    try {
      // Create campaign directly via Meta API (no database storage)
      const { data, error } = await this.supabaseClient.functions.invoke('create-campaign-meta-only', {
        body: campaignData
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || null, success: true };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async updateCampaign(updateData: any): Promise<MetaAPIResponse<any>> {
    try {
      // Update campaign directly via Meta API (no database storage)
      const { data, error } = await this.supabaseClient.functions.invoke('update-campaign-meta-only', {
        body: updateData
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || null, success: true };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async pauseCampaign(campaignId: string): Promise<MetaAPIResponse<any>> {
    try {
      // Pause campaign directly via Meta API (no database storage)
      const { data, error } = await this.supabaseClient.functions.invoke('pause-campaign-meta-only', {
        body: { campaign_id: campaignId, action: 'pause' }
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || null, success: true };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async resumeCampaign(campaignId: string): Promise<MetaAPIResponse<any>> {
    try {
      // Resume campaign directly via Meta API (no database storage)
      const { data, error } = await this.supabaseClient.functions.invoke('pause-campaign-meta-only', {
        body: { campaign_id: campaignId, action: 'resume' }
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || null, success: true };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async deleteCampaign(campaignId: string): Promise<MetaAPIResponse<any>> {
    try {
      // Delete campaign directly via Meta API (no database storage)
      const { data, error } = await this.supabaseClient.functions.invoke('delete-campaign-meta-only', {
        body: { campaign_id: campaignId }
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || null, success: true };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async duplicateCampaign(campaignId: string, newName?: string): Promise<MetaAPIResponse<any>> {
    try {
      // Duplicate campaign directly via Meta API (no database storage)
      const { data, error } = await this.supabaseClient.functions.invoke('duplicate-campaign-meta-only', {
        body: { campaign_id: campaignId, new_name: newName }
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || null, success: true };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async getDashboardMetrics(accountIds?: string[]): Promise<MetaAPIResponse<DashboardMetrics | null>> {
    try {
      const { data, error } = await this.supabaseClient.functions.invoke('get-dashboard-metrics', {
        body: { 
          account_ids: accountIds || [] 
        }
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || null, success: true };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async getChartData(accountId: string, datePreset?: string): Promise<MetaAPIResponse<ChartDataPoint[]>> {
    try {
      const { data, error } = await this.supabaseClient.functions.invoke('get-chart-data', {
        body: { 
          account_id: accountId,
          date_preset: datePreset || 'last_30d'
        }
      });

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: data?.data || [], success: true };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  async getTopCampaigns(
    accountIds: string[], 
    sortBy: 'spend' | 'roas' | 'conversions' | 'revenue' | 'clicks' | 'impressions' | 'ctr' | 'cpc' | 'cpm' = 'roas',
    limit: number = 10,
    datePreset?: string,
    statusFilter?: 'all' | 'active' | 'paused'
  ): Promise<MetaAPIResponse<TopCampaign[]>> {
    try {
      const { data, error } = await this.supabaseClient.functions.invoke('get-top-campaigns-metrics', {
        body: { 
          account_ids: accountIds,
          sort_by: sortBy,
          limit,
          date_preset: datePreset || 'last_30d',
          status_filter: statusFilter || 'all'
        }
      });

      if (error) {
        return { data: [], error: error.message };
      }

      // Transform campaigns to include trend calculation
      const campaigns = (data?.campaigns || []).map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status as 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'UNKNOWN',
        objective: campaign.objective,
        spend: campaign.spend,
        revenue: campaign.revenue,
        roas: campaign.roas,
        conversions: campaign.conversions,
        clicks: campaign.clicks,
        impressions: campaign.impressions,
        cpc: campaign.cpc,
        cpm: campaign.cpm,
        ctr: campaign.ctr,
        account_id: campaign.account_id,
        account_name: campaign.account_name,
        // Calculate trend based on ROAS performance
        trend: campaign.roas > 2.0 ? 'up' as const : 
               campaign.roas < 1.0 ? 'down' as const : 
               'flat' as const,
        // Calculate change percent based on ROAS vs target
        changePercent: Math.round((campaign.roas - 1.5) * 100) / 10 // Target ROAS of 1.5x
      }));

      return { data: campaigns, success: true };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }
}

export interface DashboardMetrics {
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  averageRoas: number;
  activeCampaigns: number;
  totalConversions: number;
  averageCTR: number;
  averageCPC: number;
  performanceChange: {
    spend: number;
    roas: number;
    ctr: number;
  };
  lastUpdated: string;
}

export interface ChartDataPoint {
  date: string;
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  cpc: number;
  ctr: number;
  impressions: number;
  clicks: number;
}

export interface TopCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'UNKNOWN';
  objective: string;
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  clicks: number;
  impressions: number;
  cpc: number;
  cpm: number;
  ctr: number;
  account_id: string;
  account_name?: string;
  trend: 'up' | 'down' | 'flat';
  changePercent: number;
}