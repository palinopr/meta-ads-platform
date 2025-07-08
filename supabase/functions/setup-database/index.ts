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

    const results = []

    // Create get_campaigns_for_account function using raw SQL
    try {
      const { data, error } = await supabaseAdmin.rpc('sql', {
        query: `
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
          AS $function$
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
          $function$;
        `
      })
      
      results.push({
        function: 'get_campaigns_for_account',
        success: !error,
        error: error?.message
      })
    } catch (e: any) {
      results.push({
        function: 'get_campaigns_for_account',
        success: false,
        error: e.message
      })
    }

    // Grant permissions
    try {
      await supabaseAdmin.rpc('sql', {
        query: 'GRANT EXECUTE ON FUNCTION get_campaigns_for_account(TEXT) TO authenticated;'
      })
    } catch (e) {
      // Continue
    }

    // Create get_my_ad_accounts function
    try {
      const { data, error } = await supabaseAdmin.rpc('sql', {
        query: `
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
          AS $function$
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
          $function$;
        `
      })
      
      results.push({
        function: 'get_my_ad_accounts',
        success: !error,
        error: error?.message
      })
    } catch (e: any) {
      results.push({
        function: 'get_my_ad_accounts',
        success: false,
        error: e.message
      })
    }

    // Grant permissions
    try {
      await supabaseAdmin.rpc('sql', {
        query: 'GRANT EXECUTE ON FUNCTION get_my_ad_accounts() TO authenticated;'
      })
    } catch (e) {
      // Continue
    }

    // Test the functions
    try {
      const { data: testAccounts, error: testError } = await supabaseAdmin
        .rpc('get_my_ad_accounts')
      
      results.push({
        function: 'test_get_my_ad_accounts',
        success: !testError,
        error: testError?.message,
        data: testAccounts
      })
    } catch (e: any) {
      results.push({
        function: 'test_get_my_ad_accounts',
        success: false,
        error: e.message
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Database setup completed',
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: 'Database setup failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})