'use client'

import React, { useState } from 'react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, TrendingUp, BarChart3, LineChart as LineChartIcon } from "lucide-react"

interface ChartData {
  date: string
  spend: number
  clicks: number
  impressions: number
  roas: number
  ctr: number
  cpc: number
}

interface InteractiveChartProps {
  data?: ChartData[]
  loading?: boolean
  onDateRangeChange?: (range: string) => void
}

export function InteractiveChart({ 
  data = [], 
  loading = false, 
  onDateRangeChange 
}: InteractiveChartProps) {
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line')
  const [metric, setMetric] = useState<'spend' | 'roas' | 'clicks' | 'impressions'>('spend')
  const [dateRange, setDateRange] = useState('30')

  // Mock data if no data provided
  const mockData: ChartData[] = [
    { date: '2025-01-01', spend: 1200, clicks: 450, impressions: 15000, roas: 3.2, ctr: 3.0, cpc: 2.67 },
    { date: '2025-01-02', spend: 1350, clicks: 520, impressions: 17200, roas: 3.5, ctr: 3.02, cpc: 2.60 },
    { date: '2025-01-03', spend: 1100, clicks: 380, impressions: 13500, roas: 2.9, ctr: 2.81, cpc: 2.89 },
    { date: '2025-01-04', spend: 1450, clicks: 580, impressions: 19000, roas: 3.8, ctr: 3.05, cpc: 2.50 },
    { date: '2025-01-05', spend: 1300, clicks: 490, impressions: 16800, roas: 3.4, ctr: 2.92, cpc: 2.65 },
    { date: '2025-01-06', spend: 1250, clicks: 465, impressions: 15800, roas: 3.3, ctr: 2.94, cpc: 2.69 },
    { date: '2025-01-07', spend: 1400, clicks: 545, impressions: 18500, roas: 3.6, ctr: 2.95, cpc: 2.57 }
  ]

  const chartData = data.length > 0 ? data : mockData

  const handleDateRangeChange = (range: string) => {
    setDateRange(range)
    onDateRangeChange?.(range)
  }

  const formatValue = (value: number) => {
    switch (metric) {
      case 'spend':
        return `£${value.toLocaleString()}`
      case 'roas':
        return `${value.toFixed(1)}x`
      case 'clicks':
      case 'impressions':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  const getMetricColor = () => {
    switch (metric) {
      case 'spend':
        return '#8b5cf6' // purple
      case 'roas':
        return '#10b981' // green
      case 'clicks':
        return '#f59e0b' // yellow
      case 'impressions':
        return '#3b82f6' // blue
      default:
        return '#8b5cf6'
    }
  }

  const renderChart = () => {
    const color = getMetricColor()
    
    if (loading) {
      return (
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-muted-foreground">Loading chart data...</div>
        </div>
      )
    }

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatValue(value)}
              />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB')}
                formatter={(value: number) => [formatValue(value), metric.toUpperCase()]}
              />
              <Area 
                type="monotone" 
                dataKey={metric} 
                stroke={color}
                fill={color}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        )
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatValue(value)}
              />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB')}
                formatter={(value: number) => [formatValue(value), metric.toUpperCase()]}
              />
              <Bar 
                dataKey={metric} 
                fill={color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )
      
      default: // line
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatValue(value)}
              />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB')}
                formatter={(value: number) => [formatValue(value), metric.toUpperCase()]}
              />
              <Line 
                type="monotone" 
                dataKey={metric} 
                stroke={color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Trends
            </CardTitle>
            <CardDescription>
              Interactive charts showing key performance metrics over time
            </CardDescription>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={metric} onValueChange={(value) => setMetric(value as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spend">Ad Spend</SelectItem>
                <SelectItem value="roas">ROAS</SelectItem>
                <SelectItem value="clicks">Clicks</SelectItem>
                <SelectItem value="impressions">Impressions</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border rounded-md">
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className="rounded-r-none"
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'area' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('area')}
                className="rounded-none border-x"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="rounded-l-none"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  )
}
