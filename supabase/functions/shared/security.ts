// Security utilities for Edge Functions
// Rate limiting implementation with KV store simulation

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  identifier: string
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Simple in-memory rate limiter (for Edge Functions)
const rateLimitStore = new Map<string, RateLimitEntry>()

export function rateLimit(config: RateLimitConfig): { allowed: boolean; remainingRequests: number; resetTime: number } {
  const now = Date.now()
  const key = config.identifier
  const existing = rateLimitStore.get(key)
  
  // Clean up expired entries
  if (existing && now > existing.resetTime) {
    rateLimitStore.delete(key)
  }
  
  const entry = rateLimitStore.get(key) || { count: 0, resetTime: now + config.windowMs }
  
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: entry.resetTime
    }
  }
  
  entry.count++
  rateLimitStore.set(key, entry)
  
  return {
    allowed: true,
    remainingRequests: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  }
}

// Security: Get client IP from request
export function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  return cfConnectingIP || realIP || forwardedFor?.split(',')[0] || 'unknown'
}

// Security: Validate request origin
export function validateOrigin(req: Request, allowedOrigins: string[]): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false
  return allowedOrigins.includes(origin)
}

// Security: Sanitize error messages
export function sanitizeError(error: any): string {
  if (typeof error === 'string') {
    return error.includes('password') || error.includes('token') || error.includes('secret') 
      ? 'Authentication error' 
      : error
  }
  
  if (error?.message) {
    return error.message.includes('password') || error.message.includes('token') || error.message.includes('secret')
      ? 'Authentication error'
      : error.message
  }
  
  return 'An error occurred'
}

// Security: Log security events
export function logSecurityEvent(event: string, userId?: string, ip?: string, additional?: any) {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    event,
    userId: userId || 'anonymous',
    ip: ip || 'unknown',
    ...additional
  }
  
  console.log(`[SECURITY] ${JSON.stringify(logData)}`)
}

// Security: Validate JWT structure (basic check)
export function isValidJWTStructure(token: string): boolean {
  const parts = token.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

// Security: Content validation
export function validateContentType(req: Request, allowedTypes: string[]): boolean {
  const contentType = req.headers.get('content-type')
  if (!contentType) return false
  
  return allowedTypes.some(type => contentType.includes(type))
}