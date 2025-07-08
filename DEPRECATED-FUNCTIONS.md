# 🚫 DEPRECATED FUNCTIONS - DO NOT USE

## ⚠️ IMPORTANT: These functions store campaign data in the database and MUST NOT BE USED

The following edge functions write campaign data to the database and violate our "direct Meta API only" architecture:

## Database Storage Functions (DEPRECATED)

### Campaign Sync Functions
- `sync-campaigns-v2` - UPSERTS campaigns to database
- `sync-campaigns-v3` - INSERTS campaigns to database  
- `sync-campaigns-v4` - INSERTS campaigns to database
- `sync-campaigns-final` - DELETES + INSERTS campaigns
- `sync-campaigns-direct` - INSERTS campaigns to database
- `meta-sync` - UPSERTS campaigns to database

### Campaign Management Functions
- `create-campaign` - Creates and stores in database
- `update-campaign` - Updates database records
- `delete-campaign` - Deletes from database
- `duplicate-campaign` - Creates duplicates in database
- `pause-campaign` - Updates database status

### Metrics Storage Functions
- `sync-campaign-metrics` - Stores metrics in database
- `sync-campaign-insights` - Stores insights in database

### Database Read Functions
- `get-campaigns-direct` - Reads from database
- `get-dashboard-metrics` - Reads campaign data from database

## ✅ APPROVED FUNCTIONS (Meta API Only)

### Current Direct API Functions
- `get-campaigns-from-meta` - Fetches directly from Meta API
- `meta-accounts-v3` - Fetches ad accounts from Meta API

### Future Direct API Functions (To Be Created)
- `get-campaign-metrics-from-meta` - Fetch metrics directly from Meta
- `create-campaign-meta-only` - Create via Meta API only
- `update-campaign-meta-only` - Update via Meta API only
- `delete-campaign-meta-only` - Delete via Meta API only
- `duplicate-campaign-meta-only` - Duplicate via Meta API only
- `pause-campaign-meta-only` - Pause/resume via Meta API only

## 🔧 Architecture Rules

1. **NO DATABASE STORAGE** for campaign data, metrics, or insights
2. **DIRECT Meta API CALLS** for all campaign operations
3. **Database ONLY for** user accounts and ad account references
4. **Always fresh data** - no sync operations needed

## 🚨 If You See These Patterns in Code

### ❌ WRONG (Database Storage):
```typescript
.from('campaigns').insert()
.from('campaigns').update()
.from('campaigns').select()
.from('campaign_metrics').insert()
.invoke('sync-campaigns-*')
```

### ✅ CORRECT (Direct Meta API):
```typescript
.invoke('get-campaigns-from-meta')
.invoke('*-meta-only')
fetch('https://graph.facebook.com/v19.0/...')
```

## 📋 TODO: Functions to Create

The following Meta-only functions need to be created to replace the database storage ones:

- [ ] `get-campaign-metrics-from-meta`
- [ ] `create-campaign-meta-only`
- [ ] `update-campaign-meta-only`
- [ ] `delete-campaign-meta-only`
- [ ] `duplicate-campaign-meta-only`
- [ ] `pause-campaign-meta-only`

## 🗑️ TODO: Functions to Delete

All the deprecated functions listed above should be deleted from the codebase to prevent accidental usage.