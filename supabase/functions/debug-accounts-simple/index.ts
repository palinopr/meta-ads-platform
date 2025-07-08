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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== DEBUG ACCOUNTS SIMPLE START ===')
    
    // Check authorization header first
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header present:', !!authHeader)
    if (authHeader) {
      console.log('Authorization header preview:', authHeader.substring(0, 20) + '...')
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: authHeader ? { 
            Authorization: authHeader 
          } : {}
        } 
      }
    )

    console.log('Supabase client created')

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError) {
      console.error('User authentication error:', userError)
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed', 
          details: userError.message,
          step: 'user_auth',
          authHeaderPresent: !!authHeader,
          authHeaderPreview: authHeader ? authHeader.substring(0, 20) + '...' : null,
          suggestion: 'User needs to log in first'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user) {
      console.error('No user found')
      return new Response(
        JSON.stringify({ 
          error: 'No user found', 
          step: 'user_auth',
          authHeaderPresent: !!authHeader,
          authHeaderPreview: authHeader ? authHeader.substring(0, 20) + '...' : null,
          suggestion: 'User needs to log in first'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id, user.email)

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Admin client created')

    // Try to get decrypted token
    let accessToken: string | null = null
    let tokenError: string | null = null

    try {
      accessToken = await getDecryptedMetaToken(supabaseAdmin, user.id)
      console.log('Token decryption attempt result:', accessToken ? `Success (length: ${accessToken.length})` : 'No token found')
    } catch (error: any) {
      tokenError = error.message
      console.error('Token decryption error:', error)
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ 
          error: 'No Meta access token found', 
          tokenError,
          user: { id: user.id, email: user.email },
          step: 'token_decrypt',
          suggestion: 'Need to connect Meta account in Settings'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Token found, testing Meta API...')

    // Test Meta API with just /me first
    const meUrl = `https://graph.facebook.com/v19.0/me?access_token=${accessToken}`
    
    let meResponse: Response
    let meText: string
    let meError: string | null = null

    try {
      meResponse = await fetch(meUrl)
      meText = await meResponse.text()
      console.log('Meta /me response status:', meResponse.status)
      console.log('Meta /me response:', meText)
    } catch (error: any) {
      meError = error.message
      console.error('Meta /me fetch error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch Meta /me', 
          fetchError: meError,
          step: 'meta_me_api'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!meResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Meta /me API error', 
          status: meResponse.status,
          response: meText,
          step: 'meta_me_api'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Now test adaccounts
    const adAccountsUrl = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,account_status&limit=250&access_token=${accessToken}`
    
    let adAccountsResponse: Response
    let adAccountsText: string
    let adAccountsError: string | null = null

    try {
      adAccountsResponse = await fetch(adAccountsUrl)
      adAccountsText = await adAccountsResponse.text()
      console.log('Meta /adaccounts response status:', adAccountsResponse.status)
      console.log('Meta /adaccounts response:', adAccountsText)
    } catch (error: any) {
      adAccountsError = error.message
      console.error('Meta /adaccounts fetch error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch Meta /adaccounts', 
          fetchError: adAccountsError,
          step: 'meta_adaccounts_api'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let adAccountsData: any = null
    try {
      adAccountsData = JSON.parse(adAccountsText)
    } catch (parseError: any) {
      console.error('Failed to parse adaccounts response:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse Meta adaccounts response', 
          rawResponse: adAccountsText,
          parseError: parseError.message,
          step: 'meta_adaccounts_parse'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== DEBUG ACCOUNTS SIMPLE SUCCESS ===')

    return new Response(
      JSON.stringify({ 
        success: true,
        user: { id: user.id, email: user.email },
        token: { 
          found: true, 
          length: accessToken.length,
          preview: accessToken.substring(0, 20) + '...'
        },
        metaAPI: {
          me: {
            status: meResponse.status,
            response: JSON.parse(meText)
          },
          adaccounts: {
            status: adAccountsResponse.status,
            response: adAccountsData,
            accountCount: adAccountsData.data?.length || 0
          }
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error in debug-accounts-simple:', error)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected server error',
        message: error.message,
        stack: error.stack,
        step: 'unexpected_error'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})