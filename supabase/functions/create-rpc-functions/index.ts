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
    // Use service role to create functions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const results = []

    // SQL statements to execute
    const sqlStatements = [
      {
        name: 'Drop old get_campaigns_for_account',
        sql: `DROP FUNCTION IF EXISTS get_campaigns_for_account(TEXT);`
      },
      {
        name: 'Create get_campaigns_for_account',
        sql: `
          CREATE OR REPLACE FUNCTION get_campaigns_for_account(p_account_id TEXT)
          RETURNS TABLE (
            campaign_id TEXT,
            name TEXT,
            objective TEXT,
            status TEXT,
            daily_budget NUMERIC,
            lifetime_budget NUMERIC,
            start_time TIMESTAMPTZ,
            stop_time TIMESTAMPTZ,
            created_time TIMESTAMPTZ,
            updated_time TIMESTAMPTZ
          )
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            v_user_id UUID;
            v_account_record_id UUID;
          BEGIN
            v_user_id := auth.uid();
            
            IF v_user_id IS NULL THEN
              RAISE EXCEPTION 'Not authenticated';
            END IF;
            
            SELECT id INTO v_account_record_id
            FROM meta_ad_accounts
            WHERE account_id = p_account_id
              AND user_id = v_user_id
            LIMIT 1;
            
            IF v_account_record_id IS NULL THEN
              RETURN;
            END IF;
            
            RETURN QUERY
            SELECT 
              c.campaign_id,
              c.name,
              c.objective,
              c.status,
              c.daily_budget,
              c.lifetime_budget,
              c.start_time,
              c.stop_time,
              c.created_time,
              c.updated_time
            FROM campaigns c
            WHERE c.ad_account_id = v_account_record_id
            ORDER BY c.created_time DESC;
          END;
          $$;
        `
      },
      {
        name: 'Grant permissions for get_campaigns_for_account',
        sql: `GRANT EXECUTE ON FUNCTION get_campaigns_for_account(TEXT) TO authenticated;`
      },
      {
        name: 'Drop old get_my_ad_accounts',
        sql: `DROP FUNCTION IF EXISTS get_my_ad_accounts();`
      },
      {
        name: 'Create get_my_ad_accounts',
        sql: `
          CREATE OR REPLACE FUNCTION get_my_ad_accounts()
          RETURNS TABLE (
            id UUID,
            account_id TEXT,
            account_name TEXT,
            currency TEXT,
            status TEXT,
            is_active BOOLEAN,
            created_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ
          )
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            v_user_id UUID;
          BEGIN
            v_user_id := auth.uid();
            
            IF v_user_id IS NULL THEN
              RAISE EXCEPTION 'Not authenticated';
            END IF;
            
            RETURN QUERY
            SELECT 
              maa.id,
              maa.account_id,
              maa.account_name,
              maa.currency,
              maa.status,
              maa.is_active,
              maa.created_at,
              maa.updated_at
            FROM meta_ad_accounts maa
            WHERE maa.user_id = v_user_id
            ORDER BY maa.account_name;
          END;
          $$;
        `
      },
      {
        name: 'Grant permissions for get_my_ad_accounts',
        sql: `GRANT EXECUTE ON FUNCTION get_my_ad_accounts() TO authenticated;`
      }
    ]

    // Unfortunately, Supabase doesn't expose a direct SQL execution endpoint
    // We need to use the SQL editor in the dashboard
    
    // Let's at least test if the functions exist
    try {
      // Test get_my_ad_accounts
      const { data: accounts, error: accountsError } = await supabaseAdmin
        .rpc('get_my_ad_accounts')
      
      results.push({
        function: 'get_my_ad_accounts',
        exists: !accountsError,
        error: accountsError?.message
      })
    } catch (e) {
      results.push({
        function: 'get_my_ad_accounts',
        exists: false,
        error: e.message
      })
    }

    // Return the SQL that needs to be executed
    return new Response(
      JSON.stringify({ 
        message: 'RPC functions need to be created via Supabase SQL Editor',
        sqlUrl: 'https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql/new',
        functionStatus: results,
        sql: sqlStatements.map(s => `-- ${s.name}\n${s.sql}`).join('\n\n')
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Please create RPC functions manually in SQL editor'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})