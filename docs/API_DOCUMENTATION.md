# Meta Ads Agency Platform - API Documentation

## Overview
Comprehensive API documentation for the Meta Ads Agency Platform, designed for managing multiple client advertising campaigns at scale.

## Authentication

### Supabase Authentication
All API endpoints require valid Supabase session tokens via JWT authentication.

```typescript
// Frontend authentication
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Meta API Authentication
Meta API access requires valid OAuth tokens stored in user profiles.

```typescript
// OAuth flow handled automatically
// Tokens stored in profiles.meta_access_token
```

## Supabase Edge Functions

### Meta Account Management

#### `meta-accounts-v3`
Fetches all ad accounts accessible to the authenticated user.

**Endpoint:** `POST /functions/v1/meta-accounts-v3`

**Request Body:**
```json
{
  "accessToken": "string (optional - uses stored token if not provided)"
}
```

**Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "id": "string",
      "name": "string",
      "currency": "string",
      "account_status": "number",
      "timezone_name": "string"
    }
  ]
}
```

#### `get-campaigns-from-meta`
Fetches campaigns directly from Meta API for a specific ad account.

**Endpoint:** `POST /functions/v1/get-campaigns-from-meta`

**Request Body:**
```json
{
  "accountId": "string",
  "accessToken": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "campaigns": [
    {
      "id": "string",
      "name": "string",
      "status": "string",
      "objective": "string",
      "created_time": "string",
      "updated_time": "string",
      "insights": {
        "spend": "string",
        "impressions": "string",
        "clicks": "string",
        "cpm": "string",
        "cpc": "string",
        "ctr": "string"
      }
    }
  ]
}
```

### Authentication Functions

#### `handle-meta-oauth`
Processes Meta OAuth callback and stores access tokens.

**Endpoint:** `POST /functions/v1/handle-meta-oauth`

**Request Body:**
```json
{
  "code": "string",
  "state": "string"
}
```

#### `sync-meta-token-v2`
Syncs Meta access token from session to user profile.

**Endpoint:** `POST /functions/v1/sync-meta-token-v2`

**Request Body:**
```json
{
  "userId": "string"
}
```

### Dashboard Data Functions

#### `get-dashboard-metrics`
Retrieves aggregated dashboard metrics for all accessible accounts.

**Endpoint:** `POST /functions/v1/get-dashboard-metrics`

**Response:**
```json
{
  "totalSpend": "number",
  "totalImpressions": "number",
  "totalClicks": "number",
  "averageCTR": "number",
  "averageCPC": "number",
  "campaignCount": "number"
}
```

#### `get-chart-data`
Provides time-series data for dashboard charts.

**Endpoint:** `POST /functions/v1/get-chart-data`

**Request Body:**
```json
{
  "accountIds": ["string"],
  "dateRange": "string",
  "metrics": ["spend", "impressions", "clicks"]
}
```

## Database Schema

### Core Tables

#### `profiles`
Extended user profiles linked to Supabase auth.users
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users)
- `first_name` (TEXT)
- `last_name` (TEXT)
- `meta_access_token` (TEXT, encrypted)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `meta_ad_accounts`
Reference table for user's accessible ad accounts
- `id` (UUID, PK)
- `user_id` (UUID, FK to profiles)
- `account_id` (TEXT, Meta account ID)
- `account_name` (TEXT)
- `currency` (TEXT)
- `status` (TEXT)
- `created_at` (TIMESTAMP)

### Agency Schema (Phase 1)

#### `agencies`
Agency tenant isolation
- `id` (UUID, PK)
- `name` (TEXT)
- `domain` (TEXT)
- `subscription_tier` (TEXT)
- `created_at` (TIMESTAMP)

#### `employees`
Agency employee management
- `id` (UUID, PK)
- `agency_id` (UUID, FK to agencies)
- `user_id` (UUID, FK to auth.users)
- `role` (TEXT: 'owner', 'manager', 'viewer')
- `status` (TEXT: 'active', 'invited', 'suspended')
- `invited_at` (TIMESTAMP)
- `joined_at` (TIMESTAMP)

#### `client_accounts`
Client ad account assignments
- `id` (UUID, PK)
- `agency_id` (UUID, FK to agencies)
- `meta_account_id` (TEXT)
- `client_name` (TEXT)
- `assigned_manager_id` (UUID, FK to employees)

#### `employee_client_access`
Granular access control
- `employee_id` (UUID, FK to employees)
- `client_account_id` (UUID, FK to client_accounts)
- `permissions` (JSONB)

## Meta Marketing API Integration

### Supported Endpoints

#### Campaigns
- `GET /{account-id}/campaigns`
- `POST /{account-id}/campaigns`
- `GET /{campaign-id}`
- `POST /{campaign-id}` (update)

#### Ad Sets
- `GET /{campaign-id}/adsets`
- `POST /{campaign-id}/adsets`
- `GET /{adset-id}`
- `POST /{adset-id}` (update)

#### Ads
- `GET /{adset-id}/ads`
- `POST /{adset-id}/ads`
- `GET /{ad-id}`
- `POST /{ad-id}` (update)

#### Insights
- `GET /{object-id}/insights`
- Breakdowns: age, gender, country, placement, device
- Time ranges: today, yesterday, last_7_days, last_30_days, custom

#### Creatives
- `GET /{account-id}/adcreatives`
- `POST /{account-id}/adcreatives`
- `GET /{creative-id}`

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "string",
  "code": "string",
  "details": {}
}
```

### Common Error Codes
- `AUTH_REQUIRED`: User not authenticated
- `TOKEN_EXPIRED`: Meta access token expired
- `RATE_LIMITED`: Meta API rate limit exceeded
- `ACCOUNT_ACCESS_DENIED`: User lacks access to ad account
- `INVALID_ACCOUNT_ID`: Ad account ID not found

## Rate Limiting

### Meta API Limits
- 200 calls per hour per user per app
- Business accounts: Higher limits available
- Batch requests recommended for bulk operations

### Implementation
```typescript
// Automatic retry with exponential backoff
const retryConfig = {
  retries: 3,
  retryDelay: (retryCount) => Math.pow(2, retryCount) * 1000
}
```

## Security

### Row Level Security (RLS)
All tables implement RLS policies ensuring:
- Users can only access their own data
- Agency employees can only access agency data
- Client access is restricted by permissions

### Data Encryption
- Meta access tokens encrypted at rest
- All API communication over HTTPS
- Environment variables for sensitive data

## Performance Optimization

### Caching Strategy
- **No database caching** of campaign data
- Always fetch fresh data from Meta API
- Redis caching for user sessions only

### Pagination
- Meta API: 25 results per page (configurable)
- Frontend: Virtual scrolling for large datasets
- Batch operations for multiple accounts

## Development Guidelines

### Adding New Endpoints
1. Create Edge Function in `supabase/functions/`
2. Implement authentication checks
3. Add error handling and logging
4. Update this documentation
5. Add TypeScript types

### Testing
```bash
# Test Edge Functions locally
npx supabase functions serve --env-file .env.local

# Test specific function
curl -X POST http://localhost:54321/functions/v1/meta-accounts-v3 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{}'
```

## Support

For API issues or questions:
- Check Edge Function logs in Supabase dashboard
- Review Meta API documentation
- Verify authentication tokens are valid
- Test with Meta Graph API Explorer

## Changelog

### v1.0.0 (Current)
- Initial API implementation
- Meta OAuth integration
- Basic campaign fetching
- Dashboard metrics

### v2.0.0 (Planned - Agency Features)
- Multi-tenant agency schema
- Employee management APIs
- Role-based access control
- Client account assignment
- Audit logging
