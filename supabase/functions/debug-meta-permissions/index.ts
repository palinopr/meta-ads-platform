import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getDecryptedMetaToken } from '../_shared/token-encryption.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests immediately
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting debug-meta-permissions function...')
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            Authorization: req.headers.get('Authorization')! 
          } 
        } 
      }
    )

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Meta access token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const accessToken = await getDecryptedMetaToken(supabaseAdmin, user.id)

    if (!accessToken) {
      return new Response(
        JSON.stringify({ 
          error: 'No Meta access token found'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Collect debug information from multiple Meta API endpoints
    const debugInfo: any = {
      user_id: user.id,
      token_length: accessToken.length,
      token_preview: accessToken.substring(0, 20) + '...',
      endpoints_tested: [],
      has_business_accounts: false,
      has_ad_accounts: false,
      permissions: [],
      business_accounts: [],
      ad_accounts: [],
      errors: []
    }

    // 1. Test basic user info and permissions
    try {
      const meResponse = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name,email,permissions&access_token=${accessToken}`
      )
      const meData = await meResponse.json()
      
      debugInfo.endpoints_tested.push('me')
      debugInfo.meta_user_id = meData.id
      debugInfo.meta_user_name = meData.name
      debugInfo.meta_user_email = meData.email
      
      if (meData.permissions?.data) {
        debugInfo.permissions = meData.permissions.data.map((p: any) => ({
          permission: p.permission,
          status: p.status
        }))
      }
      
      if (meData.error) {
        debugInfo.errors.push({ endpoint: 'me', error: meData.error })
      }
    } catch (error: any) {
      debugInfo.errors.push({ endpoint: 'me', error: error.message })
    }

    // 2. Test business accounts
    try {
      const businessResponse = await fetch(
        `https://graph.facebook.com/v19.0/me/businesses?fields=id,name,primary_page&limit=100&access_token=${accessToken}`
      )
      const businessData = await businessResponse.json()
      
      debugInfo.endpoints_tested.push('businesses')
      
      if (businessData.data && businessData.data.length > 0) {
        debugInfo.has_business_accounts = true
        debugInfo.business_accounts = businessData.data.map((b: any) => ({
          id: b.id,
          name: b.name,
          has_primary_page: !!b.primary_page
        }))
      }
      
      if (businessData.error) {
        debugInfo.errors.push({ endpoint: 'businesses', error: businessData.error })
      }
    } catch (error: any) {
      debugInfo.errors.push({ endpoint: 'businesses', error: error.message })
    }

    // 3. Test ad accounts with detailed info
    try {
      const adAccountsResponse = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,account_status,business,owner,funding_source,amount_spent,balance&limit=250&access_token=${accessToken}`
      )
      const adAccountsData = await adAccountsResponse.json()
      
      debugInfo.endpoints_tested.push('adaccounts')
      
      if (adAccountsData.data && adAccountsData.data.length > 0) {
        debugInfo.has_ad_accounts = true
        debugInfo.ad_accounts = adAccountsData.data.map((a: any) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          status: a.account_status,
          business_id: a.business?.id,
          business_name: a.business?.name,
          owner_id: a.owner,
          has_funding: !!a.funding_source,
          amount_spent: a.amount_spent,
          balance: a.balance
        }))
      }
      
      debugInfo.ad_accounts_count = adAccountsData.data?.length || 0
      debugInfo.paging_info = adAccountsData.paging
      
      if (adAccountsData.error) {
        debugInfo.errors.push({ endpoint: 'adaccounts', error: adAccountsData.error })
      }
    } catch (error: any) {
      debugInfo.errors.push({ endpoint: 'adaccounts', error: error.message })
    }

    // 4. If no ad accounts, try a different approach - get business managed accounts
    if (!debugInfo.has_ad_accounts && debugInfo.business_accounts.length > 0) {
      try {
        const firstBusiness = debugInfo.business_accounts[0]
        const businessAdAccountsResponse = await fetch(
          `https://graph.facebook.com/v19.0/${firstBusiness.id}/owned_ad_accounts?fields=id,name,currency,account_status&limit=250&access_token=${accessToken}`
        )
        const businessAdAccountsData = await businessAdAccountsResponse.json()
        
        debugInfo.endpoints_tested.push('business_owned_ad_accounts')
        
        if (businessAdAccountsData.data && businessAdAccountsData.data.length > 0) {
          debugInfo.business_owned_accounts = businessAdAccountsData.data
          debugInfo.business_owned_accounts_count = businessAdAccountsData.data.length
        }
        
        if (businessAdAccountsData.error) {
          debugInfo.errors.push({ endpoint: 'business_owned_ad_accounts', error: businessAdAccountsData.error })
        }
      } catch (error: any) {
        debugInfo.errors.push({ endpoint: 'business_owned_ad_accounts', error: error.message })
      }
    }

    // 5. Check debug access token
    try {
      const debugTokenResponse = await fetch(
        `https://graph.facebook.com/v19.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`
      )
      const debugTokenData = await debugTokenResponse.json()
      
      debugInfo.endpoints_tested.push('debug_token')
      
      if (debugTokenData.data) {
        debugInfo.token_debug = {
          app_id: debugTokenData.data.app_id,
          type: debugTokenData.data.type,
          expires_at: debugTokenData.data.expires_at,
          is_valid: debugTokenData.data.is_valid,
          scopes: debugTokenData.data.scopes
        }
      }
      
      if (debugTokenData.error) {
        debugInfo.errors.push({ endpoint: 'debug_token', error: debugTokenData.error })
      }
    } catch (error: any) {
      debugInfo.errors.push({ endpoint: 'debug_token', error: error.message })
    }

    // Analyze the results
    const analysis = {
      has_valid_token: debugInfo.errors.length === 0,
      has_proper_permissions: debugInfo.permissions.some((p: any) => 
        ['ads_management', 'ads_read'].includes(p.permission) && p.status === 'granted'
      ),
      has_business_access: debugInfo.has_business_accounts,
      has_ad_account_access: debugInfo.has_ad_accounts || !!debugInfo.business_owned_accounts_count,
      recommendations: []
    }

    // Generate recommendations
    if (!analysis.has_valid_token) {
      analysis.recommendations.push('Token appears to be invalid or expired. Reconnect Meta account.')
    }
    
    if (!analysis.has_proper_permissions) {
      analysis.recommendations.push('Missing required permissions. Need ads_management and ads_read.')
    }
    
    if (!analysis.has_business_access) {
      analysis.recommendations.push('No business accounts found. User needs to be added to a Meta Business Manager.')
    }
    
    if (!analysis.has_ad_account_access) {
      analysis.recommendations.push('No ad accounts found. User needs admin/advertiser role on ad accounts.')
    }

    return new Response(
      JSON.stringify({ 
        debugInfo,
        analysis,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error in debug-meta-permissions:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        unexpectedError: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})