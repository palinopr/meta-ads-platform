'use client'

import { useMemo } from 'react'
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Campaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED'
  spend: number
  revenue: number
  roas: number
  conversions: number
  objective: string
  trend: 'up' | 'down' | 'flat'
  changePercent: number
}

interface TopCampaignsProps {
  campaigns: Campaign[]
  maxItems?: number
  sortBy?: 'spend' | 'roas' | 'conversions' | 'revenue'
  loading?: boolean
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const getStatusColor = (status: Campaign['status']) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'PAUSED':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getTrendIcon = (trend: Campaign['trend'], changePercent: number) => {
  if (trend === 'up') {
    return <TrendingUp className="h-3 w-3 text-green-600" />
  } else if (trend === 'down') {
    return <TrendingDown className="h-3 w-3 text-red-600" />
  }
  return <Minus className="h-3 w-3 text-gray-400" />
}

const getTrendColor = (trend: Campaign['trend']) => {
  switch (trend) {
    case 'up':
      return 'text-green-600'
    case 'down':
      return 'text-red-600'
    default:
      return 'text-gray-400'
  }
}

export function TopCampaigns({ 
  campaigns, 
  maxItems = 8, 
  sortBy = 'roas',
  loading = false
}: TopCampaignsProps) {
  
  const sortedCampaigns = useMemo(() => {
    const data = campaigns
    
    const sorted = [...data].sort((a, b) => {
      switch (sortBy) {
        case 'spend':
          return b.spend - a.spend
        case 'roas':
          return b.roas - a.roas
        case 'conversions':
          return b.conversions - a.conversions
        case 'revenue':
          return b.revenue - a.revenue
        default:
          return b.roas - a.roas
      }
    })
    
    return sorted.slice(0, maxItems)
  }, [campaigns, maxItems, sortBy])

  const maxValue = useMemo(() => {
    if (sortedCampaigns.length === 0) return 1
    
    switch (sortBy) {
      case 'spend':
        return Math.max(...sortedCampaigns.map(c => c.spend))
      case 'roas':
        return Math.max(...sortedCampaigns.map(c => c.roas))
      case 'conversions':
        return Math.max(...sortedCampaigns.map(c => c.conversions))
      case 'revenue':
        return Math.max(...sortedCampaigns.map(c => c.revenue))
      default:
        return Math.max(...sortedCampaigns.map(c => c.roas))
    }
  }, [sortedCampaigns, sortBy])

  const getProgressValue = (campaign: Campaign) => {
    let value: number
    switch (sortBy) {
      case 'spend':
        value = campaign.spend
        break
      case 'roas':
        value = campaign.roas
        break
      case 'conversions':
        value = campaign.conversions
        break
      case 'revenue':
        value = campaign.revenue
        break
      default:
        value = campaign.roas
    }
    return (value / maxValue) * 100
  }

  const getDisplayValue = (campaign: Campaign) => {
    switch (sortBy) {
      case 'spend':
        return formatCurrency(campaign.spend)
      case 'roas':
        return `${campaign.roas.toFixed(2)}x`
      case 'conversions':
        return campaign.conversions.toString()
      case 'revenue':
        return formatCurrency(campaign.revenue)
      default:
        return `${campaign.roas.toFixed(2)}x`
    }
  }

  return (
    <div className="space-y-4">
      {sortedCampaigns.map((campaign, index) => (
        <div key={campaign.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
          <div className="flex-shrink-0 w-6 text-center">
            <span className="text-sm font-semibold text-gray-400">
              {index + 1}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {campaign.name}
                </h4>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getStatusColor(campaign.status)}`}
                >
                  {campaign.status}
                </Badge>
              </div>
              
              <Link 
                href={`/campaigns/${campaign.id}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ExternalLink className="h-3 w-3 text-gray-400 hover:text-gray-600" />
              </Link>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">
                {campaign.objective.replace(/_/g, ' ')}
              </span>
              
              <div className="flex items-center space-x-1">
                {getTrendIcon(campaign.trend, campaign.changePercent)}
                <span className={`text-xs ${getTrendColor(campaign.trend)}`}>
                  {campaign.changePercent > 0 ? '+' : ''}{campaign.changePercent}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Progress 
                value={getProgressValue(campaign)} 
                className="flex-1 mr-3 h-2"
              />
              <span className="text-sm font-semibold text-gray-900 min-w-0">
                {getDisplayValue(campaign)}
              </span>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Spend: {formatCurrency(campaign.spend)}</span>
              <span>Conv: {campaign.conversions}</span>
            </div>
          </div>
        </div>
      ))}
      
      {loading && (
        <div className="text-center py-8 text-gray-500">
          <p>Loading campaigns...</p>
        </div>
      )}
      {!loading && sortedCampaigns.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No campaigns data available</p>
          <p className="text-xs mt-1">Sync your Meta account to see campaign performance</p>
        </div>
      )}
    </div>
  )
}
