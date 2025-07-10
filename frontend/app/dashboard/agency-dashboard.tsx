'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  getUserAgencyContext, 
  getAgencyEmployees, 
  getAgencyClients, 
  inviteEmployee
} from '@/lib/supabase/agency'
import type { AgencyContext, Database } from '@/lib/supabase/database.types'
import { ClientContextSwitcher } from '@/components/navigation/ClientContextSwitcher'
import { BreadcrumbNavigation } from '@/components/navigation/BreadcrumbNavigation'

// Define the types based on the actual database schema
type AgencyEmployee = Database['public']['Tables']['employees']['Row'] & {
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
};

type AgencyClient = Database['public']['Tables']['client_accounts']['Row'] & {
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
};

// Meta API metrics interface
interface AgencyMetrics {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  averageRoas: number;
  activeCampaigns: number;
  performanceChange: {
    spend: number;
    roas: number;
    ctr: number;
  };
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  Building2, 
  UserPlus, 
  Settings, 
  DollarSign,
  TrendingUp,
  Calendar,
  Mail,
  Shield,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Target,
  MousePointer,
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  LineChartIcon,
  PieChartIcon
} from "lucide-react"
import { InteractiveChart } from '@/components/dashboard/InteractiveChart'
import { PerformanceComparison } from '@/components/dashboard/PerformanceComparison'
import { MetricBreakdowns } from '@/components/dashboard/MetricBreakdowns'

export function AgencyDashboard() {
  const [loading, setLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [agencyContext, setAgencyContext] = useState<AgencyContext | null>(null)
  const [employees, setEmployees] = useState<AgencyEmployee[]>([])
  const [clients, setClients] = useState<AgencyClient[]>([])
  const [agencyMetrics, setAgencyMetrics] = useState<AgencyMetrics | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'manager' | 'viewer'>('viewer')
  const [isInviting, setIsInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [dateRange, setDateRange] = useState('30d')
  const [chartData, setChartData] = useState<any[]>([])
  const [comparisonData, setComparisonData] = useState<any>(null)
  const [breakdownData, setBreakdownData] = useState<any>(null)

  const supabase = createClient()

  const handleDateRangeChange = (range: string) => {
    setDateRange(range)
    // In real implementation, this would trigger data refresh
    console.log('Date range changed to:', range)
    if (agencyContext) {
      loadChartData(agencyContext.agency.id)
    }
  }

  useEffect(() => {
    loadAgencyData()
  }, [])

  const loadAgencyData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load agency context
      const agencyContext = await getUserAgencyContext(supabase)
      if (!agencyContext) {
        setError('No agency found. Please create an agency first.')
        return
      }
      setAgencyContext(agencyContext)

      // Load employees
      const employeesData = await getAgencyEmployees(supabase, agencyContext.agency.id)
      setEmployees(employeesData || [])

      // Load clients
      const clientsData = await getAgencyClients(supabase, agencyContext.agency.id)
      setClients(clientsData || [])

      // Load agency metrics in background
      loadAgencyMetrics(agencyContext.agency.id)

      // Load chart data
      loadChartData(agencyContext.agency.id)

    } catch (err) {
      setError('Failed to load agency data')
      console.error('Error loading agency data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAgencyMetrics = async (agencyId: string) => {
    try {
      setMetricsLoading(true)
      
      // Call the dashboard metrics edge function
      const { data, error } = await supabase.functions.invoke('get-dashboard-metrics', {
        body: { 
          agency_id: agencyId,
          date_range: '30' // Last 30 days
        }
      })

      if (error) {
        console.error('Error loading agency metrics:', error)
        return
      }

      if (data) {
        setAgencyMetrics(data)
      }
    } catch (err) {
      console.error('Error loading agency metrics:', err)
    } finally {
      setMetricsLoading(false)
    }
  }

  const refreshMetrics = () => {
    if (agencyContext) {
      loadAgencyMetrics(agencyContext.agency.id)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const loadChartData = (agencyId: string) => {
    // Mock chart data - in real implementation, this would come from Meta API
    const mockChartData = [
      { date: '2025-01-01', spend: 1250, roas: 4.2, clicks: 850, impressions: 45000, ctr: 1.89, cpc: 1.47 },
      { date: '2025-01-02', spend: 1180, roas: 3.8, clicks: 720, impressions: 42000, ctr: 1.71, cpc: 1.64 },
      { date: '2025-01-03', spend: 1420, roas: 4.6, clicks: 920, impressions: 48000, ctr: 1.92, cpc: 1.54 },
      { date: '2025-01-04', spend: 1350, roas: 4.1, clicks: 880, impressions: 46000, ctr: 1.91, cpc: 1.53 },
      { date: '2025-01-05', spend: 1520, roas: 4.8, clicks: 1050, impressions: 52000, ctr: 2.02, cpc: 1.45 },
      { date: '2025-01-06', spend: 1680, roas: 5.2, clicks: 1180, impressions: 58000, ctr: 2.03, cpc: 1.42 },
      { date: '2025-01-07', spend: 1450, roas: 4.4, clicks: 950, impressions: 49000, ctr: 1.94, cpc: 1.53 }
    ]

    const mockComparisonData = [
      {
        date: '2025-01-01',
        current: { spend: 1250, roas: 4.2, clicks: 850, impressions: 45000, ctr: 1.89 },
        previous: { spend: 1100, roas: 3.8, clicks: 780, impressions: 42000, ctr: 1.86 }
      },
      {
        date: '2025-01-02',
        current: { spend: 1180, roas: 3.8, clicks: 720, impressions: 42000, ctr: 1.71 },
        previous: { spend: 1050, roas: 3.5, clicks: 680, impressions: 40000, ctr: 1.70 }
      },
      {
        date: '2025-01-03',
        current: { spend: 1420, roas: 4.6, clicks: 920, impressions: 48000, ctr: 1.92 },
        previous: { spend: 1200, roas: 4.1, clicks: 850, impressions: 45000, ctr: 1.89 }
      }
    ]

    const mockBreakdownData = {
      demographics: {
        age: [
          { range: '18-24', spend: 2500, roas: 2.8, percentage: 15 },
          { range: '25-34', spend: 4200, roas: 3.5, percentage: 35 },
          { range: '35-44', spend: 3800, roas: 3.2, percentage: 28 },
          { range: '45-54', spend: 1800, roas: 2.9, percentage: 15 },
          { range: '55+', spend: 900, roas: 2.4, percentage: 7 }
        ],
        gender: [
          { type: 'Female', spend: 7200, roas: 3.4, percentage: 58 },
          { type: 'Male', spend: 5200, roas: 2.9, percentage: 42 }
        ]
      },
      devices: [
        { type: 'Mobile', spend: 8500, clicks: 3200, impressions: 95000, roas: 3.4, percentage: 68 },
        { type: 'Desktop', spend: 3200, clicks: 980, impressions: 28000, roas: 2.8, percentage: 26 },
        { type: 'Tablet', spend: 800, clicks: 220, impressions: 8500, roas: 2.2, percentage: 6 }
      ],
      placements: [
        { name: 'Facebook Feed', spend: 5500, ctr: 3.2, cpc: 1.85, percentage: 44 },
        { name: 'Instagram Feed', spend: 3200, ctr: 2.8, cpc: 2.10, percentage: 26 },
        { name: 'Stories', spend: 2100, ctr: 4.1, cpc: 1.65, percentage: 17 },
        { name: 'Reels', spend: 1600, ctr: 3.8, cpc: 1.75, percentage: 13 }
      ],
      geography: [
        { country: 'United Kingdom', spend: 6500, roas: 3.5, clicks: 2400, percentage: 52 },
        { country: 'United States', spend: 3200, roas: 2.9, clicks: 1200, percentage: 26 },
        { country: 'Canada', spend: 1500, roas: 3.1, clicks: 580, percentage: 12 },
        { country: 'Australia', spend: 1200, roas: 2.7, clicks: 420, percentage: 10 }
      ],
      timeOfDay: [
        { hour: '00-06', spend: 400, clicks: 120, roas: 2.1 },
        { hour: '06-12', spend: 2800, clicks: 950, roas: 3.2 },
        { hour: '12-18', spend: 4200, clicks: 1580, roas: 3.6 },
        { hour: '18-24', spend: 5100, clicks: 1750, roas: 3.4 }
      ]
    }

    setChartData(mockChartData)
    setComparisonData(mockComparisonData)
    setBreakdownData(mockBreakdownData)
  }

  const handleInviteEmployee = async () => {
    if (!inviteEmail || !agencyContext) return

    try {
      setIsInviting(true)
      setError(null)

      const result = await inviteEmployee(
        supabase, 
        agencyContext.agency.id, 
        inviteEmail, 
        inviteRole
      )

      if (result) {
        setSuccess(`Invitation sent to ${inviteEmail}`)
        setInviteEmail('')
        setInviteRole('viewer')
        setShowInviteDialog(false)
        // Reload employees
        await loadAgencyData()
      } else {
        setError('Failed to send invitation')
      }
    } catch (err) {
      setError('Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-500' },
      pending: { color: 'bg-yellow-500' },
      inactive: { color: 'bg-gray-500' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive
    
    return (
      <Badge className="capitalize">
        <span className={`w-2 h-2 rounded-full ${config.color} mr-1`}></span>
        {status}
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      owner: { icon: Shield, color: 'text-purple-600' },
      manager: { icon: Settings, color: 'text-blue-600' },
      viewer: { icon: Eye, color: 'text-gray-600' }
    }
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.viewer
    const Icon = config.icon
    
    return (
      <div className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        <span className="capitalize text-xs font-medium">{role}</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading agency dashboard...</p>
        </div>
      </div>
    )
  }

  if (!agencyContext) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-10">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Agency Setup Required</h3>
            <p className="text-muted-foreground mb-4">
              You need to create or join an agency to access this dashboard.
            </p>
            <Button onClick={() => window.location.href = '/agency/setup'}>
              Create Agency
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Breadcrumb Navigation */}
      <BreadcrumbNavigation 
        items={[
          { label: 'Agency Dashboard', href: '/dashboard' }
        ]}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">{agencyContext.agency.name}</h2>
          <p className="text-gray-300">
            {agencyContext.employee.role} • {agencyContext.agency.subscription_tier} plan
          </p>
        </div>
        
        <div className="lg:w-80">
          <ClientContextSwitcher 
            clients={[]}
            selectedClient={undefined}
            onClientSelect={() => {}}
          />
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2">
      </div>

      <div className="flex items-center justify-end space-x-2">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="capitalize">
            {agencyContext.agency.status}
          </Badge>
          {agencyContext.permissions.canManageEmployees && (
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New Employee</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="employee@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as 'manager' | 'viewer')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleInviteEmployee} disabled={isInviting || !inviteEmail}>
                      {isInviting ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Send Invitation
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Enhanced Key Metrics with Agency Theme */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-r from-agency-primary-500 to-agency-primary-600 text-white border-agency-primary-400 shadow-lg hover:shadow-xl transition-shadow animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-agency-primary-50">Team Members</CardTitle>
            <Users className="h-4 w-4 text-agency-primary-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-agency-primary-100">
              {employees.filter(e => e.status === 'active').length} active
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-agency-success-500 to-agency-success-600 text-white border-agency-success-400 shadow-lg hover:shadow-xl transition-shadow animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-agency-success-50">Client Accounts</CardTitle>
            <Building2 className="h-4 w-4 text-agency-success-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-agency-success-100">
              {clients.filter(c => c.status === 'active').length} active
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-agency-secondary-600 to-agency-secondary-700 text-white border-agency-secondary-500 shadow-lg hover:shadow-xl transition-shadow animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-agency-secondary-50">Monthly Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-agency-secondary-200" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="space-y-2">
                <div className="h-8 bg-agency-secondary-400 rounded animate-pulse"></div>
                <div className="h-3 bg-agency-secondary-400 rounded animate-pulse w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {agencyMetrics ? formatCurrency(agencyMetrics.totalSpend) : '£0'}
                </div>
                <p className="text-xs text-agency-secondary-100 flex items-center">
                  {agencyMetrics?.performanceChange.spend ? (
                    <>
                      {agencyMetrics.performanceChange.spend >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {formatPercentage(agencyMetrics.performanceChange.spend)} from last month
                    </>
                  ) : (
                    'No data available'
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-agency-warning-500 to-agency-warning-600 text-white border-agency-warning-400 shadow-lg hover:shadow-xl transition-shadow animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-agency-warning-50">Avg. ROAS</CardTitle>
            <TrendingUp className="h-4 w-4 text-agency-warning-200" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="space-y-2">
                <div className="h-8 bg-agency-warning-400 rounded animate-pulse"></div>
                <div className="h-3 bg-agency-warning-400 rounded animate-pulse w-16"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {agencyMetrics ? `${agencyMetrics.averageRoas.toFixed(1)}x` : '0x'}
                </div>
                <p className="text-xs text-agency-warning-100 flex items-center">
                  {agencyMetrics?.performanceChange.roas ? (
                    <>
                      {agencyMetrics.performanceChange.roas >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {formatPercentage(agencyMetrics.performanceChange.roas)} from last month
                    </>
                  ) : (
                    'No data available'
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-meta-blue to-meta-green text-white border-meta-blue/40 shadow-lg hover:shadow-xl transition-shadow animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-50">Active Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-200" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="space-y-2">
                <div className="h-8 bg-blue-400 rounded animate-pulse"></div>
                <div className="h-3 bg-blue-400 rounded animate-pulse w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {agencyMetrics ? agencyMetrics.activeCampaigns : 0}
                </div>
                <p className="text-xs text-blue-100">
                  Across {clients.filter(c => c.status === 'active').length} clients
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      {agencyMetrics && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Performance Overview
              </CardTitle>
              <CardDescription>
                Key performance indicators across all client accounts
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshMetrics}
              disabled={metricsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Impressions</span>
                  <span className="text-sm text-muted-foreground">
                    {agencyMetrics.totalImpressions.toLocaleString()}
                  </span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Clicks</span>
                  <span className="text-sm text-muted-foreground">
                    {agencyMetrics.totalClicks.toLocaleString()}
                  </span>
                </div>
                <Progress value={62} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Click-Through Rate</span>
                  <span className="text-sm text-muted-foreground">
                    {((agencyMetrics.totalClicks / agencyMetrics.totalImpressions) * 100).toFixed(2)}%
                  </span>
                </div>
                <Progress value={68} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Employees Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Manage your agency team and their permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {employee.profiles?.full_name?.charAt(0) || employee.profiles?.email?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {employee.profiles?.full_name || employee.profiles?.email || 'Unknown'}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        {getRoleBadge(employee.role)}
                        {getStatusBadge(employee.status)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {employee.status === 'pending' && (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    {agencyContext.permissions.canManageEmployees && employee.role !== 'owner' && (
                      <Button variant="ghost" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {employees.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No employees yet</p>
                  <p className="text-sm">Invite your first team member to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clients Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Client Accounts
            </CardTitle>
            <CardDescription>
              Manage your client accounts and their Meta ad accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{client.client_name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {client.meta_account_id}
                      </Badge>
                      {getStatusBadge(client.status)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {agencyContext.permissions.canManageClients && (
                      <>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              {clients.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No clients yet</p>
                  <p className="text-sm">Add your first client to start managing their ads</p>
                </div>
              )}
            </div>
            
            {agencyContext.permissions.canManageClients && (
              <div className="space-y-2 mt-4">
                <Button className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client Account
                </Button>
                <Button className="w-full" variant="ghost" size="sm">
                  <Target className="h-4 w-4 mr-2" />
                  Sync Meta Accounts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest actions across your agency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">Activity will appear here as your team works</p>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Analytics Charts */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-white">Analytics Dashboard</h3>
            <p className="text-gray-300">Interactive performance insights across all client campaigns</p>
          </div>
        </div>

        {/* Interactive Chart */}
        <InteractiveChart 
          data={chartData} 
          loading={metricsLoading} 
          onDateRangeChange={handleDateRangeChange} 
        />

        {/* Performance Comparison */}
        <PerformanceComparison 
          data={comparisonData} 
          loading={metricsLoading} 
        />

        {/* Metric Breakdowns */}
        <MetricBreakdowns 
          data={breakdownData} 
          loading={metricsLoading} 
        />
      </div>
    </div>
  )
}
