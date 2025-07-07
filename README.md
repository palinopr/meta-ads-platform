# Meta Ads Analytics Platform

A powerful analytics and optimization platform for managing Meta (Facebook) advertising campaigns at scale.

## 🚀 Features

- **Real-time Analytics**: Track campaign performance with live updates
- **Multi-Account Management**: Handle multiple ad accounts from one dashboard
- **AI-Powered Optimization**: Get intelligent recommendations for campaign improvements
- **Automated Reporting**: Schedule and customize reports for clients
- **Budget Management**: Monitor spend and set automated alerts
- **A/B Testing Analysis**: Statistical analysis of campaign variations

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Python FastAPI
- **Database**: PostgreSQL + TimescaleDB
- **Cache**: Redis
- **Queue**: Celery
- **API**: Meta Marketing API v19.0

## 📋 Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose
- Meta Business Manager access
- Meta App with Marketing API permissions

## 🔧 Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd meta-ads-platform
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Meta API credentials
```

3. Start services with Docker:
```bash
docker-compose up -d
```

4. Install dependencies:
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

5. Run migrations:
```bash
cd backend
python manage.py migrate
```

6. Start development servers:
```bash
# Backend (from backend/)
uvicorn main:app --reload

# Frontend (from frontend/)
npm run dev
```

## 📊 Key Metrics

The platform tracks essential advertising metrics:
- ROAS (Return on Ad Spend)
- CPA (Cost Per Acquisition)
- CTR (Click-Through Rate)
- CPC (Cost Per Click)
- Conversion Rate
- Frequency
- Budget Utilization

## 🔑 Environment Variables

Required environment variables:
```
# Meta API
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_ACCESS_TOKEN=your_access_token

# Database
DATABASE_URL=postgresql://user:pass@localhost/metaads
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_jwt_secret
API_KEY=your_api_key
```

## 📝 License

[Your License]

## 🤝 Contributing

[Contributing guidelines]