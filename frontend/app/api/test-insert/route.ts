import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { account_id, account_name } = await request.json()

    // Get user from regular client first
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 })
    }

    // Create service role client (bypasses RLS)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Fallback if service key not available
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Try direct insert with service role
    const { data, error } = await serviceSupabase
      .from('meta_ad_accounts')
      .insert({
        user_id: user.id,
        account_id: account_id,
        account_name: account_name,
        currency: 'USD',
        timezone_name: 'UTC',
        status: 'ACTIVE',
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Service role insert error:', error)
      return NextResponse.json({ 
        error: error.message,
        details: error,
        user_id: user.id,
        user_id_type: typeof user.id
      }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}