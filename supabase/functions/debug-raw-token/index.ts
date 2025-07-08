import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('Starting debug-raw-token function...')
    
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

    // Get user's profile using admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('meta_access_token, meta_user_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ 
          error: 'Profile not found',
          profileError: profileError?.message
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token exists and its characteristics
    const tokenInfo = {
      hasToken: !!profile.meta_access_token,
      hasMetaUserId: !!profile.meta_user_id,
      tokenLength: profile.meta_access_token ? profile.meta_access_token.length : 0,
      tokenPreview: profile.meta_access_token ? profile.meta_access_token.substring(0, 20) + '...' : null,
      metaUserId: profile.meta_user_id,
      looksEncrypted: profile.meta_access_token ? profile.meta_access_token.includes('=') : false,
      encryptionKeyPresent: !!Deno.env.get('META_TOKEN_ENCRYPTION_KEY'),
      encryptionKeyLength: Deno.env.get('META_TOKEN_ENCRYPTION_KEY')?.length || 0
    }

    // Try to use the raw token if it looks like a valid Meta token
    let tokenWorks = false
    let metaApiResponse = null
    
    if (profile.meta_access_token && profile.meta_access_token.startsWith('EAA')) {
      // This looks like an unencrypted Meta token
      try {
        const response = await fetch(
          `https://graph.facebook.com/v19.0/me?access_token=${profile.meta_access_token}`
        )
        metaApiResponse = await response.json()
        tokenWorks = response.ok
      } catch (error: any) {
        metaApiResponse = { error: error.message }
      }
    }

    // Try to decrypt if it looks encrypted
    let decryptionAttempt = null
    if (profile.meta_access_token && profile.meta_access_token.includes('=')) {
      try {
        const { getDecryptedMetaToken } = await import('../_shared/token-encryption.ts')
        const decryptedToken = await getDecryptedMetaToken(supabaseAdmin, user.id)
        decryptionAttempt = {
          success: !!decryptedToken,
          decryptedLength: decryptedToken ? decryptedToken.length : 0,
          decryptedPreview: decryptedToken ? decryptedToken.substring(0, 20) + '...' : null
        }
        
        // Try the decrypted token
        if (decryptedToken) {
          try {
            const response = await fetch(
              `https://graph.facebook.com/v19.0/me?access_token=${decryptedToken}`
            )
            metaApiResponse = await response.json()
            tokenWorks = response.ok
          } catch (error: any) {
            metaApiResponse = { error: error.message }
          }
        }
      } catch (error: any) {
        decryptionAttempt = {
          success: false,
          error: error.message
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        userId: user.id,
        tokenInfo,
        tokenWorks,
        metaApiResponse,
        decryptionAttempt,
        recommendations: getRecommendations(tokenInfo, tokenWorks, decryptionAttempt)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error in debug-raw-token:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        unexpectedError: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function getRecommendations(tokenInfo: any, tokenWorks: boolean, decryptionAttempt: any): string[] {
  const recommendations = []
  
  if (!tokenInfo.hasToken) {
    recommendations.push('No token found. User needs to reconnect Meta account.')
  } else if (tokenInfo.looksEncrypted && !tokenInfo.encryptionKeyPresent) {
    recommendations.push('Token is encrypted but META_TOKEN_ENCRYPTION_KEY environment variable is missing in edge functions.')
  } else if (tokenInfo.looksEncrypted && decryptionAttempt && !decryptionAttempt.success) {
    recommendations.push('Token decryption failed. The encryption key may have changed or token is corrupted.')
  } else if (!tokenWorks) {
    recommendations.push('Token exists but is invalid or expired. User needs to reconnect Meta account.')
  }
  
  return recommendations
}