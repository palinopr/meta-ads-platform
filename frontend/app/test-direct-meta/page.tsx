'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestDirectMeta() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    // Get user's Meta token
    const getToken = async () => {
      try {
        console.log('🔍 Fetching user...')
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log('👤 User:', user?.id, 'Error:', userError)
        
        if (user) {
          console.log('🔍 Fetching profile...')
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('meta_access_token')
            .eq('id', user.id)
            .single()
          
          console.log('📋 Profile:', profile ? 'Found' : 'Not found', 'Error:', profileError)
          console.log('🔑 Token exists:', !!profile?.meta_access_token)
          
          if (profile?.meta_access_token) {
            setToken(profile.meta_access_token)
          }
        }
      } catch (error) {
        console.error('❌ Error getting token:', error)
      } finally {
        setLoading(false)
      }
    }
    getToken()
  }, [supabase])

  const testDatePreset = async (accountId: string, datePreset: string) => {
    if (!token) {
      setError('No Meta access token found')
      return
    }

    setTesting(true)
    setError(null)
    setResults(null)

    try {
      const fields = 'spend,clicks,impressions,ctr,cpc,cpm,actions,action_values'
      const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${token}`
      
      console.log(`🧪 Testing ${datePreset} for account ${accountId}`)
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.error) {
        setError(data.error.message)
      } else if (data.data && data.data.length > 0) {
        const insights = data.data[0]
        setResults({
          accountId,
          datePreset,
          data: {
            spend: parseFloat(insights.spend || '0'),
            clicks: parseInt(insights.clicks || '0'),
            impressions: parseInt(insights.impressions || '0'),
            ctr: parseFloat(insights.ctr || '0'),
            cpc: parseFloat(insights.cpc || '0'),
            cpm: parseFloat(insights.cpm || '0'),
            dateStart: insights.date_start,
            dateStop: insights.date_stop
          }
        })
      } else {
        setResults({
          accountId,
          datePreset,
          data: null,
          message: 'No data returned'
        })
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
          <CardTitle>Direct Meta API Test</CardTitle>
          <CardDescription>
            Test Meta API directly from the browser to debug date preset issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading token...</p>
            </div>
          ) : !token ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-yellow-800">No Meta access token found. Please connect your Meta account in Settings.</p>
            </div>
          ) : null}

          <div className="space-y-4">
            <h3 className="font-semibold">Test Different Date Presets</h3>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Account 787610255314938 (has data):</p>
              <div className="grid grid-cols-3 gap-2">
                {['today', 'yesterday', 'last_7d', 'last_30d', 'last_90d', 'this_month'].map(preset => (
                  <Button 
                    key={preset}
                    onClick={() => testDatePreset('787610255314938', preset)}
                    disabled={testing || !token || loading}
                    variant="outline"
                    size="sm"
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">Account 37705666 (no data):</p>
              <div className="grid grid-cols-3 gap-2">
                {['today', 'yesterday', 'last_7d', 'last_30d', 'last_90d', 'this_month'].map(preset => (
                  <Button 
                    key={preset}
                    onClick={() => testDatePreset('37705666', preset)}
                    disabled={testing || !token || loading}
                    variant="outline"
                    size="sm"
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {testing && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Testing...</p>
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
                <h4 className="font-semibold mb-2">Results</h4>
                <p className="text-sm">Account: {results.accountId}</p>
                <p className="text-sm">Date Preset: {results.datePreset}</p>
                {results.data ? (
                  <>
                    <p className="text-sm mt-2">Date Range: {results.data.dateStart} to {results.data.dateStop}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-xs text-gray-600">Spend</p>
                        <p className="font-semibold">${results.data.spend.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Impressions</p>
                        <p className="font-semibold">{results.data.impressions.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Clicks</p>
                        <p className="font-semibold">{results.data.clicks.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">CTR</p>
                        <p className="font-semibold">{results.data.ctr.toFixed(2)}%</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm mt-2 text-gray-600">{results.message}</p>
                )}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-4">
            <p>This test runs directly in your browser using your Meta access token.</p>
            <p>Check the browser console for detailed logs.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}