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
    console.log('test-campaign-sync: Starting...')
    
    // Parse request body
    let account_id
    try {
      const body = await req.json()
      account_id = body.account_id
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: e.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Account ID:', account_id)

    // Get user
    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            Authorization: authHeader || ''
          } 
        } 
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', userError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User:', user.id)

    // Get token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('meta_access_token')
      .eq('id', user.id)
      .single()

    console.log('Profile fetch result:', { profileError, hasToken: !!profile?.meta_access_token })

    if (!profile?.meta_access_token) {
      return new Response(
        JSON.stringify({ 
          error: 'No Meta token found',
          profileError,
          userId: user.id
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check ad account exists
    console.log('Checking ad account:', account_id)
    
    const { data: adAccount, error: adAccountError } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('*')
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .single()

    console.log('Ad account result:', { 
      found: !!adAccount, 
      adAccountError,
      accountData: adAccount ? {
        id: adAccount.id,
        account_id: adAccount.account_id,
        name: adAccount.account_name
      } : null
    })

    if (!adAccount) {
      return new Response(
        JSON.stringify({ 
          error: 'Ad account not found',
          details: 'Account needs to be saved first',
          adAccountError,
          requestedAccountId: account_id,
          userId: user.id
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test Meta API
    const metaUrl = `https://graph.facebook.com/v19.0/act_${account_id}/campaigns?fields=id,name,status&limit=5&access_token=${profile.meta_access_token}`
    
    console.log('Testing Meta API...')
    const metaResponse = await fetch(metaUrl)
    const responseText = await metaResponse.text()
    
    let metaData
    try {
      metaData = JSON.parse(responseText)
    } catch {
      metaData = { error: 'Invalid JSON response', responseText }
    }

    console.log('Meta API response status:', metaResponse.status)
    console.log('Meta API response:', JSON.stringify(metaData, null, 2))

    return new Response(
      JSON.stringify({ 
        success: true,
        test: 'complete',
        userId: user.id,
        accountId: account_id,
        adAccountRecordId: adAccount.id,
        metaApiStatus: metaResponse.status,
        metaApiOk: metaResponse.ok,
        campaignCount: metaData?.data?.length || 0,
        metaError: metaData?.error,
        firstCampaign: metaData?.data?.[0]
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error:', error)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected error',
        message: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})