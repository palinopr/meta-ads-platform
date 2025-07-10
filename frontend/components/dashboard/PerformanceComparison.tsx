'use client'

import React, { useState } from 'react'
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, BarChart3, Target, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface ComparisonData {
  date: string
  current: {
    spend: number
    roas: number
    clicks: number
    impressions: number
    ctr: number
  }
  previous: {
    spend: number
    roas: number
    clicks: number
    impressions: number
    ctr: number
  }
}

interface PerformanceComparisonProps {
  data?: ComparisonData[]
  loading?: boolean
  comparisonType?: 'period' | 'campaign' | 'account'
}

export function PerformanceComparison({ 
  data = [], 
  loading = false,
  comparisonType = 'period'
}: PerformanceComparisonProps) {
  const [metric, setMetric] = useState<'spend' | 'roas' | 'clicks' | 'impressions' | 'ctr'>('spend')
  const [viewType, setViewType] = useState<'chart' | 'table'>('chart')

  // Mock comparison data
  const mockData: ComparisonData[] = [
    {
      date: '2025-01-01',
      current: { spend: 1200, roas: 3.2, clicks: 450, impressions: 15000, ctr: 3.0 },
      previous: { spend: 1100, roas: 2.8, clicks: 420, impressions: 14500, ctr: 2.9 }
    },
    {
      date: '2025-01-02',
      current: { spend: 1350, roas: 3.5, clicks: 520, impressions: 17200, ctr: 3.02 },
      previous: { spend: 1250, roas: 3.1, clicks: 480, impressions: 16000, ctr: 3.0 }
    },
    {
      date: '2025-01-03',
      current: { spend: 1100, roas: 2.9, clicks: 380, impressions: 13500, ctr: 2.81 },
      previous: { spend: 1200, roas: 3.0, clicks: 400, impressions: 14000, ctr: 2.86 }
    },
    {
      date: '2025-01-04',
      current: { spend: 1450, roas: 3.8, clicks: 580, impressions: 19000, ctr: 3.05 },
      previous: { spend: 1300, roas: 3.3, clicks: 520, impressions: 17500, ctr: 2.97 }
    },
    {
      date: '2025-01-05',
      current: { spend: 1300, roas: 3.4, clicks: 490, impressions: 16800, ctr: 2.92 },
      previous: { spend: 1250, roas: 3.2, clicks: 470, impressions: 16200, ctr: 2.90 }
    }
  ]

  const comparisonData = data.length > 0 ? data : mockData

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const formatValue = (value: number) => {
    switch (metric) {
      case 'spend':
        return `£${value.toLocaleString()}`
      case 'roas':
        return `${value.toFixed(1)}x`
      case 'ctr':
        return `${value.toFixed(2)}%`
      case 'clicks':
      case 'impressions':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  const getComparisonLabel = () => {
    switch (comparisonType) {
      case 'period':
        return 'Previous Period'
      case 'campaign':
        return 'Other Campaigns'
      case 'account':
        return 'Other Accounts'
      default:
        return 'Comparison'
    }
  }

  // Calculate overall performance changes
  const calculateOverallChange = () => {
    const totalCurrent = comparisonData.reduce((sum, item) => sum + item.current[metric], 0)
    const totalPrevious = comparisonData.reduce((sum, item) => sum + item.previous[metric], 0)
    return calculateChange(totalCurrent, totalPrevious)
  }

  const overallChange = calculateOverallChange()

  const renderChart = () => {
    if (loading) {
      return (
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-muted-foreground">Loading comparison data...</div>
        </div>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={comparisonData}>
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
            formatter={(value: number, name: string) => [
              formatValue(value), 
              name === 'current' ? 'Current Period' : getComparisonLabel()
            ]}
          />
          <Legend />
          <Bar 
            dataKey={`previous.${metric}`}
            name="previous"
            fill="#94a3b8" 
            fillOpacity={0.6}
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey={`current.${metric}`}
            name="current"
            fill="#3b82f6" 
            radius={[2, 2, 0, 0]}
          />
          <Line 
            type="monotone" 
            dataKey={`current.${metric}`}
            stroke="#1d4ed8"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Performance Comparison
            </CardTitle>
            <CardDescription>
              Compare current performance against {getComparisonLabel().toLowerCase()}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={overallChange >= 0 ? "default" : "destructive"}
              className="flex items-center gap-1"
            >
              {overallChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(overallChange).toFixed(1)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={metric} onValueChange={(value) => setMetric(value as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spend">Ad Spend</SelectItem>
                <SelectItem value="roas">ROAS</SelectItem>
                <SelectItem value="clicks">Clicks</SelectItem>
                <SelectItem value="impressions">Impressions</SelectItem>
                <SelectItem value="ctr">CTR</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border rounded-md">
              <Button
                variant={viewType === 'chart' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('chart')}
                className="rounded-r-none"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewType === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('table')}
                className="rounded-l-none"
              >
                Table
              </Button>
            </div>
          </div>

          {/* Chart or Table View */}
          {viewType === 'chart' ? (
            renderChart()
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-right p-2">Current</th>
                      <th className="text-right p-2">{getComparisonLabel()}</th>
                      <th className="text-right p-2">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((item, index) => {
                      const change = calculateChange(item.current[metric], item.previous[metric])
                      return (
                        <tr key={index} className="border-b">
                          <td className="p-2">
                            {new Date(item.date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="text-right p-2 font-medium">
                            {formatValue(item.current[metric])}
                          </td>
                          <td className="text-right p-2 text-muted-foreground">
                            {formatValue(item.previous[metric])}
                          </td>
                          <td className="text-right p-2">
                            <Badge 
                              variant={change >= 0 ? "default" : "destructive"}
                              className="flex items-center gap-1 w-fit ml-auto"
                            >
                              {change >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {Math.abs(change).toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
