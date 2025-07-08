// Shared token encryption utilities for Meta access tokens
// This ensures consistent encryption/decryption across all edge functions

export async function encryptMetaToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  
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

export async function decryptMetaToken(encryptedToken: string): Promise<string> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  
  // Get encryption key from environment variable
  const encryptionKey = Deno.env.get('META_TOKEN_ENCRYPTION_KEY')
  if (!encryptionKey) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY environment variable is required')
  }
  
  try {
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
  } catch (error) {
    console.error('Token decryption failed:', error)
    throw new Error('Failed to decrypt Meta access token - token may be corrupted or encryption key changed')
  }
}

// Helper function to safely get and decrypt a user's Meta token
export async function getDecryptedMetaToken(supabaseAdmin: any, userId: string): Promise<string | null> {
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('meta_access_token')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.meta_access_token) {
      return null
    }

    // If the token looks like it's already decrypted (for backward compatibility during migration)
    if (!profile.meta_access_token.includes('=') && profile.meta_access_token.length < 100) {
      console.warn('Found unencrypted token - this should be migrated')
      return profile.meta_access_token
    }

    // Decrypt the token
    return await decryptMetaToken(profile.meta_access_token)
  } catch (error) {
    console.error('Error getting decrypted Meta token:', error)
    return null
  }
}