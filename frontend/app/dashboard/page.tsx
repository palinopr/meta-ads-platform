'use client'

import { MetricCard } from "@/components/dashboard/MetricCard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  DollarSign, 
  Users, 
  MousePointerClick, 
  TrendingUp,
  Eye,
  Target,
  ShoppingCart,
  BarChart3
} from "lucide-react"

export default function DashboardPage() {
  // Mock data - will be replaced with API calls
  const metrics = {
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
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          {/* Date range picker will go here */}
        </div>
      </div>
      
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
            {/* Chart component will go here */}
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
            {/* Campaign list will go here */}
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              Campaign list coming soon
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}