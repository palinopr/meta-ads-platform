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
  // Handle CORS preflight requests immediately
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting meta-accounts-simple function...')
    
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

    // Get user's Meta access token using secure decryption
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const accessToken = await getDecryptedMetaToken(supabaseAdmin, user.id)

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
    console.log('Meta API raw response:', JSON.stringify(metaData, null, 2))
    console.log(`Fetched ${metaData.data?.length || 0} accounts from Meta API`)
    
    // Check for common response patterns
    if (metaData.data && metaData.data.length === 0) {
      console.log('ZERO ACCOUNTS DETECTED - Possible reasons:')
      console.log('1. User has no ad accounts in Meta Business Manager')
      console.log('2. Token lacks proper permissions (ads_management, ads_read)')
      console.log('3. User is not admin/advertiser on any business accounts')
      console.log('4. Accounts are not properly linked to Business Manager')
    }
    
    if (metaData.paging) {
      console.log('Meta API paging info:', JSON.stringify(metaData.paging, null, 2))
    }
    
    // Transform the data to our format
    const accounts = (metaData.data || []).map((account: any) => {
      console.log('Processing individual account:', JSON.stringify(account, null, 2))
      return {
        account_id: account.id.replace('act_', ''), // Remove act_ prefix
        account_name: account.name || 'Unnamed Account',
        currency: account.currency || 'USD',
        status: account.account_status === 1 ? 'ACTIVE' : 'INACTIVE',
        is_active: account.account_status === 1
      }
    })
    
    console.log('Transformed accounts:', accounts)
    
    // Include diagnostic info in response
    const diagnosticInfo = {
      rawResponseSize: responseText.length,
      hasData: !!metaData.data,
      dataLength: metaData.data?.length || 0,
      hasPaging: !!metaData.paging,
      hasError: !!metaData.error
    }

    return new Response(
      JSON.stringify({ 
        accounts: accounts,
        totalFetched: accounts.length,
        fromApi: true,
        diagnostics: diagnosticInfo,
        rawMetaResponse: metaData // Include raw response for debugging
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error in meta-accounts-simple:', error)
    
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