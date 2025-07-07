# Deployment Instructions

## 1. Run Database Migration

Go to: https://app.supabase.com/project/igeuyfuxezvvenxjfnnn/editor

Run this SQL:

```sql
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
```

## 2. Deploy Edge Functions (Option A - Via Dashboard)

### meta-accounts function:
1. Go to: https://app.supabase.com/project/igeuyfuxezvvenxjfnnn/functions
2. Click "New Function"
3. Name: `meta-accounts`
4. Copy the code from: `supabase/functions/meta-accounts/index.ts`

### meta-sync function:
1. Click "New Function"
2. Name: `meta-sync`
3. Copy the code from: `supabase/functions/meta-sync/index.ts`

## 2. Deploy Edge Functions (Option B - Via CLI)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login
supabase login

# Link project
cd /Users/jaimeortiz/meta-ads-platform
supabase link --project-ref igeuyfuxezvvenxjfnnn

# Deploy functions
supabase functions deploy meta-accounts
supabase functions deploy meta-sync

# Set secrets
supabase secrets set META_APP_ID=1349075236218599
supabase secrets set META_APP_SECRET=7c301f1ac1404565f26462e3c734194c
```

## 3. Configure Facebook OAuth

1. Go to: https://app.supabase.com/project/igeuyfuxezvvenxjfnnn/auth/providers
2. Find **Facebook** in the list
3. Toggle it **ON**
4. Add:
   - **Facebook App ID**: `1349075236218599`
   - **Facebook App Secret**: `7c301f1ac1404565f26462e3c734194c`
5. Click **Save**

## 4. Update Facebook App Settings

1. Go to: https://developers.facebook.com/apps/1349075236218599/settings/basic/
2. Add to **Valid OAuth Redirect URIs**:
   ```
   https://igeuyfuxezvvenxjfnnn.supabase.co/auth/v1/callback
   ```
3. Make sure these permissions are enabled:
   - `email`
   - `ads_management`
   - `ads_read`
   - `business_management`

## 5. Test the Integration

1. Go to: https://frontend-ten-eta-42.vercel.app/settings
2. Click "Connect Meta Account"
3. Authorize the app
4. You should be redirected back and see "Meta account connected"

## Troubleshooting

### If Edge Functions don't work:
- Check function logs in Supabase dashboard
- Verify environment variables are set
- Make sure functions have correct CORS headers

### If Facebook OAuth fails:
- Check redirect URLs match exactly
- Verify app is in Live mode (not Development)
- Check Facebook app permissions

### If data doesn't sync:
- Check Meta access token is saved in profiles table
- Verify Edge Functions are deployed
- Check browser console for errors