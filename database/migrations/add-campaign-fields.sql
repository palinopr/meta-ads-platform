-- Add missing fields to campaigns table for Meta API sync

-- Add start_time and stop_time columns if they don't exist
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS start_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS stop_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

-- Create an index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_is_active ON public.campaigns(is_active);

-- Update existing campaigns to set is_active based on status
UPDATE public.campaigns 
SET is_active = (status = 'ACTIVE')
WHERE is_active IS NULL;

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'campaigns'
ORDER BY ordinal_position;

SELECT 'Campaign fields updated successfully!' as status;