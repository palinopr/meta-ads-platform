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
import { DateRangePickerWithPresets } from "@/components/ui/date-range-picker-with-presets"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"

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
  data: ChartData[]
  loading?: boolean
  onDateRangeChange?: (startDate: Date, endDate: Date) => void
}

export function InteractiveChart({ 
  data, 
  loading = false, 
  onDateRangeChange 
}: InteractiveChartProps) {
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line')
  const [metric, setMetric] = useState<'spend' | 'roas' | 'clicks' | 'impressions'>('spend')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 29)),
    to: new Date()
  })

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range?.to) {
      onDateRangeChange?.(range.from, range.to)
    }
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

    if (!data || data.length === 0) {
      return (
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-muted-foreground">No data available</div>
        </div>
      )
    }

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
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
            <BarChart data={data}>
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
            <LineChart data={data}>
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
          
          <div className="flex flex-col lg:flex-row gap-2">
            <DateRangePickerWithPresets
              date={dateRange}
              onDateChange={handleDateRangeChange}
            />
            
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
