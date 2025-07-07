-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create meta_ad_accounts table
CREATE TABLE IF NOT EXISTS public.meta_ad_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT UNIQUE NOT NULL,
  account_name TEXT,
  currency TEXT,
  timezone_name TEXT,
  status TEXT,
  spend_cap INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_account_id UUID NOT NULL REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  campaign_id TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT,
  objective TEXT,
  buying_type TEXT,
  budget_remaining NUMERIC,
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  bid_strategy TEXT,
  created_time TIMESTAMPTZ,
  updated_time TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  stop_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create ad_sets table
CREATE TABLE IF NOT EXISTS public.ad_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  ad_set_id TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT,
  billing_event TEXT,
  bid_amount INTEGER,
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  budget_remaining NUMERIC,
  targeting JSONB,
  promoted_object JSONB,
  optimization_goal TEXT,
  created_time TIMESTAMPTZ,
  updated_time TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create ads table
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_set_id UUID NOT NULL REFERENCES public.ad_sets(id) ON DELETE CASCADE,
  ad_id TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT,
  creative_id TEXT,
  tracking_specs JSONB,
  conversion_specs JSONB,
  created_time TIMESTAMPTZ,
  updated_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create creatives table
CREATE TABLE IF NOT EXISTS public.creatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  creative_id TEXT UNIQUE NOT NULL,
  name TEXT,
  title TEXT,
  body TEXT,
  image_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  call_to_action_type TEXT,
  link_url TEXT,
  instagram_permalink_url TEXT,
  object_story_spec JSONB,
  created_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create campaign_metrics table
CREATE TABLE IF NOT EXISTS public.campaign_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0.0,
  cpc NUMERIC DEFAULT 0.0,
  cpm NUMERIC DEFAULT 0.0,
  cpp NUMERIC DEFAULT 0.0,
  conversions INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0.0,
  cost_per_conversion NUMERIC DEFAULT 0.0,
  spend NUMERIC DEFAULT 0.0,
  purchase_value NUMERIC DEFAULT 0.0,
  roas NUMERIC DEFAULT 0.0,
  reach INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0.0,
  engagement_rate NUMERIC DEFAULT 0.0,
  video_views INTEGER DEFAULT 0,
  video_view_rate NUMERIC DEFAULT 0.0,
  cost_per_thruplay NUMERIC DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create adset_metrics table
CREATE TABLE IF NOT EXISTS public.adset_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_set_id UUID NOT NULL REFERENCES public.ad_sets(id) ON DELETE CASCADE,
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0.0,
  cpc NUMERIC DEFAULT 0.0,
  cpm NUMERIC DEFAULT 0.0,
  cpp NUMERIC DEFAULT 0.0,
  conversions INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0.0,
  cost_per_conversion NUMERIC DEFAULT 0.0,
  spend NUMERIC DEFAULT 0.0,
  purchase_value NUMERIC DEFAULT 0.0,
  roas NUMERIC DEFAULT 0.0,
  reach INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_meta_ad_accounts_user_id ON public.meta_ad_accounts(user_id);
CREATE INDEX idx_campaigns_ad_account_id ON public.campaigns(ad_account_id);
CREATE INDEX idx_ad_sets_campaign_id ON public.ad_sets(campaign_id);
CREATE INDEX idx_ads_ad_set_id ON public.ads(ad_set_id);
CREATE INDEX idx_creatives_ad_id ON public.creatives(ad_id);
CREATE INDEX idx_campaign_metrics_campaign_date ON public.campaign_metrics(campaign_id, date_start);
CREATE INDEX idx_adset_metrics_adset_date ON public.adset_metrics(ad_set_id, date_start);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_meta_ad_accounts
  BEFORE UPDATE ON public.meta_ad_accounts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_campaigns
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_ad_sets
  BEFORE UPDATE ON public.ad_sets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_ads
  BEFORE UPDATE ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_creatives
  BEFORE UPDATE ON public.creatives
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_campaign_metrics
  BEFORE UPDATE ON public.campaign_metrics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_adset_metrics
  BEFORE UPDATE ON public.adset_metrics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adset_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can view own ad accounts" ON public.meta_ad_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own campaigns" ON public.campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meta_ad_accounts
      WHERE meta_ad_accounts.id = campaigns.ad_account_id
      AND meta_ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own ad sets" ON public.ad_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      JOIN public.meta_ad_accounts ON meta_ad_accounts.id = campaigns.ad_account_id
      WHERE campaigns.id = ad_sets.campaign_id
      AND meta_ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own ads" ON public.ads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ad_sets
      JOIN public.campaigns ON campaigns.id = ad_sets.campaign_id
      JOIN public.meta_ad_accounts ON meta_ad_accounts.id = campaigns.ad_account_id
      WHERE ad_sets.id = ads.ad_set_id
      AND meta_ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own creatives" ON public.creatives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ads
      JOIN public.ad_sets ON ad_sets.id = ads.ad_set_id
      JOIN public.campaigns ON campaigns.id = ad_sets.campaign_id
      JOIN public.meta_ad_accounts ON meta_ad_accounts.id = campaigns.ad_account_id
      WHERE ads.id = creatives.ad_id
      AND meta_ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own campaign metrics" ON public.campaign_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      JOIN public.meta_ad_accounts ON meta_ad_accounts.id = campaigns.ad_account_id
      WHERE campaigns.id = campaign_metrics.campaign_id
      AND meta_ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own adset metrics" ON public.adset_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ad_sets
      JOIN public.campaigns ON campaigns.id = ad_sets.campaign_id
      JOIN public.meta_ad_accounts ON meta_ad_accounts.id = campaigns.ad_account_id
      WHERE ad_sets.id = adset_metrics.ad_set_id
      AND meta_ad_accounts.user_id = auth.uid()
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'company_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();