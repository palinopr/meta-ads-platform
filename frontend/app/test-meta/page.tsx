'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestMetaPage() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // Get session
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)

    // Get profile
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setProfile(profile)
    }
  }

  const testOAuth = async () => {
    setLoading(true)
    setMessage('Starting OAuth flow...')
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        scopes: 'email,ads_management,ads_read,business_management',
        redirectTo: `${window.location.origin}/test-meta?oauth_complete=true`,
      },
    })

    if (error) {
      setMessage(`OAuth error: ${error.message}`)
      setLoading(false)
    }
  }

  const syncToken = async () => {
    setLoading(true)
    setMessage('Syncing token...')
    
    const { data, error } = await supabase.functions.invoke('sync-meta-token-v2')
    
    if (error) {
      setMessage(`Sync error: ${JSON.stringify(error)}`)
    } else {
      setMessage(`Sync result: ${JSON.stringify(data)}`)
      await loadData() // Reload data
    }
    
    setLoading(false)
  }

  const checkConnection = async () => {
    setLoading(true)
    setMessage('Checking connection...')
    
    const { data, error } = await supabase.functions.invoke('check-meta-connection')
    
    if (error) {
      setMessage(`Check error: ${JSON.stringify(error)}`)
    } else {
      setMessage(`Check result: ${JSON.stringify(data)}`)
    }
    
    setLoading(false)
  }

  // Check if we just came back from OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('oauth_complete')) {
      setMessage('OAuth complete! Click "Sync Token" to save it.')
      loadData()
    }
  }, [])

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Meta OAuth Test Page</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Session Info</CardTitle>
            <CardDescription>Current Supabase session</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
              {JSON.stringify({
                user_id: session?.user?.id,
                email: session?.user?.email,
                provider_token: session?.provider_token ? 'Present' : 'Not found',
                provider_refresh_token: session?.provider_refresh_token ? 'Present' : 'Not found',
                identities: session?.user?.identities?.map((i: any) => ({
                  provider: i.provider,
                  id: i.id
                }))
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Info</CardTitle>
            <CardDescription>Profile table data</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
              {JSON.stringify({
                id: profile?.id,
                email: profile?.email,
                meta_access_token: profile?.meta_access_token ? 'Present' : 'Not found',
                meta_user_id: profile?.meta_user_id
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Test OAuth flow step by step</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button onClick={testOAuth} disabled={loading}>
                1. Start OAuth Flow
              </Button>
              <Button onClick={syncToken} disabled={loading}>
                2. Sync Token
              </Button>
              <Button onClick={checkConnection} disabled={loading}>
                3. Check Connection
              </Button>
              <Button onClick={loadData} disabled={loading} variant="outline">
                Refresh Data
              </Button>
            </div>
            
            {message && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
                {message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}