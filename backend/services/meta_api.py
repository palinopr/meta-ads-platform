from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adsinsights import AdsInsights
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

class MetaAPIService:
    """
    Service for interacting with Meta Marketing API.
    """
    
    def __init__(self, access_token: str = None):
        """
        Initialize Meta API service.
        
        Args:
            access_token: Meta API access token.
        """
        self.access_token = access_token or os.getenv("META_ACCESS_TOKEN")
        self.app_id = os.getenv("META_APP_ID")
        self.app_secret = os.getenv("META_APP_SECRET")
        
        # Initialize the API
        FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)
    
    def get_ad_accounts(self, user_id: str = "me") -> List[Dict[str, Any]]:
        """
        Get all ad accounts for a user.
        
        Args:
            user_id: Meta user ID or "me" for current user.
            
        Returns:
            List of ad account data.
        """
        from facebook_business.adobjects.user import User
        
        user = User(user_id)
        accounts = user.get_ad_accounts(fields=[
            'id',
            'name',
            'currency',
            'timezone_name',
            'account_status',
            'spend_cap',
            'amount_spent',
            'balance'
        ])
        
        return [account.export_all_data() for account in accounts]
    
    def get_campaigns(self, account_id: str, status: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Get campaigns for an ad account.
        
        Args:
            account_id: Ad account ID.
            status: List of campaign statuses to filter.
            
        Returns:
            List of campaign data.
        """
        account = AdAccount(f'act_{account_id}')
        
        params = {
            'fields': [
                'id',
                'name',
                'status',
                'objective',
                'buying_type',
                'budget_remaining',
                'daily_budget',
                'lifetime_budget',
                'bid_strategy',
                'created_time',
                'updated_time',
                'start_time',
                'stop_time'
            ]
        }
        
        if status:
            params['filtering'] = [{'field': 'status', 'operator': 'IN', 'value': status}]
        
        campaigns = account.get_campaigns(**params)
        return [campaign.export_all_data() for campaign in campaigns]
    
    def get_campaign_insights(
        self, 
        campaign_id: str, 
        date_preset: str = 'last_30d',
        fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get insights for a campaign.
        
        Args:
            campaign_id: Campaign ID.
            date_preset: Date range preset.
            fields: List of insight fields to retrieve.
            
        Returns:
            Campaign insights data.
        """
        campaign = Campaign(campaign_id)
        
        default_fields = [
            'impressions',
            'clicks',
            'ctr',
            'cpc',
            'cpm',
            'cpp',
            'spend',
            'conversions',
            'conversion_rate_ranking',
            'cost_per_conversion',
            'purchase_roas',
            'reach',
            'frequency',
            'engagement_rate_ranking'
        ]
        
        insights = campaign.get_insights(
            fields=fields or default_fields,
            params={'date_preset': date_preset}
        )
        
        return insights[0].export_all_data() if insights else {}
    
    def get_adsets(self, campaign_id: str) -> List[Dict[str, Any]]:
        """
        Get ad sets for a campaign.
        
        Args:
            campaign_id: Campaign ID.
            
        Returns:
            List of ad set data.
        """
        campaign = Campaign(campaign_id)
        
        adsets = campaign.get_ad_sets(fields=[
            'id',
            'name',
            'status',
            'billing_event',
            'bid_amount',
            'daily_budget',
            'lifetime_budget',
            'budget_remaining',
            'targeting',
            'promoted_object',
            'optimization_goal',
            'created_time',
            'updated_time',
            'start_time',
            'end_time'
        ])
        
        return [adset.export_all_data() for adset in adsets]
    
    def get_ads(self, adset_id: str) -> List[Dict[str, Any]]:
        """
        Get ads for an ad set.
        
        Args:
            adset_id: Ad set ID.
            
        Returns:
            List of ad data.
        """
        adset = AdSet(adset_id)
        
        ads = adset.get_ads(fields=[
            'id',
            'name',
            'status',
            'creative',
            'tracking_specs',
            'conversion_specs',
            'created_time',
            'updated_time'
        ])
        
        return [ad.export_all_data() for ad in ads]
    
    def get_account_insights_time_series(
        self,
        account_id: str,
        start_date: datetime,
        end_date: datetime,
        level: str = 'campaign',
        time_increment: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Get time series insights for an account.
        
        Args:
            account_id: Ad account ID.
            start_date: Start date for insights.
            end_date: End date for insights.
            level: Aggregation level (campaign, adset, ad).
            time_increment: Time increment in days.
            
        Returns:
            List of time series insights data.
        """
        account = AdAccount(f'act_{account_id}')
        
        insights = account.get_insights(
            fields=[
                'campaign_id',
                'campaign_name',
                'adset_id',
                'adset_name',
                'ad_id',
                'ad_name',
                'impressions',
                'clicks',
                'ctr',
                'cpc',
                'cpm',
                'spend',
                'conversions',
                'cost_per_conversion',
                'purchase_roas',
                'reach',
                'frequency'
            ],
            params={
                'level': level,
                'time_range': {
                    'since': start_date.strftime('%Y-%m-%d'),
                    'until': end_date.strftime('%Y-%m-%d')
                },
                'time_increment': time_increment,
                'breakdowns': ['days_1']
            }
        )
        
        return [insight.export_all_data() for insight in insights]
    
    def batch_request(self, requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Execute batch requests to Meta API.
        
        Args:
            requests: List of request configurations.
            
        Returns:
            List of responses.
        """
        from facebook_business.adobjects.serverside.batch import Batch
        
        batch = FacebookAdsApi.new_batch()
        
        for request in requests:
            # Add requests to batch
            pass
        
        batch.execute()
        return batch.get_responses()