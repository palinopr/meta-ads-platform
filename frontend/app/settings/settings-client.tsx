'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { Facebook, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  meta_access_token: string | null
  meta_user_id: string | null
}

interface SettingsClientProps {
  user: User
  profile: Profile | null
}

export function SettingsClient({ user, profile }: SettingsClientProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [currentProfile, setCurrentProfile] = useState(profile)
  const [verifyingConnection, setVerifyingConnection] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Check if we just returned from OAuth and refresh profile
  useEffect(() => {
    const checkForUpdate = async () => {
      const params = new URLSearchParams(window.location.search)
      // If we're coming back from OAuth, refresh the profile
      if (params.has('oauth_success')) {
        setVerifyingConnection(true)
        try {
          // Wait a moment for the OAuth callback to complete
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Try to sync the Meta token from the session
          const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-meta-token')
          
          if (syncError) {
            console.error('Error syncing Meta token:', syncError)
          }
          
          // Fetch the latest profile data
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (!error && data) {
            setCurrentProfile(data)
            if (data.meta_access_token) {
              setMessage({ type: 'success', text: 'Meta account connected successfully!' })
            } else {
              setMessage({ type: 'error', text: 'Failed to connect Meta account. Please try again.' })
            }
          }
        } catch (error) {
          console.error('Error refreshing profile:', error)
          setMessage({ type: 'error', text: 'Failed to verify Meta connection.' })
        } finally {
          setVerifyingConnection(false)
        }
        
        // Clean up URL
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }

    checkForUpdate()
  }, [user.id])

  const handleConnectMeta = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          scopes: 'email,ads_management,ads_read,business_management',
          redirectTo: `${window.location.origin}/auth/callback?next=/settings?oauth_success=true`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    }
  }

  const handleDisconnectMeta = async () => {
    setLoading(true)
    setMessage(null)

    try {
      // Update profile to remove Meta tokens
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          meta_access_token: null,
          meta_user_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setCurrentProfile(data)
      setMessage({ type: 'success', text: 'Meta account disconnected successfully' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const isMetaConnected = currentProfile?.meta_access_token !== null

  if (verifyingConnection) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Verifying Meta account connection...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user.email}</p>
          </div>
          {currentProfile?.full_name && (
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <p className="mt-1 text-sm text-gray-900">{currentProfile.full_name}</p>
            </div>
          )}
          {currentProfile?.company_name && (
            <div>
              <label className="text-sm font-medium text-gray-700">Company</label>
              <p className="mt-1 text-sm text-gray-900">{currentProfile.company_name}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta Account Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Meta Business Account</CardTitle>
          <CardDescription>
            Connect your Meta account to sync advertising data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isMetaConnected ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Meta account connected</span>
              </div>
              <p className="text-sm text-gray-600">
                Your Meta advertising data is ready to be synced.
              </p>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => router.push('/campaigns')}
                  variant="default"
                >
                  View Campaigns
                </Button>
                <Button 
                  onClick={handleDisconnectMeta}
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Facebook className="h-4 w-4 mr-2" />
                  )}
                  Disconnect Meta Account
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Connect your Meta account to start importing your advertising data 
                and access advanced analytics features.
              </p>
              <Button 
                onClick={handleConnectMeta}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Facebook className="h-4 w-4 mr-2" />
                )}
                Connect Meta Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Access (Future Feature) */}
      <Card>
        <CardHeader>
          <CardTitle>API Access</CardTitle>
          <CardDescription>
            Programmatic access to your data (Coming Soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            API keys and webhook configuration will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}