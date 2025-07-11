# Railway Backend Workflow Guide

## 🚀 **How We Work With Railway for Meta API Debugging**

### **The Problem We Solved**
- Dashboard showing all zeros
- No visibility into Meta API responses
- Difficult to debug serverless edge functions
- Needed real-time monitoring like `vercel logs --follow`

### **The Solution: Railway Backend**
Always-on FastAPI server with comprehensive logging for real-time Meta API monitoring.

## 🏗️ **Current Architecture**

```
Frontend (Vercel) → Railway Backend → Meta API
                 ↘ Database (Supabase) ↗

✅ Frontend: https://frontend-pqj6xqp11-palinos-projects.vercel.app
✅ Railway: https://meta-ads-backend-production.up.railway.app  
✅ Database: Supabase (igeuyfuxezvvenxjfnnn)
```

## 🔍 **Live Monitoring Commands**

### **Essential Railway Commands:**
```bash
# Navigate to backend
cd "/Users/jaimeortiz/Visual Studio/Meta Ads/meta-ads-platform/backend"

# View real-time logs (MAIN DEBUGGING TOOL)
railway logs --deployment

# Check deployment status
railway status

# Deploy changes
railway up

# Set environment variables
railway variables --set "KEY=value"
```

### **What You See in Live Logs:**
```
🔄 [DASHBOARD] Starting metrics fetch for account: 45558046
🔑 [DASHBOARD] Meta token available: true
🌐 [META API] Calling insights endpoint: https://graph.facebook.com/v19.0/act_45558046/insights
📊 [META API] Fields requested: ['spend', 'impressions', 'clicks', 'cpc', 'cpm', 'ctr', 'conversions']
📡 [META API] Response status: 200
📊 [META API] Raw insights response: {"data": [], "paging": {}}
⚠️ [PROCESSING] No insight data returned from Meta API
📊 [ZERO DATA] Returning empty metrics for account 45558046
```

## 🎯 **Development Workflow**

### **When Making Changes:**
1. **Edit code** in `/backend/app.py`
2. **Deploy**: `railway up`
3. **Monitor**: `railway logs --deployment`
4. **Test**: Call API endpoints and watch real-time logs
5. **Debug**: See exactly what Meta API returns

### **Debugging Zero Data Issue:**
1. **Start monitoring**: `railway logs --deployment`
2. **Trigger dashboard load** on frontend
3. **Watch logs** to see:
   - Is Meta API being called?
   - What status code does Meta return?
   - What data does Meta send back?
   - Are there permission issues?

## 📊 **Railway Backend Endpoints**

### **Available Endpoints:**
- `GET /` - Health status
- `GET /health` - Health check  
- `POST /api/dashboard-metrics` - Dashboard metrics (with live logging)

### **Calling from Frontend:**
```typescript
// Instead of Supabase Edge Function:
const response = await fetch('https://meta-ads-backend-production.up.railway.app/api/dashboard-metrics', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    account_id: accountId,
    date_preset: 'last_30d'
  })
});
```

## 🛠️ **Railway Project Details**

### **Project Info:**
- **Project ID**: f9c1908b-2662-46e6-84e2-9952a4beb297
- **Service ID**: 4365883d-c4ca-4d52-b5c2-8fec59e86957
- **URL**: https://meta-ads-backend-production.up.railway.app
- **Workspace**: palinopr's Projects

### **Environment Variables Set:**
```bash
SUPABASE_URL=https://igeuyfuxezvvenxjfnnn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=8080  # Set automatically by Railway
```

## 🚦 **Next Steps for Zero Data Debugging**

### **Immediate Actions:**
1. **Update frontend** to call Railway instead of Supabase Edge Functions
2. **Monitor live logs** during dashboard load to see Meta API responses
3. **Check Meta API permissions** and account data availability
4. **Verify OAuth token validity** and scope permissions

### **What We'll Learn:**
- Is Meta API returning empty data or errors?
- Are the accounts actually empty (no campaigns)?
- Do we have correct permissions for insights data?
- Is the date range filtering out all data?

## 💡 **Why This is Better Than Edge Functions**

### **Railway Advantages:**
- ✅ **Live console monitoring** - See every Meta API call in real-time
- ✅ **Always-on server** - No cold starts, persistent debugging
- ✅ **Comprehensive logging** - Detailed request/response tracking
- ✅ **Development experience** - Like having `vercel logs --follow` for backend

### **Edge Functions Limitations:**
- ❌ **Limited logging** - Only function invocation logs
- ❌ **Serverless** - Spin up/down, no persistent monitoring
- ❌ **No live streaming** - Can't see real-time API responses
- ❌ **Debugging difficulty** - No visibility into what Meta API returns

## 🎯 **Success Metrics**

### **We'll Know Railway is Working When:**
1. **Live logs show** Meta API calls and responses
2. **Zero data mystery solved** through real-time API monitoring  
3. **Development speed improved** with instant debugging feedback
4. **Meta API issues** clearly visible and debuggable

---

**This Railway backend gives us the live monitoring capability that Vercel serverless functions cannot provide - essential for debugging complex Meta API integrations.**