import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
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

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the user's session to check for Facebook provider token
    const { data: { session } } = await supabaseClient.auth.getSession()
    
    // Get Facebook access token from the user's identities
    const facebookIdentity = user.identities?.find(identity => identity.provider === 'facebook')
    
    if (!facebookIdentity || !facebookIdentity.identity_data) {
      return new Response(
        JSON.stringify({ error: 'No Facebook identity found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract Facebook user ID and fetch long-lived token
    const fbUserId = facebookIdentity.identity_data.provider_id
    
    // For now, we'll use the provider token from the identity
    // In production, you'd exchange this for a long-lived token
    const metaAccessToken = facebookIdentity.identity_data.provider_token || 
                            user.app_metadata?.provider_token ||
                            user.user_metadata?.provider_token

    if (!metaAccessToken) {
      // Try to get it from the session
      const providerToken = session?.provider_token
      if (!providerToken) {
        return new Response(
          JSON.stringify({ error: 'No Facebook access token found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Update the user's profile with the Meta access token
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        meta_access_token: metaAccessToken || session?.provider_token,
        meta_user_id: fbUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save Meta access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Meta account connected successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handle-meta-oauth:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})