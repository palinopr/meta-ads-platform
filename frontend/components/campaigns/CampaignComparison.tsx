"use client"

import * as React from "react"
import { Check, Copy, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Campaign, CampaignMetrics } from "@/lib/api/meta"
import { formatCurrency, formatPercentage } from "@/lib/utils"

interface CampaignComparisonProps {
  campaigns: Campaign[]
  metrics: Record<string, CampaignMetrics[]>
  onRemoveCampaign: (campaignId: string) => void
  maxCampaigns?: number
}

interface MetricComparison {
  campaign: Campaign
  totalSpend: number
  totalClicks: number
  totalImpressions: number
  avgCtr: number
  avgCpc: number
  avgCpm: number
  avgRoas: number
  conversions: number
}

export function CampaignComparison({
  campaigns,
  metrics,
  onRemoveCampaign,
  maxCampaigns = 4
}: CampaignComparisonProps) {
  const [copied, setCopied] = React.useState<string | null>(null)

  const calculateMetrics = (campaign: Campaign): MetricComparison => {
    const campaignMetrics = metrics[campaign.campaign_id] || []
    
    if (campaignMetrics.length === 0) {
      return {
        campaign,
        totalSpend: 0,
        totalClicks: 0,
        totalImpressions: 0,
        avgCtr: 0,
        avgCpc: 0,
        avgCpm: 0,
        avgRoas: 0,
        conversions: 0
      }
    }

    const totals = campaignMetrics.reduce((acc, metric) => ({
      spend: acc.spend + metric.spend,
      clicks: acc.clicks + metric.clicks,
      impressions: acc.impressions + metric.impressions,
      conversions: acc.conversions + metric.conversions,
      ctr: acc.ctr + metric.ctr,
      cpc: acc.cpc + metric.cpc,
      cpm: acc.cpm + metric.cpm,
      roas: acc.roas + metric.roas
    }), {
      spend: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      roas: 0
    })

    const count = campaignMetrics.length

    return {
      campaign,
      totalSpend: totals.spend,
      totalClicks: totals.clicks,
      totalImpressions: totals.impressions,
      avgCtr: totals.ctr / count,
      avgCpc: totals.cpc / count,
      avgCpm: totals.cpm / count,
      avgRoas: totals.roas / count,
      conversions: totals.conversions
    }
  }

  const comparisonData = campaigns.map(calculateMetrics)
  
  // Calculate best/worst for each metric
  const getBestWorst = (metric: keyof Omit<MetricComparison, 'campaign'>) => {
    const values = comparisonData.map(data => data[metric] as number)
    const max = Math.max(...values)
    const min = Math.min(...values)
    
    // For metrics where lower is better (CPC, CPM), reverse the logic
    const lowerIsBetter = ['avgCpc', 'avgCpm'].includes(metric)
    
    return {
      best: lowerIsBetter ? min : max,
      worst: lowerIsBetter ? max : min
    }
  }

  const getPerformanceIcon = (value: number, metric: keyof Omit<MetricComparison, 'campaign'>) => {
    const { best, worst } = getBestWorst(metric)
    
    if (value === best) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (value === worst) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getProgressValue = (value: number, metric: keyof Omit<MetricComparison, 'campaign'>) => {
    const values = comparisonData.map(data => data[metric] as number)
    const max = Math.max(...values)
    const min = Math.min(...values)
    
    if (max === min) return 50 // All equal
    
    return ((value - min) / (max - min)) * 100
  }

  const copyToClipboard = async (campaignId: string, data: MetricComparison) => {
    const text = `Campaign: ${data.campaign.name}\nSpend: ${formatCurrency(data.totalSpend)}\nClicks: ${data.totalClicks.toLocaleString()}\nCTR: ${formatPercentage(data.avgCtr)}\nCPC: ${formatCurrency(data.avgCpc)}\nROAS: ${data.avgRoas.toFixed(2)}x\nConversions: ${data.conversions.toLocaleString()}`

    await navigator.clipboard.writeText(text)
    setCopied(campaignId)
    setTimeout(() => setCopied(null), 2000)
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Select campaigns to compare their performance</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Campaign Comparison</h3>
        <p className="text-sm text-muted-foreground">
          {campaigns.length} of {maxCampaigns} campaigns selected
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {comparisonData.map((data) => (
          <Card key={data.campaign.campaign_id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-medium truncate">
                    {data.campaign.name}
                  </CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={data.campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {data.campaign.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {data.campaign.objective}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(data.campaign.campaign_id, data)}
                    className="h-8 w-8 p-0"
                  >
                    {copied === data.campaign.campaign_id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveCampaign(data.campaign.campaign_id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    ×
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Total Spend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Total Spend</span>
                  {getPerformanceIcon(data.totalSpend, 'totalSpend')}
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(data.totalSpend)}
                </div>
                <Progress 
                  value={getProgressValue(data.totalSpend, 'totalSpend')} 
                  className="h-1"
                />
              </div>

              {/* ROAS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">ROAS</span>
                  {getPerformanceIcon(data.avgRoas, 'avgRoas')}
                </div>
                <div className="text-lg font-semibold">
                  {data.avgRoas.toFixed(2)}x
                </div>
                <Progress 
                  value={getProgressValue(data.avgRoas, 'avgRoas')} 
                  className="h-1"
                />
              </div>

              {/* CTR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">CTR</span>
                  {getPerformanceIcon(data.avgCtr, 'avgCtr')}
                </div>
                <div className="text-lg font-semibold">
                  {formatPercentage(data.avgCtr)}
                </div>
                <Progress 
                  value={getProgressValue(data.avgCtr, 'avgCtr')} 
                  className="h-1"
                />
              </div>

              {/* CPC */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">CPC</span>
                  {getPerformanceIcon(data.avgCpc, 'avgCpc')}
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(data.avgCpc)}
                </div>
                <Progress 
                  value={100 - getProgressValue(data.avgCpc, 'avgCpc')} 
                  className="h-1"
                />
              </div>

              {/* Conversions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Conversions</span>
                  {getPerformanceIcon(data.conversions, 'conversions')}
                </div>
                <div className="text-lg font-semibold">
                  {data.conversions.toLocaleString()}
                </div>
                <Progress 
                  value={getProgressValue(data.conversions, 'conversions')} 
                  className="h-1"
                />
              </div>

              {/* Additional metrics in smaller text */}
              <div className="pt-2 border-t space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Clicks:</span>
                  <span>{data.totalClicks.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Impressions:</span>
                  <span>{data.totalImpressions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>CPM:</span>
                  <span>{formatCurrency(data.avgCpm)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
