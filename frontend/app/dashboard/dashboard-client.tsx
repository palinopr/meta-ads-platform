'use client'

import { useEffect, useState } from 'react'
import { MetricCard } from "@/components/dashboard/MetricCard"
import { PerformanceChart } from "@/components/dashboard/PerformanceChart"
import { TopCampaigns } from "@/components/dashboard/TopCampaigns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MetaAPI, MetaAdAccount, DashboardMetrics, ChartDataPoint, TopCampaign } from '@/lib/api/meta'
import { createClient } from '@/lib/supabase/client'
import { DateRangePickerWithPresets } from "@/components/ui/date-range-picker-with-presets"
import { DateRange } from "react-day-picker"
import { subDays, formatDistanceToNow } from 'date-fns'
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
  const [chartError, setChartError] = useState<string | null>(null)
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null)
  const [campaigns, setCampaigns] = useState<TopCampaign[]>([])
  const [sparklineData, setSparklineData] = useState<any>(null)
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date()
  })
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const supabase = createClient()
  const api = new MetaAPI(supabase)

  useEffect(() => {
    loadAccounts()
  }, [])

  // Auto-refresh data every 15 minutes (900 seconds)
  useEffect(() => {
    if (!selectedAccount) return

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard data...')
      loadChartData(selectedAccount)
      loadCampaigns([selectedAccount])
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
        await loadCampaigns([data[0].account_id])
        await loadSparklineData(data[0].account_id)
      }
    } catch (err) {
      setError('Failed to load ad accounts. Please connect your Meta account.')
    } finally {
      setLoading(false)
    }
  }

  const loadMetrics = async (accountId: string, customDateRange?: DateRange) => {
    try {
      setMetricsLoading(true)
      setError(null)
      
      const rangeTouse = customDateRange || dateRange
      console.log('🔄 Loading dashboard metrics for account:', accountId)
      console.log('📅 Using date range:', rangeTouse)
      
      // Fetch real metrics from Meta API for the selected account
      const response = await api.getDashboardMetrics([accountId], rangeTouse)
      
      console.log('📊 Dashboard metrics response:', response)
      console.log('📊 Raw response data:', JSON.stringify(response, null, 2))
      
      if (response.error) {
        console.error('❌ Dashboard metrics error:', response.error)
        setError(response.error)
        setDashboardMetrics(null)
        return
      }
      
      if (response.data) {
        console.log('✅ Dashboard metrics loaded successfully:', response.data)
        setDashboardMetrics(response.data)
        setLastUpdated(new Date())
      } else {
        console.warn('⚠️ No data returned from dashboard metrics API')
        setError('No data available. This might be a new account with no campaigns yet.')
        setDashboardMetrics(null)
      }
      
    } catch (err) {
      console.error('❌ Failed to load metrics:', err)
      setError(`Failed to load campaign metrics: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setDashboardMetrics(null)
    } finally {
      setMetricsLoading(false)
    }
  }

  const loadChartData = async (accountId: string, customDateRange?: DateRange) => {
    try {
      setChartLoading(true)
      setChartError(null)
      
      const rangeToUse = customDateRange || dateRange
      console.log('📅 Loading chart data with date range:', rangeToUse)
      
      // Fetch real chart data from Meta API
      const response = await api.getChartData(accountId, rangeToUse)
      
      if (response.error) {
        setChartError(response.error)
        setChartData([])
        return
      }
      
      if (response.data) {
        setChartData(response.data)
      }
      
    } catch (err) {
      console.error('Failed to load chart data:', err)
      setChartError('Failed to load chart data. Please try again.')
      setChartData([])
    } finally {
      setChartLoading(false)
    }
  }

  const loadCampaigns = async (accountIds: string[], customDateRange?: DateRange) => {
    try {
      setCampaignsLoading(true)
      setCampaignsError(null)
      
      const rangeToUse = customDateRange || dateRange
      console.log('📅 Loading campaigns with date range:', rangeToUse)
      
      // Fetch real campaign data from Meta API
      const response = await api.getTopCampaigns(accountIds, 'roas', 6, rangeToUse, 'all')
      
      if (response.error) {
        setCampaignsError(response.error)
        setCampaigns([])
        return
      }
      
      if (response.data) {
        setCampaigns(response.data)
      }
      
    } catch (err) {
      console.error('Failed to load campaigns:', err)
      setCampaignsError('Failed to load campaigns. Please try again.')
      setCampaigns([])
    } finally {
      setCampaignsLoading(false)
    }
  }

  const loadSparklineData = async (accountId: string, customDateRange?: DateRange) => {
    try {
      const rangeToUse = customDateRange || dateRange
      console.log('🔄 Loading sparkline data for account:', accountId)
      console.log('📅 Using date range:', rangeToUse)
      
      const response = await api.getSparklineData(accountId, rangeToUse)
      
      if (response.error) {
        console.error('❌ Sparkline data error:', response.error)
        return
      }
      
      if (response.data) {
        console.log('✅ Sparkline data loaded successfully')
        setSparklineData(response.data)
      }
      
    } catch (err) {
      console.error('Failed to load sparkline data:', err)
    }
  }

  const handleDateRangeChange = async (newDateRange: DateRange | undefined) => {
    console.log('📅 Date range picker changed:', newDateRange)
    setDateRange(newDateRange)
    
    if (selectedAccount && newDateRange?.from && newDateRange?.to) {
      console.log('🔄 Date range changed, refreshing data with new range...')
      
      // Pass the new date range directly to avoid stale state issues
      await loadMetrics(selectedAccount, newDateRange)
      await loadChartData(selectedAccount, newDateRange)
      await loadCampaigns([selectedAccount], newDateRange)
      await loadSparklineData(selectedAccount, newDateRange)
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
      
      // Step 3: Refresh campaigns
      await loadCampaigns([selectedAccount])
      
      // Step 4: Refresh sparkline data
      await loadSparklineData(selectedAccount)
      
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
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {accounts.length > 0 && selectedAccount ? (
              `Viewing data for ${accounts.find(a => a.account_id === selectedAccount)?.account_name || 'Selected Account'}`
            ) : (
              'Overview of your Meta advertising performance'
            )}
          </p>
          
          {/* Sync Status Badge */}
          {lastUpdated && (
            <div className="flex items-center mt-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </div>
          )}
        </div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-3 lg:space-y-0 lg:space-x-3">
          {accounts.length > 0 && (
            <>
              {/* Date Range Picker */}
              <div className="w-full lg:w-auto">
                <DateRangePickerWithPresets
                  date={dateRange}
                  onDateChange={handleDateRangeChange}
                  placeholder="Select date range"
                  className="flex-col sm:flex-row"
                />
              </div>
              
              <select 
                className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 min-w-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedAccount || ''}
                onChange={async (e) => {
                  setSelectedAccount(e.target.value)
                  await loadMetrics(e.target.value)
                  await loadChartData(e.target.value)
                  await loadCampaigns([e.target.value])
                  await loadSparklineData(e.target.value)
                }}
              >
                {accounts.map(account => (
                  <option key={account.account_id} value={account.account_id}>
                    {account.account_name} ({account.currency})
                  </option>
                ))}
              </select>
              <Button 
                onClick={syncData} 
                disabled={syncing}
                variant="outline"
                size="lg"
                className="px-6 py-3 font-medium shadow-sm hover:shadow-md transition-all duration-200 border-gray-200 dark:border-gray-700"
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
          <AlertDescription>
            {error}
            {error.includes('Meta access token') && (
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = '/settings'}
                >
                  Connect Meta Account
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {accounts.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="text-center py-16">
            <AlertCircle className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
            <h3 className="text-2xl font-bold mb-3">No Meta Ad Accounts Found</h3>
            <p className="text-muted-foreground mb-6 text-lg max-w-md mx-auto">
              Connect your Meta account to start viewing your advertising data and unlock powerful analytics.
            </p>
            <Button 
              onClick={() => window.location.href = '/settings'}
              size="lg"
              className="px-8 py-3 text-lg"
            >
              Connect Meta Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Performance Metrics - Enhanced Desktop Layout */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Spend"
              value={dashboardMetrics?.totalSpend ?? "No Data"}
              previousValue={dashboardMetrics?.performanceChange ? 
                dashboardMetrics.totalSpend * (1 - dashboardMetrics.performanceChange.spend / 100) : 
                undefined}
              format="currency"
              icon={<DollarSign className="h-6 w-6 text-blue-500" />}
              loading={metricsLoading}
              size="large"
              className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800"
              showSparkline={true}
              sparklineData={sparklineData?.totalSpend}
            />
            <MetricCard
              title="ROAS"
              value={dashboardMetrics?.averageRoas ?? "No Data"}
              previousValue={dashboardMetrics?.performanceChange ? 
                dashboardMetrics.averageRoas * (1 - dashboardMetrics.performanceChange.roas / 100) : 
                undefined}
              format="number"
              icon={<TrendingUp className="h-6 w-6 text-green-500" />}
              loading={metricsLoading}
              size="large"
              className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800"
              showSparkline={true}
              sparklineData={sparklineData?.averageRoas}
            />
            <MetricCard
              title="Conversions"
              value={dashboardMetrics?.totalConversions ?? "No Data"}
              previousValue={dashboardMetrics?.performanceChange ? 
                dashboardMetrics.totalConversions * (1 - dashboardMetrics.performanceChange.conversions / 100) : 
                undefined}
              format="number"
              icon={<ShoppingCart className="h-6 w-6 text-purple-500" />}
              loading={metricsLoading}
              size="large"
              className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800"
              showSparkline={true}
              sparklineData={sparklineData?.totalConversions}
            />
            <MetricCard
              title="Cost Per Click"
              value={dashboardMetrics?.averageCPC ?? "No Data"}
              previousValue={dashboardMetrics?.performanceChange ? 
                dashboardMetrics.averageCPC * (1 - dashboardMetrics.performanceChange.cpc / 100) : 
                undefined}
              format="currency"
              icon={<Target className="h-6 w-6 text-orange-500" />}
              invertTrend={true}
              loading={metricsLoading}
              size="large"
              className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800"
              showSparkline={true}
              sparklineData={sparklineData?.averageCPC}
            />
          </div>

          {/* Secondary Metrics - Improved Layout */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Impressions"
              value={dashboardMetrics?.totalImpressions ?? "No Data"}
              previousValue={undefined}
              format="number"
              icon={<Eye className="h-5 w-5 text-muted-foreground" />}
              loading={metricsLoading}
              size="medium"
              className="hover:shadow-lg transition-all duration-200"
            />
            <MetricCard
              title="Clicks"
              value={dashboardMetrics?.totalClicks ?? "No Data"}
              previousValue={undefined}
              format="number"
              icon={<MousePointerClick className="h-5 w-5 text-muted-foreground" />}
              loading={metricsLoading}
              size="medium"
              className="hover:shadow-lg transition-all duration-200"
            />
            <MetricCard
              title="Click-Through Rate"
              value={dashboardMetrics?.averageCTR ?? "No Data"}
              previousValue={undefined}
              format="percentage"
              icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
              loading={metricsLoading}
              size="medium"
              className="hover:shadow-lg transition-all duration-200"
            />
            <MetricCard
              title="Active Campaigns"
              value={dashboardMetrics?.activeCampaigns ?? "No Data"}
              previousValue={undefined}
              format="number"
              icon={<Users className="h-5 w-5 text-muted-foreground" />}
              loading={metricsLoading}
              size="medium"
              className="hover:shadow-lg transition-all duration-200"
            />
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 lg:grid-cols-7">
            <Card className="col-span-full lg:col-span-4 hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Performance Overview</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Daily spend and ROAS trends over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] lg:h-[400px]">
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
                    height={300}
                  />
                )}
              </CardContent>
            </Card>
            
            <Card className="col-span-full lg:col-span-3 hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Top Campaigns</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Ranked by ROAS performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TopCampaigns 
                  campaigns={campaigns}
                  maxItems={6}
                  sortBy="roas"
                  loading={campaignsLoading}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
