import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getDecryptedMetaToken } from '../_shared/token-encryption.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a Supabase client with the user's token
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

    // Get user from the client
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('meta_access_token, meta_user_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get decrypted Meta access token
    const accessToken = await getDecryptedMetaToken(supabaseAdmin, user.id)
    
    // Check if we have a Meta token
    const hasMetaConnection = !!(accessToken && profile.meta_user_id)

    // If connected, optionally verify the token is still valid
    let isValid = hasMetaConnection
    if (hasMetaConnection && accessToken) {
      try {
        // Make a simple API call to verify the token
        const response = await fetch(
          `https://graph.facebook.com/v19.0/me?access_token=${accessToken}`,
          { method: 'GET' }
        )
        
        isValid = response.ok
        
        if (!isValid) {
          // Token is invalid, clear it from the profile
          await supabaseAdmin
            .from('profiles')
            .update({
              meta_access_token: null,
              meta_user_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
        }
      } catch (error) {
        console.error('Error verifying Meta token:', error)
        // Don't fail the whole request if verification fails
      }
    }

    return new Response(
      JSON.stringify({ 
        connected: hasMetaConnection && isValid,
        hasToken: !!accessToken,
        hasUserId: !!profile.meta_user_id,
        isValid
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in check-meta-connection:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})