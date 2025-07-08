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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get table info
    const { data: columns, error: columnsError } = await supabaseAdmin
      .rpc('get_table_columns', { table_name: 'campaigns' })
      .single()

    // Try a simple insert test
    const testCampaign = {
      campaign_id: 'test_' + Date.now(),
      account_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      name: 'Test Campaign',
      objective: 'BRAND_AWARENESS',
      status: 'PAUSED',
      created_time: new Date().toISOString(),
      updated_time: new Date().toISOString(),
      user_id: '00000000-0000-0000-0000-000000000000'
    }

    const { error: insertError } = await supabaseAdmin
      .from('campaigns')
      .insert(testCampaign)

    // Clean up test campaign
    if (!insertError) {
      await supabaseAdmin
        .from('campaigns')
        .delete()
        .eq('campaign_id', testCampaign.campaign_id)
    }

    // Get a sample campaign structure
    const { data: sampleCampaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .limit(1)
      .single()

    return new Response(
      JSON.stringify({ 
        tableColumns: columns,
        columnsError,
        testInsertError: insertError,
        testCampaignData: testCampaign,
        sampleCampaign,
        canInsert: !insertError
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})