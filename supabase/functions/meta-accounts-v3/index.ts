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
    console.log('Handling OPTIONS request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting meta-accounts-v3 function...')
    
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
        JSON.stringify({ error: 'Unauthorized', accounts: [] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Get user's Meta access token directly (no decryption)
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
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ 
          error: 'Profile not found',
          accounts: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = profile.meta_access_token

    if (!accessToken) {
      console.log('No Meta access token found for user:', user.id)
      return new Response(
        JSON.stringify({ 
          error: 'No Meta access token found. Please connect your Meta account.',
          accounts: [],
          needsConnection: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Meta access token found, length:', accessToken.length)
    console.log('Token starts with:', accessToken.substring(0, 20) + '...')

    // Fetch from Meta API
    const metaUrl = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,account_status&limit=250&access_token=${accessToken}`
    
    console.log('Fetching from Meta API...')
    const metaResponse = await fetch(metaUrl)
    const responseText = await metaResponse.text()
    
    if (!metaResponse.ok) {
      console.error('Meta API error:', responseText)
      
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { error: { message: responseText } }
      }
      
      // Check if token is invalid
      if (errorData.error?.code === 190 || metaResponse.status === 401) {
        // Clear invalid token from profile
        await supabaseAdmin
          .from('profiles')
          .update({
            meta_access_token: null,
            meta_user_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          
        return new Response(
          JSON.stringify({ 
            error: 'Meta access token is invalid or expired. Please reconnect your Meta account.',
            accounts: [],
            tokenExpired: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorData.error?.message || 'Failed to fetch Meta accounts',
          accounts: [],
          metaError: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const metaData = JSON.parse(responseText)
    console.log('Meta API response received')
    console.log(`Fetched ${metaData.data?.length || 0} accounts from Meta API`)
    
    // Check for zero accounts
    if (metaData.data && metaData.data.length === 0) {
      console.log('Zero accounts returned. Possible reasons:')
      console.log('1. User has no ad accounts')
      console.log('2. Missing permissions (ads_management, ads_read)')
      console.log('3. Not admin/advertiser on any accounts')
      
      // Try to get more info about permissions
      try {
        const permissionsUrl = `https://graph.facebook.com/v19.0/me/permissions?access_token=${accessToken}`
        const permResponse = await fetch(permissionsUrl)
        if (permResponse.ok) {
          const permData = await permResponse.json()
          console.log('User permissions:', JSON.stringify(permData, null, 2))
        }
      } catch (error) {
        console.error('Error checking permissions:', error)
      }
    }
    
    // Transform the data to our format
    const accounts = (metaData.data || []).map((account: any) => {
      return {
        account_id: account.id.replace('act_', ''), // Remove act_ prefix
        account_name: account.name || 'Unnamed Account',
        currency: account.currency || 'USD',
        status: account.account_status === 1 ? 'ACTIVE' : 'INACTIVE',
        is_active: account.account_status === 1
      }
    })
    
    console.log(`Returning ${accounts.length} accounts`)

    return new Response(
      JSON.stringify({ 
        accounts: accounts,
        totalFetched: accounts.length,
        success: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error in meta-accounts-v3:', error)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        accounts: [],
        unexpectedError: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})