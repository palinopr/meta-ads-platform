import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { date_preset = 'last_30d' } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role to get profile data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user's Meta access token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('meta_access_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.meta_access_token) {
      return new Response(
        JSON.stringify({ error: 'Meta access token not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test Meta API call with the specified date_preset
    const testAccountId = '1234567890' // Replace with a real account ID
    const fields = 'spend,clicks,impressions,ctr,cpc,cpm,actions,action_values'
    const url = `https://graph.facebook.com/v19.0/act_${testAccountId}/insights?fields=${fields}&date_preset=${date_preset}&access_token=${profile.meta_access_token}`
    
    console.log(`\n🚀 TEST META API CALL`)
    console.log(`📅 Date Preset: ${date_preset}`)
    console.log(`🌐 URL: ${url.replace(/access_token=[^&]*/, 'access_token=***')}`)
    
    const response = await fetch(url)
    const responseText = await response.text()
    let responseData
    
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = { raw: responseText }
    }
    
    console.log(`📊 Response Status: ${response.status}`)
    console.log(`📈 Response Headers:`, Object.fromEntries(response.headers.entries()))
    console.log(`📝 Response Data:`, JSON.stringify(responseData, null, 2))
    
    // Also test what happens with different date presets
    const testPresets = ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'last_90d']
    console.log(`\n🔍 Testing all date presets:`)
    
    for (const preset of testPresets) {
      const testUrl = `https://graph.facebook.com/v19.0/act_${testAccountId}/insights?fields=spend,impressions&date_preset=${preset}&access_token=${profile.meta_access_token}`
      console.log(`\n📅 Testing ${preset}:`)
      console.log(`🌐 URL: ${testUrl.replace(/access_token=[^&]*/, 'access_token=***')}`)
      
      const testResponse = await fetch(testUrl)
      const testData = await testResponse.json()
      console.log(`📊 Result: ${testResponse.status} - Data points: ${testData.data?.length || 0}`)
      if (testData.data?.[0]) {
        console.log(`💰 Spend: ${testData.data[0].spend}, 👁️ Impressions: ${testData.data[0].impressions}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Test completed, check logs',
        date_preset,
        status: response.status,
        data: responseData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})