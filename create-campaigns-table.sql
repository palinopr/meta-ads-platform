-- Create campaigns table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.campaigns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ad_account_id uuid NOT NULL REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
    campaign_id text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'PAUSED',
    objective text,
    daily_budget numeric(10,2),
    lifetime_budget numeric(10,2),
    created_time timestamp with time zone DEFAULT now(),
    updated_time timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(ad_account_id, campaign_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_ad_account_id ON public.campaigns(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_id ON public.campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_time ON public.campaigns(created_time DESC);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies using the safe functions
CREATE POLICY "Users can view own campaigns via function" ON public.campaigns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.meta_ad_accounts 
            WHERE meta_ad_accounts.id = campaigns.ad_account_id 
            AND meta_ad_accounts.user_id = get_current_user_id()
        )
    );

CREATE POLICY "Users can insert own campaigns via function" ON public.campaigns
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meta_ad_accounts 
            WHERE meta_ad_accounts.id = campaigns.ad_account_id 
            AND meta_ad_accounts.user_id = get_current_user_id()
        )
    );

CREATE POLICY "Users can update own campaigns via function" ON public.campaigns
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.meta_ad_accounts 
            WHERE meta_ad_accounts.id = campaigns.ad_account_id 
            AND meta_ad_accounts.user_id = get_current_user_id()
        )
    );

CREATE POLICY "Users can delete own campaigns via function" ON public.campaigns
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.meta_ad_accounts 
            WHERE meta_ad_accounts.id = campaigns.ad_account_id 
            AND meta_ad_accounts.user_id = get_current_user_id()
        )
    );

-- Test insert some sample data
DO $$
DECLARE
    v_user_id uuid;
    v_account_id uuid;
BEGIN
    -- Get current user
    v_user_id := get_current_user_id();
    
    IF v_user_id IS NOT NULL THEN
        -- Get first ad account for user
        SELECT id INTO v_account_id
        FROM public.meta_ad_accounts
        WHERE user_id = v_user_id
        LIMIT 1;
        
        IF v_account_id IS NOT NULL THEN
            -- Insert a sample campaign
            INSERT INTO public.campaigns (
                ad_account_id,
                campaign_id,
                name,
                status,
                objective,
                daily_budget
            ) VALUES (
                v_account_id,
                'sample_' || gen_random_uuid()::text,
                'Sample Campaign',
                'ACTIVE',
                'CONVERSIONS',
                100.00
            ) ON CONFLICT DO NOTHING;
            
            RAISE NOTICE 'Sample campaign created for testing';
        END IF;
    END IF;
END $$;

SELECT 'Campaigns table created successfully!' as status;