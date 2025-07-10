'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Building2,
  BarChart3,
  Target,
  Users,
  Settings,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Globe,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavigationItem {
  name: string
  href: string
  icon: any
  badge?: string
  children?: NavigationItem[]
}

const navigation: NavigationItem[] = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    name: 'Campaigns',
    href: '/campaigns',
    icon: Target,
    badge: 'New',
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: Building2,
    children: [
      { name: 'All Clients', href: '/clients', icon: Building2 },
      { name: 'Add Client', href: '/clients/add', icon: Building2 },
      { name: 'Client Reports', href: '/clients/reports', icon: BarChart3 },
    ]
  },
  {
    name: 'Team',
    href: '/team',
    icon: Users,
    children: [
      { name: 'Team Members', href: '/team', icon: Users },
      { name: 'Roles & Permissions', href: '/team/roles', icon: Shield },
      { name: 'Invite Team', href: '/team/invite', icon: Users },
    ]
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
    children: [
      { name: 'Performance', href: '/analytics/performance', icon: TrendingUp },
      { name: 'ROI Analysis', href: '/analytics/roi', icon: DollarSign },
      { name: 'Attribution', href: '/analytics/attribution', icon: Globe },
    ]
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

interface AgencySidebarProps {
  className?: string
}

export function AgencySidebar({ className }: AgencySidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  const NavigationItems = () => (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigation.map((item) => {
        const hasChildren = item.children && item.children.length > 0
        const isExpanded = expandedItems.includes(item.name)
        const active = isActive(item.href)

        return (
          <div key={item.name}>
            {hasChildren ? (
              <div>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={cn(
                    'group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-gradient-to-r from-agency-primary-500 to-agency-primary-600 text-white shadow-lg'
                      : 'text-agency-secondary-300 hover:bg-agency-secondary-800 hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                      active ? 'text-white' : 'text-agency-secondary-400'
                    )}
                  />
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.badge && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-agency-success-500 px-2 py-0.5 text-xs font-medium text-white">
                      {item.badge}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronRight className="ml-2 h-4 w-4" />
                  )}
                </button>
                {isExpanded && (
                  <div className="mt-1 space-y-1 pl-6 animate-fade-in">
                    {item.children?.map((child) => {
                      const childActive = isActive(child.href)
                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={cn(
                            'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                            childActive
                              ? 'bg-agency-primary-500/20 text-agency-primary-300 border-l-2 border-agency-primary-500'
                              : 'text-agency-secondary-400 hover:bg-agency-secondary-800 hover:text-white'
                          )}
                        >
                          <child.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                          {child.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-gradient-to-r from-agency-primary-500 to-agency-primary-600 text-white shadow-lg'
                    : 'text-agency-secondary-300 hover:bg-agency-secondary-800 hover:text-white'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                    active ? 'text-white' : 'text-agency-secondary-400'
                  )}
                />
                <span>{item.name}</span>
                {item.badge && (
                  <span className="ml-auto inline-flex items-center rounded-full bg-agency-success-500 px-2 py-0.5 text-xs font-medium text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-50 bg-agency-secondary-900/90 backdrop-blur-sm border border-agency-secondary-700"
        >
          <Menu className="h-5 w-5 text-white" />
        </Button>
      </div>

      {/* Mobile sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-80 bg-agency-secondary-900 shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-agency-secondary-700">
              <h2 className="text-lg font-semibold text-white">Navigation</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="h-5 w-5 text-white" />
              </Button>
            </div>
            <NavigationItems />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={cn(
        'flex flex-col w-full h-full bg-agency-secondary-900 border-r border-agency-secondary-700',
        className
      )}>
        <div className="flex items-center px-6 py-6 border-b border-agency-secondary-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-agency-primary-500 to-agency-primary-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Agency Pro</h1>
              <p className="text-xs text-agency-secondary-400">Meta Ads Platform</p>
            </div>
          </div>
        </div>
        <NavigationItems />
        
        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-agency-secondary-700">
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-gradient-to-r from-meta-blue/10 to-meta-green/10 border border-meta-blue/20">
            <div className="w-8 h-8 bg-meta-blue rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">M</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Meta Connected</p>
              <p className="text-xs text-agency-secondary-400">API Status: Active</p>
            </div>
            <div className="w-2 h-2 bg-agency-success-500 rounded-full animate-pulse-glow"></div>
          </div>
        </div>
      </div>
    </>
  )
}
