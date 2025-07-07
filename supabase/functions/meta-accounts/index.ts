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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get user from JWT
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Meta accounts from database
    const { data: accounts, error } = await supabaseClient
      .from('meta_ad_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) {
      throw error
    }

    // If no accounts in DB, fetch from Meta API
    if (!accounts || accounts.length === 0) {
      // Get user's Meta access token
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('meta_access_token')
        .eq('id', user.id)
        .single()

      if (!profile?.meta_access_token) {
        return new Response(
          JSON.stringify({ 
            error: 'No Meta access token found. Please connect your Meta account.',
            accounts: [] 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch from Meta API
      const metaResponse = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,timezone_name,account_status&access_token=${profile.meta_access_token}`
      )

      if (!metaResponse.ok) {
        throw new Error('Failed to fetch Meta accounts')
      }

      const metaData = await metaResponse.json()
      
      // Save accounts to database
      if (metaData.data && metaData.data.length > 0) {
        const accountsToInsert = metaData.data.map((account: any) => ({
          user_id: user.id,
          account_id: account.id,
          account_name: account.name || 'Unnamed Account',
          currency: account.currency || 'USD',
          timezone_name: account.timezone_name || 'UTC',
          status: account.account_status === 1 ? 'ACTIVE' : 'INACTIVE',
          is_active: account.account_status === 1
        }))

        const { data: insertedAccounts } = await supabaseClient
          .from('meta_ad_accounts')
          .insert(accountsToInsert)
          .select()

        return new Response(
          JSON.stringify({ accounts: insertedAccounts || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ accounts: accounts || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})