# Supabase Edge Functions Deployment Guide

## Environment Variables Required

Each Edge Function requires the following environment variables to be set in your Supabase project:

- `SUPABASE_URL` - Your Supabase project URL (automatically provided)
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key (automatically provided)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (must be set manually)

## Setting Environment Variables

### Using Supabase CLI

```bash
# Set the service role key for all functions
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# You can also set function-specific secrets
supabase secrets set --function=sync-campaigns SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Select the function you want to configure
4. Click on "Secrets" tab
5. Add `SUPABASE_SERVICE_ROLE_KEY` with your service role key value

## Deployment

### Deploy all functions
```bash
supabase functions deploy
```

### Deploy a specific function
```bash
supabase functions deploy sync-campaigns
```

## Testing Edge Functions Locally

### Start local development
```bash
supabase start
supabase functions serve sync-campaigns --env-file ./supabase/.env.local
```

### Create `.env.local` file for local testing
Create a file at `supabase/.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Common Issues and Solutions

### "Edge Function returned a non-2xx status code"

This error usually means one of the following:

1. **Missing Service Role Key**: The function needs admin access to the database
   - Solution: Set `SUPABASE_SERVICE_ROLE_KEY` in your Edge Function secrets

2. **Missing Authorization Header**: The client isn't sending the user's auth token
   - Solution: Ensure the client includes the Authorization header with the user's JWT

3. **Invalid Request Body**: The function can't parse the JSON request
   - Solution: Ensure the client sends valid JSON with Content-Type: application/json

4. **Database Permissions**: RLS policies might be blocking access
   - Solution: Use the admin client (with service role key) for database operations

## Function Descriptions

- **sync-campaigns**: Syncs Meta campaign data for a specific ad account
- **meta-accounts**: Fetches and syncs Meta ad accounts for the authenticated user
- **meta-accounts-v2**: Updated version with better error handling
- **handle-meta-oauth**: Handles Meta OAuth callback and token exchange
- **check-meta-connection**: Verifies Meta API connection status
- **sync-meta-token**: Updates Meta access tokens
- **meta-sync**: General Meta data synchronization

## Security Notes

- Never expose the `SUPABASE_SERVICE_ROLE_KEY` to client-side code
- Always validate user authentication before performing admin operations
- Use the admin client only for operations that require bypassing RLS