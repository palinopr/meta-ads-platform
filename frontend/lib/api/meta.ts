/**
 * Meta API Client for Facebook Marketing API Integration
 * 
 * This module provides a simplified frontend interface for interacting with the Meta Marketing API
 * through Supabase Edge Functions. It implements the Direct API pattern to ensure data freshness.
 * 
 * @module MetaAPI
 * @version 1.0.0
 * @author Meta Ads Platform Team
 */

import { logger, logApiRequest, logApiError, logMetaApiCall, logMetaApiError } from '../utils/logger';
import { handleError, withRetry, isMetaAPIError } from '../utils/error-handler';

/**
 * Represents a Meta Ad Account
 * @interface MetaAdAccount
 */
export interface MetaAdAccount {
  /** Unique identifier for the ad account */
  account_id: string;
  /** Human-readable name of the ad account */
  account_name: string;
  /** Currency code used by the account (e.g., 'USD', 'EUR') */
  currency: string;
  /** Current status of the account */
  status: string;
  /** Whether the account is currently active */
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

// Helper function to convert date range to Meta API date preset
function dateRangeToMetaPreset(dateRange?: { from: Date | undefined; to?: Date | undefined }): string {
  if (!dateRange?.from || !dateRange?.to) {
    return 'last_30d' // Default
  }
  
  const now = new Date()
  const from = dateRange.from
  const to = dateRange.to
  
  // Calculate the difference between the selected dates
  const rangeInDays = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  
  // Check if the "to" date is close to today (within 1 day)
  const daysFromToday = Math.floor((now.getTime() - to.getTime()) / (1000 * 60 * 60 * 24))
  const isCurrentPeriod = Math.abs(daysFromToday) <= 1
  
  // Log for debugging
  logger.debug('Date range to Meta preset conversion', 'META_API', {
    from: from.toISOString(),
    to: to.toISOString(),
    rangeInDays,
    daysFromToday,
    isCurrentPeriod
  })
  
  // If it's a current period (ending today/yesterday/tomorrow due to timezone)
  if (Math.abs(daysFromToday) <= 2) { // Allow 2 days tolerance for timezone issues
    if (rangeInDays >= 5 && rangeInDays <= 8) {
      logger.debug('Date range matched: last_7d', 'META_API')
      return 'last_7d'
    } else if (rangeInDays >= 13 && rangeInDays <= 15) {
      logger.debug('📅 [dateRangeToMetaPreset] Matched: last_14d')
      return 'last_14d'
    } else if (rangeInDays >= 28 && rangeInDays <= 31) {
      logger.debug('📅 [dateRangeToMetaPreset] Matched: last_30d')
      return 'last_30d'
    } else if (rangeInDays >= 59 && rangeInDays <= 61) {
      logger.debug('📅 [dateRangeToMetaPreset] Matched: last_60d')
      return 'last_60d'
    } else if (rangeInDays >= 88 && rangeInDays <= 91) {
      logger.debug('📅 [dateRangeToMetaPreset] Matched: last_90d')
      return 'last_90d'
    }
  }
  
  // Check for "this month" - if from is start of current month and to is today
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  if (from.toDateString() === startOfMonth.toDateString() && isCurrentPeriod) {
    logger.debug('📅 [dateRangeToMetaPreset] Matched: this_month')
    return 'this_month'
  }
  
  // Check for "last month" - if it spans the previous month
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
  if (from.toDateString() === startOfLastMonth.toDateString() && 
      to.toDateString() === endOfLastMonth.toDateString()) {
    logger.debug('📅 [dateRangeToMetaPreset] Matched: last_month')
    return 'last_month'
  }
  
  // Check for "year to date"
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  if (from.toDateString() === startOfYear.toDateString() && isCurrentPeriod) {
    logger.debug('📅 [dateRangeToMetaPreset] Matched: this_year')
    return 'this_year'
  }
  
  // For custom date ranges, use Meta's custom date range format
  // Format: YYYY-MM-DD
  const fromStr = from.toISOString().split('T')[0]
  const toStr = to.toISOString().split('T')[0]
  logger.debug(`📅 [dateRangeToMetaPreset] Using custom range: ${fromStr} to ${toStr}`)
  
  // For now, default to last_30d as Meta API requires specific presets
  // Custom date range support implemented - falls back to time_range parameter
  // Meta API will handle the custom date range via time_range parameter
  return {
    preset: 'last_30d',
    time_range: {
      since: from.toISOString().split('T')[0],
      until: to.toISOString().split('T')[0]
    }
  }
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

  async getDashboardMetrics(accountIds?: string[], dateRange?: { from: Date | undefined; to?: Date | undefined }): Promise<MetaAPIResponse<DashboardMetrics | null>> {
    try {
      const datePreset = dateRangeToMetaPreset(dateRange);
      
      logger.debug('🔄 [FRONTEND] Getting dashboard metrics via Supabase Edge Function...');
      logger.debug('📋 [FRONTEND] Account IDs:', accountIds);
      logger.debug('📅 [FRONTEND] Date preset:', datePreset);
      
      // Use Supabase Edge Function as fallback due to Railway CORS issues
      const { data, error } = await this.supabaseClient.functions.invoke('get-dashboard-metrics', {
        body: { 
          account_ids: accountIds || [], // Pass all account IDs
          date_preset: datePreset
        }
      });

      if (error) {
        logger.error('❌ [FRONTEND] Supabase edge function error:', error);
        return { data: null, error: error.message };
      }

      logger.debug('✅ [FRONTEND] Dashboard metrics received:', data);
      return { data: data || null, success: true };
    } catch (error: any) {
      logger.error('❌ [FRONTEND] Error calling Supabase edge function:', error);
      return { data: null, error: error.message };
    }
  }

  async getChartData(accountId: string, dateRange?: { from: Date | undefined; to?: Date | undefined }): Promise<MetaAPIResponse<ChartDataPoint[]>> {
    try {
      const datePreset = dateRangeToMetaPreset(dateRange);
      
      logger.debug('🔄 [FRONTEND] Getting chart data with date preset:', datePreset);
      
      const { data, error } = await this.supabaseClient.functions.invoke('get-performance-chart-data', {
        body: { 
          account_ids: [accountId],
          date_preset: datePreset
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

  async getSparklineData(accountId: string, dateRange?: { from: Date | undefined; to?: Date | undefined }): Promise<MetaAPIResponse<any>> {
    try {
      const datePreset = dateRangeToMetaPreset(dateRange);
      
      logger.debug('🔄 [FRONTEND] Getting sparkline data with date preset:', datePreset);
      
      const { data, error } = await this.supabaseClient.functions.invoke('get-sparkline-data', {
        body: { 
          account_id: accountId,
          date_preset: datePreset
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

  async getTopCampaigns(
    accountIds: string[], 
    sortBy: 'spend' | 'roas' | 'conversions' | 'revenue' | 'clicks' | 'impressions' | 'ctr' | 'cpc' | 'cpm' = 'roas',
    limit: number = 10,
    dateRange?: { from: Date | undefined; to?: Date | undefined },
    statusFilter?: 'all' | 'active' | 'paused'
  ): Promise<MetaAPIResponse<TopCampaign[]>> {
    try {
      const datePreset = dateRangeToMetaPreset(dateRange);
      
      logger.debug('🔄 [FRONTEND] Getting top campaigns with date preset:', datePreset);
      
      const { data, error } = await this.supabaseClient.functions.invoke('get-top-campaigns-metrics', {
        body: { 
          account_ids: accountIds,
          sort_by: sortBy,
          limit,
          date_preset: datePreset,
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
  // Main KPIs
  totalSpend: number;
  totalRevenue: number;
  averageRoas: number;
  totalConversions: number;
  
  // Engagement metrics
  totalClicks: number;
  totalImpressions: number;
  averageCTR: number;
  averageCPC: number;
  averageCPM: number;
  
  // Campaign info
  totalCampaigns: number;
  activeCampaigns: number;
  pausedCampaigns: number;
  
  // Performance changes (comparing with previous period)
  performanceChange: {
    spend: number;
    revenue: number;
    roas: number;
    conversions: number;
    ctr: number;
    cpc: number;
  };
  
  // Account info
  totalAccounts: number;
  activeAccounts: number;
  
  // Metadata
  dateRange: string;
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