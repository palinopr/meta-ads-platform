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

  // Size-specific styling
  const sizeConfig = {
    small: {
      card: 'p-4',
      header: 'pb-2',
      title: 'text-sm',
      value: 'text-xl',
      trend: 'text-xs',
      icon: 'w-4 h-4',
      skeleton: { value: 'h-6 w-20', trend: 'h-3 w-24' }
    },
    medium: {
      card: 'p-4 md:p-6',
      header: 'pb-3',
      title: 'text-sm md:text-base',
      value: 'text-2xl md:text-3xl',
      trend: 'text-sm',
      icon: 'w-5 h-5',
      skeleton: { value: 'h-8 w-24', trend: 'h-4 w-32' }
    },
    large: {
      card: 'p-6 md:p-8',
      header: 'pb-4',
      title: 'text-base md:text-lg',
      value: 'text-3xl md:text-4xl',
      trend: 'text-sm md:text-base',
      icon: 'w-6 h-6',
      skeleton: { value: 'h-10 w-32', trend: 'h-5 w-40' }
    }
  }

  const currentSizeConfig = sizeConfig[size]

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer",
      "border-0 shadow-md bg-gradient-to-br from-white to-gray-50/50",
      "dark:from-gray-900 dark:to-gray-800/50 dark:shadow-gray-900/20",
      config && percentageChange !== null && `${config.bgColor} ${config.borderColor} border`,
      currentSizeConfig.card
    )}>
      <CardHeader className={cn(
        "flex flex-row items-center justify-between space-y-0",
        currentSizeConfig.header
      )}>
        <CardTitle className={cn(
          "font-semibold text-muted-foreground tracking-tight",
          currentSizeConfig.title
        )}>
          {title}
        </CardTitle>
        <div className={cn(
          "text-muted-foreground/70 transition-colors duration-200",
          "group-hover:text-muted-foreground",
          currentSizeConfig.icon
        )}>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <>
            <Skeleton className={cn(currentSizeConfig.skeleton.value, "mb-2")} />
            <Skeleton className={currentSizeConfig.skeleton.trend} />
          </>
        ) : (
          <>
            <div className={cn(
              "font-bold text-gray-900 dark:text-gray-100 tracking-tight",
              currentSizeConfig.value
            )}>
              {formattedValue()}
            </div>
            {percentageChange !== null && config && (
              <div className={cn(
                "flex items-center gap-1 mt-2",
                currentSizeConfig.trend,
                config.textColor
              )}>
                <div className="flex items-center gap-1">
                  {TrendIcon && (
                    <TrendIcon 
                      className="w-4 h-4" 
                      aria-label={`${config.ariaLabel} of ${Math.abs(percentageChange).toFixed(1)}%`}
                    />
                  )}
                  <span className="font-semibold">
                    {percentageChange > 0 && '+'}
                    {percentageChange.toFixed(1)}%
                  </span>
                </div>
                <span className="text-muted-foreground/70 text-xs md:text-sm">
                  vs last period
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}