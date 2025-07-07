'use client'

import { useEffect, useState } from 'react'
import { MetricCard } from "@/components/dashboard/MetricCard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MetaAPI, MetaAdAccount } from '@/lib/api/meta'
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
  const [metrics, setMetrics] = useState({
    totalSpend: 0,
    previousSpend: 0,
    roas: 0,
    previousRoas: 0,
    totalConversions: 0,
    previousConversions: 0,
    cpa: 0,
    previousCpa: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    reach: 0
  })

  const api = new MetaAPI()

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getAdAccounts()
      setAccounts(data)
      
      if (data.length > 0) {
        setSelectedAccount(data[0].account_id)
        await loadMetrics(data[0].account_id)
      }
    } catch (err) {
      setError('Failed to load ad accounts. Please connect your Meta account.')
    } finally {
      setLoading(false)
    }
  }

  const loadMetrics = async (accountId: string) => {
    try {
      // For now, using mock data. Will be replaced with actual metrics
      setMetrics({
        totalSpend: 125430.50,
        previousSpend: 98320.25,
        roas: 4.23,
        previousRoas: 3.85,
        totalConversions: 3421,
        previousConversions: 2890,
        cpa: 36.65,
        previousCpa: 34.02,
        impressions: 1543210,
        clicks: 45321,
        ctr: 0.0293,
        reach: 892340
      })
    } catch (err) {
      console.error('Failed to load metrics:', err)
    }
  }

  const syncData = async () => {
    if (!selectedAccount) return

    try {
      setSyncing(true)
      setError(null)
      await api.syncAccount(selectedAccount)
      await loadMetrics(selectedAccount)
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
                onChange={(e) => {
                  setSelectedAccount(e.target.value)
                  loadMetrics(e.target.value)
                }}
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.account_id}>
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
              value={metrics.totalSpend}
              previousValue={metrics.previousSpend}
              format="currency"
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              trend="up"
            />
            <MetricCard
              title="ROAS"
              value={metrics.roas}
              previousValue={metrics.previousRoas}
              format="number"
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
              trend="up"
            />
            <MetricCard
              title="Conversions"
              value={metrics.totalConversions}
              previousValue={metrics.previousConversions}
              format="number"
              icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
              trend="up"
            />
            <MetricCard
              title="Cost Per Acquisition"
              value={metrics.cpa}
              previousValue={metrics.previousCpa}
              format="currency"
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
              trend="down"
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Impressions"
              value={metrics.impressions}
              format="number"
              icon={<Eye className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Clicks"
              value={metrics.clicks}
              format="number"
              icon={<MousePointerClick className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Click-Through Rate"
              value={metrics.ctr}
              format="percentage"
              icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Reach"
              value={metrics.reach}
              format="number"
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>
                  Daily spend and ROAS trends
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Performance chart coming soon
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Campaigns</CardTitle>
                <CardDescription>
                  By conversion value
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  Campaign list coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}