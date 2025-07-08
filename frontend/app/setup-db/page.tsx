'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function SetupDBPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  const createRPCFunctions = async () => {
    setLoading(true)
    setMessage('')
    setError('')

    try {
      // Create get_campaigns_for_account function
      const { error: error1 } = await supabase.rpc('query', {
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
            WHERE c.account_id = v_account_record_id
              AND c.user_id = v_user_id
            ORDER BY c.created_time DESC;
          END;
          $$;
        `
      })

      if (error1) {
        setError(`Error creating get_campaigns_for_account: ${error1.message}`)
        return
      }

      // Grant permissions
      const { error: error2 } = await supabase.rpc('query', {
        query: `GRANT EXECUTE ON FUNCTION get_campaigns_for_account(TEXT) TO authenticated;`
      })

      if (error2) {
        setError(`Error granting permissions: ${error2.message}`)
        return
      }

      // Create get_my_ad_accounts function
      const { error: error3 } = await supabase.rpc('query', {
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
      })

      if (error3) {
        setError(`Error creating get_my_ad_accounts: ${error3.message}`)
        return
      }

      // Grant permissions
      const { error: error4 } = await supabase.rpc('query', {
        query: `GRANT EXECUTE ON FUNCTION get_my_ad_accounts() TO authenticated;`
      })

      if (error4) {
        setError(`Error granting permissions: ${error4.message}`)
        return
      }

      setMessage('RPC functions created successfully!')
    } catch (e: any) {
      setError(`Unexpected error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Database Setup</CardTitle>
          <CardDescription>
            Create missing RPC functions for campaign management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              This will create the following RPC functions:
              <ul className="list-disc list-inside mt-2">
                <li>get_campaigns_for_account(account_id) - Returns campaigns for an account</li>
                <li>get_my_ad_accounts() - Returns your ad accounts</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button 
            onClick={createRPCFunctions} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating Functions...' : 'Create RPC Functions'}
          </Button>

          {message && (
            <Alert>
              <AlertDescription className="text-green-600">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}