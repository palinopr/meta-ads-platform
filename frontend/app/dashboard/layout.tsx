import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AgencySidebar } from "@/components/navigation/AgencySidebar"

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

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* AgencySidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <AgencySidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          {children}
        </main>
      </div>
    </div>
  )
}
