# Deployment Guide

## GitHub Setup

1. Create a new repository on GitHub:
   - Go to https://github.com/new
   - Name: `meta-ads-platform`
   - Description: "Analytics platform for managing Meta advertising campaigns at scale"
   - Public repository
   - Don't initialize with README (we already have one)

2. Push the code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/meta-ads-platform.git
git branch -M main
git push -u origin main
```

## Vercel Deployment (Frontend)

### Option 1: Via Vercel CLI

1. Deploy the frontend:
```bash
cd frontend
vercel --prod
```

2. Follow the prompts:
   - Set up and deploy: Y
   - Scope: Select your account
   - Link to existing project? N
   - Project name: meta-ads-platform
   - Directory: ./
   - Override settings? N

### Option 2: Via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL`: Your backend URL

## Backend Deployment Options

### Option 1: Railway.app

1. Go to https://railway.app/new
2. Deploy from GitHub repo
3. Add services:
   - PostgreSQL with TimescaleDB
   - Redis
   - Backend service
4. Configure environment variables

### Option 2: Render.com

1. Create a new Web Service at https://render.com
2. Connect GitHub repository
3. Configure:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add PostgreSQL and Redis addons

### Option 3: DigitalOcean App Platform

1. Create new app at https://cloud.digitalocean.com/apps
2. Connect GitHub
3. Add components:
   - Web service (backend)
   - Dev database (PostgreSQL)
   - Redis
4. Configure environment variables

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

### Backend (.env)
```
# Meta API
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_ACCESS_TOKEN=your_access_token
META_BUSINESS_ID=your_business_id

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379

# Security
JWT_SECRET=generate-a-secure-random-string
API_KEY=generate-another-secure-string

# Frontend
FRONTEND_URL=https://your-frontend.vercel.app
```

## Meta App Setup

1. Go to https://developers.facebook.com
2. Create a new app (Business type)
3. Add Marketing API product
4. Generate access tokens
5. Add your domains to App Domains
6. Configure OAuth redirect URIs

## Post-Deployment

1. Run database migrations:
```bash
alembic upgrade head
```

2. Test the deployment:
   - Frontend health: https://your-app.vercel.app
   - Backend health: https://your-api.com/health
   - Meta API connection: https://your-api.com/api/meta/test

3. Set up monitoring:
   - Vercel Analytics for frontend
   - Sentry for error tracking
   - DataDog or New Relic for APM

## SSL/Security

- Vercel provides automatic SSL
- For backend, use platform's SSL (Railway/Render)
- Enable CORS only for your frontend domain
- Use environment variables for all secrets
- Enable rate limiting on API endpoints

## Scaling Considerations

1. **Database**: Enable connection pooling
2. **Redis**: Use Redis Cluster for high availability
3. **API**: Implement caching strategies
4. **Frontend**: Use ISR (Incremental Static Regeneration)
5. **CDN**: CloudFlare for global distribution