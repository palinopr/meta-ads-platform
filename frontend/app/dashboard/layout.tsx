import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardNav } from "@/components/dashboard/DashboardNav"
import { UserNav } from "@/components/dashboard/UserNav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-primary">Meta Ads Platform</h1>
          </div>
          <div className="mt-8 flex-grow flex flex-col">
            <DashboardNav />
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <UserNav user={user} profile={profile} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}