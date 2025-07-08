'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function CheckSessionPage() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()

  const checkSession = async () => {
    setLoading(true)
    
    try {
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      setSessionData({
        session: {
          exists: !!session,
          accessToken: session?.access_token ? session.access_token.substring(0, 20) + '...' : null,
          refreshToken: session?.refresh_token ? session.refresh_token.substring(0, 20) + '...' : null,
          expiresAt: session?.expires_at,
          user: session?.user ? {
            id: session.user.id,
            email: session.user.email
          } : null,
          error: sessionError?.message
        },
        user: {
          exists: !!user,
          id: user?.id,
          email: user?.email,
          error: userError?.message
        }
      })
    } catch (error: any) {
      setSessionData({
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        setSessionData({
          refreshError: error.message
        })
      } else {
        setSessionData({
          refreshSuccess: true,
          newSession: {
            accessToken: data.session?.access_token ? data.session.access_token.substring(0, 20) + '...' : null,
            expiresAt: data.session?.expires_at
          }
        })
      }
    } catch (error: any) {
      setSessionData({
        refreshError: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Session Debug</CardTitle>
          <CardDescription>
            Check Supabase authentication session status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={checkSession}
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Check Session'}
            </Button>
            
            <Button 
              onClick={refreshSession}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Refreshing...' : 'Refresh Session'}
            </Button>
          </div>
          
          {sessionData && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800">Session Data:</h4>
              <pre className="text-blue-700 whitespace-pre-wrap mt-2 text-xs overflow-auto max-h-96">
                {JSON.stringify(sessionData, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}