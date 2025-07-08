const fetch = require('node-fetch');

const SUPABASE_URL = 'https://igeuyfuxezvvenxjfnnn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function executeSQL(sql) {
  try {
    // First, let's try to create the functions one by one
    const functions = [
      {
        name: 'get_campaigns_for_account',
        sql: `
          -- Drop if exists
          DROP FUNCTION IF EXISTS get_campaigns_for_account(TEXT);
          
          -- Create RPC function to get campaigns for a specific account
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
            -- Get the current user ID
            v_user_id := auth.uid();
            
            IF v_user_id IS NULL THEN
              RAISE EXCEPTION 'Not authenticated';
            END IF;
            
            -- Find the account record ID for this user and account
            SELECT id INTO v_account_record_id
            FROM meta_ad_accounts
            WHERE account_id = p_account_id
              AND user_id = v_user_id
            LIMIT 1;
            
            IF v_account_record_id IS NULL THEN
              -- Return empty result set if account not found
              RETURN;
            END IF;
            
            -- Return campaigns for this account
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
        name: 'grant_campaigns_permissions',
        sql: `GRANT EXECUTE ON FUNCTION get_campaigns_for_account(TEXT) TO authenticated;`
      },
      {
        name: 'get_my_ad_accounts',
        sql: `
          -- Drop if exists
          DROP FUNCTION IF EXISTS get_my_ad_accounts();
          
          -- Create RPC function to get user's ad accounts
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
            -- Get the current user ID
            v_user_id := auth.uid();
            
            IF v_user_id IS NULL THEN
              RAISE EXCEPTION 'Not authenticated';
            END IF;
            
            -- Return ad accounts for this user
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
        name: 'grant_accounts_permissions',
        sql: `GRANT EXECUTE ON FUNCTION get_my_ad_accounts() TO authenticated;`
      }
    ];

    console.log('Creating RPC functions in Supabase...\n');

    for (const func of functions) {
      console.log(`Creating ${func.name}...`);
      
      // Use the Supabase REST API to execute raw SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: func.sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to create ${func.name}:`, errorText);
        
        // If the query RPC doesn't exist, log the SQL for manual execution
        if (response.status === 404) {
          console.log('\nThe query RPC function is not available.');
          console.log('Please run the following SQL in Supabase SQL Editor:\n');
          functions.forEach(f => {
            console.log(`-- ${f.name}`);
            console.log(f.sql);
            console.log('');
          });
          return;
        }
      } else {
        console.log(`✓ ${func.name} created successfully`);
      }
    }

    console.log('\n✅ All RPC functions created successfully!');

  } catch (error) {
    console.error('Error:', error);
    console.log('\nPlease run the SQL manually in Supabase SQL Editor.');
  }
}

// Run the script
executeSQL();