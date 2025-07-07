'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [constraints, setConstraints] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    // Get all accounts for this user
    if (user) {
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('*')
        .eq('user_id', user.id)
      
      if (data) setAccounts(data)
      if (error) console.error('Error loading accounts:', error)
    }
  }

  const testInsert = async () => {
    setLoading(true)
    setMessage('')
    
    const testAccount = {
      user_id: user?.id,
      account_id: '787610255314938',
      account_name: 'Test Account',
      currency: 'USD',
      timezone_name: 'America/New_York',
      status: 'ACTIVE',
      is_active: true
    }

    console.log('Attempting to insert:', testAccount)

    const { data, error } = await supabase
      .from('meta_ad_accounts')
      .insert(testAccount)
      .select()

    if (error) {
      setMessage(`Error: ${JSON.stringify(error, null, 2)}`)
      console.error('Insert error:', error)
    } else {
      setMessage(`Success: ${JSON.stringify(data, null, 2)}`)
      await loadData()
    }
    
    setLoading(false)
  }

  const deleteAccount = async (id: string) => {
    const { error } = await supabase
      .from('meta_ad_accounts')
      .delete()
      .eq('id', id)

    if (!error) {
      await loadData()
      setMessage('Account deleted')
    } else {
      setMessage(`Delete error: ${error.message}`)
    }
  }

  const checkConstraints = async () => {
    // This would need to be run as a SQL query in Supabase
    setMessage('Check the console for constraint query to run in Supabase SQL editor')
    console.log(`
Run this in Supabase SQL Editor:

SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.meta_ad_accounts'::regclass;
    `)
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Meta Ad Accounts</h1>
      
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Current User</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify({ id: user?.id, email: user?.email }, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={testInsert} disabled={loading || !user}>
              Test Insert Account
            </Button>
            <Button onClick={checkConstraints} variant="outline">
              Show Constraint Query
            </Button>
            <Button onClick={loadData} variant="outline">
              Refresh Data
            </Button>
          </CardContent>
        </Card>

        {message && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto whitespace-pre-wrap">
                {message}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Current Accounts ({accounts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.map((account) => (
              <div key={account.id} className="border-b py-2 last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{account.account_name}</p>
                    <p className="text-sm text-gray-600">ID: {account.account_id}</p>
                    <p className="text-xs text-gray-500">
                      {account.currency} • {account.status} • Created: {new Date(account.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => deleteAccount(account.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <p className="text-gray-500">No accounts found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}