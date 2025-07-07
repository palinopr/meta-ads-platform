import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      // Check if this is a Facebook OAuth callback
      const facebookIdentity = data.session.user.identities?.find(
        identity => identity.provider === 'facebook'
      )
      
      if (facebookIdentity) {
        // The provider_token is available in the session
        const providerToken = data.session.provider_token
        const providerRefreshToken = data.session.provider_refresh_token
        
        if (providerToken) {
          // Update the user's profile with the Meta access token
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              meta_access_token: providerToken,
              meta_user_id: facebookIdentity.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.session.user.id)
          
          if (updateError) {
            console.error('Error updating profile with Meta token:', updateError)
          }
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}