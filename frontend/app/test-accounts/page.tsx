'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function TestAccountsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const testAccounts = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('meta-accounts-simple', {
        body: {}
      })

      if (error) {
        setError(error.message)
        return
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testScenarios = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('test-meta-scenarios', {
        body: {}
      })

      if (error) {
        setError(error.message)
        return
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testDebugSimple = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('No valid session found')
        return
      }

      // Use fetch directly instead of supabase.functions.invoke to avoid token override
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/debug-accounts-simple`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          },
          body: JSON.stringify({})
        }
      )

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testAuthSimple = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('No valid session found')
        return
      }

      // Use fetch directly to test token
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/token-debug`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          },
          body: JSON.stringify({})
        }
      )

      const data = await response.json()
      setResult(data)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Meta Accounts Debug</CardTitle>
          <CardDescription>
            Debug Meta API accounts response with detailed logging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={testAccounts}
              disabled={loading}
            >
              {loading ? 'Testing...' : 'Test Real Meta API'}
            </Button>
            
            <Button 
              onClick={testAuthSimple}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Testing...' : 'Test Auth'}
            </Button>
            
            <Button 
              onClick={testDebugSimple}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Testing...' : 'Debug Step-by-Step'}
            </Button>
            
            <Button 
              onClick={testScenarios}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Testing...' : 'Test Scenarios'}
            </Button>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800">Error:</h4>
              <pre className="text-red-700 whitespace-pre-wrap mt-2 text-sm">{error}</pre>
            </div>
          )}
          
          {result && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800">Response:</h4>
              <pre className="text-blue-700 whitespace-pre-wrap mt-2 text-xs overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}