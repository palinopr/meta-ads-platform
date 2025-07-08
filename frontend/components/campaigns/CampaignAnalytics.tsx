"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { BarChart, LineChart, Download, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MetaAPI, Campaign, CampaignMetrics } from "@/lib/api/meta"
import { createClient } from "@/lib/supabase/client"
import { CampaignFilters, CampaignFilterOptions } from "./CampaignFilters"
import { CampaignComparison } from "./CampaignComparison"
import { PerformanceChart } from "@/components/dashboard/PerformanceChart"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { exportToCsv, exportToPdf } from "@/lib/utils/export"

interface CampaignAnalyticsProps {
  accountId: string
}

export function CampaignAnalytics({ accountId }: CampaignAnalyticsProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set())
  const [campaignMetrics, setCampaignMetrics] = useState<Record<string, CampaignMetrics[]>>({})
  const [filters, setFilters] = useState<CampaignFilterOptions>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const supabase = createClient()
  const metaApi = new MetaAPI(supabase)

  // Load campaigns
  const loadCampaigns = async () => {
    try {
      setLoading(true)
      const response = await metaApi.getCampaigns(accountId)
      if (response.error) {
        console.error('Error loading campaigns:', response.error)
        return
      }
      setCampaigns(response.data)
      setFilteredCampaigns(response.data)
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load metrics for campaigns
  const loadCampaignMetrics = async (campaignIds: string[]) => {
    try {
      const metrics: Record<string, CampaignMetrics[]> = {}
      
      for (const campaignId of campaignIds) {
        try {
          const response = await metaApi.getCampaignMetrics(
            campaignId,
            filters.startDate,
            filters.endDate
          )
          if (response.error) {
            console.error(`Error loading metrics for campaign ${campaignId}:`, response.error)
            metrics[campaignId] = []
          } else {
            metrics[campaignId] = response.data
          }
        } catch (error) {
          console.error(`Error loading metrics for campaign ${campaignId}:`, error)
          metrics[campaignId] = []
        }
      }
      
      setCampaignMetrics(prev => ({ ...prev, ...metrics }))
    } catch (error) {
      console.error('Error loading campaign metrics:', error)
    }
  }

  // Apply filters
  const applyFilters = (campaigns: Campaign[], filters: CampaignFilterOptions): Campaign[] => {
    return campaigns.filter(campaign => {
      // Search filter
      if (filters.search && !campaign.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }

      // Status filter
      if (filters.status && campaign.status !== filters.status) {
        return false
      }

      // Objective filter
      if (filters.objective && campaign.objective !== filters.objective) {
        return false
      }

      // Budget filters
      if (filters.budgetMin !== undefined) {
        const budget = campaign.daily_budget || campaign.lifetime_budget || 0
        if (budget < filters.budgetMin) return false
      }

      if (filters.budgetMax !== undefined) {
        const budget = campaign.daily_budget || campaign.lifetime_budget || 0
        if (budget > filters.budgetMax) return false
      }

      return true
    })
  }

  // Handle filter changes
  const handleFiltersChange = (newFilters: CampaignFilterOptions) => {
    setFilters(newFilters)
    const filtered = applyFilters(campaigns, newFilters)
    setFilteredCampaigns(filtered)

    // Reload metrics if date range changed
    if (newFilters.startDate !== filters.startDate || newFilters.endDate !== filters.endDate) {
      const campaignIds = Array.from(selectedCampaigns)
      if (campaignIds.length > 0) {
        loadCampaignMetrics(campaignIds)
      }
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
    setFilteredCampaigns(campaigns)
  }

  // Toggle campaign selection
  const toggleCampaignSelection = (campaignId: string) => {
    const newSelected = new Set(selectedCampaigns)
    
    if (newSelected.has(campaignId)) {
      newSelected.delete(campaignId)
    } else {
      if (newSelected.size >= 4) {
        alert("You can compare up to 4 campaigns at once.")
        return
      }
      newSelected.add(campaignId)
    }
    
    setSelectedCampaigns(newSelected)

    // Load metrics for newly selected campaigns
    if (newSelected.has(campaignId) && !campaignMetrics[campaignId]) {
      loadCampaignMetrics([campaignId])
    }
  }

  // Remove campaign from comparison
  const removeCampaignFromComparison = (campaignId: string) => {
    const newSelected = new Set(selectedCampaigns)
    newSelected.delete(campaignId)
    setSelectedCampaigns(newSelected)
  }

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true)
    await loadCampaigns()
    
    // Reload metrics for selected campaigns
    const campaignIds = Array.from(selectedCampaigns)
    if (campaignIds.length > 0) {
      await loadCampaignMetrics(campaignIds)
    }
    
    setRefreshing(false)
  }

  // Export functions
  const exportData = async (format: 'csv' | 'pdf') => {
    try {
      const selectedCampaignData = filteredCampaigns.filter(c => 
        selectedCampaigns.has(c.campaign_id)
      )

      if (format === 'csv') {
        await exportToCsv(selectedCampaignData, campaignMetrics)
      } else {
        await exportToPdf(selectedCampaignData, campaignMetrics)
      }

      alert(`Data exported to ${format.toUpperCase()} format.`)
    } catch (error) {
      alert("Failed to export data. Please try again.")
    }
  }

  // Load data on mount
  useEffect(() => {
    if (accountId) {
      loadCampaigns()
    }
  }, [accountId])

  // Calculate overview metrics
  const overviewMetrics = React.useMemo(() => {
    const selectedCampaignData = campaigns.filter(c => selectedCampaigns.has(c.campaign_id))
    const allMetrics = Object.values(campaignMetrics).flat()
    
    return {
      totalCampaigns: selectedCampaignData.length,
      totalSpend: allMetrics.reduce((sum, m) => sum + m.spend, 0),
      totalClicks: allMetrics.reduce((sum, m) => sum + m.clicks, 0),
      totalImpressions: allMetrics.reduce((sum, m) => sum + m.impressions, 0),
      avgRoas: allMetrics.length > 0 ? allMetrics.reduce((sum, m) => sum + m.roas, 0) / allMetrics.length : 0,
      totalConversions: allMetrics.reduce((sum, m) => sum + m.conversions, 0)
    }
  }, [campaigns, selectedCampaigns, campaignMetrics])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <p>Loading campaigns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campaign Analytics</h2>
          <p className="text-muted-foreground">
            Analyze and compare campaign performance across multiple metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {selectedCampaigns.size > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => exportData('csv')}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => exportData('pdf')}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <CampaignFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={clearFilters}
        isLoading={refreshing}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="comparison" disabled={selectedCampaigns.size === 0}>
            Comparison {selectedCampaigns.size > 0 && `(${selectedCampaigns.size})`}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{overviewMetrics.totalCampaigns}</div>
                <p className="text-xs text-muted-foreground">Selected Campaigns</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">${overviewMetrics.totalSpend.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Spend</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{overviewMetrics.totalClicks.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Clicks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{overviewMetrics.totalImpressions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Impressions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{overviewMetrics.avgRoas.toFixed(2)}x</div>
                <p className="text-xs text-muted-foreground">Avg ROAS</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{overviewMetrics.totalConversions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Conversions</p>
              </CardContent>
            </Card>
          </div>

          {selectedCampaigns.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceChart 
                  data={Object.values(campaignMetrics).flat().map(metric => ({
                    ...metric,
                    revenue: metric.spend * metric.roas // Calculate revenue from spend and ROAS
                  }))} 
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredCampaigns.length} campaigns found
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedCampaigns.size} selected for comparison
            </p>
          </div>

          <div className="space-y-2">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign.campaign_id} className="cursor-pointer hover:bg-accent/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={selectedCampaigns.has(campaign.campaign_id)}
                      onCheckedChange={() => toggleCampaignSelection(campaign.campaign_id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{campaign.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {campaign.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {campaign.objective}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                        <span>
                          Budget: ${(campaign.daily_budget || campaign.lifetime_budget || 0).toLocaleString()}
                          {campaign.daily_budget ? '/day' : '/lifetime'}
                        </span>
                        <span>ID: {campaign.campaign_id}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison">
          <CampaignComparison
            campaigns={campaigns.filter(c => selectedCampaigns.has(c.campaign_id))}
            metrics={campaignMetrics}
            onRemoveCampaign={removeCampaignFromComparison}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
