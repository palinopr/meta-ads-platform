'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugCampaignsPage() {
  const [debugResults, setDebugResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [accounts, setAccounts] = useState<any[]>([])

  const supabase = createClient()

  const loadAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setDebugResults({ error: 'Please log in first - go to /login', redirect: '/login' })
        return
      }

      console.log('✅ Found logged-in user:', user.id)

      const { data: accountsData, error } = await supabase
        .from('meta_ad_accounts')
        .select('id, account_id, account_name, currency')
        .eq('user_id', user.id)
        .limit(10)

      if (error) {
        setDebugResults({ error: `Failed to load accounts: ${error.message}` })
      } else {
        setAccounts(accountsData || [])
        if (accountsData && accountsData.length > 0) {
          setSelectedAccount(accountsData[0].account_id)
        }
        setDebugResults({ 
          success: `✅ Auto-loaded ${accountsData?.length || 0} accounts for user: ${user.email}`,
          userId: user.id,
          userEmail: user.email
        })
      }
    } catch (error: any) {
      setDebugResults({ error: `Error loading accounts: ${error.message}` })
    }
  }

  const debugCampaignSync = async () => {
    if (!selectedAccount) {
      setDebugResults({ error: 'Please select an account first' })
      return
    }

    setLoading(true)
    const results: any = {
      timestamp: new Date().toISOString(),
      steps: []
    }

    try {
      // Step 1: Check authentication
      results.steps.push({ step: 1, name: 'Authentication Check', status: 'running' })
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      
      if (authError || !session) {
        results.steps[0] = { step: 1, name: 'Authentication Check', status: 'failed', error: authError?.message || 'No session' }
        setDebugResults(results)
        setLoading(false)
        return
      }
      results.steps[0] = { step: 1, name: 'Authentication Check', status: 'success', data: { userId: session.user.id } }

      // Step 2: Check Meta access token
      results.steps.push({ step: 2, name: 'Meta Token Check', status: 'running' })
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('meta_access_token')
        .eq('id', session.user.id)
        .single()

      if (profileError || !profile?.meta_access_token) {
        results.steps[1] = { step: 2, name: 'Meta Token Check', status: 'failed', error: profileError?.message || 'No Meta token' }
        setDebugResults(results)
        setLoading(false)
        return
      }
      results.steps[1] = { step: 2, name: 'Meta Token Check', status: 'success', data: { hasToken: true } }

      // Step 3: Check selected account exists
      results.steps.push({ step: 3, name: 'Account Verification', status: 'running' })
      const cleanAccountId = selectedAccount.replace(/^act_/, '')
      const { data: accountData, error: accountError } = await supabase
        .from('meta_ad_accounts')
        .select('id, account_name')
        .eq('account_id', cleanAccountId)
        .eq('user_id', session.user.id)
        .single()

      if (accountError || !accountData) {
        results.steps[2] = { step: 3, name: 'Account Verification', status: 'failed', error: accountError?.message || 'Account not found' }
        setDebugResults(results)
        setLoading(false)
        return
      }
      results.steps[2] = { step: 3, name: 'Account Verification', status: 'success', data: accountData }

      // Step 4: Call sync-campaigns function
      results.steps.push({ step: 4, name: 'Campaign Sync API Call', status: 'running' })
      
      const syncResponse = await fetch('/functions/v1/sync-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ account_id: selectedAccount })
      })

      if (!syncResponse.ok) {
        const errorText = await syncResponse.text()
        results.steps[3] = { 
          step: 4, 
          name: 'Campaign Sync API Call', 
          status: 'failed', 
          error: `HTTP ${syncResponse.status}: ${errorText}`,
          response: { status: syncResponse.status, statusText: syncResponse.statusText }
        }
        setDebugResults(results)
        setLoading(false)
        return
      }

      const syncData = await syncResponse.json()
      results.steps[3] = { step: 4, name: 'Campaign Sync API Call', status: 'success', data: syncData }

      // Step 5: Verify campaigns were saved
      results.steps.push({ step: 5, name: 'Database Verification', status: 'running' })
      const { data: campaignsInDb, error: dbError } = await supabase
        .from('campaigns')
        .select('id, campaign_id, campaign_name, status')
        .eq('user_id', session.user.id)
        .eq('meta_account_uuid', accountData.id)
        .limit(10)

      if (dbError) {
        results.steps[4] = { step: 5, name: 'Database Verification', status: 'failed', error: dbError.message }
      } else {
        results.steps[4] = { 
          step: 5, 
          name: 'Database Verification', 
          status: 'success', 
          data: { 
            campaignCount: campaignsInDb?.length || 0, 
            campaigns: campaignsInDb 
          } 
        }
      }

      // Step 6: Test Meta API directly (for comparison)
      results.steps.push({ step: 6, name: 'Direct Meta API Test', status: 'running' })
      try {
        const metaUrl = `https://graph.facebook.com/v19.0/act_${cleanAccountId}/campaigns?fields=id,name,status&limit=5&access_token=${profile.meta_access_token}`
        const metaResponse = await fetch(metaUrl)
        
        if (metaResponse.ok) {
          const metaData = await metaResponse.json()
          results.steps[5] = { 
            step: 6, 
            name: 'Direct Meta API Test', 
            status: 'success', 
            data: { 
              campaignsFromMeta: metaData.data?.length || 0,
              campaigns: metaData.data 
            } 
          }
        } else {
          const metaError = await metaResponse.json()
          results.steps[5] = { 
            step: 6, 
            name: 'Direct Meta API Test', 
            status: 'failed', 
            error: metaError 
          }
        }
      } catch (metaError: any) {
        results.steps[5] = { 
          step: 6, 
          name: 'Direct Meta API Test', 
          status: 'failed', 
          error: metaError.message 
        }
      }

    } catch (error: any) {
      results.error = error.message
    }

    setDebugResults(results)
    setLoading(false)
  }

  // Auto-load accounts when component mounts
  useEffect(() => {
    loadAccounts()
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Campaign Sync Debug Tool</CardTitle>
          <p className="text-sm text-gray-600">Automatically using your logged-in session</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={loadAccounts} variant="outline">
              Refresh Accounts
            </Button>
            
            {accounts.length > 0 && (
              <select 
                value={selectedAccount} 
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-3 py-2 border rounded"
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.account_id}>
                    {account.account_name || account.account_id} ({account.currency})
                  </option>
                ))}
              </select>
            )}
            
            <Button 
              onClick={debugCampaignSync} 
              disabled={loading || !selectedAccount}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Debugging...' : 'Debug Campaign Sync'}
            </Button>
          </div>

          {debugResults && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Debug Results</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-auto max-h-96">
                  {JSON.stringify(debugResults, null, 2)}
                </pre>
              </div>

              {debugResults.steps && (
                <div className="mt-4 space-y-2">
                  {debugResults.steps.map((step: any, index: number) => (
                    <div key={index} className={`p-3 rounded flex items-center gap-3 ${
                      step.status === 'success' ? 'bg-green-100 text-green-800' :
                      step.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      <span className="font-medium">Step {step.step}:</span>
                      <span>{step.name}</span>
                      <span className="ml-auto">
                        {step.status === 'success' ? '✅' :
                         step.status === 'failed' ? '❌' : '⏳'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800">How to use:</h4>
            <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
              <li>Click "Load Ad Accounts" to get your accounts</li>
              <li>Select an account from the dropdown</li>
              <li>Click "Debug Campaign Sync" to test the entire flow</li>
              <li>Check each step to see where the issue occurs</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
