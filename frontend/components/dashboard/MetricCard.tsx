'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatNumber, formatPercentage, calculatePercentageChange } from "@/lib/utils"
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: number | string
  previousValue?: number
  format?: 'currency' | 'number' | 'percentage'
  icon?: React.ReactNode
  trend?: 'up' | 'down'
}

export function MetricCard({ 
  title, 
  value, 
  previousValue, 
  format = 'number',
  icon,
  trend
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

  const percentageChange = previousValue && typeof value === 'number' 
    ? calculatePercentageChange(value, previousValue)
    : null

  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue()}</div>
        {percentageChange !== null && (
          <div className={`flex items-center text-sm ${trendColor}`}>
            {percentageChange > 0 ? (
              <ArrowUpIcon className="w-4 h-4 mr-1" />
            ) : (
              <ArrowDownIcon className="w-4 h-4 mr-1" />
            )}
            <span>{Math.abs(percentageChange).toFixed(1)}%</span>
            <span className="text-gray-500 ml-1">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}