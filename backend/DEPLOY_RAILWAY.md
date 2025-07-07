# Railway Deployment Guide for Backend API

## Prerequisites
- Railway CLI installed (`brew install railway`)
- Railway account

## Deployment Steps

1. **Login to Railway**
```bash
railway login
```

2. **Initialize Railway Project**
```bash
cd backend
railway init
```
Choose "Empty Project" and give it a name like "meta-ads-backend"

3. **Add PostgreSQL Database**
```bash
railway add
```
Select PostgreSQL

4. **Add Redis**
```bash
railway add
```
Select Redis

5. **Set Environment Variables**
```bash
# Database (automatically set by Railway)
# DATABASE_URL will be provided by Railway

# Meta API
railway variables set META_APP_ID=1349075236218599
railway variables set META_APP_SECRET=7c301f1ac1404565f26462e3c734194c

# Security
railway variables set JWT_SECRET=ihtuAm6HBAOonQeYkO+FvjY8cxCABLSodMMUB8EqryI=

# Frontend
railway variables set FRONTEND_URL=https://frontend-ten-eta-42.vercel.app
```

6. **Deploy**
```bash
railway up
```

7. **Get your API URL**
```bash
railway open
```

## Post-Deployment

1. **Update Frontend Environment**
Add your Railway backend URL to Vercel:
```bash
cd ../frontend
npx vercel env add NEXT_PUBLIC_API_URL production
# Enter your Railway URL (e.g., https://meta-ads-backend.up.railway.app)
```

2. **Run Database Migrations**
Connect to Railway PostgreSQL and run the migration script from `/supabase/migrations/001_initial_schema.sql`

## Monitoring
- View logs: `railway logs`
- Open dashboard: `railway open`
- Check status: `railway status`