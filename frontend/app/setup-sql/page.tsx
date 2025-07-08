'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Copy, CheckCircle2, ExternalLink } from 'lucide-react'

export default function SetupSQLPage() {
  const [copied, setCopied] = useState(false)

  const SQL_SCRIPT = `-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_campaigns_for_account(TEXT);
DROP FUNCTION IF EXISTS get_my_ad_accounts();

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
  WHERE c.account_id = v_account_record_id
    AND c.user_id = v_user_id
  ORDER BY c.created_time DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_campaigns_for_account(TEXT) TO authenticated;

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_my_ad_accounts() TO authenticated;`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SCRIPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Setup SQL Functions</CardTitle>
          <CardDescription>
            Copy and run this SQL in your Supabase dashboard to create the required RPC functions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>Instructions</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal list-inside space-y-2 mt-2">
                <li>Click the "Copy SQL" button below</li>
                <li>
                  Open your Supabase SQL Editor{' '}
                  <a 
                    href="https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/sql/new" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    here <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </li>
                <li>Paste the SQL and click "Run"</li>
                <li>Return to the campaigns page and try syncing again</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="relative">
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{SQL_SCRIPT}</code>
            </pre>
            <Button
              onClick={copyToClipboard}
              className="absolute top-2 right-2"
              variant="outline"
              size="sm"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SQL
                </>
              )}
            </Button>
          </div>

          <Alert variant="default">
            <AlertDescription>
              <strong>What this creates:</strong>
              <ul className="list-disc list-inside mt-2">
                <li><code>get_campaigns_for_account(account_id)</code> - Returns campaigns for a specific ad account</li>
                <li><code>get_my_ad_accounts()</code> - Returns all your connected ad accounts</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}