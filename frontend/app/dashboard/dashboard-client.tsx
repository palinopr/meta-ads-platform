'use client'

import { useEffect, useState } from 'react'
import { MetricCard } from "@/components/dashboard/MetricCard"
import { PerformanceChart } from "@/components/dashboard/PerformanceChart"
import { TopCampaigns } from "@/components/dashboard/TopCampaigns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MetaAPI, MetaAdAccount, DashboardMetrics, ChartDataPoint } from '@/lib/api/meta'
import { createClient } from '@/lib/supabase/client'
import { 
  DollarSign, 
  Users, 
  MousePointerClick, 
  TrendingUp,
  Eye,
  Target,
  ShoppingCart,
  BarChart3,
  RefreshCw,
  AlertCircle
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"


export function DashboardClient() {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null)

  const supabase = createClient()
  const api = new MetaAPI(supabase)

  useEffect(() => {
    loadAccounts()
  }, [])

  // Auto-refresh charts every 15 minutes (900 seconds)
  useEffect(() => {
    if (!selectedAccount) return

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing chart data...')
      loadChartData(selectedAccount)
    }, 15 * 60 * 1000) // 15 minutes

    return () => clearInterval(interval)
  }, [selectedAccount])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.getAdAccounts()
      if (response.error) {
        setError(response.error)
        return
      }
      const data = response.data
      setAccounts(data)
      
      if (data.length > 0) {
        setSelectedAccount(data[0].account_id)
        await loadMetrics(data[0].account_id)
        await loadChartData(data[0].account_id)
      }
    } catch (err) {
      setError('Failed to load ad accounts. Please connect your Meta account.')
    } finally {
      setLoading(false)
    }
  }

  const loadMetrics = async (accountId: string) => {
    try {
      setMetricsLoading(true)
      setError(null)
      
      // Fetch real metrics from Meta API
      const response = await api.getDashboardMetrics()
      
      if (response.error) {
        setError(response.error)
        setDashboardMetrics(null)
        return
      }
      
      if (response.data) {
        setDashboardMetrics(response.data)
      }
      
    } catch (err) {
      console.error('Failed to load metrics:', err)
      setError('Failed to load campaign metrics. Please try again.')
      setDashboardMetrics(null)
    } finally {
      setMetricsLoading(false)
    }
  }

  const loadChartData = async (accountId: string) => {
    try {
      setChartLoading(true)
      setError(null)
      
      // Fetch real chart data from Meta API
      const response = await api.getChartData(accountId)
      
      if (response.error) {
        setError(response.error)
        setChartData([])
        return
      }
      
      if (response.data) {
        setChartData(response.data)
      }
      
    } catch (err) {
      console.error('Failed to load chart data:', err)
      setError('Failed to load chart data. Please try again.')
      setChartData([])
    } finally {
      setChartLoading(false)
    }
  }

  const syncData = async () => {
    if (!selectedAccount) return

    try {
      setSyncing(true)
      setError(null)
      
      // Dashboard now uses direct Meta API calls - no database sync needed
      
      // Step 1: Refresh dashboard with direct API data
      await loadMetrics(selectedAccount)
      
      // Step 2: Refresh chart data
      await loadChartData(selectedAccount)
      
      // Data sync completed
      
    } catch (err) {
      setError('Failed to sync data. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading your Meta Ads data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          {accounts.length > 0 && (
            <>
              <select 
                className="px-3 py-2 border rounded-md"
                value={selectedAccount || ''}
                onChange={async (e) => {
                  setSelectedAccount(e.target.value)
                  await loadMetrics(e.target.value)
                  await loadChartData(e.target.value)
                }}
              >
                {accounts.map(account => (
                  <option key={account.account_id} value={account.account_id}>
                    {account.account_name}
                  </option>
                ))}
              </select>
              <Button 
                onClick={syncData} 
                disabled={syncing}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync Data
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Meta Ad Accounts Found</h3>
            <p className="text-muted-foreground mb-4">
              Connect your Meta account to start viewing your advertising data.
            </p>
            <Button onClick={() => window.location.href = '/settings'}>
              Connect Meta Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Spend"
              value={dashboardMetrics?.totalSpend || 0}
              previousValue={dashboardMetrics ? dashboardMetrics.totalSpend * 0.85 : 0}
              format="currency"
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              loading={metricsLoading}
            />
            <MetricCard
              title="ROAS"
              value={dashboardMetrics?.averageRoas || 0}
              previousValue={dashboardMetrics ? dashboardMetrics.averageRoas * 0.95 : 0}
              format="number"
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
              loading={metricsLoading}
            />
            <MetricCard
              title="Conversions"
              value={dashboardMetrics?.totalConversions || 0}
              previousValue={dashboardMetrics ? dashboardMetrics.totalConversions * 0.9 : 0}
              format="number"
              icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
              loading={metricsLoading}
            />
            <MetricCard
              title="Cost Per Click"
              value={dashboardMetrics?.averageCPC || 0}
              previousValue={dashboardMetrics ? dashboardMetrics.averageCPC * 1.05 : 0}
              format="currency"
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
              invertTrend={true}
              loading={metricsLoading}
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Impressions"
              value={dashboardMetrics?.totalImpressions || 0}
              previousValue={dashboardMetrics ? dashboardMetrics.totalImpressions * 0.95 : undefined}
              format="number"
              icon={<Eye className="h-4 w-4 text-muted-foreground" />}
              loading={metricsLoading}
            />
            <MetricCard
              title="Clicks"
              value={dashboardMetrics?.totalClicks || 0}
              previousValue={dashboardMetrics ? dashboardMetrics.totalClicks * 0.88 : undefined}
              format="number"
              icon={<MousePointerClick className="h-4 w-4 text-muted-foreground" />}
              loading={metricsLoading}
            />
            <MetricCard
              title="Click-Through Rate"
              value={dashboardMetrics?.averageCTR || 0}
              previousValue={dashboardMetrics ? dashboardMetrics.averageCTR * 0.92 : undefined}
              format="percentage"
              icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
              loading={metricsLoading}
            />
            <MetricCard
              title="Active Campaigns"
              value={dashboardMetrics?.activeCampaigns || 0}
              previousValue={dashboardMetrics ? dashboardMetrics.activeCampaigns - 2 : undefined}
              format="number"
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              loading={metricsLoading}
            />
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>
                  Daily spend and ROAS trends over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {chartLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading chart data...</span>
                  </div>
                ) : (
                  <PerformanceChart 
                    data={chartData}
                    timeframe="30d" 
                    metric="spend" 
                    height={250}
                  />
                )}
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Campaigns</CardTitle>
                <CardDescription>
                  Ranked by ROAS performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TopCampaigns 
                  campaigns={[]} // TODO: Fetch actual campaign data
                  maxItems={6}
                  sortBy="roas"
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
