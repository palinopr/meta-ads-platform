# 🚧 BLOCKERS - Known Issues & Landmines to Avoid

> **Purpose**: Document all known issues, blockers, and potential landmines to prevent stepping on them repeatedly. Read this before making any significant changes.

---

## 🚨 **ACTIVE BLOCKERS** (Will Stop Progress)

### **Currently**: No Active Blockers ✅
- System is stable and operational
- No known issues preventing development
- Meta API integration working properly
- ✅ **MAJOR BLOCKER ELIMINATED**: Meta token security vulnerability resolved
- ✅ **$2M+ Revenue Protection**: Encryption deployed, business risk eliminated

---

## ⚠️ **KNOWN LANDMINES** (Avoid These Areas)

### **Database Schema Changes**
- **Issue**: Any schema changes need careful migration planning
- **Why**: Production database with real customer data
- **Safe Approach**: Always test in Supabase dashboard first, use migrations
- **Risk Level**: HIGH

### **Meta API Rate Limiting** 
- **Issue**: Meta has strict rate limits for API calls
- **Why**: Can cause 24-hour blocks if exceeded
- **Safe Approach**: Use batching (max 25 campaigns), 200ms delays between calls
- **Risk Level**: MEDIUM

### **Authentication Flow Changes**
- **Issue**: Changes to auth can lock out users
- **Why**: Customer access is revenue-critical
- **Safe Approach**: Test thoroughly in incognito mode before deploy
- **Risk Level**: HIGH

---

## 🔍 **POTENTIAL ISSUES** (Monitor These)

### **Environment Variables**
- **Issue**: Missing env vars cause build failures
- **Symptoms**: Pages failing to load, API calls failing
- **Solution**: Check .env files match expected variables
- **Monitoring**: Build logs, runtime errors

### **Supabase RLS Policies**
- **Issue**: Overly restrictive policies can block data access
- **Symptoms**: Empty data returns, permission errors
- **Solution**: Test policies in Supabase SQL editor
- **Monitoring**: Database logs, empty result sets

### **Vercel Deployment Issues**
- **Issue**: Environment variable mismatches between local and production
- **Symptoms**: Features work locally but fail in production
- **Solution**: Verify environment variables in Vercel dashboard
- **Monitoring**: Deployment logs, production error reports

---

## 📝 **RESOLVED BLOCKERS** (Reference Only)

### **Meta OAuth Token Persistence** ✅ RESOLVED
- **Was**: Tokens not saving after Facebook login
- **Solution**: Fixed callback handler to capture provider_token
- **Date Resolved**: December 2024
- **Files Changed**: `/auth/callback/route.ts`, sync-meta-token edge function

### **Meta Token Security Vulnerability** ✅ RESOLVED
- **Was**: Access tokens stored unencrypted in database (CEO Priority #1)
- **Solution**: Implemented AES-GCM 256-bit encryption with PBKDF2 key derivation
- **Date Resolved**: January 8, 2025
- **Files Changed**: `sync-meta-token/index.ts`, `_shared/token-encryption.ts`, multiple edge functions
- **Business Impact**: $2M+ ad spend now protected, biggest business risk eliminated

### **Large Account Set Performance** ✅ RESOLVED  
- **Was**: 200+ ad accounts causing timeouts and poor UX
- **Solution**: Created optimized meta-accounts-v2 with search and pagination
- **Date Resolved**: December 2024
- **Files Changed**: `meta-accounts-v2/index.ts`, `AccountSelector` component

### **Campaign Schema Errors** ✅ RESOLVED
- **Was**: UUID vs TEXT mismatches causing database errors
- **Solution**: Standardized on TEXT for account_id fields
- **Date Resolved**: December 2024
- **Files Changed**: Database migrations, campaign sync functions

---

## 🔄 **MONITORING CHECKLIST**

Before making changes, verify these are still stable:

- [ ] **User Authentication**: Can users log in successfully?
- [ ] **Dashboard Loading**: Does dashboard show real data?
- [ ] **Meta API Connection**: Are API calls succeeding?
- [ ] **Data Sync**: Is auto-refresh working every 15 minutes?
- [ ] **Account Selection**: Can users switch between ad accounts?
- [ ] **Chart Rendering**: Are performance charts displaying correctly?

---

## 🚨 **EMERGENCY PROCEDURES**

### **If Authentication Breaks**
1. Check environment variables in Vercel
2. Verify Supabase project is active
3. Test OAuth flow in incognito mode
4. Check NEXTAUTH_SECRET is set correctly

### **If Data Sync Breaks**
1. Check Meta API access token validity
2. Verify edge functions are deployed
3. Check for rate limiting errors in logs
4. Validate database connection

### **If Dashboard Shows No Data**
1. Check RLS policies in Supabase
2. Verify user has connected Meta account
3. Check if campaigns exist for selected account
4. Validate API response structure

---

**🔄 Last Updated**: January 8, 2025, 19:50  
**📝 Next Review**: 🤖 AUTO-TRIGGERED when MANDATORY-CEO-REFERENCE.md is requested  
**🎯 Update Trigger**: 🤖 AUTO-DOCUMENTS any issue that blocks progress for >15 minutes  
**🤖 Automation Status**: ACTIVE - Will auto-update with blocker status and CEO priority context