-- ================================================================
-- ANALYTICS PLATFORM DATABASE CLEANUP
-- ================================================================
-- Remove all campaign storage tables per new architecture:
-- Frontend → Edge Function → Meta API (Direct)
-- 
-- PRINCIPLE: Always fetch fresh data from Meta API
-- No stale database cache for campaign data
-- ================================================================

-- Drop dependent tables first (due to foreign key constraints)
DROP TABLE IF EXISTS public.adset_metrics CASCADE;
DROP TABLE IF EXISTS public.campaign_metrics CASCADE;
DROP TABLE IF EXISTS public.creatives CASCADE;
DROP TABLE IF EXISTS public.ads CASCADE;
DROP TABLE IF EXISTS public.ad_sets CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;

-- Remove related indexes (if they still exist)
DROP INDEX IF EXISTS idx_campaign_metrics_campaign_date;
DROP INDEX IF EXISTS idx_adset_metrics_adset_date;
DROP INDEX IF EXISTS idx_creatives_ad_id;
DROP INDEX IF EXISTS idx_ads_ad_set_id;
DROP INDEX IF EXISTS idx_ad_sets_campaign_id;
DROP INDEX IF EXISTS idx_campaigns_ad_account_id;

-- Clean up any orphaned triggers
DROP TRIGGER IF EXISTS set_timestamp_adset_metrics ON public.adset_metrics;
DROP TRIGGER IF EXISTS set_timestamp_campaign_metrics ON public.campaign_metrics;
DROP TRIGGER IF EXISTS set_timestamp_creatives ON public.creatives;
DROP TRIGGER IF EXISTS set_timestamp_ads ON public.ads;
DROP TRIGGER IF EXISTS set_timestamp_ad_sets ON public.ad_sets;
DROP TRIGGER IF EXISTS set_timestamp_campaigns ON public.campaigns;

-- ================================================================
-- RESULT: Database now contains only essential tables:
-- - profiles (user accounts)
-- - meta_ad_accounts (ad account references only)
-- 
-- All campaign/ad data will be fetched directly from Meta API
-- ================================================================

-- Add comment to document the cleanup
COMMENT ON TABLE public.profiles IS 'User profiles for internal analytics platform';
COMMENT ON TABLE public.meta_ad_accounts IS 'Meta ad account references (no campaign data stored - fetch from API)';
