'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import { MetaAPI } from '@/lib/api/meta'

interface CampaignCreateFormProps {
  accountId: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface CampaignFormData {
  name: string
  objective: string
  status: string
  budget_type: 'DAILY' | 'LIFETIME'
  daily_budget?: number
  lifetime_budget?: number
  bid_strategy: string
  optimization_goal: string
  description?: string
}

const CAMPAIGN_OBJECTIVES = [
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic - Drive people to a destination' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement - Get more likes, comments, and shares' },
  { value: 'OUTCOME_LEADS', label: 'Leads - Collect leads for your business' },
  { value: 'OUTCOME_SALES', label: 'Sales - Find people likely to purchase' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion - Get more app installs' },
  { value: 'OUTCOME_AWARENESS', label: 'Awareness - Increase brand awareness' },
  { value: 'CONVERSIONS', label: 'Conversions - Track website conversions' },
  { value: 'LINK_CLICKS', label: 'Link Clicks - Drive clicks to website' },
  { value: 'REACH', label: 'Reach - Show ads to maximum people' },
  { value: 'VIDEO_VIEWS', label: 'Video Views - Get more video views' }
]

const BID_STRATEGIES = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Lowest Cost (Recommended)' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Lowest Cost with Bid Cap' },
  { value: 'TARGET_COST', label: 'Target Cost' },
  { value: 'COST_CAP', label: 'Cost Cap' }
]

const OPTIMIZATION_GOALS = [
  { value: 'LINK_CLICKS', label: 'Link Clicks' },
  { value: 'CONVERSIONS', label: 'Conversions' },
  { value: 'IMPRESSIONS', label: 'Impressions' },
  { value: 'REACH', label: 'Reach' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Landing Page Views' },
  { value: 'POST_ENGAGEMENT', label: 'Post Engagement' },
  { value: 'VIDEO_VIEWS', label: 'Video Views' },
  { value: 'THRUPLAY', label: 'ThruPlay' }
]

export function CampaignCreateForm({ accountId, onSuccess, onCancel }: CampaignCreateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    objective: '',
    status: 'PAUSED',
    budget_type: 'DAILY',
    daily_budget: 10,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    optimization_goal: 'LINK_CLICKS'
  })

  const api = new MetaAPI()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Campaign name is required')
      return
    }
    
    if (!formData.objective) {
      setError('Campaign objective is required')
      return
    }
    
    if (formData.budget_type === 'DAILY' && (!formData.daily_budget || formData.daily_budget < 1)) {
      setError('Daily budget must be at least $1')
      return
    }
    
    if (formData.budget_type === 'LIFETIME' && (!formData.lifetime_budget || formData.lifetime_budget < 1)) {
      setError('Lifetime budget must be at least $1')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Create campaign via Meta API
      const campaignData = {
        accountId,
        name: formData.name,
        objective: formData.objective,
        status: formData.status,
        budgetType: formData.budget_type.toLowerCase() as 'daily' | 'lifetime',
        budget: formData.budget_type === 'DAILY' 
          ? formData.daily_budget! 
          : formData.lifetime_budget!
      }
      
      console.log('Creating campaign:', campaignData)
      
      const result = await api.createCampaign(campaignData)
      console.log('Campaign created:', result)
      
      // Success feedback
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/campaigns')
      }
      
    } catch (error: any) {
      console.error('Failed to create campaign:', error)
      setError(error.message || 'Failed to create campaign. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: keyof CampaignFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null) // Clear error when user makes changes
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={onCancel || (() => router.back())}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create New Campaign</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>
            Create a new Meta advertising campaign. The campaign will be created in a paused state for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="Enter campaign name"
                value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('name', e.target.value)}
                required
              />
            </div>

            {/* Campaign Objective */}
            <div className="space-y-2">
              <Label htmlFor="objective">Campaign Objective *</Label>
              <Select value={formData.objective} onValueChange={(value) => updateFormData('objective', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign objective" />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_OBJECTIVES.map((objective) => (
                    <SelectItem key={objective.value} value={objective.value}>
                      {objective.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Budget Type */}
            <div className="space-y-3">
              <Label>Budget Type *</Label>
              <RadioGroup
                value={formData.budget_type}
                onValueChange={(value: 'DAILY' | 'LIFETIME') => updateFormData('budget_type', value)}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="DAILY" id="daily" />
                  <Label htmlFor="daily">Daily Budget</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="LIFETIME" id="lifetime" />
                  <Label htmlFor="lifetime">Lifetime Budget</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Budget Amount */}
            {formData.budget_type === 'DAILY' ? (
              <div className="space-y-2">
                <Label htmlFor="daily_budget">Daily Budget (USD) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="daily_budget"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="10.00"
                    className="pl-8"
                    value={formData.daily_budget || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('daily_budget', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Minimum daily budget is $1.00
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="lifetime_budget">Lifetime Budget (USD) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="lifetime_budget"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="100.00"
                    className="pl-8"
                    value={formData.lifetime_budget || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('lifetime_budget', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Minimum lifetime budget is $1.00
                </p>
              </div>
            )}

            {/* Bid Strategy */}
            <div className="space-y-2">
              <Label htmlFor="bid_strategy">Bid Strategy</Label>
              <Select value={formData.bid_strategy} onValueChange={(value) => updateFormData('bid_strategy', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BID_STRATEGIES.map((strategy) => (
                    <SelectItem key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optimization Goal */}
            <div className="space-y-2">
              <Label htmlFor="optimization_goal">Optimization Goal</Label>
              <Select value={formData.optimization_goal} onValueChange={(value) => updateFormData('optimization_goal', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTIMIZATION_GOALS.map((goal) => (
                    <SelectItem key={goal.value} value={goal.value}>
                      {goal.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campaign Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select value={formData.status} onValueChange={(value) => updateFormData('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAUSED">Paused (Recommended)</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                We recommend starting campaigns in a paused state for review
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add a description for this campaign..."
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormData('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel || (() => router.back())}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Campaign...
                  </>
                ) : (
                  'Create Campaign'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
