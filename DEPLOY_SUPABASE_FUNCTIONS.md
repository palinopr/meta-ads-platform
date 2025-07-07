# Deploying Supabase Edge Functions

## Prerequisites
1. Install Supabase CLI: `brew install supabase/tap/supabase`
2. Login to Supabase: `supabase login`

## Deploy Functions

1. **Link your project**:
   ```bash
   cd /Users/jaimeortiz/meta-ads-platform
   supabase link --project-ref igeuyfuxezvvenxjfnnn
   ```

2. **Deploy the functions**:
   ```bash
   supabase functions deploy meta-accounts
   supabase functions deploy meta-sync
   ```

3. **Set secrets** (if not already set):
   ```bash
   supabase secrets set META_APP_ID=1349075236218599
   supabase secrets set META_APP_SECRET=7c301f1ac1404565f26462e3c734194c
   ```

## Alternative: Deploy via Supabase Dashboard

1. Go to https://app.supabase.com/project/igeuyfuxezvvenxjfnnn/functions
2. Click "New Function"
3. Create `meta-accounts`:
   - Name: `meta-accounts`
   - Copy the code from `supabase/functions/meta-accounts/index.ts`
4. Create `meta-sync`:
   - Name: `meta-sync`
   - Copy the code from `supabase/functions/meta-sync/index.ts`

## Test the Functions

After deployment, test with:

```bash
# Test meta-accounts
curl -X POST https://igeuyfuxezvvenxjfnnn.supabase.co/functions/v1/meta-accounts \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Test meta-sync
curl -X POST https://igeuyfuxezvvenxjfnnn.supabase.co/functions/v1/meta-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"account_id": "act_123456789"}'
```

## Update Frontend

The frontend is already configured to use these functions through the `MetaAPI` class in `lib/api/meta.ts`.

## Benefits of This Approach

1. **No separate backend deployment needed** - Everything runs on Supabase
2. **Automatic scaling** - Edge functions scale automatically
3. **Built-in authentication** - Uses Supabase Auth
4. **Lower costs** - Only pay for what you use
5. **Faster development** - No DevOps complexity

## Next Steps

1. Run database migrations (if not done yet)
2. Configure Facebook OAuth in Supabase
3. Test the complete flow