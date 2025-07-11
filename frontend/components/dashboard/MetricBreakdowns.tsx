'use client'

import React, { useState } from 'react'
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  PieChart as PieChartIcon, 
  BarChart3, 
  Users, 
  Smartphone, 
  Monitor, 
  Tablet,
  MapPin,
  Clock,
  Target
} from "lucide-react"

interface BreakdownData {
  demographics: {
    age: { range: string; spend: number; roas: number; percentage: number }[]
    gender: { type: string; spend: number; roas: number; percentage: number }[]
  }
  devices: {
    type: string
    spend: number
    clicks: number
    impressions: number
    roas: number
    percentage: number
  }[]
  placements: {
    name: string
    spend: number
    ctr: number
    cpc: number
    percentage: number
  }[]
  geography: {
    country: string
    spend: number
    roas: number
    clicks: number
    percentage: number
  }[]
  timeOfDay: {
    hour: string
    spend: number
    clicks: number
    roas: number
  }[]
}

interface MetricBreakdownsProps {
  data: BreakdownData
  loading?: boolean
}

export function MetricBreakdowns({ 
  data,
  loading = false
}: MetricBreakdownsProps) {
  const [activeTab, setActiveTab] = useState('demographics')

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />
      case 'desktop':
        return <Monitor className="h-4 w-4" />
      case 'tablet':
        return <Tablet className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metric Breakdowns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading breakdown data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Metric Breakdowns
        </CardTitle>
        <CardDescription>
          Detailed performance analysis across demographics, devices, and placements
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="placements">Placements</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="demographics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Age Demographics */}
              <div>
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Age Distribution
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.demographics.age}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="percentage"
                      label={({ range, percentage }) => `${range}: ${percentage}%`}
                    >
                      {data.demographics.age.map((entry, index) => (
                        <Cell key={`age-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Gender Demographics */}
              <div>
                <h4 className="text-sm font-medium mb-4">Gender Distribution</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.demographics.gender}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'spend' ? formatCurrency(value as number) : `${(value as number).toFixed(1)}x`,
                        name === 'spend' ? 'Spend' : 'ROAS'
                      ]}
                    />
                    <Bar dataKey="spend" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <div className="grid gap-4">
              {data.devices.map((device, index) => (
                <div key={device.type} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(device.type)}
                    <div>
                      <p className="font-medium">{device.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {device.clicks.toLocaleString()} clicks • {device.percentage}% of spend
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(device.spend)}</p>
                    <p className="text-sm text-muted-foreground">
                      {device.roas.toFixed(1)}x ROAS
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="placements" className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.placements}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="spend" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="geography" className="space-y-4">
            <div className="grid gap-4">
              {data.geography.map((country, index) => (
                <div key={country.country} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4" />
                    <div>
                      <p className="font-medium">{country.country}</p>
                      <p className="text-sm text-muted-foreground">
                        {country.clicks.toLocaleString()} clicks • {country.percentage}% of spend
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(country.spend)}</p>
                    <Badge variant="outline">
                      {country.roas.toFixed(1)}x ROAS
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timing" className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Performance by Time of Day
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.timeOfDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'spend' ? formatCurrency(value as number) : 
                      name === 'clicks' ? (value as number).toLocaleString() :
                      `${(value as number).toFixed(1)}x`,
                      name === 'spend' ? 'Spend' : 
                      name === 'clicks' ? 'Clicks' : 'ROAS'
                    ]}
                  />
                  <Bar dataKey="spend" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
