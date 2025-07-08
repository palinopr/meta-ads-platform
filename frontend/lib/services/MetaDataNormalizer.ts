/**
 * 🎯 Meta Data Normalizer Service
 * Centralized data transformation between Meta API and Database formats
 * This eliminates the UUID vs TEXT mismatch that causes "operator does not exist" errors
 */

export interface DatabaseAccount {
  id?: string;
  account_id: string;  // Always clean number string (no "act_" prefix)
  account_name: string;
  currency: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseCampaign {
  id?: string;
  campaign_id: string;    // Always clean campaign ID
  campaign_name: string;
  account_id: string;     // Foreign key to accounts (clean number)
  user_id: string;
  status: string;
  objective: string;
  daily_budget?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseCampaignInsight {
  id?: string;
  campaign_id: string;
  account_id: string;
  user_id: string;
  date_start: string;
  date_stop: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
}

export class MetaDataNormalizer {
  /**
   * Remove "act_" prefix from Meta account ID
   * Meta API returns: "act_123456789"
   * Database expects: "123456789"
   */
  static normalizeAccountId(metaAccountId: string): string {
    if (!metaAccountId) return '';
    return metaAccountId.replace(/^act_/, '');
  }

  /**
   * Add "act_" prefix for Meta API calls
   * Database has: "123456789"
   * Meta API expects: "act_123456789"
   */
  static toMetaAccountId(dbAccountId: string): string {
    if (!dbAccountId) return '';
    if (dbAccountId.startsWith('act_')) return dbAccountId;
    return `act_${dbAccountId}`;
  }

  /**
   * Validate account ID format (should be numeric only)
   */
  static validateAccountId(accountId: string): boolean {
    return /^[0-9]+$/.test(accountId);
  }

  /**
   * Validate campaign ID format  
   */
  static validateCampaignId(campaignId: string): boolean {
    return /^[0-9]+$/.test(campaignId);
  }

  /**
   * Transform Meta API account data to database format
   */
  static normalizeAccountData(metaAccount: any): DatabaseAccount {
    return {
      account_id: this.normalizeAccountId(metaAccount.id),
      account_name: metaAccount.name || 'Unknown Account',
      currency: metaAccount.currency || 'USD',
      user_id: '', // Will be set by calling service
    };
  }

  /**
   * Transform Meta API campaign data to database format
   */
  static normalizeCampaignData(metaCampaign: any, accountId: string): DatabaseCampaign {
    return {
      campaign_id: metaCampaign.id,
      campaign_name: metaCampaign.name || 'Unknown Campaign',
      account_id: this.normalizeAccountId(accountId),
      user_id: '', // Will be set by calling service
      status: metaCampaign.status || 'UNKNOWN',
      objective: metaCampaign.objective || 'UNKNOWN',
      daily_budget: metaCampaign.daily_budget ? parseFloat(metaCampaign.daily_budget) : 0,
    };
  }

  /**
   * Transform Meta API insights data to database format
   */
  static normalizeInsightsData(
    metaInsights: any, 
    campaignId: string, 
    accountId: string
  ): DatabaseCampaignInsight {
    return {
      campaign_id: campaignId,
      account_id: this.normalizeAccountId(accountId),
      user_id: '', // Will be set by calling service
      date_start: metaInsights.date_start,
      date_stop: metaInsights.date_stop,
      impressions: parseInt(metaInsights.impressions) || 0,
      clicks: parseInt(metaInsights.clicks) || 0,
      spend: parseFloat(metaInsights.spend) || 0,
      conversions: parseInt(metaInsights.conversions) || 0,
      ctr: parseFloat(metaInsights.ctr) || 0,
      cpc: parseFloat(metaInsights.cpc) || 0,
      cpm: parseFloat(metaInsights.cpm) || 0,
      roas: this.calculateROAS(
        parseFloat(metaInsights.conversions) || 0,
        parseFloat(metaInsights.spend) || 0
      ),
    };
  }

  /**
   * Calculate ROAS (Return on Ad Spend)
   */
  private static calculateROAS(conversions: number, spend: number): number {
    if (spend === 0) return 0;
    return conversions / spend;
  }

  /**
   * Batch normalize account data
   */
  static normalizeAccountsBatch(metaAccounts: any[]): DatabaseAccount[] {
    return metaAccounts.map(account => this.normalizeAccountData(account));
  }

  /**
   * Batch normalize campaign data
   */
  static normalizeCampaignsBatch(metaCampaigns: any[], accountId: string): DatabaseCampaign[] {
    return metaCampaigns.map(campaign => 
      this.normalizeCampaignData(campaign, accountId)
    );
  }

  /**
   * Clean and validate input data before database operations
   */
  static sanitizeInput(input: string): string {
    if (!input) return '';
    return input.toString().trim();
  }

  /**
   * Generate consistent error messages for validation failures
   */
  static getValidationError(field: string, value: string, expected: string): string {
    return `Invalid ${field}: "${value}". Expected ${expected}.`;
  }
}
