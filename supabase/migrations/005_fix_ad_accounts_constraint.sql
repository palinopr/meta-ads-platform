-- Drop the existing unique constraint on account_id
ALTER TABLE public.meta_ad_accounts 
DROP CONSTRAINT IF EXISTS meta_ad_accounts_account_id_key;

-- Add composite unique constraint on (account_id, user_id)
-- This allows the same ad account to be linked to multiple users
ALTER TABLE public.meta_ad_accounts 
ADD CONSTRAINT meta_ad_accounts_account_id_user_id_key 
UNIQUE (account_id, user_id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_user_id 
ON public.meta_ad_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_account_id 
ON public.meta_ad_accounts(account_id);