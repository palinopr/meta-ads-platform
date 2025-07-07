'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  BarChart3, 
  Megaphone, 
  Settings, 
  Users, 
  DollarSign,
  FileText,
  Home
} from "lucide-react"

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: Home },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Budget', href: '/dashboard/budget', icon: DollarSign },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-2 pb-4 space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50',
              'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
            )}
          >
            <item.icon
              className={cn(
                isActive ? 'text-primary' : 'text-gray-400',
                'mr-3 flex-shrink-0 h-5 w-5'
              )}
            />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}