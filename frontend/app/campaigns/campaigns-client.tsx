'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Loader2,
  Trash2,
  Copy,
  Plus
} from 'lucide-react'

export function CampaignsClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  const api = new MetaAPI(supabase)

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
      const response = await api.getAdAccounts()
      
      if (response.error) {
        setError(response.error)
        return
      }
      
      setAdAccounts(response.data)
      
      // If only one account, auto-select it
      if (response.data.length === 1) {
        setSelectedAccount(response.data[0].account_id)
      }
    } catch (error: any) {
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
      
      // Account saving is handled by the direct Meta API functions
      
      // Campaigns are now fetched directly from Meta API - no sync needed
      
      // Load campaigns directly from Meta API
      const response = await api.getCampaigns(selectedAccount)
      if (response.error) {
        throw new Error(response.error)
      }
      const campaignData = response.data
      setCampaigns(campaignData)
      
      if (campaignData.length === 0) {
        setError('No campaigns found in this Meta account.')
      }
    } catch (error: any) {
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
      const response = await api.getCampaigns(selectedAccount)
      if (response.error) {
        throw new Error(response.error)
      }
      const data = response.data
      setCampaigns(data)
    } catch (error: any) {
      setError(error.message || 'Failed to load campaigns')
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const handlePauseCampaign = async (campaignId: string, currentStatus: string) => {
    try {
      setError(null)
      
      const campaign = campaigns.find(c => c.campaign_id === campaignId)
      if (!campaign) {
        setError('Campaign not found')
        return
      }
      
      const isCurrentlyActive = currentStatus === 'ACTIVE'
      const action = isCurrentlyActive ? 'pause' : 'resume'
      
      const response = isCurrentlyActive 
        ? await api.pauseCampaign(campaignId)
        : await api.resumeCampaign(campaignId)
      
      if (response.error) {
        setError(response.error)
        return
      }
      
      if (response.data?.tokenExpired) {
        setError('Your Meta access token has expired. Please reconnect your account in Settings.')
        return
      }
      
      // Update the campaign status in the local state
      setCampaigns(campaigns.map(c => 
        c.campaign_id === campaignId 
          ? { ...c, status: isCurrentlyActive ? 'PAUSED' : 'ACTIVE' }
          : c
      ))
      
    } catch (error: any) {
      setError(error.message || 'Failed to update campaign')
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      setError(null)
      
      const campaign = campaigns.find(c => c.campaign_id === campaignId)
      if (!campaign) {
        setError('Campaign not found')
        return
      }
      
      // Confirmation dialog
      const confirmDelete = window.confirm(
        `Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`
      )
      
      if (!confirmDelete) return
      
      const response = await api.deleteCampaign(campaignId)
      
      if (response.error) {
        setError(response.error)
        return
      }
      
      if (response.data?.tokenExpired) {
        setError('Your Meta access token has expired. Please reconnect your account in Settings.')
        return
      }
      
      if (response.data?.requiresPause) {
        setError('Cannot delete active campaigns with significant budget. Please pause the campaign first.')
        return
      }
      
      // Remove the campaign from the local state
      setCampaigns(campaigns.filter(c => c.campaign_id !== campaignId))
      
    } catch (error: any) {
      setError(error.message || 'Failed to delete campaign')
    }
  }

  const handleDuplicateCampaign = async (campaignId: string) => {
    try {
      setError(null)
      
      const campaign = campaigns.find(c => c.campaign_id === campaignId)
      if (!campaign) {
        setError('Campaign not found')
        return
      }
      
      const response = await api.duplicateCampaign(campaignId)
      
      if (response.error) {
        setError(response.error)
        return
      }
      
      if (response.data?.tokenExpired) {
        setError('Your Meta access token has expired. Please reconnect your account in Settings.')
        return
      }
      
      // Add the new campaign to the local state
      if (response.data?.campaign) {
        setCampaigns([...campaigns, response.data.campaign])
      }
      
    } catch (error: any) {
      setError(error.message || 'Failed to duplicate campaign')
    }
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
          <Button 
            disabled={!selectedAccount}
            onClick={() => window.alert('Campaign creation modal coming soon!')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
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
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Meta Ad Accounts Found</h3>
            <div className="text-muted-foreground mb-6 space-y-2">
              <p>This could happen for several reasons:</p>
              <ul className="text-sm text-left max-w-md mx-auto space-y-1">
                <li>• Your Meta account connection has expired</li>
                <li>• You don't have any ad accounts in your Meta Business account</li>
                <li>• You don't have proper permissions (ads_management, ads_read)</li>
                <li>• Your Meta account isn't linked to a Business Manager</li>
              </ul>
            </div>
            <div className="space-y-3">
              <Button onClick={() => window.location.href = '/settings'}>
                Check Meta Connection in Settings
              </Button>
              <div className="text-xs text-muted-foreground">
                Need help? Make sure you have admin access to Meta Business accounts with active ad accounts.
              </div>
            </div>
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
            <Card key={campaign.campaign_id}>
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.alert('Campaign editing modal coming soon!')}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDuplicateCampaign(campaign.campaign_id)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Duplicate
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handlePauseCampaign(campaign.campaign_id, campaign.status)}
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
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteCampaign(campaign.campaign_id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => router.push(`/campaigns/${campaign.campaign_id}`)}
                  >
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