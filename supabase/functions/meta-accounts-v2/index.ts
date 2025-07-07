import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('Starting meta-accounts-v2 function...')
    
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

    // Get user's Meta access token
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('meta_access_token')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ 
          error: 'Profile not found',
          accounts: [] 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile?.meta_access_token) {
      console.log('No Meta access token found')
      return new Response(
        JSON.stringify({ 
          error: 'No Meta access token found. Please connect your Meta account.',
          accounts: [],
          needsConnection: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching accounts from Meta API...')
    
    // Fetch from Meta API - simplified version
    const metaUrl = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,account_status&limit=250&access_token=${profile.meta_access_token}`
    
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
    console.log(`Fetched ${metaData.data?.length || 0} accounts from Meta API`)
    
    // Transform the data to our format
    const accounts = (metaData.data || []).map((account: any) => ({
      account_id: account.id.replace('act_', ''), // Remove act_ prefix
      account_name: account.name || 'Unnamed Account',
      currency: account.currency || 'USD',
      status: account.account_status === 1 ? 'ACTIVE' : 'INACTIVE',
      is_active: account.account_status === 1
    }))

    return new Response(
      JSON.stringify({ 
        accounts: accounts,
        totalFetched: accounts.length,
        fromApi: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error in meta-accounts-v2:', error)
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