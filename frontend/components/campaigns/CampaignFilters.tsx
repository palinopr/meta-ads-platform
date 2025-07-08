"use client"

import * as React from "react"
import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker, QuickDateRanges } from "@/components/ui/date-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface CampaignFilterOptions {
  search?: string
  status?: string
  objective?: string
  budgetMin?: number
  budgetMax?: number
  startDate?: Date
  endDate?: Date
  spendMin?: number
  spendMax?: number
  roasMin?: number
  roasMax?: number
}

interface CampaignFiltersProps {
  filters: CampaignFilterOptions
  onFiltersChange: (filters: CampaignFilterOptions) => void
  onClearFilters: () => void
  isLoading?: boolean
}

const CAMPAIGN_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "DELETED", label: "Deleted" },
]

const CAMPAIGN_OBJECTIVES = [
  { value: "OUTCOME_TRAFFIC", label: "Traffic" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement" },
  { value: "OUTCOME_LEADS", label: "Leads" },
  { value: "OUTCOME_SALES", label: "Sales" },
  { value: "OUTCOME_APP_PROMOTION", label: "App Promotion" },
  { value: "OUTCOME_AWARENESS", label: "Awareness" },
]

export function CampaignFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  isLoading = false
}: CampaignFiltersProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const handleFilterChange = (key: keyof CampaignFilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    onFiltersChange({ ...filters, startDate, endDate })
  }

  const getActiveFiltersCount = () => {
    const activeFilters = Object.entries(filters).filter(([key, value]) => {
      if (key === 'search') return value && value.trim() !== ''
      return value !== undefined && value !== null && value !== ''
    })
    return activeFilters.length
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">Filters</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-8 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-2 text-xs"
            >
              {isExpanded ? 'Less' : 'More'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Always visible filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Campaign name..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status || ''}
              onValueChange={(value) => handleFilterChange('status', value || undefined)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any status</SelectItem>
                {CAMPAIGN_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Objective</Label>
            <Select
              value={filters.objective || ''}
              onValueChange={(value) => handleFilterChange('objective', value || undefined)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any objective" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any objective</SelectItem>
                {CAMPAIGN_OBJECTIVES.map((objective) => (
                  <SelectItem key={objective.value} value={objective.value}>
                    {objective.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expandable filters */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            {/* Date Range */}
            <div className="space-y-3">
              <Label>Date Range</Label>
              <DateRangePicker
                startDate={filters.startDate}
                endDate={filters.endDate}
                onStartDateChange={(date) => handleFilterChange('startDate', date)}
                onEndDateChange={(date) => handleFilterChange('endDate', date)}
                disabled={isLoading}
              />
              <QuickDateRanges onRangeSelect={handleDateRangeSelect} />
            </div>

            {/* Budget Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget-min">Min Budget ($)</Label>
                <Input
                  id="budget-min"
                  type="number"
                  placeholder="0"
                  value={filters.budgetMin || ''}
                  onChange={(e) => handleFilterChange('budgetMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-max">Max Budget ($)</Label>
                <Input
                  id="budget-max"
                  type="number"
                  placeholder="No limit"
                  value={filters.budgetMax || ''}
                  onChange={(e) => handleFilterChange('budgetMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Performance Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spend-min">Min Spend ($)</Label>
                <Input
                  id="spend-min"
                  type="number"
                  placeholder="0"
                  value={filters.spendMin || ''}
                  onChange={(e) => handleFilterChange('spendMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spend-max">Max Spend ($)</Label>
                <Input
                  id="spend-max"
                  type="number"
                  placeholder="No limit"
                  value={filters.spendMax || ''}
                  onChange={(e) => handleFilterChange('spendMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roas-min">Min ROAS</Label>
                <Input
                  id="roas-min"
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={filters.roasMin || ''}
                  onChange={(e) => handleFilterChange('roasMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
