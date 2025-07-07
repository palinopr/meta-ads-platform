-- Create campaign_insights table for storing Meta API performance data
-- This table stores real-time campaign metrics from Meta Marketing API

CREATE TABLE IF NOT EXISTS public.campaign_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL,
  date_start date NOT NULL,
  date_stop date NOT NULL,
  
  -- Core metrics
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend decimal(10,2) DEFAULT 0,
  conversions decimal(8,2) DEFAULT 0,
  
  -- Performance metrics
  ctr decimal(5,4) DEFAULT 0, -- Click-through rate
  cpc decimal(8,2) DEFAULT 0, -- Cost per click
  cpm decimal(8,2) DEFAULT 0, -- Cost per mille (1000 impressions)
  cost_per_conversion decimal(8,2) DEFAULT 0,
  purchase_roas decimal(8,4), -- Return on ad spend (can be null)
  
  -- Reach and frequency
  reach integer DEFAULT 0,
  frequency decimal(4,2) DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(campaign_id, date_start, date_stop)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campaign_insights_campaign_id ON public.campaign_insights(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_date_range ON public.campaign_insights(date_start, date_stop);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_spend ON public.campaign_insights(spend DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_roas ON public.campaign_insights(purchase_roas DESC) WHERE purchase_roas IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.campaign_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see insights for campaigns they own
CREATE POLICY "Users can view their own campaign insights" ON public.campaign_insights
FOR SELECT USING (
  campaign_id IN (
    SELECT c.campaign_id 
    FROM public.campaigns c
    JOIN public.meta_ad_accounts maa ON c.ad_account_id = maa.id
    WHERE maa.user_id = auth.uid()
  )
);

-- Create RLS policy: System can insert/update insights
CREATE POLICY "System can manage campaign insights" ON public.campaign_insights
FOR ALL USING (true);

-- Grant permissions
GRANT SELECT ON public.campaign_insights TO authenticated;
GRANT ALL ON public.campaign_insights TO service_role;

-- Add helpful comments
COMMENT ON TABLE public.campaign_insights IS 'Stores real-time campaign performance metrics from Meta Marketing API';
COMMENT ON COLUMN public.campaign_insights.ctr IS 'Click-through rate as decimal (e.g., 0.0234 = 2.34%)';
COMMENT ON COLUMN public.campaign_insights.purchase_roas IS 'Return on ad spend - revenue/spend ratio';
COMMENT ON COLUMN public.campaign_insights.spend IS 'Amount spent in dollars';
