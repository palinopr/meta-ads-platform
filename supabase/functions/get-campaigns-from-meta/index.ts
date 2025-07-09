import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ================================================================
// ENTERPRISE SECURITY CONFIGURATION
// ================================================================

// Allowed origins for production security
const ALLOWED_ORIGINS = [
  'https://frontend-ten-eta-42.vercel.app',
  'https://frontend-dc65j5ycm-palinos-projects.vercel.app',
  'http://localhost:3000',
  'https://localhost:3000'
]

// Rate limiting configuration
const RATE_LIMIT_MAX_REQUESTS = 100 // per minute
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute

// Request timeout configuration
const REQUEST_TIMEOUT_MS = 30000 // 30 seconds

// In-memory rate limiting store (for basic protection)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// ================================================================
// SECURITY UTILITIES
// ================================================================

function getCorsHeaders(origin: string | null): HeadersInit {
  const isAllowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  }
}

function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const clientData = rateLimitStore.get(clientId)
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }
  
  clientData.count++
  return true
}

function validateAccountId(accountId: string): boolean {
  // Validate account ID format (Meta ad account IDs are numeric)
  return /^\d+$/.test(accountId) && accountId.length >= 10 && accountId.length <= 20
}

function sanitizeError(error: any): string {
  // Sanitize error messages to prevent information leakage
  if (typeof error === 'string') {
    return error.includes('token') ? 'Authentication error' : 'Request failed'
  }
  if (error?.message) {
    return error.message.includes('token') ? 'Authentication error' : 'Request failed'
  }
  return 'Request failed'
}

async function logAuditEvent(userId: string, action: string, metadata: any = {}) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Insert audit log (you may need to create this table)
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action,
      metadata,
      timestamp: new Date().toISOString(),
      ip_address: metadata.ip_address || null
    })
  } catch (e) {
    console.error('Audit logging failed:', e)
  }
}

// ================================================================
// MAIN HANDLER
// ================================================================

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ================================================================
    // RATE LIMITING
    // ================================================================
    const clientIp = req.headers.get('CF-Connecting-IP') || 
                    req.headers.get('X-Forwarded-For') || 
                    req.headers.get('X-Real-IP') || 
                    'unknown'
    
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '60'
          } 
        }
      )
    }

    // ================================================================
    // REQUEST VALIDATION
    // ================================================================
    
    // Validate Content-Type
    const contentType = req.headers.get('Content-Type')
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: 'Invalid content type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate request body with timeout
    let account_id: string
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      
      const bodyPromise = req.json()
      const body = await Promise.race([
        bodyPromise,
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error('Request timeout')))
        })
      ])
      
      clearTimeout(timeoutId)
      
      account_id = body?.account_id
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate account_id
    if (!account_id || !validateAccountId(account_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid account ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ================================================================
    // AUTHENTICATION & AUTHORIZATION
    // ================================================================
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            Authorization: authHeader
          } 
        } 
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ================================================================
    // META TOKEN RETRIEVAL
    // ================================================================
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('meta_access_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.meta_access_token) {
      await logAuditEvent(user.id, 'meta_token_missing', { account_id, ip_address: clientIp })
      return new Response(
        JSON.stringify({ error: 'Meta access token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = profile.meta_access_token

    // ================================================================
    // ACCOUNT ACCESS VERIFICATION
    // ================================================================
    
    const { data: adAccount, error: adAccountError } = await supabaseClient
      .from('meta_ad_accounts')
      .select('account_id')
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .single()

    if (adAccountError || !adAccount) {
      await logAuditEvent(user.id, 'unauthorized_account_access', { account_id, ip_address: clientIp })
      return new Response(
        JSON.stringify({ error: 'Account access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ================================================================
    // META API REQUEST WITH SECURITY
    // ================================================================
    
    const metaUrl = `https://graph.facebook.com/v19.0/act_${account_id}/campaigns`
    const metaParams = new URLSearchParams({
      fields: 'id,name,objective,status,daily_budget,lifetime_budget,created_time,updated_time,start_time,stop_time',
      limit: '250',
      access_token: accessToken
    })
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    
    try {
      const metaResponse = await fetch(`${metaUrl}?${metaParams}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Meta-Analytics-Platform/1.0',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })
      
      clearTimeout(timeoutId)
      
      const responseText = await metaResponse.text()
      
      if (!metaResponse.ok) {
        console.error('Meta API error:', metaResponse.status, responseText.substring(0, 200))
        await logAuditEvent(user.id, 'meta_api_error', { 
          account_id, 
          status: metaResponse.status,
          ip_address: clientIp
        })
        
        return new Response(
          JSON.stringify({ 
            error: 'Meta API request failed',
            metaError: true
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const metaData = JSON.parse(responseText)
      
      // ================================================================
      // DATA PROCESSING & RESPONSE
      // ================================================================
      
      const campaigns = (metaData.data || []).map((campaign: any) => ({
        campaign_id: campaign.id,
        account_id: account_id,
        name: campaign.name || 'Unnamed Campaign',
        objective: campaign.objective || 'UNKNOWN',
        status: campaign.status || 'UNKNOWN',
        daily_budget: campaign.daily_budget ? parseInt(campaign.daily_budget) / 100 : null,
        lifetime_budget: campaign.lifetime_budget ? parseInt(campaign.lifetime_budget) / 100 : null,
        start_time: campaign.start_time || null,
        stop_time: campaign.stop_time || null,
        created_time: campaign.created_time,
        updated_time: campaign.updated_time || campaign.created_time
      }))

      // Log successful request
      await logAuditEvent(user.id, 'campaigns_fetched', { 
        account_id, 
        count: campaigns.length,
        ip_address: clientIp
      })

      return new Response(
        JSON.stringify({ 
          campaigns,
          success: true,
          count: campaigns.length,
          source: 'meta_api',
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
      
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Request timeout' }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      throw fetchError
    }

  } catch (error: any) {
    console.error('Function error:', error)
    
    // Log error for monitoring
    try {
      await logAuditEvent('system', 'function_error', { 
        error: sanitizeError(error),
        ip_address: clientIp
      })
    } catch (e) {
      console.error('Error logging failed:', e)
    }
    
    return new Response(
      JSON.stringify({ 
        error: sanitizeError(error),
        campaigns: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
