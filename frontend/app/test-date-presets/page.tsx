'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestDatePresets() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const testAccount = async (accountId: string) => {
    setTesting(true)
    setError(null)
    setResults(null)

    try {
      const { data, error } = await supabase.functions.invoke('test-meta-dates', {
        body: { account_id: accountId }
      })

      if (error) {
        setError(error.message)
      } else {
        setResults(data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Meta API Date Presets</CardTitle>
          <CardDescription>
            This tool tests all Meta API date presets to see which ones return data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Test Accounts</h3>
            <div className="flex gap-2">
              <Button 
                onClick={() => testAccount('37705666')}
                disabled={testing}
              >
                Test Account 37705666
              </Button>
              <Button 
                onClick={() => testAccount('787610255314938')}
                disabled={testing}
              >
                Test Account 787610255314938
              </Button>
            </div>
          </div>

          {testing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Testing all date presets...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h4 className="font-semibold mb-2">Summary</h4>
                <p>Account: {results.account_id}</p>
                <p>Successful presets: {results.summary.successful}</p>
                <p>Failed presets: {results.summary.failed}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Comparison (Successful Presets)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left">Preset</th>
                        <th className="px-4 py-2 text-right">Spend</th>
                        <th className="px-4 py-2 text-right">Clicks</th>
                        <th className="px-4 py-2 text-right">Impressions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {results.summary.comparison.map((item: any, i: number) => (
                        <tr key={i} className={item.spend === 0 ? 'bg-gray-50' : ''}>
                          <td className="px-4 py-2">{item.preset}</td>
                          <td className="px-4 py-2 text-right">${item.spend.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">{item.clicks.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">{item.impressions.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Detailed Results</h4>
                <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
                  {JSON.stringify(results.results, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 mt-4">
            <p>Check the Supabase function logs for detailed API responses:</p>
            <a 
              href="https://supabase.com/dashboard/project/igeuyfuxezvvenxjfnnn/functions/test-meta-dates/logs" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View Function Logs →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}