-- Add Meta OAuth token columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
ADD COLUMN IF NOT EXISTS meta_user_id TEXT,
ADD COLUMN IF NOT EXISTS meta_token_expires_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_meta_user_id ON public.profiles(meta_user_id);

-- Update RLS policy to allow users to update their own Meta tokens
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);