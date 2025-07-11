import os
import logging
import sys
from datetime import datetime
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure comprehensive logging for Railway
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('railway_app.log')
    ]
)

logger = logging.getLogger("meta-ads-railway")

app = FastAPI(
    title="Meta Ads Analytics API - Railway",
    description="Live Meta API Backend with Real-time Logging",
    version="1.0.0"
)

# Configure CORS for Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://frontend-pqj6xqp11-palinos-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Pydantic models
class DashboardMetricsResponse(BaseModel):
    totalSpend: float
    totalRevenue: float
    averageRoas: float
    totalConversions: int
    totalClicks: int
    totalImpressions: int
    averageCTR: float
    averageCPC: float
    averageCPM: float
    totalCampaigns: int
    activeCampaigns: int
    pausedCampaigns: int
    performanceChange: Dict[str, Any]
    totalAccounts: int
    activeAccounts: int
    dateRange: str
    lastUpdated: str

class SparklineDataResponse(BaseModel):
    data: List[Dict[str, Any]]
    success: bool

async def get_user_meta_token(authorization: str = Header(...)):
    """Get user's Meta access token from Supabase profiles"""
    logger.info(f"🔐 Getting user Meta token from authorization header")
    
    if not authorization.startswith('Bearer '):
        logger.error("❌ Invalid authorization header format")
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace('Bearer ', '')
    
    try:
        # Get user from Supabase Auth
        async with httpx.AsyncClient() as client:
            logger.info("🔍 Fetching user from Supabase Auth...")
            
            auth_response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY
                }
            )
            
            if auth_response.status_code != 200:
                logger.error(f"❌ Auth failed: {auth_response.status_code} - {auth_response.text}")
                raise HTTPException(status_code=401, detail="User not authenticated")
            
            user_data = auth_response.json()
            user_id = user_data['id']
            logger.info(f"✅ User authenticated: {user_id}")
            
            # Get Meta access token from profiles
            logger.info("🔍 Fetching Meta access token from profiles...")
            
            profile_response = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY
                },
                params={
                    "id": f"eq.{user_id}",
                    "select": "meta_access_token"
                }
            )
            
            if profile_response.status_code != 200:
                logger.error(f"❌ Profile fetch failed: {profile_response.status_code}")
                raise HTTPException(status_code=400, detail="Failed to fetch user profile")
            
            profiles = profile_response.json()
            if not profiles or not profiles[0].get('meta_access_token'):
                logger.error("❌ No Meta access token found in profile")
                raise HTTPException(status_code=400, detail="Meta access token not found. Please connect your Meta account.")
            
            meta_token = profiles[0]['meta_access_token']
            logger.info("✅ Meta access token retrieved successfully")
            
            return meta_token
            
    except httpx.RequestError as e:
        logger.error(f"❌ Request error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to authenticate user")

@app.get("/")
async def root():
    logger.info("🚀 Root endpoint hit - Railway Meta API Backend is running")
    return {
        "message": "Meta Ads Analytics API - Railway Backend", 
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "live_logging": "enabled"
    }

@app.get("/health")
async def health_check():
    logger.info("💓 Health check endpoint hit")
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/dashboard-metrics")
async def get_dashboard_metrics(
    request_data: Dict[str, Any],
    meta_token: str = Depends(get_user_meta_token)
):
    """Get dashboard metrics directly from Meta API with live logging"""
    
    account_id = request_data.get('account_id')
    date_preset = request_data.get('date_preset', 'last_30d')
    
    logger.info(f"🔄 [DASHBOARD] Starting metrics fetch for account: {account_id}")
    logger.info(f"📅 [DASHBOARD] Date preset: {date_preset}")
    logger.info(f"🔑 [DASHBOARD] Meta token available: {bool(meta_token)}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Build Meta API URL for insights
            fields = [
                'spend', 'impressions', 'clicks', 'cpc', 'cpm', 'ctr',
                'conversions', 'video_thruplay_watched_actions'
            ]
            
            insights_url = f"https://graph.facebook.com/v19.0/act_{account_id}/insights"
            params = {
                'access_token': meta_token,
                'fields': ','.join(fields),
                'date_preset': date_preset,
                'level': 'account'
            }
            
            logger.info(f"🌐 [META API] Calling insights endpoint: {insights_url}")
            logger.info(f"📊 [META API] Fields requested: {fields}")
            
            # Call Meta API
            response = await client.get(insights_url, params=params)
            
            logger.info(f"📡 [META API] Response status: {response.status_code}")
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"❌ [META API] Error response: {error_text}")
                raise HTTPException(status_code=response.status_code, detail=f"Meta API error: {error_text}")
            
            insights_data = response.json()
            logger.info(f"📊 [META API] Raw insights response: {insights_data}")
            
            # Get campaigns count
            campaigns_url = f"https://graph.facebook.com/v19.0/act_{account_id}/campaigns"
            campaigns_params = {
                'access_token': meta_token,
                'fields': 'id,name,status',
                'limit': 1000
            }
            
            logger.info(f"🎯 [META API] Calling campaigns endpoint for count...")
            
            campaigns_response = await client.get(campaigns_url, params=campaigns_params)
            campaigns_data = campaigns_response.json() if campaigns_response.status_code == 200 else {'data': []}
            
            logger.info(f"🎯 [META API] Campaigns response: {len(campaigns_data.get('data', []))} campaigns found")
            
            # Process the data
            data = insights_data.get('data', [])
            
            if data:
                insight = data[0]  # Account level data
                logger.info(f"✅ [PROCESSING] Processing insight data: {insight}")
                
                metrics = DashboardMetricsResponse(
                    totalSpend=float(insight.get('spend', 0)),
                    totalRevenue=0.0,  # Revenue calculation needed
                    averageRoas=0.0,   # ROAS calculation needed
                    totalConversions=int(float(insight.get('conversions', 0))),
                    totalClicks=int(insight.get('clicks', 0)),
                    totalImpressions=int(insight.get('impressions', 0)),
                    averageCTR=float(insight.get('ctr', 0)),
                    averageCPC=float(insight.get('cpc', 0)),
                    averageCPM=float(insight.get('cpm', 0)),
                    totalCampaigns=len(campaigns_data.get('data', [])),
                    activeCampaigns=len([c for c in campaigns_data.get('data', []) if c.get('status') == 'ACTIVE']),
                    pausedCampaigns=len([c for c in campaigns_data.get('data', []) if c.get('status') == 'PAUSED']),
                    performanceChange={
                        "spend": 0, "revenue": 0, "roas": 0, "conversions": 0, "ctr": None, "cpc": None
                    },
                    totalAccounts=1,
                    activeAccounts=1,
                    dateRange=date_preset,
                    lastUpdated=datetime.now().isoformat()
                )
                
                logger.info(f"✅ [SUCCESS] Dashboard metrics processed successfully")
                logger.info(f"💰 [METRICS] Spend: ${metrics.totalSpend}, Clicks: {metrics.totalClicks}, Impressions: {metrics.totalImpressions}")
                
                return {"data": metrics.dict(), "success": True}
            else:
                logger.warning(f"⚠️ [PROCESSING] No insight data returned from Meta API")
                
                # Return zeros if no data
                empty_metrics = DashboardMetricsResponse(
                    totalSpend=0.0, totalRevenue=0.0, averageRoas=0.0, totalConversions=0,
                    totalClicks=0, totalImpressions=0, averageCTR=0.0, averageCPC=0.0, averageCPM=0.0,
                    totalCampaigns=len(campaigns_data.get('data', [])), activeCampaigns=0, pausedCampaigns=0,
                    performanceChange={"spend": 0, "revenue": 0, "roas": 0, "conversions": 0, "ctr": None, "cpc": None},
                    totalAccounts=1, activeAccounts=1, dateRange=date_preset, lastUpdated=datetime.now().isoformat()
                )
                
                logger.info(f"📊 [ZERO DATA] Returning empty metrics for account {account_id}")
                return {"data": empty_metrics.dict(), "success": True}
                
    except httpx.RequestError as e:
        logger.error(f"❌ [ERROR] Request error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard metrics: {str(e)}")
    except Exception as e:
        logger.error(f"❌ [ERROR] Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.post("/api/sparkline-data")
async def get_sparkline_data(
    request_data: Dict[str, Any],
    meta_token: str = Depends(get_user_meta_token)
):
    """Get sparkline data directly from Meta API with live logging"""
    
    account_id = request_data.get('account_id')
    
    logger.info(f"🔄 [SPARKLINE] Starting sparkline fetch for account: {account_id}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get last 7 days of data for sparkline
            insights_url = f"https://graph.facebook.com/v19.0/act_{account_id}/insights"
            params = {
                'access_token': meta_token,
                'fields': 'spend,impressions,clicks,date_start',
                'date_preset': 'last_7d',
                'time_increment': 1,  # Daily breakdown
                'level': 'account'
            }
            
            logger.info(f"🌐 [SPARKLINE] Calling Meta API for 7-day data...")
            
            response = await client.get(insights_url, params=params)
            
            logger.info(f"📡 [SPARKLINE] Response status: {response.status_code}")
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"❌ [SPARKLINE] Meta API error: {error_text}")
                return {"data": [], "success": False}
            
            insights_data = response.json()
            logger.info(f"📊 [SPARKLINE] Raw response: {insights_data}")
            
            # Process sparkline data
            sparkline_data = []
            for insight in insights_data.get('data', []):
                sparkline_data.append({
                    'date': insight.get('date_start'),
                    'value': float(insight.get('spend', 0)),
                    'clicks': int(insight.get('clicks', 0)),
                    'impressions': int(insight.get('impressions', 0))
                })
            
            logger.info(f"✅ [SPARKLINE] Processed {len(sparkline_data)} data points")
            logger.info(f"📈 [SPARKLINE] Data: {sparkline_data}")
            
            return {"data": sparkline_data, "success": True}
            
    except Exception as e:
        logger.error(f"❌ [SPARKLINE ERROR] {str(e)}")
        return {"data": [], "success": False}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"🚀 Starting Railway Meta API server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)