import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function testDatePreset(accessToken: string, accountId: string, datePreset: string) {
  const fields = 'spend,clicks,impressions,ctr,cpc,cpm'
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${accessToken}`
  
  console.log(`\n🧪 Testing date preset: ${datePreset}`)
  console.log(`🌐 URL: ${url.replace(/access_token=[^&]*/, 'access_token=***')}`)
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    
    console.log(`📊 Response status: ${response.status}`)
    console.log(`📊 Response data:`, JSON.stringify(data, null, 2))
    
    if (data.data && data.data.length > 0) {
      const insights = data.data[0]
      return {
        datePreset,
        success: true,
        data: {
          spend: parseFloat(insights.spend || '0'),
          clicks: parseInt(insights.clicks || '0'),
          impressions: parseInt(insights.impressions || '0'),
          ctr: parseFloat(insights.ctr || '0'),
          cpc: parseFloat(insights.cpc || '0'),
          cpm: parseFloat(insights.cpm || '0')
        }
      }
    } else {
      return {
        datePreset,
        success: false,
        error: 'No data returned',
        rawResponse: data
      }
    }
  } catch (error) {
    console.error(`❌ Error for ${datePreset}:`, error)
    return {
      datePreset,
      success: false,
      error: error.message
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { account_id } = await req.json()

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

    console.log(`\n🔬 TESTING ALL DATE PRESETS FOR ACCOUNT: ${account_id}`)
    console.log(`🔬 User ID: ${user.id}`)
    console.log(`🔬 Time: ${new Date().toISOString()}`)

    // Test all Meta date presets
    const datePresets = [
      'today',
      'yesterday',
      'this_week',
      'last_week',
      'last_7d',
      'last_14d',
      'last_28d',
      'last_30d',
      'last_90d',
      'this_month',
      'last_month',
      'this_year',
      'last_year'
    ]

    const results = []
    for (const preset of datePresets) {
      const result = await testDatePreset(profile.meta_access_token, account_id, preset)
      results.push(result)
    }

    // Also test custom date range
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    
    const customUrl = `https://graph.facebook.com/v19.0/act_${account_id}/insights?fields=spend,clicks,impressions&time_range={"since":"${sevenDaysAgo.toISOString().split('T')[0]}","until":"${today.toISOString().split('T')[0]}"}&access_token=${profile.meta_access_token}`
    
    console.log(`\n🧪 Testing custom date range (last 7 days)`)
    console.log(`🌐 URL: ${customUrl.replace(/access_token=[^&]*/, 'access_token=***')}`)
    
    const customResponse = await fetch(customUrl)
    const customData = await customResponse.json()
    console.log(`📊 Custom range response:`, JSON.stringify(customData, null, 2))

    // Summary
    console.log('\n📋 SUMMARY OF RESULTS:')
    console.log('✅ Successful presets:', results.filter(r => r.success).map(r => r.datePreset).join(', '))
    console.log('❌ Failed presets:', results.filter(r => !r.success).map(r => r.datePreset).join(', '))
    
    const comparison = results.filter(r => r.success).map(r => ({
      preset: r.datePreset,
      spend: r.data.spend,
      clicks: r.data.clicks,
      impressions: r.data.impressions
    }))
    
    console.log('\n💰 Spend comparison:')
    comparison.forEach(c => {
      console.log(`  ${c.preset}: $${c.spend} (${c.clicks} clicks, ${c.impressions} impressions)`)
    })

    return new Response(
      JSON.stringify({
        account_id,
        results,
        summary: {
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          comparison
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})