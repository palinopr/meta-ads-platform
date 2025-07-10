'use client'

import Link from 'next/link'
import { ChevronRight, Home, Building2, Target, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: any
  isActive?: boolean
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[]
  className?: string
}

export function BreadcrumbNavigation({ items, className }: BreadcrumbNavigationProps) {
  return (
    <nav className={cn('flex items-center space-x-1 text-sm', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const IconComponent = item.icon

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="mr-1 h-4 w-4 text-agency-secondary-400 flex-shrink-0" />
              )}
              
              <div className="flex items-center space-x-1.5">
                {IconComponent && (
                  <IconComponent className={cn(
                    'h-4 w-4 flex-shrink-0',
                    isLast 
                      ? 'text-agency-primary-400' 
                      : 'text-agency-secondary-400'
                  )} />
                )}
                
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className={cn(
                      'font-medium transition-colors hover:text-agency-primary-400',
                      'text-agency-secondary-300'
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'font-medium',
                      isLast 
                        ? 'text-white' 
                        : 'text-agency-secondary-300'
                    )}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Helper function to generate common breadcrumb patterns
export const createBreadcrumbs = {
  dashboard: (): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard', icon: Home, isActive: true }
  ],
  
  campaigns: (clientName?: string): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    ...(clientName ? [{ label: clientName, href: '/clients', icon: Building2 }] : []),
    { label: 'Campaigns', href: '/campaigns', icon: Target, isActive: true }
  ],
  
  campaignDetail: (clientName: string, campaignName: string, campaignId: string): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: clientName, href: '/clients', icon: Building2 },
    { label: 'Campaigns', href: '/campaigns', icon: Target },
    { label: campaignName, isActive: true }
  ],
  
  analytics: (clientName?: string, section?: string): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    ...(clientName ? [{ label: clientName, href: '/clients', icon: Building2 }] : []),
    { label: 'Analytics', href: '/analytics', icon: BarChart3, isActive: !section },
    ...(section ? [{ label: section, isActive: true }] : [])
  ],
  
  clients: (clientName?: string): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Clients', href: '/clients', icon: Building2, isActive: !clientName },
    ...(clientName ? [{ label: clientName, isActive: true }] : [])
  ],
  
  settings: (section?: string): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Settings', href: '/settings', isActive: !section },
    ...(section ? [{ label: section, isActive: true }] : [])
  ]
}
