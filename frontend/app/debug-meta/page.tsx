'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function DebugMetaPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const testDebugFunction = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('debug-meta-token', {
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

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Meta Token Debug Tool</CardTitle>
          <CardDescription>
            Debug Meta API token and account access issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testDebugFunction}
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Meta Connection'}
          </Button>
          
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800">Error:</h4>
              <pre className="text-red-700 whitespace-pre-wrap mt-2">{error}</pre>
            </div>
          )}
          
          {result && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800">Debug Result:</h4>
              <pre className="text-green-700 whitespace-pre-wrap mt-2 text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}