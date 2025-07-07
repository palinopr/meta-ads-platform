'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MetaAPI, Campaign } from '@/lib/api/meta'
import { 
  RefreshCw, 
  Pause, 
  Play, 
  Edit, 
  TrendingUp, 
  DollarSign,
  Eye,
  MousePointerClick
} from 'lucide-react'

export function CampaignsClient() {
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const api = new MetaAPI()

  useEffect(() => {
    loadCampaigns()
  }, [selectedAccount])

  const loadCampaigns = async () => {
    if (!selectedAccount) return

    try {
      setLoading(true)
      const data = await api.getCampaigns(selectedAccount)
      setCampaigns(data)
    } catch (error) {
      console.error('Failed to load campaigns:', error)
    } finally {
      setLoading(false)
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

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading campaigns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Campaigns</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadCampaigns}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>Create Campaign</Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
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