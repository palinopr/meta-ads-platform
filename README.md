# Meta Ads Analytics Platform

A comprehensive analytics and optimization platform for Meta advertising campaigns, designed for agencies managing $2M+ in ad spend.

![Meta Ads Platform](https://img.shields.io/badge/Meta%20Ads-Platform-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 🚀 Live Demo

- **Frontend**: https://frontend-ten-eta-42.vercel.app
- **Test Account**: Create your own at `/signup`

## ✨ Features

### Current Features
- 📊 **Real-time Analytics Dashboard** - Track ROAS, CTR, CPC, CPM across campaigns
- 🔐 **Secure Authentication** - Email/password and Facebook OAuth
- 🔗 **Meta Account Connection** - OAuth integration with Facebook
- 📱 **Campaign Management** - View and manage ad campaigns
- 👥 **Multi-Client Support** - Handle multiple ad accounts
- 📄 **Legal Compliance** - Privacy Policy and Terms of Service

### Coming Soon
- 📈 Real-time performance charts
- 🤖 AI-powered optimization suggestions
- 📊 Custom reporting with PDF export
- 🔔 Performance alerts and notifications
- 🏷️ White-label support for agencies

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui
- **Charts**: Recharts (planned)
- **Deployment**: Vercel

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with Facebook OAuth
- **API**: Supabase Edge Functions
- **External APIs**: Facebook Marketing API v19.0

## 🏗️ Project Structure

```
meta-ads-platform/
├── frontend/               # Next.js application
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities and clients
│   └── public/           # Static assets
├── supabase/             # Backend logic
│   ├── functions/        # Edge Functions
│   └── migrations/       # Database schema
├── backend/              # FastAPI (legacy, being migrated)
└── docs/                 # Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Facebook App (for OAuth)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/palinopr/meta-ads-platform.git
   cd meta-ads-platform
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open http://localhost:3000**

### Environment Variables

Create a `.env.local` file in the frontend directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Facebook
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id

# Backend API (if using separate backend)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📦 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with `git push`

### Edge Functions (Supabase)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy meta-accounts
supabase functions deploy meta-sync
supabase functions deploy handle-meta-oauth
```

## 🔧 Configuration

### Facebook OAuth Setup

1. Create a Facebook App at https://developers.facebook.com
2. Add Facebook Login product
3. Set redirect URI: `https://your-supabase-url.supabase.co/auth/v1/callback`
4. Add Privacy Policy URL: `https://your-app.vercel.app/privacy`
5. Add Terms of Service URL: `https://your-app.vercel.app/terms`
6. Enable these permissions:
   - `email`
   - `ads_management`
   - `ads_read`
   - `business_management`

### Supabase Setup

1. Enable Facebook OAuth in Authentication settings
2. Add your Facebook App ID and Secret
3. Run migrations from `supabase/migrations/`
4. Deploy Edge Functions
5. Set up Row Level Security policies

## 📊 Database Schema

- `profiles` - User profiles and settings
- `meta_ad_accounts` - Connected Facebook ad accounts
- `campaigns` - Campaign data and settings
- `ad_sets` - Ad set configurations
- `ads` - Individual ad creatives
- `campaign_metrics` - Performance metrics
- `adset_metrics` - Ad set level metrics

## 📈 Key Metrics Tracked

- **ROAS** (Return on Ad Spend)
- **CPA** (Cost Per Acquisition)
- **CTR** (Click-Through Rate)
- **CPC** (Cost Per Click)
- **CPM** (Cost Per Mille)
- **Conversion Rate**
- **Frequency**
- **Budget Utilization**

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Known Issues

- Facebook OAuth token persistence needs improvement
- Real-time data sync not yet implemented
- Charts and visualizations coming soon

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

- **Documentation**: See [CLAUDE.md](./CLAUDE.md) for detailed docs
- **Issues**: https://github.com/palinopr/meta-ads-platform/issues
- **Email**: support@outletmediamethod.com

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Supabase](https://supabase.com/)
- UI components from [Shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

Made with ❤️ for digital marketers managing Meta ads at scale