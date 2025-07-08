import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Debug endpoint called')
    
    // Use service role to bypass RLS for debugging - this is a public debug endpoint
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const debugData: any = {
      timestamp: new Date().toISOString(),
      tables: {}
    }

    // Check all tables
    console.log('🔍 Starting debug data collection...')

    // 1. Profiles with Meta tokens
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, meta_access_token, created_at')
      .limit(10)

    debugData.tables.profiles = {
      count: profiles?.length || 0,
      error: profilesError?.message,
      sample: profiles?.map(p => ({
        id: p.id,
        hasMetaToken: !!p.meta_access_token,
        created_at: p.created_at
      })) || []
    }

    // 2. Meta Ad Accounts
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('*')
      .limit(10)

    debugData.tables.meta_ad_accounts = {
      count: accounts?.length || 0,
      error: accountsError?.message,
      sample: accounts?.map(a => ({
        id: a.id,
        account_id: a.account_id,
        account_name: a.account_name,
        user_id: a.user_id,
        is_active: a.is_active,
        created_at: a.created_at
      })) || []
    }

    // 3. Campaigns
    const { data: campaigns, error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .limit(10)

    debugData.tables.campaigns = {
      count: campaigns?.length || 0,
      error: campaignsError?.message,
      sample: campaigns?.map(c => ({
        id: c.id,
        campaign_id: c.campaign_id,
        name: c.name,
        ad_account_id: c.ad_account_id,
        is_active: c.is_active,
        objective: c.objective,
        created_at: c.created_at
      })) || []
    }

    // 4. Campaign Insights
    const { data: insights, error: insightsError } = await supabaseAdmin
      .from('campaign_insights')
      .select('*')
      .limit(10)

    debugData.tables.campaign_insights = {
      count: insights?.length || 0,
      error: insightsError?.message,
      sample: insights?.map(i => ({
        campaign_id: i.campaign_id,
        date_start: i.date_start,
        spend: i.spend,
        conversions: i.conversions,
        impressions: i.impressions,
        clicks: i.clicks
      })) || []
    }

    // 5. Data Relationships Analysis
    if (accounts?.length > 0 && campaigns?.length > 0) {
      const accountIds = new Set(accounts.map(a => a.account_id))
      const campaignAccountIds = campaigns.map(c => c.ad_account_id)
      
      debugData.relationships = {
        account_ids_in_accounts_table: Array.from(accountIds),
        account_ids_in_campaigns_table: [...new Set(campaignAccountIds)],
        linked_campaigns: campaigns.filter(c => accountIds.has(c.ad_account_id)).length,
        total_campaigns: campaigns.length,
        uuid_issues: campaignAccountIds.filter(id => id && !accountIds.has(id))
      }
    }

    // 6. Test specific user data if provided
    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id')
    
    if (userId) {
      console.log(`🔍 Testing data for user: ${userId}`)
      
      // Get user's accounts
      const { data: userAccounts, error: userAccountsError } = await supabaseAdmin
        .from('meta_ad_accounts')
        .select('*')
        .eq('user_id', userId)

      debugData.user_specific = {
        user_id: userId,
        accounts_count: userAccounts?.length || 0,
        accounts_error: userAccountsError?.message,
        accounts: userAccounts || []
      }

      // If user has accounts, check campaigns
      if (userAccounts?.length > 0) {
        const accountId = userAccounts[0].account_id
        
        // Test campaign lookup with UUID cleaning
        const cleanAccountId = accountId.replace(/^act_/, '')
        
        const { data: userCampaigns, error: userCampaignsError } = await supabaseAdmin
          .from('campaigns')
          .select('*')
          .eq('ad_account_id', cleanAccountId)

        debugData.user_specific.test_campaign_lookup = {
          original_account_id: accountId,
          clean_account_id: cleanAccountId,
          campaigns_found: userCampaigns?.length || 0,
          campaigns_error: userCampaignsError?.message,
          campaigns: userCampaigns || []
        }
      }
    }

    // 7. Database Schema Info
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('table_name, column_name, data_type')
      .in('table_name', ['profiles', 'meta_ad_accounts', 'campaigns', 'campaign_insights'])
      .eq('table_schema', 'public')

    debugData.schema = {
      error: columnsError?.message,
      tables: columns?.reduce((acc: any, col: any) => {
        if (!acc[col.table_name]) acc[col.table_name] = []
        acc[col.table_name].push({
          column: col.column_name,
          type: col.data_type
        })
        return acc
      }, {}) || {}
    }

    console.log('✅ Debug data collection complete')

    return new Response(
      JSON.stringify(debugData, null, 2),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error: any) {
    console.error('💥 Debug error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
