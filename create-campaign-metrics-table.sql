-- Create campaign_metrics table for storing performance data

CREATE TABLE IF NOT EXISTS public.campaign_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    date_start date NOT NULL,
    date_stop date NOT NULL,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    ctr numeric(10,4) DEFAULT 0, -- Click-through rate as percentage
    cpc numeric(10,2) DEFAULT 0, -- Cost per click
    cpm numeric(10,2) DEFAULT 0, -- Cost per mille (thousand impressions)
    spend numeric(10,2) DEFAULT 0,
    conversions integer DEFAULT 0,
    conversion_rate numeric(10,4) DEFAULT 0,
    roas numeric(10,2) DEFAULT 0, -- Return on ad spend
    frequency numeric(10,2) DEFAULT 1,
    reach integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(campaign_id, date_start)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON public.campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date_start ON public.campaign_metrics(date_start DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_date ON public.campaign_metrics(campaign_id, date_start DESC);

-- Enable RLS
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using our safe auth check
CREATE POLICY "select_metrics_policy" ON public.campaign_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            JOIN public.meta_ad_accounts ma ON ma.id = c.ad_account_id
            WHERE c.id = campaign_metrics.campaign_id 
            AND safe_auth_check(ma.user_id)
        )
    );

CREATE POLICY "insert_metrics_policy" ON public.campaign_metrics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            JOIN public.meta_ad_accounts ma ON ma.id = c.ad_account_id
            WHERE c.id = campaign_metrics.campaign_id 
            AND safe_auth_check(ma.user_id)
        )
    );

CREATE POLICY "update_metrics_policy" ON public.campaign_metrics
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            JOIN public.meta_ad_accounts ma ON ma.id = c.ad_account_id
            WHERE c.id = campaign_metrics.campaign_id 
            AND safe_auth_check(ma.user_id)
        )
    );

CREATE POLICY "delete_metrics_policy" ON public.campaign_metrics
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            JOIN public.meta_ad_accounts ma ON ma.id = c.ad_account_id
            WHERE c.id = campaign_metrics.campaign_id 
            AND safe_auth_check(ma.user_id)
        )
    );

-- Create a function to get metrics for a date range
CREATE OR REPLACE FUNCTION get_campaign_metrics(
    p_campaign_id uuid,
    p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '30 days')::date,
    p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    date_start date,
    impressions integer,
    clicks integer,
    ctr numeric,
    cpc numeric,
    cpm numeric,
    spend numeric,
    conversions integer,
    roas numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.date_start,
        cm.impressions,
        cm.clicks,
        cm.ctr,
        cm.cpc,
        cm.cpm,
        cm.spend,
        cm.conversions,
        cm.roas
    FROM public.campaign_metrics cm
    WHERE cm.campaign_id = p_campaign_id
    AND cm.date_start >= p_start_date
    AND cm.date_start <= p_end_date
    ORDER BY cm.date_start DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_campaign_metrics(uuid, date, date) TO authenticated;

SELECT 'Campaign metrics table created successfully!' as status;