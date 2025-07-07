'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugRawPage() {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testRawSQL = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    const supabase = createClient()
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('No user found')

      console.log('User:', user)

      // Test 1: Raw SQL query with explicit casting
      const { data: test1, error: error1 } = await supabase
        .rpc('query_meta_accounts_raw', {
          user_id_param: user.id
        })

      if (error1) {
        console.error('Test 1 error:', error1)
        setError({ test1: error1 })
        return
      }

      // Test 2: Try without any RLS
      const { data: test2, error: error2 } = await supabase
        .from('meta_ad_accounts')
        .select('count')
        .limit(1)

      // Test 3: Check auth functions
      const { data: test3, error: error3 } = await supabase
        .rpc('check_auth_uid_type')

      setResult({
        user_id: user.id,
        user_id_type: typeof user.id,
        test1_result: test1,
        test2_result: test2,
        test3_result: test3,
        errors: { error1, error2, error3 }
      })
    } catch (err: any) {
      console.error('Caught error:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const testServiceRole = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      // This will bypass RLS entirely
      const response = await fetch('/api/test-insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: '787610255314938',
          account_name: 'Test Account Service Role'
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        setError(data)
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Raw SQL & Service Role</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testRawSQL} disabled={loading}>
              Test Raw SQL Functions
            </Button>
            <Button onClick={testServiceRole} disabled={loading} variant="outline">
              Test Service Role Insert (Bypass RLS)
            </Button>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="py-4">
              <p>Loading...</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Success Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-500">
            <CardHeader>
              <CardTitle className="text-red-600">Error Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-red-50 p-4 rounded overflow-auto text-sm text-red-800">
                {JSON.stringify(error, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">SQL Functions to create:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
{`-- Function 1: Query with explicit casting
CREATE OR REPLACE FUNCTION query_meta_accounts_raw(user_id_param text)
RETURNS SETOF meta_ad_accounts AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.meta_ad_accounts 
    WHERE user_id = user_id_param::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION query_meta_accounts_raw TO authenticated;

-- Function 2: Check auth.uid() type
CREATE OR REPLACE FUNCTION check_auth_uid_type()
RETURNS json AS $$
DECLARE
    v_uid text;
    v_type text;
BEGIN
    v_uid := auth.uid();
    v_type := pg_typeof(auth.uid())::text;
    
    RETURN json_build_object(
        'uid_value', v_uid,
        'uid_type', v_type,
        'uid_length', length(v_uid),
        'is_valid_uuid', v_uid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_auth_uid_type TO authenticated;`}
        </pre>
      </div>
    </div>
  )
}