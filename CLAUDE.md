# Meta Ads Analytics Platform

## Project Overview
A comprehensive analytics and optimization platform for Meta advertising campaigns with $2M+ in ad spend management. Currently deployed and operational with Supabase authentication and database integration.

### 🎯 Core Features
- **Real-time Analytics Dashboard** - Track ROAS, CTR, CPC, CPM, conversions across all campaigns
- **Campaign Optimization** - AI-powered suggestions for budget allocation and audience targeting
- **Multi-Client Management** - Handle multiple ad accounts with role-based access
- **Automated Reporting** - Scheduled reports with custom metrics and insights
- **Budget Management** - Track spend, set alerts, and automate budget adjustments
- **A/B Testing Analysis** - Compare campaign performance with statistical significance
- **Facebook OAuth Integration** - Direct login with Facebook for seamless Meta API access

### 🔧 Tech Stack
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Python FastAPI with async support
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with email/password and Facebook OAuth
- **Cache**: Redis for real-time data
- **Queue**: Celery with Redis for background tasks
- **Meta API**: Facebook Marketing API v19.0
- **Deployment**: 
  - Frontend: Vercel (https://frontend-ten-eta-42.vercel.app)
  - Backend: Ready for Railway/Render deployment
  - Database: Supabase Cloud

### 🔑 Environment Variables & Credentials
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://igeuyfuxezvvenxjfnnn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres.igeuyfuxezvvenxjfnnn:***@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Facebook/Meta
FACEBOOK_APP_ID=1349075236218599
FACEBOOK_APP_SECRET=7c301f1ac1404565f26462e3c734194c
NEXT_PUBLIC_FACEBOOK_APP_ID=1349075236218599

# Authentication
NEXTAUTH_SECRET=ihtuAm6HBAOonQeYkO+FvjY8cxCABLSodMMUB8EqryI=
```

### 📊 Key Metrics Tracked
- Return on Ad Spend (ROAS)
- Cost Per Acquisition (CPA)
- Click-Through Rate (CTR)
- Cost Per Click (CPC)
- Conversion Rate
- Frequency
- Relevance Score
- Budget Utilization
- Video Metrics (views, view rate, cost per thruplay)

### 🏗️ Project Structure
```
meta-ads-platform/
├── frontend/               # Next.js application (deployed to Vercel)
│   ├── app/               # App router pages
│   │   ├── dashboard/     # Protected dashboard routes
│   │   ├── login/         # Authentication pages
│   │   └── signup/        # User registration
│   ├── components/        # React components
│   │   ├── ui/           # Reusable UI components
│   │   └── dashboard/    # Dashboard-specific components
│   ├── lib/              # Utilities and API clients
│   │   └── supabase/     # Supabase client configuration
│   └── middleware.ts     # Auth middleware
├── backend/               # FastAPI application
│   ├── api/              # API endpoints
│   │   ├── auth.py       # JWT authentication
│   │   └── meta.py       # Meta API endpoints
│   ├── models/           # SQLAlchemy models
│   ├── services/         # External service integrations
│   │   └── meta_api.py   # Facebook Marketing API service
│   └── main.py           # FastAPI app entry
├── supabase/             # Database migrations
│   └── migrations/       # SQL migration files
└── docs/                 # Documentation
```

### 🚀 Current Deployment Status
- **Frontend**: ✅ Live at https://frontend-ten-eta-42.vercel.app
- **Database**: ✅ Supabase configured and ready
- **Authentication**: ✅ Email/password and Facebook OAuth implemented
- **Backend API**: 🟡 Ready for deployment (awaiting cloud setup)
- **GitHub Repository**: ✅ https://github.com/palinopr/meta-ads-platform

### 🔄 Development Guidelines
- **Always check `TASK.md`** for current development tasks
- **Use Supabase client libraries** for database operations
- **Follow Meta API best practices** - Rate limiting, batch requests, webhook handling
- **Implement comprehensive error handling** for API failures
- **Use environment variables** for all sensitive data
- **Cache aggressively** - Meta data updates every 15 minutes
- **Write tests** for all API integrations and business logic

### 🗄️ Database Schema (Supabase)
- **profiles**: User profiles linked to auth.users
- **meta_ad_accounts**: Facebook ad accounts
- **campaigns**: Campaign data with objectives and budgets
- **ad_sets**: Ad set configurations and targeting
- **ads**: Individual ad creatives
- **creatives**: Ad creative content (images, videos, text)
- **campaign_metrics**: Time-series performance data
- **adset_metrics**: Ad set level metrics

All tables have:
- UUID primary keys
- Row Level Security (RLS) policies
- Automatic updated_at timestamps
- User-based access control

### 🔐 Security Implementation
- **Supabase RLS**: Database-level security policies
- **OAuth Scopes**: ads_management, ads_read, email
- **JWT Tokens**: Secure API authentication
- **Environment Variables**: All secrets in .env files
- **HTTPS Only**: Enforced on all deployments
- **Input Validation**: Pydantic models for all API inputs

### 📈 API Endpoints
```
# Authentication
POST   /api/auth/register     - User registration
POST   /api/auth/token       - Login (JWT)
GET    /api/auth/me          - Current user info

# Meta Integration
GET    /api/meta/accounts    - List ad accounts
GET    /api/meta/accounts/{id}/campaigns - List campaigns
GET    /api/meta/campaigns/{id}/metrics  - Get metrics
POST   /api/meta/sync        - Sync data from Meta

# OAuth Callbacks
GET    /auth/callback        - Supabase OAuth callback
```

### 🧪 Testing Requirements
- **Frontend Tests**: Jest + React Testing Library
- **Backend Tests**: Pytest with FastAPI test client
- **E2E Tests**: Playwright for critical user flows
- **Test Coverage**: Minimum 80% for business logic

### 📚 Key Dependencies
```json
// Frontend
{
  "@supabase/supabase-js": "^2.50.3",
  "@supabase/ssr": "^0.6.1",
  "next": "14.2.5",
  "react": "^18",
  "tailwindcss": "^3.4.1",
  "lucide-react": "^0.321.0",
  "recharts": "^2.10.4"
}

// Backend
{
  "fastapi": "0.109.0",
  "facebook-business": "18.0.4",
  "sqlalchemy": "2.0.25",
  "pydantic": "2.5.3",
  "celery": "5.3.6"
}
```

### 🚦 Next Development Steps
1. **Backend Deployment**: Deploy FastAPI to Railway/Render
2. **Facebook OAuth Setup**: Configure in Supabase dashboard
3. **Data Sync Workers**: Implement Celery tasks for periodic sync
4. **Real-time Updates**: Add WebSocket support for live metrics
5. **Advanced Analytics**: Machine learning for optimization suggestions
6. **White-label Support**: Multi-tenant architecture improvements

### 📈 Performance Targets
- **Dashboard Load**: < 2 seconds
- **API Response**: < 500ms for cached data
- **Data Freshness**: 15-minute sync intervals
- **Concurrent Users**: 100+ without degradation
- **Data Retention**: 2 years of historical metrics

### 🔧 Local Development
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Database
# Use Supabase dashboard or run migrations locally
```

### 🐛 Known Issues & TODOs
- [ ] Add comprehensive error boundaries in React
- [ ] Implement request retry logic for Meta API
- [ ] Add data export functionality
- [ ] Create onboarding flow for new users
- [ ] Implement webhook handlers for real-time updates
- [ ] Add multi-language support

### 📞 Support & Resources
- **Supabase Dashboard**: https://app.supabase.com/project/igeuyfuxezvvenxjfnnn
- **Meta API Docs**: https://developers.facebook.com/docs/marketing-apis/
- **Vercel Dashboard**: https://vercel.com/palinos-projects/frontend
- **GitHub Issues**: https://github.com/palinopr/meta-ads-platform/issues

### 🎓 Lessons Learned & Important Notes

#### Vercel Deployment
1. **Environment Variables Must Be Set Before Build**
   - Next.js needs `NEXT_PUBLIC_*` variables during build time
   - Use `.env.production` file for production environment variables
   - Or use `--build-env` flags with `vercel` CLI
   - Without env vars, pages using external services (Supabase) will fail to build

2. **Directory Structure Matters**
   - Ensure you're deploying from the correct directory
   - Avoid nested duplicate folders (e.g., `frontend/frontend`)
   - Use `vercel.json` to configure root directory if needed

3. **Build Errors Are Different from Runtime Errors**
   - 404 errors can occur when build fails and only generates error pages
   - Check build logs with `npx vercel inspect --logs <deployment-url>`
   - Static generation errors prevent pages from being created

#### Supabase Integration
1. **Client Creation Requirements**
   - Both URL and anon key are required
   - Missing either will cause: `@supabase/ssr: Your project's URL and API key are required`
   - Use separate clients for server (`@/lib/supabase/server`) and browser (`@/lib/supabase/client`)

2. **Authentication Flow**
   - Middleware handles session refresh automatically
   - Protected routes redirect to login when no session
   - OAuth callbacks need proper redirect URL configuration

3. **Row Level Security (RLS)**
   - Always enable RLS on all tables
   - Create policies before inserting data
   - Use `auth.uid()` for user-based access control
   - Test policies in Supabase dashboard SQL editor

#### Project Organization
1. **Monorepo Considerations**
   - Keep frontend and backend in same repository for easier development
   - Use separate deployment pipelines for each service
   - Share types/interfaces between frontend and backend

2. **Environment Management**
   - Use `.env.local` for local development
   - Use `.env.production` for production builds
   - Never commit `.env` files with secrets
   - Document all required environment variables

#### GitHub Integration
1. **Authentication Methods**
   - GitHub CLI (`gh`) requires authentication via `gh auth login`
   - Personal Access Tokens can be used with `GH_TOKEN` environment variable
   - Vercel can auto-deploy from GitHub with proper permissions

2. **Deployment Workflow**
   - Commit and push changes to GitHub
   - Vercel auto-deploys on push (if connected)
   - Or manually deploy with `npx vercel --prod`

#### Common Pitfalls to Avoid
1. **Don't assume environment variables are available** - Always check and provide fallbacks
2. **Don't ignore build warnings** - They often indicate future problems
3. **Don't skip error boundaries** - Especially important for client-side data fetching
4. **Don't forget to update TypeScript types** - When changing database schema
5. **Don't hardcode URLs** - Use environment variables for all external services

#### Best Practices Discovered
1. **Always run builds locally first** - `npm run build` catches most issues
2. **Use TypeScript strictly** - Catches many runtime errors at compile time
3. **Implement proper loading states** - Better UX during data fetching
4. **Add comprehensive logging** - Helps debug production issues
5. **Test auth flows thoroughly** - Including edge cases like expired tokens