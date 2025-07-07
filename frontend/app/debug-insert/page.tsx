'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugInsertPage() {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testDirectInsert = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    const supabase = createClient()
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('No user found')

      // Log user info
      console.log('User ID:', user.id)
      console.log('User ID type:', typeof user.id)

      // Try direct insert with minimal data
      const insertData = {
        user_id: user.id,
        account_id: '787610255314938',
        account_name: 'Test Account Debug',
        currency: 'USD',
        timezone_name: 'UTC',
        status: 'ACTIVE',
        is_active: true
      }

      console.log('Insert data:', insertData)

      const { data, error: insertError } = await supabase
        .from('meta_ad_accounts')
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        setError({
          ...insertError,
          details: {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            user_id: user.id,
            user_id_type: typeof user.id
          }
        })
      } else {
        setResult(data)
      }
    } catch (err: any) {
      console.error('Caught error:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const checkTableInfo = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    const supabase = createClient()
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Try to query existing accounts
      const { data: accounts, error: queryError } = await supabase
        .from('meta_ad_accounts')
        .select('*')
        .limit(5)

      if (queryError) {
        setError({ query_error: queryError })
      } else {
        setResult({ 
          user_info: {
            id: user?.id,
            id_type: typeof user?.id,
            email: user?.email
          },
          existing_accounts: accounts,
          count: accounts?.length || 0
        })
      }
    } catch (err: any) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Database Insert</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testDirectInsert} disabled={loading}>
              Test Direct Insert
            </Button>
            <Button onClick={checkTableInfo} disabled={loading} variant="outline">
              Check Table Info
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
        <h2 className="text-lg font-semibold mb-2">SQL to run in Supabase:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm">
{`-- Run this in Supabase SQL Editor to fix RLS policies
DROP POLICY IF EXISTS "Users can view own ad accounts" ON public.meta_ad_accounts;
DROP POLICY IF EXISTS "Users can insert own ad accounts" ON public.meta_ad_accounts;
DROP POLICY IF EXISTS "Users can update own ad accounts" ON public.meta_ad_accounts;
DROP POLICY IF EXISTS "Users can delete own ad accounts" ON public.meta_ad_accounts;

CREATE POLICY "Users can view own ad accounts" ON public.meta_ad_accounts
    FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert own ad accounts" ON public.meta_ad_accounts
    FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own ad accounts" ON public.meta_ad_accounts
    FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own ad accounts" ON public.meta_ad_accounts
    FOR DELETE USING (auth.uid()::uuid = user_id);`}
        </pre>
      </div>
    </div>
  )
}