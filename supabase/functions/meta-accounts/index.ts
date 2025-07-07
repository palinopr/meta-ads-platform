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

    // Also create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
    const { data: accounts, error } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('account_name')

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    // If no accounts in DB, fetch from Meta API
    if (!accounts || accounts.length === 0) {
      // Get user's Meta access token
      const { data: profile } = await supabaseAdmin
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

      console.log('Fetching accounts from Meta API...')
      
      // Fetch from Meta API with pagination
      const allAccounts: any[] = []
      let nextUrl = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,timezone_name,account_status&limit=100&access_token=${profile.meta_access_token}`
      
      while (nextUrl) {
        try {
          const metaResponse = await fetch(nextUrl)

          if (!metaResponse.ok) {
            const errorData = await metaResponse.json()
            console.error('Meta API error:', errorData)
            
            // Check if token is invalid
            if (errorData.error?.code === 190) {
              return new Response(
                JSON.stringify({ 
                  error: 'Meta access token is invalid or expired. Please reconnect your Meta account.',
                  accounts: [],
                  tokenExpired: true
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            
            throw new Error(errorData.error?.message || 'Failed to fetch Meta accounts')
          }

          const metaData = await metaResponse.json()
          
          if (metaData.data) {
            allAccounts.push(...metaData.data)
          }
          
          // Check for next page
          nextUrl = metaData.paging?.next || null
          
          // Limit to prevent infinite loops (1000 accounts max)
          if (allAccounts.length > 1000) {
            console.warn('Reached maximum account limit of 1000')
            break
          }
        } catch (fetchError) {
          console.error('Error fetching page:', fetchError)
          break
        }
      }
      
      console.log(`Fetched ${allAccounts.length} accounts from Meta API`)
      
      // Save accounts to database in batches
      if (allAccounts.length > 0) {
        const accountsToInsert = allAccounts.map((account: any) => ({
          user_id: user.id,
          account_id: account.id.replace('act_', ''), // Remove act_ prefix
          account_name: account.name || 'Unnamed Account',
          currency: account.currency || 'USD',
          timezone_name: account.timezone_name || 'UTC',
          status: account.account_status === 1 ? 'ACTIVE' : 'INACTIVE',
          is_active: account.account_status === 1
        }))

        // Insert in batches of 50
        const batchSize = 50
        const insertedAccounts: any[] = []
        
        for (let i = 0; i < accountsToInsert.length; i += batchSize) {
          const batch = accountsToInsert.slice(i, i + batchSize)
          const { data: batchData, error: batchError } = await supabaseAdmin
            .from('meta_ad_accounts')
            .upsert(batch, { onConflict: 'account_id,user_id' })
            .select()
          
          if (batchError) {
            console.error(`Error inserting batch ${i / batchSize + 1}:`, batchError)
          } else if (batchData) {
            insertedAccounts.push(...batchData)
          }
        }

        return new Response(
          JSON.stringify({ 
            accounts: insertedAccounts,
            totalFetched: allAccounts.length,
            totalSaved: insertedAccounts.length
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        accounts: accounts || [],
        fromCache: true 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in meta-accounts:', error)
    return new Response(
      JSON.stringify({ error: error.message, accounts: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})