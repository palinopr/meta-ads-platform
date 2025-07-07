-- Ensure meta_access_token can store long OAuth tokens
-- Facebook tokens can be quite long (200+ characters)
ALTER TABLE public.profiles 
ALTER COLUMN meta_access_token TYPE TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN public.profiles.meta_access_token IS 'Facebook OAuth access token for Meta API calls';
COMMENT ON COLUMN public.profiles.meta_user_id IS 'Facebook user ID from OAuth identity';
COMMENT ON COLUMN public.profiles.meta_token_expires_at IS 'Token expiration timestamp (if available)';