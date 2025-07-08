import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getDecryptedMetaToken } from '../_shared/token-encryption.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting debug-meta-token function...')
    
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
      console.error('User error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Get user's Meta access token using admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the raw profile data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Profile not found', details: profileError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Profile found:', {
      userId: user.id,
      hasMetaToken: !!profile.meta_access_token,
      hasMetaUserId: !!profile.meta_user_id,
      tokenLength: profile.meta_access_token?.length || 0
    })

    const accessToken = await getDecryptedMetaToken(supabaseAdmin, user.id)

    if (!accessToken) {
      return new Response(
        JSON.stringify({ 
          error: 'No Meta access token found',
          profile: {
            hasMetaToken: !!profile.meta_access_token,
            hasMetaUserId: !!profile.meta_user_id,
            tokenLength: profile.meta_access_token?.length || 0
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Token decrypted successfully, length:', accessToken.length)

    // Test the Meta API directly
    const metaUrl = `https://graph.facebook.com/v19.0/me?access_token=${accessToken}`
    
    console.log('Testing Meta API /me endpoint...')
    const meResponse = await fetch(metaUrl)
    const meData = await meResponse.text()
    
    console.log('Meta /me response status:', meResponse.status)
    console.log('Meta /me response:', meData)

    // Test the ad accounts endpoint
    const adAccountsUrl = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,account_status&limit=250&access_token=${accessToken}`
    
    console.log('Testing Meta API /me/adaccounts endpoint...')
    const adAccountsResponse = await fetch(adAccountsUrl)
    const adAccountsData = await adAccountsResponse.text()
    
    console.log('Meta /me/adaccounts response status:', adAccountsResponse.status)
    console.log('Meta /me/adaccounts response:', adAccountsData)

    let adAccountsParsed = null
    try {
      adAccountsParsed = JSON.parse(adAccountsData)
    } catch (e) {
      console.error('Failed to parse ad accounts response:', e)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: user.id,
          email: user.email
        },
        profile: {
          hasMetaToken: !!profile.meta_access_token,
          hasMetaUserId: !!profile.meta_user_id,
          tokenLength: profile.meta_access_token?.length || 0
        },
        token: {
          decrypted: true,
          length: accessToken.length,
          prefix: accessToken.substring(0, 20) + '...'
        },
        metaAPI: {
          meEndpoint: {
            status: meResponse.status,
            data: meData
          },
          adAccountsEndpoint: {
            status: adAccountsResponse.status,
            data: adAccountsData,
            parsed: adAccountsParsed
          }
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error in debug-meta-token:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})