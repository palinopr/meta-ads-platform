# Meta Ads Analytics Platform

## Project Overview
A comprehensive analytics and optimization platform for Meta advertising campaigns with $2M+ in ad spend management.

### 🎯 Core Features
- **Real-time Analytics Dashboard** - Track ROAS, CTR, CPC, CPM, conversions across all campaigns
- **Campaign Optimization** - AI-powered suggestions for budget allocation and audience targeting
- **Multi-Client Management** - Handle multiple ad accounts with role-based access
- **Automated Reporting** - Scheduled reports with custom metrics and insights
- **Budget Management** - Track spend, set alerts, and automate budget adjustments
- **A/B Testing Analysis** - Compare campaign performance with statistical significance

### 🔧 Tech Stack
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Python FastAPI with async support
- **Database**: PostgreSQL with TimescaleDB for time-series data
- **Cache**: Redis for real-time data
- **Queue**: Celery with Redis for background tasks
- **Meta API**: Facebook Marketing API v19.0
- **Authentication**: OAuth2 with JWT tokens
- **Deployment**: Docker + Kubernetes

### 📊 Key Metrics Tracked
- Return on Ad Spend (ROAS)
- Cost Per Acquisition (CPA)
- Click-Through Rate (CTR)
- Cost Per Click (CPC)
- Conversion Rate
- Frequency
- Relevance Score
- Budget Utilization

### 🏗️ Project Structure
```
meta-ads-platform/
├── frontend/               # Next.js application
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities and API clients
│   └── styles/           # Global styles
├── backend/               # FastAPI application
│   ├── api/              # API endpoints
│   ├── core/             # Core business logic
│   ├── models/           # Database models
│   ├── services/         # External service integrations
│   └── workers/          # Background tasks
├── infrastructure/        # Docker, K8s configs
└── docs/                 # Documentation
```

### 🔄 Development Guidelines
- **Always check `TASK.md`** for current development tasks
- **Follow Meta API best practices** - Rate limiting, batch requests, webhook handling
- **Implement comprehensive error handling** for API failures
- **Use environment variables** for all sensitive data
- **Cache aggressively** - Meta data updates every 15 minutes
- **Write tests** for all API integrations and business logic

### 🧱 Code Standards
- **Never create files longer than 500 lines** - Split into modules
- **Use clear module organization** by feature/responsibility
- **Follow PEP8** with type hints and black formatting
- **Use pydantic** for data validation
- **Write docstrings** for all functions (Google style)

### 🧪 Testing Requirements
- **Create pytest unit tests** for all new features
- **Test structure** mirrors app structure in `/tests`
- **Include**: expected use, edge cases, failure cases
- **Run tests in Docker** for consistency

### 📚 Documentation
- **Update README.md** when features/dependencies change
- **Comment non-obvious code** with `# Reason:` explanations
- **Keep API documentation** up to date

### 🚀 Performance Considerations
- **Batch Meta API requests** to avoid rate limits
- **Use Redis caching** for frequently accessed data
- **Implement pagination** for large data sets
- **Use background tasks** for heavy processing
- **Monitor API usage** to stay within limits

### 🔐 Security Requirements
- **Never commit secrets** - Use environment variables
- **Implement proper authentication** - OAuth2 + JWT
- **Validate all inputs** - Prevent injection attacks
- **Use HTTPS everywhere** - Encrypt data in transit
- **Implement rate limiting** - Prevent abuse

### 📈 Scaling Considerations
- **Design for horizontal scaling** from day one
- **Use message queues** for async processing
- **Implement proper logging** and monitoring
- **Plan for multi-tenancy** architecture
- **Consider data partitioning** for large datasets