# Meta Ads Analytics Platform - Project Brief

## Foundation Document

This document serves as the source of truth for the Meta Ads Analytics Platform project scope and core requirements.

## Core Requirements

### Primary Objective
Build a comprehensive analytics and optimization platform for Meta advertising campaigns managing £2M+ in ad spend with real-time data access and AI-powered insights.

### Key Success Metrics
- **Performance**: Dashboard loads < 2 seconds, API responses < 500ms
- **Scale**: Support 100+ concurrent users, 200+ ad accounts per user
- **Reliability**: 99.9% uptime, comprehensive test coverage
- **Business Impact**: Protect £2M+ ad spend with enterprise-grade reliability

## Technical Architecture Decisions

### ✅ CRITICAL: Direct Meta API Pattern (No Database Storage)
```
Frontend → Edge Function → Meta API ✅ CORRECT
Frontend → Database → Sync Job → Meta API ❌ WRONG
```

**Database Usage Rules:**
- ✅ Store: User accounts, Meta ad account references, user preferences
- ❌ Never Store: Campaign data, metrics, ad performance data

### Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + Shadcn/ui
- **Backend**: Supabase Edge Functions (Python/TypeScript)
- **Database**: Supabase PostgreSQL with RLS
- **Authentication**: Supabase Auth + Facebook OAuth
- **API**: Facebook Marketing API v19.0
- **Testing**: Jest + React Testing Library

## Current Deployment Status
- **Frontend**: ✅ Live at https://frontend-ten-eta-42.vercel.app
- **Database**: ✅ Supabase (igeuyfuxezvvenxjfnnn)
- **Authentication**: ✅ Email/password + Facebook OAuth working
- **Edge Functions**: ✅ meta-accounts-v3, get-campaigns-from-meta deployed

## Core Features (Priority Order)
1. **Real-time Analytics Dashboard** - ROAS, CTR, CPC, CPM tracking
2. **Campaign Management** - Direct Meta API integration
3. **Multi-Client Support** - 200+ ad accounts per user
4. **Automated Reporting** - Scheduled insights and alerts
5. **AI-Powered Optimization** - Budget allocation suggestions
6. **A/B Testing Analysis** - Statistical significance testing

## Business Context
- **Target Users**: Digital marketing agencies managing multiple clients
- **Revenue Protection**: Enterprise-grade reliability for high-value ad spend
- **Competitive Edge**: Direct API access for always-fresh data
- **Compliance**: Privacy Policy & Terms for Facebook App approval
