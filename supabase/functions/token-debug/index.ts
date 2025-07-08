import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const apikey = req.headers.get('apikey')
    const clientInfo = req.headers.get('x-client-info')
    
    // Decode JWT manually to see what's in it
    let jwtPayload = null
    let tokenType = 'none'
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          jwtPayload = payload
          
          if (payload.sub) {
            tokenType = 'user'
          } else if (payload.role === 'anon') {
            tokenType = 'anonymous'
          } else {
            tokenType = 'unknown'
          }
        }
      } catch (e) {
        console.error('JWT decode error:', e)
      }
    }

    return new Response(
      JSON.stringify({
        headers: {
          authorization: authHeader ? authHeader.substring(0, 100) + '...' : null,
          apikey: apikey ? apikey.substring(0, 50) + '...' : null,
          clientInfo
        },
        tokenAnalysis: {
          type: tokenType,
          payload: jwtPayload,
          hasSubClaim: !!jwtPayload?.sub,
          role: jwtPayload?.role,
          userId: jwtPayload?.sub
        },
        allHeaders: Object.fromEntries(req.headers.entries())
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})