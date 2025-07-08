# Meta Ads Analytics Platform

## Project Overview
A comprehensive analytics and optimization platform for Meta advertising campaigns with $2M+ in ad spend management. Currently deployed and operational with Supabase authentication and database integration.

### 📍 Current State (Jan 2025)
- ✅ **Frontend deployed** at https://frontend-ten-eta-42.vercel.app
- ✅ **User authentication working** - Email/password signup and login
- ✅ **Dashboard UI complete** - Shows metrics cards and layout
- ✅ **Supabase Edge Functions deployed** - meta-accounts-v3, get-campaigns-from-meta
- ✅ **Facebook OAuth configured** - In Supabase auth providers
- ✅ **Settings page** - Connect/disconnect Meta account
- ✅ **Campaigns page** - Searchable account selector for 200+ accounts
- ✅ **Privacy Policy & Terms** - Compliance pages for Facebook
- ✅ **Meta token storage FIXED** - OAuth tokens properly persisting to database
- ✅ **Direct Meta API Architecture** - Campaigns fetched directly from Meta (no database storage)
- ✅ **Massive Cleanup Completed** - Removed 50+ debug files and 15+ deprecated functions
- ✅ **Pagination support** - Handles 200+ ad accounts efficiently
- ✅ **Real campaign data** - Fetches actual campaigns directly from Meta API
- ✅ **Searchable dropdowns** - Type to search through 200+ accounts

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
- **Database**: ✅ Supabase with profiles, meta_ad_accounts, campaigns tables
- **Authentication**: ✅ Email/password and Facebook OAuth configured
- **Edge Functions**: ✅ Deployed (meta-accounts, meta-sync, handle-meta-oauth)
- **GitHub Repository**: ✅ https://github.com/palinopr/meta-ads-platform
- **Supabase Project**: ✅ igeuyfuxezvvenxjfnnn

### 🔄 Development Guidelines
- **Always check `TASK.md`** for current development tasks
- **Use Supabase client libraries** for database operations
- **Follow Meta API best practices** - Rate limiting, batch requests, webhook handling
- **Implement comprehensive error handling** for API failures
- **Use environment variables** for all sensitive data
- **DON'T cache campaign data in database** - Always fetch fresh from Meta API
- **Write tests** for all API integrations and business logic

### 🏗️ CRITICAL ARCHITECTURE DECISION: Direct Meta API Only

#### ❌ What NOT to Do (Database Storage Pattern)
```
Frontend → Database → Sync Job → Meta API
```
This creates:
- Stale data issues
- Complex sync logic
- Database storage overhead
- Multiple failure points
- Unnecessary complexity

#### ✅ What TO DO (Direct API Pattern)
```
Frontend → Edge Function → Meta API
```
This provides:
- Always fresh data
- Simple architecture
- No sync needed
- Single source of truth
- Better performance

#### Database Usage Rules
The database should ONLY store:
1. **User accounts** (auth.users, profiles)
2. **Meta ad account references** (meta_ad_accounts - just ID and name)
3. **User preferences/settings**

The database should NEVER store:
1. ❌ Campaign data
2. ❌ Campaign metrics
3. ❌ Ad performance data
4. ❌ Any data available from Meta API

#### When You See These Patterns - STOP!
```typescript
// ❌ WRONG - Database storage
.from('campaigns').insert()
.from('campaign_metrics').select()
await api.syncAccount()

// ✅ CORRECT - Direct API
await api.getCampaigns() // fetches from Meta
.invoke('get-campaigns-from-meta')
```

### 🗄️ Database Schema (Supabase) - SIMPLIFIED
- **profiles**: User profiles linked to auth.users (includes meta_access_token)
- **meta_ad_accounts**: Facebook ad account references (ID, name, status only)

#### ⚠️ DEPRECATED TABLES (DO NOT USE)
These tables exist but should NOT be used - fetch data directly from Meta API instead:
- ❌ **campaigns**: Should fetch from Meta API
- ❌ **ad_sets**: Should fetch from Meta API
- ❌ **ads**: Should fetch from Meta API
- ❌ **creatives**: Should fetch from Meta API
- ❌ **campaign_metrics**: Should fetch from Meta API
- ❌ **adset_metrics**: Should fetch from Meta API

All active tables have:
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

### 📈 API Endpoints (Supabase Edge Functions)
```
# Active Meta Integration Edge Functions
POST   /functions/v1/meta-accounts-v3         - List ad accounts from Meta
POST   /functions/v1/get-campaigns-from-meta  - Fetch campaigns directly from Meta
POST   /functions/v1/handle-meta-oauth        - Process OAuth callback

# Frontend Routes
GET    /                     - Landing page
GET    /login               - User login
GET    /signup              - User registration
GET    /dashboard           - Analytics dashboard (mock data for now)
GET    /settings            - Account settings & Meta connection
GET    /campaigns           - Campaign management (direct Meta API)
GET    /privacy             - Privacy policy
GET    /terms               - Terms of service
GET    /auth/callback       - OAuth callback handler
```

#### 🚫 Deprecated Edge Functions (REMOVED)
- ❌ sync-campaigns-* (all variants) - Don't sync to database
- ❌ get-campaigns-direct - Don't read from database
- ❌ sync-campaign-metrics - Don't store metrics
- ❌ All debug/test functions - Removed for production

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
1. ✅ **Fix Meta Token Storage**: COMPLETED - Tokens now persist properly
2. **Implement Real Data Sync**: Fetch actual campaigns from Meta API
3. **Campaign Management**: Add create/edit/pause campaign features
4. **Real-time Charts**: Add Recharts for performance visualization
5. **Budget Optimization**: Implement automated budget redistribution
6. **Export Features**: CSV/PDF export for reports
7. **Webhook Integration**: Real-time updates from Meta
8. ✅ **Multi-Account Support**: COMPLETED - Dropdown supports 200+ accounts
9. **AI Insights**: OpenAI integration for optimization suggestions
10. **White Label**: Custom branding for agencies

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

### ⚠️ IMPORTANT: Manual Database Setup Required

Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql/new):

```sql
-- Fix the unique constraint on meta_ad_accounts
ALTER TABLE public.meta_ad_accounts 
DROP CONSTRAINT IF EXISTS meta_ad_accounts_account_id_key;

ALTER TABLE public.meta_ad_accounts 
ADD CONSTRAINT meta_ad_accounts_account_id_user_id_key 
UNIQUE (account_id, user_id);
```

This fixes the account insertion error and allows multiple users to have the same ad account.

### 🐛 Known Issues & TODOs
- [x] Facebook OAuth token not persisting to profiles.meta_access_token - FIXED
- [ ] Need to implement actual Meta API data fetching for campaigns
- [ ] Add comprehensive error boundaries in React
- [ ] Implement request retry logic for Meta API
- [ ] Add loading skeletons for better UX
- [ ] Create onboarding flow for new users
- [x] Add account selection for multiple ad accounts - COMPLETED
- [ ] Implement date range picker for metrics
- [ ] Add export functionality (CSV/PDF)
- [ ] Create admin panel for agency owners
- [ ] Add search/filter for ad accounts (important with 200+ accounts)
- [ ] Implement campaign metrics fetching from Meta API

### 📞 Support & Resources
- **Supabase Dashboard**: https://app.supabase.com/project/igeuyfuxezvvenxjfnnn
- **Meta API Docs**: https://developers.facebook.com/docs/marketing-apis/
- **Vercel Dashboard**: https://vercel.com/palinos-projects/frontend
- **GitHub Issues**: https://github.com/palinopr/meta-ads-platform/issues

### 🛠️ How to Build New Features

#### 1. Adding a New Page/Route
```bash
# Create new page in frontend/app/[route-name]/page.tsx
# Example: Campaign editor at /campaigns/edit
```

#### 2. Adding New Supabase Edge Function
```typescript
// Create in supabase/functions/[function-name]/index.ts
// Deploy with: SUPABASE_ACCESS_TOKEN=sbp_f7707c9af87f1e53db3c08bce5e2bb143267a9d9 npx supabase functions deploy [function-name] --project-ref igeuyfuxezvvenxjfnnn
```

#### 3. Adding Database Tables
```sql
-- Add migration in supabase/migrations/
-- Run in Supabase SQL editor
-- Always add RLS policies!
```

#### 4. Common Development Flow
1. **Update Database Schema** - Add tables/columns in Supabase
2. **Create Edge Function** - If new API endpoint needed
3. **Add Frontend Component** - In components/ directory
4. **Create Page** - In app/ directory
5. **Update Types** - Keep TypeScript interfaces in sync
6. **Test Locally** - npm run dev
7. **Deploy** - Follow Standard Deployment Workflow (see below)

#### 5. 🚀 **CRITICAL: Standard Deployment Workflow**

**ALWAYS execute these 2 steps when completing ANY CEO feature:**

```bash
# Step 1: Git Commit & Push
git add [changed-files]
git commit -m "🚀 [Feature Name]: [Brief description]

✅ [Task completion details]
- [Feature 1]: [Description]
- [Feature 2]: [Description]

Business Impact:
💰 [Revenue impact]
🏢 [Customer value]
📈 [Growth metric]

Technical:
- [Technical detail 1]
- [Technical detail 2]"

git push origin main

# Step 2: Force Vercel Production Deployment
cd frontend && npx vercel --prod
```

**Why This Matters:**
- ✅ Ensures all CEO features are immediately live in production
- ✅ GitHub auto-deploy may miss changes or have delays
- ✅ Manual Vercel deployment guarantees latest code is deployed
- ✅ Provides immediate production URL for testing
- ✅ Critical for demo readiness and customer showcases

**Always verify deployment worked by checking:**
- Bundle size increase (indicates new features deployed)
- Production URL reflects latest changes
- No deployment errors in Vercel logs

#### 5. Using AI Features
- **Campaign Optimization**: Use OpenAI API via Edge Functions
- **Budget Recommendations**: Analyze metrics patterns
- **Audience Insights**: Process demographic data
- **Content Suggestions**: Generate ad copy variations

#### 6. Key Files to Know
- `frontend/lib/api/meta.ts` - Meta API client
- `frontend/lib/supabase/client.ts` - Supabase client setup
- `frontend/app/dashboard/` - Main dashboard components
- `frontend/app/campaigns/campaigns-client.tsx` - Campaign management with account selection
- `frontend/app/settings/settings-client.tsx` - Meta OAuth connection
- `frontend/app/test-meta/page.tsx` - OAuth debugging tool
- `frontend/components/ui/account-selector.tsx` - Reusable searchable account dropdown
- `supabase/functions/meta-accounts-v2/` - Simplified ad account fetching
- `supabase/functions/sync-campaigns/` - Syncs campaigns from Meta API
- `supabase/functions/sync-meta-token/` - Syncs OAuth token from session
- `supabase/functions/check-meta-connection/` - Verifies Meta connection
- `supabase/migrations/` - Database schema

### 🔧 Recent Fixes (Jan 2025)

#### Facebook OAuth Token Storage Fix
**Problem**: OAuth tokens weren't persisting after Facebook login
**Solution**: 
1. Updated `/auth/callback/route.ts` to capture `provider_token` from session
2. Created `sync-meta-token` Edge Function as fallback
3. Added `/test-meta` debug page to troubleshoot OAuth flow
4. Token now properly saves to `profiles.meta_access_token`

#### Large Account Set Handling
**Problem**: User has 200+ ad accounts causing timeouts and poor UX
**Solution**:
1. Created `meta-accounts-v2` simplified Edge Function
2. Built custom searchable `AccountSelector` component
3. Added search by name, ID, or currency
4. Groups accounts by active/inactive status
5. Shows rich info with icons and badges

#### Campaign Loading Fix
**Problem**: Schema cache error when joining campaigns with meta_ad_accounts
**Solution**:
1. Fixed query to use proper foreign key relationship
2. Created `sync-campaigns` Edge Function to fetch from Meta API
3. Auto-syncs campaigns when account is selected
4. Handles Meta API pagination and rate limits

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
6. **Handle large datasets with pagination** - Essential for 200+ ad accounts
7. **DON'T cache campaign data in database** - Always fetch fresh from Meta API
8. **Use batch operations** - When inserting many records to avoid timeouts
9. **Create debug tools TEMPORARILY** - Remove them before production
10. **Separate concerns in Edge Functions** - One function per specific task
11. **Direct API architecture is simpler** - No sync complexity or stale data issues
12. **Clean up debug code regularly** - Prevents codebase bloat

### 🧹 Cleanup Lessons (Jan 2025)

#### What We Removed
1. **50+ debug/test pages and files**
   - All /debug-*, /test-*, /setup-* routes
   - Temporary OAuth troubleshooting tools
   - Development-only utilities

2. **15+ deprecated edge functions**
   - All sync-campaigns-* variants
   - Database read/write functions for campaigns
   - Metrics storage functions
   - Debug and test functions

3. **Unused API client classes**
   - MetaAPIFixed, MetaAPISafe
   - Complex fallback logic
   - Multiple API attempt patterns

4. **Console.log statements and debug code**
   - Production code now clean
   - No debug artifacts in UI
   - Professional error handling only

#### Why This Matters
- **Smaller bundle sizes** (106KB reduction on campaigns page)
- **Cleaner codebase** (10,000+ lines removed)
- **No confusion** about which functions to use
- **Prevents regression** to database storage pattern
- **Professional production deployment**

#### Key Takeaway
**Always clean up after development!** Debug tools are temporary. Once the feature works, remove the scaffolding. The best code is no code - if you don't need it, delete it.

## 🤖 AUTOMATED CEO PROTOCOL

When user says **"read mandatory CEO reference"**, the automated protocol executes:

1. **Reads all .md files** starting with MANDATORY-CEO-REFERENCE.md
2. **Creates TODO list** with features and deployment tasks
3. **Executes highest priority** items from CEO reference
4. **Always ends with**:
   - git add -A
   - git commit with business impact message
   - git push origin main
   - cd frontend && npx vercel --prod
5. **Updates all documentation** after completion

This ensures:
- CEO priorities are always addressed first
- Every change is deployed to production
- Documentation stays current
- Nothing is forgotten

See **🤖AUTO-PROTOCOL.md** for full implementation details.
