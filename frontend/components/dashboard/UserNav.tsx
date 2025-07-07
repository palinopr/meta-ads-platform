'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface UserNavProps {
  user: User
  profile: any
}

export function UserNav({ user, profile }: UserNavProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button onClick={handleSignOut} className="flex-shrink-0 w-full group block">
      <div className="flex items-center">
        <div>
          <div className="inline-block h-9 w-9 rounded-full bg-gray-300"></div>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-700">
            {profile?.full_name || user.email}
          </p>
          <p className="text-xs font-medium text-gray-500">{user.email}</p>
        </div>
        <LogOut className="ml-auto h-4 w-4 text-gray-400" />
      </div>
    </button>
  )
}