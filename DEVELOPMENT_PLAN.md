# Development Plan for Internal Meta Ads Analytics Platform

## Project Purpose and Goals

**NEW VISION**: A lean internal analytics platform for 2-3 power users to analyze Meta ads trends and make fast optimization decisions.

**Primary Goals:**
- **Trend Analysis**: Age demographics, sales per day patterns, performance insights
- **Fast Decision Making**: Quick access to what's working vs what needs optimization
- **Simple UI**: No complexity, focused on essential analytics only
- **Real-time Data**: Always fresh insights from Meta API (no stale database cache)
- **Power User Experience**: Built for experts who know what they need

**Current Status:** Strategic pivot from complex SaaS to lean internal analytics tool - 70% complexity reduction achieved.

## Context and Background

**Platform Architecture (Simplified):**
- Frontend: Next.js 14 with TypeScript (lean, fast loading)
- Backend: Supabase Edge Functions only (no complex FastAPI backend)
- Database: Ultra-minimal schema (profiles + meta_ad_accounts only)
- Authentication: Supabase Auth with Facebook OAuth
- Meta API Integration: Direct API calls (no campaign data storage)

**Key Architecture Decision:** 
```
Frontend → Edge Function → Meta API (Direct)
NOT: Frontend → Database → Sync Job → Meta API
```

**Database Strategy:**
- KEEP: User profiles, Meta account references only
- REMOVE: All campaign storage tables (campaigns, ads, metrics, etc.)
- PRINCIPLE: Always fetch fresh from Meta API

## Hard Requirements

1. **Speed**: Dashboard loads in < 2 seconds, insights available immediately
2. **Simplicity**: Single-page analytics dashboard, no complex navigation
3. **Accuracy**: Real-time Meta API data for trend analysis
4. **Focus**: Only essential analytics - age demographics, daily patterns, performance metrics
5. **Internal Tool**: Built for 2-3 expert users, not multi-tenant SaaS
6. **No Tools**: Pure analytics focus, no campaign management features

## Development Phases

### Phase 1: Foundation Cleanup & Database Simplification 🧹

**Business Impact:** Remove complexity, faster development, simpler maintenance

**Week 1 Tasks:**
- [ ] **Database Schema Cleanup (CRITICAL)**
  ```sql
  -- Remove deprecated campaign storage tables
  DROP TABLE IF EXISTS campaigns CASCADE;
  DROP TABLE IF EXISTS ads CASCADE;
  DROP TABLE IF EXISTS ad_sets CASCADE;
  DROP TABLE IF EXISTS creatives CASCADE;
  DROP TABLE IF EXISTS campaign_metrics CASCADE;
  DROP TABLE IF EXISTS adset_metrics CASCADE;
  ```
- [ ] **Edge Functions Cleanup**
  - KEEP: meta-accounts-v3, handle-meta-oauth, sync-meta-token-v2
  - DELETE: sync-campaigns (all variants), sync-campaign-insights, get-campaigns-direct
- [ ] **Remove Backend Complexity**
  - Remove FastAPI backend (not needed for analytics)
  - Keep only essential Edge Functions
  - Simplify authentication flow

### Phase 2: Core Analytics Dashboard 📊

**Business Impact:** Essential analytics for trend analysis and optimization decisions

**Week 2 Tasks:**
- [ ] **Meta Analytics Service**
  - MetaAnalyticsService class with batched API calls
  - Campaign insights endpoint (demographics, performance, time series)
  - Client-side caching (5-minute TTL) and rate limiting
- [ ] **Core Analytics Components**
  - AgeDemographicTrends: Line charts showing age group performance over time
  - DailySalesPattern: Heatmap of performance by day/hour
  - PerformanceComparison: Side-by-side campaign analysis
  - OptimizationInsights: Top/bottom performers with recommendations
- [ ] **Single Analytics Dashboard**
  - Replace complex multi-page navigation
  - Single dashboard with key insights
  - Fast loading with skeleton states

### Phase 3: Power User Experience 🚀

**Business Impact:** Optimized for expert users making fast decisions

**Week 3 Tasks:**
- [ ] **Fast Interactions**
  - Keyboard shortcuts: 'D'→Dashboard, 'T'→Trends, 'C'→Comparison, 'R'→Refresh
  - Progressive data loading
  - Virtual scrolling for large datasets
- [ ] **High-Contrast Analytics Mode**
  - Optimized for data analysis
  - Clear data visualization
  - Minimal distractions
- [ ] **Mobile Optimization**
  - Responsive design for on-the-go insights
  - Touch-friendly controls
  - Essential data only on small screens

### Phase 4: Advanced Analytics & Polish ✨

**Business Impact:** Professional internal tool with advanced insights

**Week 4 Tasks:**
- [ ] **Advanced Trend Analysis**
  - Seasonal pattern detection
  - Performance forecasting
  - Anomaly detection alerts
- [ ] **Data Export**
  - PDF reports for sharing insights
  - Excel export for deeper analysis
  - Quick screenshot sharing
- [ ] **Performance Optimization**
  - Bundle size optimization
  - Data prefetching
  - Progressive Web App features

## Technical Implementation

### Data Flow (Simplified)
```
User Dashboard → Edge Function → Meta API → Real-time Analytics
                      ↓
                Temporary Cache (5min TTL)
```

### Key APIs Needed
- **Meta Insights API**: Campaign performance, demographics, time series
- **Meta Campaigns API**: Basic campaign info for context
- **Meta Ad Account API**: Account selection and management

### Analytics Components Architecture
```
AnalyticsDashboard/
├── AgeDemographicTrends/
├── DailySalesPattern/
├── PerformanceComparison/
├── OptimizationInsights/
└── QuickMetrics/
```

## Success Metrics

**Immediate (Week 1):**
- Database simplified: 6+ tables removed
- Build time reduced by 50%
- Edge functions cleaned up

**Short-term (Month 1):**
- Dashboard loads in < 2 seconds
- Users can identify trends in < 30 seconds
- Zero database sync issues (direct API only)

**Long-term (Quarter 1):**
- Power users make optimization decisions 3x faster
- Zero stale data issues
- Platform handles 200+ ad accounts smoothly

## Key Differentiators

**What Makes This Different:**
- **Internal Tool**: Built for experts, not general users
- **Analytics Focus**: Pure insights, no campaign management
- **Direct API**: Always fresh data, no sync complexity
- **Speed**: Optimized for fast decision making
- **Simplicity**: Essential features only

**What We DON'T Build:**
- Multi-user management
- Campaign creation/editing tools
- Complex reporting workflows
- White-label features
- User onboarding flows

## QA Checklist

- [ ] Database contains only essential tables (profiles, meta_ad_accounts)
- [ ] No campaign data stored in database
- [ ] All analytics data fetched directly from Meta API
- [ ] Dashboard loads in < 2 seconds
- [ ] Age demographic trends display correctly
- [ ] Daily sales patterns show clear insights
- [ ] Performance comparison highlights optimization opportunities
- [ ] Keyboard shortcuts work for power users
- [ ] Mobile view shows essential data clearly
- [ ] No complex navigation or unnecessary features
- [ ] Direct API pattern maintained throughout
- [ ] Meta API rate limits respected with proper caching
- [ ] Error handling for API failures
- [ ] Professional appearance suitable for internal use
