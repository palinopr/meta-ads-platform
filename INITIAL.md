## FEATURE: Meta Ads Analytics Platform

Build a comprehensive analytics and optimization platform for managing Meta (Facebook) advertising campaigns with the following core capabilities:

### Core Requirements:
1. **Data Integration**:
   - Connect to Meta Marketing API v19.0
   - Fetch campaign, adset, and ad level data
   - Store historical data for trend analysis
   - Real-time data updates every 15 minutes
   - Handle multiple ad accounts

2. **Analytics Dashboard**:
   - Real-time metrics display (ROAS, CTR, CPC, CPM, Conversions)
   - Time-series charts for performance trends
   - Campaign comparison tools
   - Custom date ranges and filters
   - Export capabilities (CSV, PDF reports)

3. **Campaign Optimization**:
   - AI-powered budget allocation recommendations
   - Audience performance analysis
   - Creative performance insights
   - A/B test statistical analysis
   - Automated alerts for performance changes

4. **Multi-Client Management**:
   - Agency-level dashboard
   - Client-specific portals
   - Role-based access control
   - White-labeling support
   - Client reporting automation

5. **Budget Management**:
   - Real-time spend tracking
   - Budget pacing analysis
   - Overspend alerts
   - Budget recommendation engine
   - Historical spend analysis

## EXAMPLES:
Place relevant code patterns in the examples/ folder:
- Meta API integration patterns
- Dashboard component examples
- Authentication flow samples
- Data visualization components

## DOCUMENTATION:
- Meta Marketing API: https://developers.facebook.com/docs/marketing-apis/
- Meta Business SDK Python: https://github.com/facebook/facebook-python-business-sdk
- Meta API Rate Limits: https://developers.facebook.com/docs/graph-api/overview/rate-limiting
- Meta Webhooks: https://developers.facebook.com/docs/graph-api/webhooks/
- FastAPI: https://fastapi.tiangolo.com/
- Next.js App Router: https://nextjs.org/docs/app
- TimescaleDB: https://docs.timescale.com/

## TECH STACK DETAILS:
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS, Shadcn/ui components
- **Backend**: Python FastAPI with async support, Pydantic for validation
- **Database**: PostgreSQL 15+ with TimescaleDB extension for time-series data
- **Cache**: Redis for real-time data and session management
- **Queue**: Celery with Redis broker for background tasks
- **Authentication**: OAuth2 with JWT tokens, Meta Login integration

## OTHER CONSIDERATIONS:

### Meta API Specifics:
- Rate limiting: 200 calls per hour per user
- Batch requests for efficiency
- Webhook setup for real-time updates
- Access token refresh handling
- Business Manager permissions required

### Performance Requirements:
- Dashboard load time < 2 seconds
- Real-time updates via WebSockets
- Support for 100+ concurrent users
- Handle accounts with 10,000+ campaigns

### Security:
- Encrypt all API tokens
- Implement request signing
- Audit logging for all actions
- GDPR compliance for data storage
- Regular security scans

### Scalability:
- Microservices architecture
- Horizontal scaling capability
- Database partitioning by client
- CDN for static assets
- Container-based deployment

### Key Features to Avoid Common Pitfalls:
1. Implement proper error handling for API failures
2. Use exponential backoff for rate limits
3. Cache aggressively but invalidate properly
4. Implement proper pagination for large datasets
5. Handle timezone conversions correctly
6. Validate all webhook payloads
7. Implement proper cost data aggregation