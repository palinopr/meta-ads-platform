import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withSentryMonitoring, captureBusinessError, capturePerformanceMetric, withPerformanceSpan, logBusinessEvent } from '../_shared/sentry-config.ts'

// Token encryption utilities
async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  
  // Get encryption key from environment variable
  const encryptionKey = Deno.env.get('META_TOKEN_ENCRYPTION_KEY')
  if (!encryptionKey) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY environment variable is required')
  }
  
  // Create key from environment variable
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16))
  
  // Derive encryption key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  
  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  // Encrypt the token
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(token)
  )
  
  // Combine salt + iv + encrypted data and encode as base64
  const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length)
  
  return btoa(String.fromCharCode(...combined))
}

async function decryptToken(encryptedToken: string): Promise<string> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  
  // Get encryption key from environment variable
  const encryptionKey = Deno.env.get('META_TOKEN_ENCRYPTION_KEY')
  if (!encryptionKey) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY environment variable is required')
  }
  
  // Decode base64
  const combined = new Uint8Array(
    atob(encryptedToken).split('').map(char => char.charCodeAt(0))
  )
  
  // Extract salt, iv, and encrypted data
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const encryptedData = combined.slice(28)
  
  // Create key from environment variable
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  
  // Derive decryption key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  
  // Decrypt the data
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  )
  
  return decoder.decode(decryptedBuffer)
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(withSentryMonitoring('sync-meta-token', async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  let success = false
  let userId = 'unknown'

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      captureBusinessError(new Error('No authorization header'), {
        functionName: 'sync-meta-token',
        businessImpact: 'high',
        affectedRevenue: 'User cannot connect Meta account',
        customerImpact: 'Authentication failure prevents Meta integration',
        additionalContext: { missingAuthHeader: true }
      })
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '')
    
    // Create a client with the user's token to get their session
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    // Get the user's session - this should contain provider_token if just authenticated
    const { data: { session }, error: sessionError } = await withPerformanceSpan('get-user-session', 'Retrieve user session from auth', async () => {
      return await supabaseClient.auth.getSession()
    })
    
    if (sessionError || !session) {
      captureBusinessError(sessionError || new Error('No session found'), {
        functionName: 'sync-meta-token',
        businessImpact: 'high',
        affectedRevenue: 'User cannot connect Meta account',
        customerImpact: 'Session validation failure prevents Meta integration',
        additionalContext: { sessionError: sessionError?.message, noSession: !session }
      })
      return new Response(
        JSON.stringify({ error: 'No session found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = session.user
    userId = user.id

    // Check for Facebook identity
    const facebookIdentity = user.identities?.find(
      identity => identity.provider === 'facebook'
    )

    if (!facebookIdentity) {
      captureBusinessError(new Error('No Facebook identity found'), {
        functionName: 'sync-meta-token',
        businessImpact: 'high',
        affectedRevenue: 'User cannot connect Meta account',
        customerImpact: 'Missing Facebook identity prevents Meta integration',
        additionalContext: { 
          userId: user.id,
          identityCount: user.identities?.length || 0,
          identityProviders: user.identities?.map(i => i.provider) || []
        }
      })
      return new Response(
        JSON.stringify({ error: 'No Facebook identity found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // The provider_token should be in the session if this is called right after OAuth
    const metaAccessToken = session.provider_token
    
    if (!metaAccessToken) {
      // If no provider token in session, check if we already have one stored
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('meta_access_token')
        .eq('id', user.id)
        .single()
      
      if (profile?.meta_access_token) {
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Meta account already connected',
            hasToken: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ error: 'No Facebook access token found. Please reconnect.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Encrypt the Meta access token before storing
    let encryptedToken: string
    try {
      encryptedToken = await withPerformanceSpan('encrypt-meta-token', 'Encrypt Meta access token with AES-GCM', async () => {
        return await encryptToken(metaAccessToken)
      })
      
      logBusinessEvent('Token encrypted successfully', {
        functionName: 'sync-meta-token',
        userId: user.id,
        action: 'encrypt-token',
        result: 'success',
        additionalData: { encryptionMethod: 'AES-GCM-256' }
      })
    } catch (encryptionError) {
      console.error('Token encryption failed:', encryptionError)
      captureBusinessError(encryptionError, {
        functionName: 'sync-meta-token',
        businessImpact: 'critical',
        affectedRevenue: 'User cannot connect Meta account, security failure',
        customerImpact: 'Token encryption failure prevents secure storage',
        additionalContext: { 
          userId: user.id,
          encryptionError: encryptionError.message,
          hasEncryptionKey: !!Deno.env.get('META_TOKEN_ENCRYPTION_KEY')
        }
      })
      return new Response(
        JSON.stringify({ error: 'Failed to encrypt Meta access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the user's profile with the encrypted Meta access token
    const { error: updateError } = await withPerformanceSpan('update-profile', 'Update user profile with encrypted token', async () => {
      return await supabaseAdmin
        .from('profiles')
        .update({
          meta_access_token: encryptedToken,
          meta_user_id: facebookIdentity.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
    })

    if (updateError) {
      console.error('Error updating profile:', updateError)
      captureBusinessError(updateError, {
        functionName: 'sync-meta-token',
        businessImpact: 'critical',
        affectedRevenue: 'User cannot connect Meta account, database failure',
        customerImpact: 'Profile update failure prevents Meta integration',
        additionalContext: { 
          userId: user.id,
          updateError: updateError.message,
          errorCode: updateError.code,
          errorDetails: updateError.details
        }
      })
      return new Response(
        JSON.stringify({ error: 'Failed to save Meta access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the token works by making a test API call
    try {
      const verifyResponse = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${metaAccessToken}`
      )
      
      if (!verifyResponse.ok) {
        console.error('Token verification failed:', await verifyResponse.text())
      } else {
        console.log('Meta token verified successfully and stored encrypted')
      }
    } catch (error) {
      console.error('Error verifying token:', error)
    }

    // Mark as successful and capture performance metrics
    success = true
    const duration = Date.now() - startTime
    
    capturePerformanceMetric('sync-meta-token', duration, {
      functionName: 'sync-meta-token',
      success: true,
      recordCount: 1,
      apiCalls: 1,
      additionalMetrics: {
        hasEncryptedToken: true,
        tokenVerified: true
      }
    })

    logBusinessEvent('Meta account connected successfully', {
      functionName: 'sync-meta-token',
      userId: user.id,
      action: 'connect-meta-account',
      result: 'success',
      additionalData: {
        metaUserId: facebookIdentity.id,
        hasEncryptedToken: true,
        tokenVerified: true
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Meta account connected successfully',
        hasToken: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in sync-meta-token:', error)
    
    // Capture performance metrics for failed request
    const duration = Date.now() - startTime
    capturePerformanceMetric('sync-meta-token', duration, {
      functionName: 'sync-meta-token',
      success: false,
      recordCount: 0,
      apiCalls: 0,
      additionalMetrics: {
        errorType: error.name || 'UnknownError',
        userId: userId
      }
    })

    // Capture unexpected error with critical business impact
    captureBusinessError(error, {
      functionName: 'sync-meta-token',
      businessImpact: 'critical',
      affectedRevenue: 'User cannot connect Meta account, authentication failure',
      customerImpact: 'System error prevents Meta integration',
      additionalContext: {
        userId: userId,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        unexpectedError: true
      }
    })

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}, {
  category: 'authentication',
  criticalPath: true
}))