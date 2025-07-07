'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Campaign {
  id: string
  name: string
  status: string
  objective: string
  daily_budget?: number
  lifetime_budget?: number
  created_time: string
}

interface CampaignMetrics {
  date_start: string
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  spend: number
  conversions: number
  roas: number
}

export function CampaignDetailClient({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [metrics, setMetrics] = useState<CampaignMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('last_30d')
  
  const supabase = createClient()

  useEffect(() => {
    loadCampaignDetails()
  }, [campaignId])

  const loadCampaignDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (campaignError) throw campaignError
      if (!campaignData) throw new Error('Campaign not found')

      setCampaign(campaignData)

      // Fetch existing metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('date_start', { ascending: true })

      if (metricsError) throw metricsError

      setMetrics(metricsData || [])
    } catch (err: any) {
      console.error('Error loading campaign:', err)
      setError(err.message || 'Failed to load campaign details')
    } finally {
      setLoading(false)
    }
  }

  const syncMetrics = async () => {
    if (!campaign) return

    try {
      setLoadingMetrics(true)
      setError(null)

      const { data, error } = await supabase.functions.invoke('sync-campaign-metrics', {
        body: { 
          campaign_id: campaignId,
          date_preset: dateRange 
        }
      })

      if (error) throw error

      if (data?.tokenExpired) {
        setError('Your Meta access token has expired. Please reconnect your account in Settings.')
        return
      }

      if (data?.success) {
        // Reload metrics
        await loadCampaignDetails()
        console.log('Metrics synced:', data.summary)
      }
    } catch (err: any) {
      console.error('Error syncing metrics:', err)
      setError(err.message || 'Failed to sync metrics')
    } finally {
      setLoadingMetrics(false)
    }
  }

  const calculateTotals = () => {
    const totals = metrics.reduce((acc, metric) => ({
      impressions: acc.impressions + metric.impressions,
      clicks: acc.clicks + metric.clicks,
      spend: acc.spend + metric.spend,
      conversions: acc.conversions + metric.conversions,
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0 })

    const avgCtr = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length 
      : 0

    const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0
    const avgCpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0
    const avgRoas = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.roas, 0) / metrics.length 
      : 0

    return { ...totals, avgCtr, avgCpc, avgCpm, avgRoas }
  }

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`
  const formatPercent = (value: number) => `${value.toFixed(2)}%`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading campaign details...</p>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Campaign not found</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/campaigns')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Button>
      </div>
    )
  }

  const totals = calculateTotals()

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{campaign.name}</h2>
            <p className="text-muted-foreground">
              {campaign.objective} • Created {new Date(campaign.created_time).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={syncMetrics}
            disabled={loadingMetrics}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingMetrics ? 'animate-spin' : ''}`} />
            Sync Metrics
          </Button>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            campaign.status === 'ACTIVE' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {campaign.status}
          </span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.spend)}</div>
            <p className="text-xs text-muted-foreground">
              Budget: {campaign.daily_budget 
                ? `${formatCurrency(campaign.daily_budget)}/day` 
                : campaign.lifetime_budget 
                ? formatCurrency(campaign.lifetime_budget) 
                : 'No budget set'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.impressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              CPM: {formatCurrency(totals.avgCpm)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.clicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              CTR: {formatPercent(totals.avgCtr)} • CPC: {formatCurrency(totals.avgCpc)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.conversions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ROAS: {totals.avgRoas.toFixed(2)}x
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spend & Conversions Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date_start" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="spend" 
                    stroke="#8884d8" 
                    name="Spend ($)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="conversions" 
                    stroke="#82ca9d" 
                    name="Conversions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CTR & CPC Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date_start" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="ctr" 
                    stroke="#ff7300" 
                    name="CTR (%)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cpc" 
                    stroke="#387908" 
                    name="CPC ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date_start" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value: any) => formatCurrency(value as number)}
                  />
                  <Bar dataKey="spend" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {metrics.length === 0 && (
        <Card>
          <CardContent className="text-center py-10">
            <h3 className="text-lg font-semibold mb-2">No metrics data available</h3>
            <p className="text-muted-foreground mb-4">
              Click "Sync Metrics" to fetch performance data from Meta.
            </p>
            <Button onClick={syncMetrics} disabled={loadingMetrics}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingMetrics ? 'animate-spin' : ''}`} />
              Sync Metrics Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}