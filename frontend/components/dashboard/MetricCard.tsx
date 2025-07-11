'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatNumber, formatPercentage, calculatePercentageChange, cn } from "@/lib/utils"
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface MetricCardProps {
  title: string
  value: number | string
  previousValue?: number
  format?: 'currency' | 'number' | 'percentage'
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
  invertTrend?: boolean // For metrics where down is good (e.g., CPC, CPA)
}

export function MetricCard({ 
  title, 
  value, 
  previousValue, 
  format = 'number',
  icon,
  trend,
  loading = false,
  invertTrend = false
}: MetricCardProps) {
  const formattedValue = () => {
    if (typeof value === 'string') return value
    
    switch (format) {
      case 'currency':
        return formatCurrency(value)
      case 'percentage':
        return formatPercentage(value)
      default:
        return formatNumber(value)
    }
  }

  const percentageChange = previousValue !== undefined && typeof value === 'number' 
    ? calculatePercentageChange(value, previousValue)
    : null

  // Determine if the change is positive or negative for the business
  const isPositiveChange = () => {
    if (percentageChange === null) return null
    if (invertTrend) {
      // For metrics like CPC, CPA where lower is better
      return percentageChange < 0
    }
    // For metrics like ROAS, Revenue where higher is better
    return percentageChange > 0
  }

  // Get the appropriate trend based on the change
  const getTrend = () => {
    if (trend) return trend
    if (percentageChange === null) return undefined
    if (percentageChange === 0) return 'neutral'
    return isPositiveChange() ? 'up' : 'down'
  }

  const currentTrend = getTrend()

  // Style configuration for different states
  const trendConfig = {
    up: {
      icon: ArrowUpIcon,
      textColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800/50',
      ariaLabel: 'increase'
    },
    down: {
      icon: ArrowDownIcon,
      textColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-200 dark:border-red-800/50',
      ariaLabel: 'decrease'
    },
    neutral: {
      icon: MinusIcon,
      textColor: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-950/30',
      borderColor: 'border-gray-200 dark:border-gray-800/50',
      ariaLabel: 'no change'
    }
  }

  const config = currentTrend ? trendConfig[currentTrend] : null
  const TrendIcon = config?.icon

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      config && percentageChange !== null && `${config.bgColor} ${config.borderColor} border`
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{formattedValue()}</div>
            {percentageChange !== null && config && (
              <div className={cn(
                "flex items-center gap-1 text-sm mt-1",
                config.textColor
              )}>
                <div className="flex items-center">
                  {TrendIcon && (
                    <TrendIcon 
                      className="w-4 h-4" 
                      aria-label={`${config.ariaLabel} of ${Math.abs(percentageChange).toFixed(1)}%`}
                    />
                  )}
                  <span className="font-medium">
                    {percentageChange > 0 && '+'}
                    {percentageChange.toFixed(1)}%
                  </span>
                </div>
                <span className="text-muted-foreground">vs last period</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}