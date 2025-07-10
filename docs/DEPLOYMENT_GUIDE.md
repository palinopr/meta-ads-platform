# Meta Ads Agency Platform - Deployment Guide

## Overview
Complete deployment guide for the Meta Ads Agency Platform. This guide covers both development and production deployments using modern cloud infrastructure.

## Prerequisites

### Required Accounts
- **Vercel Account**: For frontend hosting
- **Supabase Account**: For database and backend services
- **GitHub Account**: For source code management
- **Meta Developer Account**: For Facebook/Instagram API access
- **Domain Provider**: For custom domain (optional)

### Development Tools
- **Node.js**: v18+ (LTS recommended)
- **Git**: Latest version
- **VS Code**: Recommended IDE
- **Supabase CLI**: For local development

## Architecture Overview

```mermaid
graph TB
    A[Frontend - Vercel] --> B[Supabase Edge Functions]
    B --> C[Supabase PostgreSQL]
    B --> D[Meta Marketing API]
    A --> E[Supabase Auth]
    C --> F[Row Level Security]
    G[Custom Domain] --> A
```

### Technology Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: Supabase PostgreSQL with RLS
- **Authentication**: Supabase Auth with Meta OAuth
- **Hosting**: Vercel (Frontend) + Supabase (Backend)
- **API**: Meta Marketing API v19.0

## Environment Setup

### 1. Meta Developer Configuration

#### Create Facebook App
1. Visit [Facebook Developers](https://developers.facebook.com/)
2. Create new app → Business → App Name: "Your Agency Platform"
3. Add Facebook Login product
4. Configure OAuth redirect URIs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`
   - Supabase: `https://yourid.supabase.co/auth/v1/callback`

#### App Settings
```json
{
  "app_id": "your_app_id",
  "app_secret": "your_app_secret",
  "permissions": [
    "email",
    "ads_management", 
    "ads_read",
    "business_management"
  ]
}
```

### 2. Supabase Project Setup

#### Create Project
1. Visit [Supabase Dashboard](https://app.supabase.com/)
2. Create new project
3. Choose region close to your users
4. Note project URL and anon key

#### Database Setup
```sql
-- Run these in Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for meta_ad_accounts
CREATE POLICY "Users can view own ad accounts" ON meta_ad_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ad accounts" ON meta_ad_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### Auth Configuration
1. Navigate to Authentication → Settings
2. Enable Email authentication
3. Add Facebook as OAuth provider:
   - Client ID: Your Facebook App ID
   - Client Secret: Your Facebook App Secret
4. Configure redirect URLs

### 3. Environment Variables

#### Frontend (.env.local)
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Meta/Facebook Configuration
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Development URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

#### Supabase Edge Functions (.env)
```bash
# Meta API
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Meta API
META_API_VERSION=v19.0
META_API_BASE_URL=https://graph.facebook.com
```

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/meta-ads-platform.git
cd meta-ads-platform
```

### 2. Install Dependencies
```bash
# Frontend dependencies
cd frontend
npm install

# Return to root
cd ..
```

### 3. Setup Supabase Local Development
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Start local development
supabase start
```

### 4. Run Development Servers
```bash
# Terminal 1: Frontend
cd frontend
npm run dev

# Terminal 2: Supabase Edge Functions
supabase functions serve --env-file .env.local
```

### 5. Access Development Environment
- Frontend: http://localhost:3000
- Supabase Studio: http://localhost:54323
- Edge Functions: http://localhost:54321

## Production Deployment

### 1. Supabase Production Setup

#### Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy --project-ref your-project-id

# Deploy specific function
supabase functions deploy meta-accounts-v3 --project-ref your-project-id

# Set environment variables
supabase secrets set FACEBOOK_APP_ID=your_app_id --project-ref your-project-id
supabase secrets set FACEBOOK_APP_SECRET=your_app_secret --project-ref your-project-id
```

#### Run Database Migrations
```bash
# Push local migrations to production
supabase db push --project-ref your-project-id

# Or run migrations manually in Supabase SQL Editor
```

### 2. Vercel Frontend Deployment

#### Connect Repository
1. Visit [Vercel Dashboard](https://vercel.com/)
2. Import Git Repository
3. Select your Meta Ads Platform repository
4. Configure build settings:
   - Framework: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Install Command: `npm install`

#### Environment Variables
Add in Vercel dashboard under Settings → Environment Variables:

```bash
# Production Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
NEXTAUTH_SECRET=your_production_secret
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

#### Deploy
```bash
# Automatic deployment on git push
git add .
git commit -m "🚀 Production deployment"
git push origin main

# Manual deployment
cd frontend
npx vercel --prod
```

### 3. Custom Domain Setup

#### Vercel Domain Configuration
1. In Vercel dashboard → Domains
2. Add your custom domain
3. Configure DNS records with your provider:
   - Type: CNAME
   - Name: @ (or subdomain)
   - Value: your-vercel-deployment.vercel.app

#### SSL Certificate
- Automatically provisioned by Vercel
- Includes wildcard for subdomains
- Auto-renewal every 90 days

### 4. Meta App Production Configuration

#### App Review Process
1. Submit app for review with required permissions
2. Provide test user credentials
3. Include privacy policy and terms of service URLs
4. Wait for approval (typically 3-7 days)

#### Production Settings
```json
{
  "oauth_redirect_uris": [
    "https://yourdomain.com/auth/callback",
    "https://your-project.supabase.co/auth/v1/callback"
  ],
  "privacy_policy_url": "https://yourdomain.com/privacy",
  "terms_of_service_url": "https://yourdomain.com/terms"
}
```

## Security Configuration

### 1. Supabase Security

#### RLS Policies
```sql
-- Agency isolation policies (Phase 1)
CREATE POLICY "Agency isolation" ON agencies
    FOR ALL USING (id IN (
        SELECT agency_id FROM employees 
        WHERE user_id = auth.uid() AND status = 'active'
    ));

CREATE POLICY "Employee access control" ON employees
    FOR SELECT USING (
        agency_id IN (
            SELECT agency_id FROM employees 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );
```

#### Database Backup
```bash
# Enable automated backups
supabase db backup enable --project-ref your-project-id

# Manual backup
supabase db dump --project-ref your-project-id > backup.sql
```

### 2. API Security

#### Rate Limiting
```typescript
// Implement in Edge Functions
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP"
};
```

#### Input Validation
```typescript
// Validate all inputs
import { z } from 'zod';

const accountSchema = z.object({
  accountId: z.string().regex(/^\d+$/),
  accessToken: z.string().min(1)
});
```

### 3. Frontend Security

#### Content Security Policy
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' connect.facebook.net;
      connect-src 'self' https://*.supabase.co https://graph.facebook.com;
      img-src 'self' data: https:;
      style-src 'self' 'unsafe-inline';
    `.replace(/\s{2,}/g, ' ').trim()
  }
];
```

## Monitoring & Analytics

### 1. Application Monitoring

#### Vercel Analytics
```bash
# Install Vercel Analytics
npm install @vercel/analytics

# Add to layout.tsx
import { Analytics } from '@vercel/analytics/react';
```

#### Error Tracking
```typescript
// Error boundary implementation
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 2. Database Monitoring

#### Supabase Metrics
- Query performance monitoring
- Connection pool usage
- RLS policy performance
- Storage usage tracking

#### Alerts Configuration
```sql
-- Setup alerts for critical metrics
-- High CPU usage
-- Connection limits
-- Query performance degradation
-- Failed authentication attempts
```

### 3. API Monitoring

#### Meta API Rate Limits
```typescript
// Monitor rate limit headers
const checkRateLimit = (response: Response) => {
  const remaining = response.headers.get('x-ad-account-usage');
  const resetTime = response.headers.get('x-app-usage');
  
  if (remaining && parseInt(remaining) < 10) {
    // Alert when approaching limits
    console.warn('Approaching Meta API rate limit');
  }
};
```

## Performance Optimization

### 1. Frontend Optimization

#### Next.js Configuration
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['graph.facebook.com', 'platform-lookaside.fbsbx.com'],
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    appDir: true,
  },
  compress: true,
  poweredByHeader: false,
};
```

#### Bundle Analysis
```bash
# Analyze bundle size
npm install @next/bundle-analyzer
npm run analyze
```

### 2. Database Optimization

#### Indexing Strategy
```sql
-- Add indexes for common queries
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_meta_accounts_user_id ON meta_ad_accounts(user_id);
CREATE INDEX idx_campaigns_account_id ON campaigns(account_id);

-- Composite indexes for complex queries
CREATE INDEX idx_campaigns_status_date ON campaigns(status, created_at);
```

#### Query Optimization
```sql
-- Use EXPLAIN ANALYZE for query planning
EXPLAIN ANALYZE SELECT * FROM campaigns 
WHERE account_id = 'act_123' AND status = 'ACTIVE';
```

### 3. CDN Configuration

#### Vercel Edge Network
- Automatic global CDN
- Edge Functions deployment
- Image optimization
- Static asset caching

## Backup & Recovery

### 1. Database Backup

#### Automated Backups
```bash
# Configure daily backups
supabase db backup schedule --project-ref your-project-id --frequency daily
```

#### Manual Backup
```bash
# Full database backup
pg_dump postgresql://user:pass@host:port/db > backup_$(date +%Y%m%d).sql

# Schema only backup
pg_dump -s postgresql://user:pass@host:port/db > schema_backup.sql
```

### 2. Application Backup

#### Repository Backup
- Primary: GitHub repository
- Mirror: GitLab or BitBucket
- Local: Regular git pulls

#### Environment Configuration
```bash
# Backup environment variables
echo "# Environment Backup $(date)" > .env.backup
echo "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL" >> .env.backup
# ... add other variables
```

### 3. Recovery Procedures

#### Database Recovery
```bash
# Restore from backup
psql postgresql://user:pass@host:port/db < backup_file.sql

# Point-in-time recovery
supabase db restore --project-ref your-project-id --backup-id backup-id
```

#### Application Recovery
```bash
# Redeploy from last known good commit
git checkout last-good-commit
git push origin main --force-with-lease
```

## Scaling Considerations

### 1. Database Scaling

#### Connection Pooling
```typescript
// Configure connection pooling
const supabase = createClient(url, key, {
  db: {
    pooler: {
      enabled: true,
      mode: 'transaction'
    }
  }
});
```

#### Read Replicas
- Configure for read-heavy workloads
- Route analytics queries to replicas
- Maintain write operations on primary

### 2. Function Scaling

#### Edge Function Optimization
```typescript
// Optimize cold starts
export default async function handler(req: Request) {
  // Initialize connections once
  if (!globalConnection) {
    globalConnection = await initializeConnections();
  }
  
  // Process request
  return processRequest(req);
}
```

### 3. Frontend Scaling

#### ISR (Incremental Static Regeneration)
```typescript
// Use ISR for dashboard pages
export async function getStaticProps() {
  return {
    props: { data },
    revalidate: 300 // 5 minutes
  };
}
```

## Troubleshooting Guide

### Common Deployment Issues

#### Build Failures
```bash
# Check build logs
vercel logs your-deployment-url

# Common fixes
rm -rf node_modules .next
npm install
npm run build
```

#### Database Connection Issues
```typescript
// Test database connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .single();
    
    if (error) throw error;
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
};
```

#### Meta API Issues
```typescript
// Debug Meta API calls
const debugMetaAPI = async (accessToken: string) => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/me/adaccounts?access_token=${accessToken}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Meta API Error:', error);
    }
  } catch (error) {
    console.error('Meta API Request Failed:', error);
  }
};
```

### Performance Issues

#### Slow Database Queries
```sql
-- Find slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

#### High Memory Usage
```bash
# Monitor memory usage
node --inspect server.js
# Use Chrome DevTools for profiling
```

### Security Issues

#### Authentication Problems
```typescript
// Debug auth flow
const debugAuth = async () => {
  const session = await supabase.auth.getSession();
  console.log('Current session:', session);
  
  const user = await supabase.auth.getUser();
  console.log('Current user:', user);
};
```

## Maintenance Tasks

### Daily Tasks
- Monitor error rates
- Check API rate limit usage
- Review security logs
- Verify backup completion

### Weekly Tasks
- Update dependencies
- Review performance metrics
- Analyze user feedback
- Test critical user flows

### Monthly Tasks
- Security audit
- Performance optimization review
- Dependency vulnerability scan
- Disaster recovery testing

## Support & Documentation

### Resources
- **Vercel Documentation**: https://vercel.com/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Meta API Documentation**: https://developers.facebook.com/docs/marketing-apis
- **Next.js Documentation**: https://nextjs.org/docs

### Getting Help
- **GitHub Issues**: For bug reports and feature requests
- **Discord Community**: Real-time community support
- **Professional Support**: Available for enterprise deployments

---

This deployment guide ensures a robust, scalable, and secure deployment of the Meta Ads Agency Platform. Follow these steps carefully and maintain regular backups and monitoring for optimal performance.
