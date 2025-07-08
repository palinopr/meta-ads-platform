'use client'

import { useMemo } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { format, subDays, parseISO } from 'date-fns'

interface ChartDataPoint {
  date: string
  spend: number
  revenue: number
  roas: number
  conversions: number
  cpc: number
  ctr: number
}

interface PerformanceChartProps {
  data?: ChartDataPoint[]
  timeframe?: '7d' | '30d' | '90d'
  metric?: 'spend' | 'roas' | 'conversions' | 'cpc'
  height?: number
}

// Generate mock daily data for the past 30 days
const generateMockData = (days: number = 30): ChartDataPoint[] => {
  const data: ChartDataPoint[] = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const baseSpend = 1200 + Math.random() * 800 // $1200-2000 daily spend
    const baseConversions = 15 + Math.random() * 10 // 15-25 conversions
    const revenue = baseConversions * (80 + Math.random() * 40) // $80-120 per conversion
    
    data.push({
      date,
      spend: Math.round(baseSpend),
      revenue: Math.round(revenue),
      roas: Number((revenue / baseSpend).toFixed(2)),
      conversions: Math.round(baseConversions),
      cpc: Number((baseSpend / (baseConversions * 5)).toFixed(2)), // Assuming 5 clicks per conversion
      ctr: Number((Math.random() * 2 + 1).toFixed(2)) // 1-3% CTR
    })
  }
  
  return data
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatPercentage = (value: number) => {
  return `${value.toFixed(2)}%`
}

const formatNumber = (value: number) => {
  return value.toLocaleString()
}

export function PerformanceChart({ 
  data, 
  timeframe = '30d', 
  metric = 'spend',
  height = 300 
}: PerformanceChartProps) {
  
  const chartData = useMemo(() => {
    if (data && data.length > 0) {
      return data
    }
    
    // Use mock data for now - in production this will be real Meta API data
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
    return generateMockData(days)
  }, [data, timeframe])

  const formatTooltipLabel = (label: string) => {
    try {
      return format(parseISO(label), 'MMM dd, yyyy')
    } catch {
      return label
    }
  }

  const getMetricConfig = () => {
    switch (metric) {
      case 'spend':
        return {
          dataKey: 'spend',
          name: 'Daily Spend',
          color: '#8884d8',
          formatter: formatCurrency
        }
      case 'roas':
        return {
          dataKey: 'roas',
          name: 'ROAS',
          color: '#82ca9d',
          formatter: (value: number) => `${value.toFixed(2)}x`
        }
      case 'conversions':
        return {
          dataKey: 'conversions',
          name: 'Conversions',
          color: '#ffc658',
          formatter: formatNumber
        }
      case 'cpc':
        return {
          dataKey: 'cpc',
          name: 'Cost Per Click',
          color: '#ff7300',
          formatter: formatCurrency
        }
      default:
        return {
          dataKey: 'spend',
          name: 'Daily Spend',
          color: '#8884d8',
          formatter: formatCurrency
        }
    }
  }

  const metricConfig = getMetricConfig()

  // For spend and revenue, use area chart for better visual impact
  if (metric === 'spend') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#666' }}
            tickFormatter={(value) => format(parseISO(value), 'MMM dd')}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#666' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip 
            labelFormatter={formatTooltipLabel}
            formatter={(value: number, name: string) => [
              name === 'spend' ? formatCurrency(value) : formatCurrency(value),
              name === 'spend' ? 'Daily Spend' : 'Revenue'
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Area
            type="monotone"
            dataKey="spend"
            stroke="#8884d8"
            fillOpacity={1}
            fill="url(#spendGradient)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#82ca9d"
            fillOpacity={1}
            fill="url(#revenueGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // For other metrics, use line chart
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="date" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#666' }}
          tickFormatter={(value) => format(parseISO(value), 'MMM dd')}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#666' }}
          tickFormatter={metricConfig.formatter}
        />
        <Tooltip 
          labelFormatter={formatTooltipLabel}
          formatter={(value: number) => [metricConfig.formatter(value), metricConfig.name]}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Line
          type="monotone"
          dataKey={metricConfig.dataKey}
          stroke={metricConfig.color}
          strokeWidth={3}
          dot={{ fill: metricConfig.color, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: metricConfig.color }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
