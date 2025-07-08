// Safe Meta API client with error handling and retry logic
import { MetaAPI, MetaAdAccount, Campaign, MetaAPIResponse } from './meta';

export class MetaAPISafe extends MetaAPI {
  private retryCount = 3;
  private retryDelay = 1000; // 1 second

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryOperation<T>(
    operation: () => Promise<MetaAPIResponse<T>>,
    maxRetries: number = this.retryCount
  ): Promise<MetaAPIResponse<T>> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (result.success || !result.error) {
          return result;
        }
        
        // If it's the last attempt, return the error
        if (attempt === maxRetries) {
          return result;
        }
        
        // Wait before retrying
        await this.sleep(this.retryDelay * attempt);
      } catch (error: any) {
        if (attempt === maxRetries) {
          return { data: [] as any, error: error.message };
        }
        await this.sleep(this.retryDelay * attempt);
      }
    }
    
    return { data: [] as any, error: 'Max retries exceeded' };
  }

  async getAdAccounts(): Promise<MetaAPIResponse<MetaAdAccount[]>> {
    return this.retryOperation(() => super.getAdAccounts());
  }

  async getCampaigns(accountId: string): Promise<MetaAPIResponse<Campaign[]>> {
    return this.retryOperation(() => super.getCampaigns(accountId));
  }
}