import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header:', authHeader?.substring(0, 50) + '...')
    
    // Try multiple approaches to create the client
    
    // Approach 1: With auth header
    const client1 = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: authHeader ? { Authorization: authHeader } : {}
        } 
      }
    )

    const { data: { user: user1 }, error: error1 } = await client1.auth.getUser()
    
    // Approach 2: Service role client
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Try to decode the JWT manually
    let jwtPayload = null
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          jwtPayload = payload
        }
      } catch (e) {
        console.error('JWT decode error:', e)
      }
    }

    return new Response(
      JSON.stringify({
        authHeader: {
          present: !!authHeader,
          preview: authHeader?.substring(0, 50) + '...'
        },
        approach1: {
          user: user1 ? { id: user1.id, email: user1.email } : null,
          error: error1?.message
        },
        jwtPayload: jwtPayload,
        environment: {
          supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
          anonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
          serviceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        }
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})