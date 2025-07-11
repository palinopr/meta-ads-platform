from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from ..models import get_db, User, MetaAdAccount, Campaign, CampaignMetrics
from ..services.meta_api import MetaAPIService
from .auth import get_current_user

router = APIRouter(prefix="/api/meta", tags=["meta"])

# Pydantic models
class AdAccountResponse(BaseModel):
    id: str
    account_id: str
    account_name: str
    currency: str
    timezone_name: str
    status: str
    is_active: bool

class CampaignResponse(BaseModel):
    id: str
    campaign_id: str
    name: str
    status: str
    objective: str
    daily_budget: Optional[float]
    lifetime_budget: Optional[float]
    created_time: datetime

class MetricsResponse(BaseModel):
    date: str
    impressions: int
    clicks: int
    ctr: float
    cpc: float
    cpm: float
    spend: float
    conversions: int
    roas: float

# Routes
@router.get("/accounts", response_model=List[AdAccountResponse])
async def get_ad_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all ad accounts for the current user.
    """
    # Get from database first
    accounts = db.query(MetaAdAccount).filter(
        MetaAdAccount.user_id == current_user.id,
        MetaAdAccount.is_active == True
    ).all()
    
    if accounts:
        return [
            AdAccountResponse(
                id=str(account.id),
                account_id=account.account_id,
                account_name=account.account_name,
                currency=account.currency,
                timezone_name=account.timezone_name,
                status=account.status,
                is_active=account.is_active
            ) for account in accounts
        ]
    
    # If no accounts in DB, fetch from Meta API
    if not current_user.meta_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Meta access token found. Please connect your Meta account."
        )
    
    try:
        meta_service = MetaAPIService(current_user.meta_access_token)
        meta_accounts = meta_service.get_ad_accounts()
        
        # Save accounts to database
        for meta_account in meta_accounts:
            account = MetaAdAccount(
                user_id=current_user.id,
                account_id=meta_account['id'],
                account_name=meta_account.get('name', 'Unnamed Account'),
                currency=meta_account.get('currency', 'USD'),
                timezone_name=meta_account.get('timezone_name', 'UTC'),
                status=meta_account.get('account_status', 'ACTIVE')
            )
            db.add(account)
        
        db.commit()
        
        # Query again to return
        accounts = db.query(MetaAdAccount).filter(
            MetaAdAccount.user_id == current_user.id
        ).all()
        
        return [
            AdAccountResponse(
                id=str(account.id),
                account_id=account.account_id,
                account_name=account.account_name,
                currency=account.currency,
                timezone_name=account.timezone_name,
                status=account.status,
                is_active=account.is_active
            ) for account in accounts
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch ad accounts: {str(e)}"
        )

@router.get("/accounts/{account_id}/campaigns", response_model=List[CampaignResponse])
async def get_campaigns(
    account_id: str,
    status: Optional[List[str]] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get campaigns for an ad account.
    """
    # Verify account ownership
    account = db.query(MetaAdAccount).filter(
        MetaAdAccount.id == account_id,
        MetaAdAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ad account not found"
        )
    
    # Get campaigns from database
    query = db.query(Campaign).filter(Campaign.ad_account_id == account.id)
    
    if status:
        query = query.filter(Campaign.status.in_(status))
    
    campaigns = query.all()
    
    return [
        CampaignResponse(
            id=str(campaign.id),
            campaign_id=campaign.campaign_id,
            name=campaign.name,
            status=campaign.status,
            objective=campaign.objective,
            daily_budget=campaign.daily_budget,
            lifetime_budget=campaign.lifetime_budget,
            created_time=campaign.created_time
        ) for campaign in campaigns
    ]

@router.get("/campaigns/{campaign_id}/metrics", response_model=List[MetricsResponse])
async def get_campaign_metrics(
    campaign_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get metrics for a campaign.
    """
    # Set default date range if not provided
    if not end_date:
        end_date = datetime.now()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Verify campaign ownership
    campaign = db.query(Campaign).join(MetaAdAccount).filter(
        Campaign.id == campaign_id,
        MetaAdAccount.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    # Get metrics from database
    metrics = db.query(CampaignMetrics).filter(
        CampaignMetrics.campaign_id == campaign.id,
        CampaignMetrics.date_start >= start_date.date(),
        CampaignMetrics.date_start <= end_date.date()
    ).order_by(CampaignMetrics.date_start).all()
    
    return [
        MetricsResponse(
            date=metric.date_start.isoformat(),
            impressions=metric.impressions,
            clicks=metric.clicks,
            ctr=metric.ctr,
            cpc=metric.cpc,
            cpm=metric.cpm,
            spend=metric.spend,
            conversions=metric.conversions,
            roas=metric.roas
        ) for metric in metrics
    ]

@router.post("/sync")
async def sync_data(
    account_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync data from Meta API.
    """
    if not current_user.meta_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Meta access token found. Please connect your Meta account."
        )
    
    # Sync logic implemented using direct API calls (following Direct API pattern)
    # No database storage needed - data is fetched directly from Meta API
    try:
        meta_service = MetaAPIService(current_user.meta_access_token)
        accounts_result = meta_service.get_ad_accounts()
        
        if not accounts_result.get('success'):
            return {
                "message": "Sync failed", 
                "status": "error",
                "error": accounts_result.get('error', 'Unknown error')
            }
        
        return {
            "message": "Sync completed successfully", 
            "status": "completed",
            "accounts_synced": len(accounts_result.get('data', [])),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "message": "Sync failed with exception", 
            "status": "error",
            "error": str(e)
        }