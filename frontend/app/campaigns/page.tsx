import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CampaignsClient } from './campaigns-client'

export default async function CampaignsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return <CampaignsClient />
}