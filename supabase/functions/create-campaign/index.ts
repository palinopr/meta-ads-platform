import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

interface CampaignData {
  accountId: string
  name: string
  objective: string
  budgetType: 'daily' | 'lifetime'
  budget: number
  status: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Get campaign data from request
    const campaignData: CampaignData = await req.json()
    console.log('Creating campaign:', campaignData)

    // Get user's Meta access token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('meta_access_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.meta_access_token) {
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ 
          error: 'Meta access token not found. Please reconnect your Meta account.',
          tokenExpired: true 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get ad account details
    const { data: adAccount, error: accountError } = await supabase
      .from('meta_ad_accounts')
      .select('*')
      .eq('account_id', campaignData.accountId)
      .eq('user_id', user.id)
      .single()

    if (accountError || !adAccount) {
      console.error('Ad account error:', accountError)
      return new Response(
        JSON.stringify({ error: 'Ad account not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create campaign via Meta Marketing API
    const metaApiUrl = `https://graph.facebook.com/v19.0/act_${campaignData.accountId}/campaigns`
    
    const campaignPayload = {
      name: campaignData.name,
      objective: campaignData.objective,
      status: campaignData.status,
      access_token: profile.meta_access_token
    }

    // Add budget based on type
    if (campaignData.budgetType === 'daily') {
      campaignPayload.daily_budget = Math.round(campaignData.budget * 100) // Convert to cents
    } else {
      campaignPayload.lifetime_budget = Math.round(campaignData.budget * 100) // Convert to cents
    }

    console.log('Meta API payload:', campaignPayload)

    const metaResponse = await fetch(metaApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campaignPayload)
    })

    const metaResult = await metaResponse.json()
    console.log('Meta API response:', metaResult)

    if (!metaResponse.ok) {
      console.error('Meta API error:', metaResult)
      
      // Check for token expiration
      if (metaResult.error?.code === 190) {
        return new Response(
          JSON.stringify({ 
            error: 'Meta access token expired. Please reconnect your Meta account.',
            tokenExpired: true 
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: metaResult.error?.message || 'Failed to create campaign in Meta'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Save campaign to our database
    const campaignRecord = {
      campaign_id: metaResult.id,
      name: campaignData.name,
      status: campaignData.status,
      objective: campaignData.objective,
      daily_budget: campaignData.budgetType === 'daily' ? campaignData.budget : null,
      lifetime_budget: campaignData.budgetType === 'lifetime' ? campaignData.budget : null,
      ad_account_id: adAccount.id,
      created_time: new Date().toISOString()
    }

    const { data: savedCampaign, error: saveError } = await supabase
      .from('campaigns')
      .insert([campaignRecord])
      .select()
      .single()

    if (saveError) {
      console.error('Error saving campaign:', saveError)
      // Campaign was created in Meta but failed to save locally
      // We should log this for manual reconciliation
      return new Response(
        JSON.stringify({ 
          error: 'Campaign created in Meta but failed to save locally. Please contact support.',
          metaCampaignId: metaResult.id
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Campaign saved successfully:', savedCampaign)

    return new Response(
      JSON.stringify({
        success: true,
        campaign: savedCampaign,
        metaCampaignId: metaResult.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in create-campaign function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
