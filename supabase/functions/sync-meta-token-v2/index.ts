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
    console.log('Starting sync-meta-token-v2 function...')
    
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

    // Get the current session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'No session found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Session found for user:', session.user.id)
    console.log('Provider token present:', !!session.provider_token)
    console.log('Provider refresh token present:', !!session.provider_refresh_token)

    // Check if we have a Facebook provider token
    if (!session.provider_token) {
      // Check if the user has Facebook in their identities
      const facebookIdentity = session.user.identities?.find(i => i.provider === 'facebook')
      
      if (!facebookIdentity) {
        return new Response(
          JSON.stringify({ 
            error: 'No Facebook identity found. Please connect your Meta account.',
            identities: session.user.identities
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          error: 'No provider token in session. Please reconnect your Meta account.',
          hasFacebookIdentity: true,
          identityId: facebookIdentity.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the Facebook identity for the user ID
    const facebookIdentity = session.user.identities?.find(i => i.provider === 'facebook')
    const metaUserId = facebookIdentity?.id || null

    console.log('Facebook identity found:', !!facebookIdentity)
    console.log('Meta user ID:', metaUserId)

    // Create admin client for database operations
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

    // Store the unencrypted token directly
    console.log('Storing unencrypted token for user:', session.user.id)
    
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        meta_access_token: session.provider_token,
        meta_user_id: metaUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update profile',
          details: updateError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Profile updated successfully')

    // Verify the token works with Meta API
    let tokenValid = false
    let metaUserData = null
    
    try {
      const metaResponse = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${session.provider_token}`
      )
      
      if (metaResponse.ok) {
        metaUserData = await metaResponse.json()
        tokenValid = true
        console.log('Token verified with Meta API. User:', metaUserData.name)
      } else {
        const errorData = await metaResponse.json()
        console.error('Meta API rejected token:', errorData)
      }
    } catch (error) {
      console.error('Error verifying token:', error)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Meta token synced successfully',
        tokenStored: true,
        tokenValid,
        metaUserId,
        metaUserData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in sync-meta-token-v2:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})