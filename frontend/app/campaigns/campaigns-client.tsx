'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MetaAPI, Campaign, MetaAdAccount } from '@/lib/api/meta'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AccountSelector } from '@/components/ui/account-selector'
import { createClient } from '@/lib/supabase/client'
import { 
  RefreshCw, 
  Pause, 
  Play, 
  Edit, 
  TrendingUp, 
  DollarSign,
  Eye,
  MousePointerClick,
  AlertCircle,
  Loader2
} from 'lucide-react'

export function CampaignsClient() {
  const [loading, setLoading] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const api = new MetaAPI()

  useEffect(() => {
    loadAdAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      ensureAccountAndLoadCampaigns()
    }
  }, [selectedAccount])

  const loadAdAccounts = async () => {
    try {
      setLoading(true)
      setError(null)
      const accounts = await api.getAdAccounts()
      setAdAccounts(accounts)
      
      // If only one account, auto-select it
      if (accounts.length === 1) {
        setSelectedAccount(accounts[0].account_id)
      }
    } catch (error: any) {
      console.error('Failed to load ad accounts:', error)
      setError(error.message || 'Failed to load ad accounts. Please reconnect your Meta account.')
    } finally {
      setLoading(false)
    }
  }

  const ensureAccountAndLoadCampaigns = async () => {
    if (!selectedAccount) return

    try {
      setLoadingCampaigns(true)
      setError(null)
      
      // Find the selected account details
      const selectedAccountData = adAccounts.find(acc => acc.account_id === selectedAccount)
      if (!selectedAccountData) {
        setError('Account details not found')
        return
      }
      
      console.log('Selected account:', selectedAccountData)
      
      // Ensure the account exists in our database
      const { data: { user } } = await createClient().auth.getUser()
      if (user) {
        try {
          // Try to insert/update the account in our database
          const { error: upsertError } = await createClient()
            .from('meta_ad_accounts')
            .upsert({
              user_id: user.id,
              account_id: selectedAccountData.account_id,
              account_name: selectedAccountData.account_name,
              currency: selectedAccountData.currency || 'USD',
              status: selectedAccountData.status || 'ACTIVE',
              is_active: selectedAccountData.is_active !== false,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'account_id,user_id'
            })
          
          if (upsertError) {
            console.error('Error upserting account:', upsertError)
          } else {
            console.log('Account ensured in database')
          }
        } catch (e) {
          console.error('Failed to ensure account:', e)
        }
      }
      
      // Load campaigns (even if account insert failed)
      const data = await api.getCampaigns(selectedAccount)
      setCampaigns(data)
      
      if (data.length === 0) {
        setError('No campaigns found. This account might not have any campaigns yet.')
      }
    } catch (error: any) {
      console.error('Failed to load campaigns:', error)
      setError(error.message || 'Failed to load campaigns')
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const syncAndLoadCampaigns = async () => {
    if (!selectedAccount) return

    try {
      setLoadingCampaigns(true)
      setError(null)
      
      console.log('Syncing campaigns for account:', selectedAccount)
      
      // First sync campaigns from Meta API
      try {
        await api.syncAccount(selectedAccount)
      } catch (syncError: any) {
        console.error('Sync error:', syncError)
        // Continue to load existing campaigns even if sync fails
      }
      
      // Then load the campaigns
      const data = await api.getCampaigns(selectedAccount)
      setCampaigns(data)
      
      if (data.length === 0) {
        setError('No campaigns found. This account might not have any campaigns or sync might have failed.')
      }
    } catch (error: any) {
      console.error('Failed to sync/load campaigns:', error)
      setError(error.message || 'Failed to load campaigns')
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const loadCampaigns = async () => {
    if (!selectedAccount) return

    try {
      setLoadingCampaigns(true)
      setError(null)
      const data = await api.getCampaigns(selectedAccount)
      setCampaigns(data)
    } catch (error: any) {
      console.error('Failed to load campaigns:', error)
      setError(error.message || 'Failed to load campaigns')
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const handlePauseCampaign = async (campaignId: string) => {
    // TODO: Implement pause campaign
    console.log('Pause campaign:', campaignId)
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-50'
      case 'PAUSED':
        return 'text-yellow-600 bg-yellow-50'
      case 'DELETED':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading ad accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Campaigns</h2>
        <div className="flex items-center space-x-2">
          {adAccounts.length > 0 && (
            <AccountSelector
              accounts={adAccounts}
              value={selectedAccount}
              onValueChange={setSelectedAccount}
              placeholder="Select an ad account..."
              className="w-[450px]"
            />
          )}
          <Button 
            variant="outline" 
            onClick={selectedAccount ? ensureAccountAndLoadCampaigns : loadAdAccounts}
            disabled={loadingCampaigns}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingCampaigns ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button disabled={!selectedAccount}>Create Campaign</Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {adAccounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <h3 className="text-lg font-semibold mb-2">No ad accounts found</h3>
            <p className="text-muted-foreground mb-4">
              Your Meta account doesn't have any ad accounts or the connection has expired.
            </p>
            <Button onClick={() => window.location.href = '/settings'}>
              Reconnect Meta Account
            </Button>
          </CardContent>
        </Card>
      ) : !selectedAccount ? (
        <Card>
          <CardContent className="text-center py-10">
            <h3 className="text-lg font-semibold mb-2">Select an ad account</h3>
            <p className="text-muted-foreground mb-4">
              You have {adAccounts.length} ad accounts. Please select one from the dropdown above.
            </p>
          </CardContent>
        </Card>
      ) : loadingCampaigns ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading campaigns...</p>
          </div>
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-4">
              Connect your Meta account to start viewing campaigns.
            </p>
            <Button onClick={() => window.location.href = '/settings'}>
              Connect Meta Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <CardDescription>{campaign.objective}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Daily Budget</p>
                    <p className="text-xl font-semibold">
                      {campaign.daily_budget ? `$${campaign.daily_budget.toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lifetime Budget</p>
                    <p className="text-xl font-semibold">
                      {campaign.lifetime_budget ? `$${campaign.lifetime_budget.toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">
                      {new Date(campaign.created_time).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Campaign ID</p>
                    <p className="text-sm font-mono">{campaign.campaign_id}</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handlePauseCampaign(campaign.id)}
                  >
                    {campaign.status === 'ACTIVE' ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button variant="default" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}