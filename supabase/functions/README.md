# Supabase Edge Functions

This directory contains all the Edge Functions for the Meta Ads Platform.

## Core Functions

### Authentication & Account Management
- `meta-accounts-v3` - Fetches ad accounts from Meta API
- `handle-meta-oauth` - Handles OAuth callback from Meta
- `sync-meta-token-v2` - Syncs Meta access token from auth session

### Dashboard Data Functions
- `get-dashboard-metrics` - Fetches account-level KPIs (spend, revenue, ROAS, conversions)
  - Parameters: `account_ids[]` (optional), `date_preset` (default: 'last_30d')
  - Returns: Main KPIs, engagement metrics, campaign counts, performance changes

- `get-performance-chart-data` - Fetches time-series data for performance charts
  - Parameters: `account_ids[]` (required), `date_preset`, `breakdown` ('day'|'week'|'month')
  - Returns: Daily/weekly/monthly metrics for charting

- `get-metric-breakdowns` - Fetches demographic, device, and placement breakdowns
  - Parameters: `account_ids[]` (required), `date_preset`, `metric_type`
  - Returns: Breakdown data by age, gender, device, and placement

- `get-top-campaigns-metrics` - Fetches top performing campaigns with metrics
  - Parameters: `account_ids[]` (required), `date_preset`, `sort_by`, `limit`, `status_filter`
  - Returns: Top campaigns sorted by selected metric

### Campaign Management
- `get-campaigns-from-meta` - Fetches campaigns for a specific ad account
  - Parameters: `account_id` (required)
  - Returns: List of campaigns with basic info

- `get-chart-data` - Legacy chart data function (use get-performance-chart-data instead)

## Environment Variables Required

Each Edge Function requires the following environment variables to be set in your Supabase project:

- `SUPABASE_URL` - Your Supabase project URL (automatically provided)
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key (automatically provided)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (must be set manually)

## Setting Environment Variables

### Using Supabase CLI

```bash
# Set the service role key for all functions
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key --project-ref igeuyfuxezvvenxjfnnn
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Select the function you want to configure
4. Click on "Secrets" tab
5. Add `SUPABASE_SERVICE_ROLE_KEY` with your service role key value

## Deployment

### Deploy a single function:
```bash
npx supabase functions deploy <function-name> --project-ref igeuyfuxezvvenxjfnnn
```

### Deploy all dashboard functions:
```bash
# Deploy each function
for func in get-dashboard-metrics get-performance-chart-data get-metric-breakdowns get-top-campaigns-metrics; do
  npx supabase functions deploy $func --project-ref igeuyfuxezvvenxjfnnn
done
```

### Deploy all functions:
```bash
# Deploy each function
for func in meta-accounts-v3 get-dashboard-metrics get-performance-chart-data get-metric-breakdowns get-top-campaigns-metrics get-campaigns-from-meta handle-meta-oauth sync-meta-token-v2; do
  npx supabase functions deploy $func --project-ref igeuyfuxezvvenxjfnnn
done
```

## Architecture Pattern

All dashboard data functions follow the Direct API pattern:
1. Authenticate user and get Meta access token
2. Fetch data directly from Meta Graph API
3. Transform and aggregate data in memory
4. Return formatted response

**Important**: We do NOT store campaign data in the database - always fetch fresh from Meta API.

## Common Parameters

Most dashboard functions accept these parameters:
- `account_ids[]` - Array of Meta ad account IDs to fetch data for
- `date_preset` - Meta's date preset values: 'today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'last_90d'
- `sort_by` - Metric to sort by (varies by function)
- `limit` - Number of results to return

## Testing Edge Functions Locally

### Start local development
```bash
supabase start
supabase functions serve <function-name> --env-file ./supabase/.env.local
```

### Create `.env.local` file for local testing
Create a file at `supabase/.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Error Handling

All functions return consistent error responses:
```json
{
  "error": "Error message",
  "details": "Additional context (in development only)"
}
```

Common status codes:
- 200 - Success
- 400 - Bad request (missing parameters, invalid token)
- 401 - Unauthorized (no auth header or invalid user)
- 403 - Forbidden (accessing accounts not owned by user)
- 429 - Rate limited
- 500 - Internal server error

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

## Security Notes

- Never expose the `SUPABASE_SERVICE_ROLE_KEY` to client-side code
- Always validate user authentication before performing admin operations
- Use the admin client only for operations that require bypassing RLS
- All functions include CORS headers for cross-origin requests
- Rate limiting is implemented to prevent abuse
- Request timeouts are set to 30 seconds to prevent hanging requests