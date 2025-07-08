// Meta API Rate Limiting Infrastructure
// Implements comprehensive rate limiting for Facebook Marketing API
// Based on official Meta documentation and best practices

interface RateLimitConfig {
  maxPoints: number;        // Maximum points before throttling
  decayTimeMs: number;      // Time for points to decay (300s = 5 minutes)
  blockDurationMs: number;  // How long to block when max reached
  readCallPoints: number;   // Points per read call (1 point)
  writeCallPoints: number;  // Points per write call (3 points)
}

interface RateLimitState {
  points: number;
  lastCallTime: number;
  blockedUntil: number;
}

interface RateLimitHeaders {
  'x-fb-ads-insights-throttle'?: string;
  'x-ad-account-usage'?: string;
  'x-app-usage'?: string;
}

interface ThrottleInfo {
  app_id_util_pct: number;
  acc_id_util_pct: number;
  estimated_time_to_regain_access: number;
}

// Rate limit configurations for different tiers
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  development: {
    maxPoints: 60,
    decayTimeMs: 300000,      // 5 minutes
    blockDurationMs: 300000,  // 5 minutes
    readCallPoints: 1,
    writeCallPoints: 3
  },
  standard: {
    maxPoints: 9000,
    decayTimeMs: 300000,      // 5 minutes  
    blockDurationMs: 60000,   // 1 minute
    readCallPoints: 1,
    writeCallPoints: 3
  }
}

// In-memory rate limit state (per account)
const rateLimitState = new Map<string, RateLimitState>()

export class MetaAPIRateLimiter {
  private config: RateLimitConfig
  private accountId: string
  private userId: string

  constructor(accountId: string, userId: string, tier: 'development' | 'standard' = 'development') {
    this.config = RATE_LIMIT_CONFIGS[tier]
    this.accountId = accountId
    this.userId = userId
  }

  private getStateKey(): string {
    return `${this.userId}:${this.accountId}`
  }

  private getState(): RateLimitState {
    const key = this.getStateKey()
    if (!rateLimitState.has(key)) {
      rateLimitState.set(key, {
        points: 0,
        lastCallTime: Date.now(),
        blockedUntil: 0
      })
    }
    return rateLimitState.get(key)!
  }

  private updateState(state: RateLimitState): void {
    rateLimitState.set(this.getStateKey(), state)
  }

  private decayPoints(state: RateLimitState): number {
    const now = Date.now()
    const timeSinceLastCall = now - state.lastCallTime
    
    if (timeSinceLastCall > 0) {
      // Points decay linearly over the decay time period
      const decayFactor = Math.min(timeSinceLastCall / this.config.decayTimeMs, 1)
      const newPoints = Math.max(0, state.points * (1 - decayFactor))
      return newPoints
    }
    
    return state.points
  }

  /**
   * Check if we can make a request without hitting rate limits
   */
  public canMakeRequest(isWriteCall: boolean = false): { 
    allowed: boolean; 
    waitTimeMs: number; 
    currentPoints: number;
    reason?: string;
  } {
    const state = this.getState()
    const now = Date.now()
    
    // Check if we're currently blocked
    if (state.blockedUntil > now) {
      return {
        allowed: false,
        waitTimeMs: state.blockedUntil - now,
        currentPoints: state.points,
        reason: 'Currently blocked due to rate limit violation'
      }
    }
    
    // Apply point decay
    const currentPoints = this.decayPoints(state)
    const requestPoints = isWriteCall ? this.config.writeCallPoints : this.config.readCallPoints
    const projectedPoints = currentPoints + requestPoints
    
    // Check if this request would exceed the limit
    if (projectedPoints > this.config.maxPoints) {
      // Calculate how long to wait for enough points to decay
      const excessPoints = projectedPoints - this.config.maxPoints
      const waitTimeMs = (excessPoints / this.config.maxPoints) * this.config.decayTimeMs
      
      return {
        allowed: false,
        waitTimeMs: Math.ceil(waitTimeMs),
        currentPoints,
        reason: `Request would exceed rate limit (${projectedPoints}/${this.config.maxPoints} points)`
      }
    }
    
    return {
      allowed: true,
      waitTimeMs: 0,
      currentPoints
    }
  }

  /**
   * Record that we made a request (updates internal state)
   */
  public recordRequest(isWriteCall: boolean = false): void {
    const state = this.getState()
    const now = Date.now()
    
    // Apply point decay first
    const currentPoints = this.decayPoints(state)
    const requestPoints = isWriteCall ? this.config.writeCallPoints : this.config.readCallPoints
    
    // Update state
    state.points = currentPoints + requestPoints
    state.lastCallTime = now
    
    // If we've exceeded the limit, set block time
    if (state.points > this.config.maxPoints) {
      state.blockedUntil = now + this.config.blockDurationMs
    }
    
    this.updateState(state)
  }

  /**
   * Process rate limit headers from Meta API response
   */
  public processRateLimitHeaders(headers: RateLimitHeaders): ThrottleInfo | null {
    const throttleHeader = headers['x-fb-ads-insights-throttle']
    
    if (throttleHeader) {
      try {
        const throttleInfo = JSON.parse(throttleHeader) as ThrottleInfo
        
        // If we're being throttled, update our blocked state
        if (throttleInfo.estimated_time_to_regain_access > 0) {
          const state = this.getState()
          state.blockedUntil = Date.now() + (throttleInfo.estimated_time_to_regain_access * 1000)
          this.updateState(state)
        }
        
        return throttleInfo
      } catch (e) {
        console.error('Failed to parse throttle header:', e)
      }
    }
    
    return null
  }

  /**
   * Get current rate limit status
   */
  public getStatus(): {
    currentPoints: number;
    maxPoints: number;
    utilizationPercent: number;
    isBlocked: boolean;
    blockedUntilMs: number;
    canMakeRead: boolean;
    canMakeWrite: boolean;
  } {
    const state = this.getState()
    const now = Date.now()
    const currentPoints = this.decayPoints(state)
    
    return {
      currentPoints,
      maxPoints: this.config.maxPoints,
      utilizationPercent: (currentPoints / this.config.maxPoints) * 100,
      isBlocked: state.blockedUntil > now,
      blockedUntilMs: Math.max(0, state.blockedUntil - now),
      canMakeRead: this.canMakeRequest(false).allowed,
      canMakeWrite: this.canMakeRequest(true).allowed
    }
  }
}

/**
 * Rate-limited fetch wrapper for Meta API calls
 */
export async function rateLimitedFetch(
  url: string,
  options: RequestInit = {},
  rateLimiter: MetaAPIRateLimiter,
  isWriteCall: boolean = false,
  maxRetries: number = 3
): Promise<Response> {
  let retryCount = 0
  
  while (retryCount < maxRetries) {
    // Check rate limit before making request
    const limitCheck = rateLimiter.canMakeRequest(isWriteCall)
    
    if (!limitCheck.allowed) {
      console.log(`Rate limit check failed: ${limitCheck.reason}. Waiting ${limitCheck.waitTimeMs}ms`)
      await new Promise(resolve => setTimeout(resolve, limitCheck.waitTimeMs))
      retryCount++
      continue
    }
    
    try {
      // Record the request
      rateLimiter.recordRequest(isWriteCall)
      
      // Make the API call
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'User-Agent': 'MetaAdsAnalytics/1.0'
        }
      })
      
      // Process rate limit headers from response
      const throttleInfo = rateLimiter.processRateLimitHeaders(response.headers as any)
      
      if (throttleInfo) {
        console.log('Rate limit info:', throttleInfo)
        
        // If we're being throttled, wait before allowing more requests
        if (throttleInfo.estimated_time_to_regain_access > 0) {
          console.log(`Meta API throttling detected. Waiting ${throttleInfo.estimated_time_to_regain_access}s`)
        }
      }
      
      // Check for rate limit error codes
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: { message: errorText } }
        }
        
        // Handle rate limit errors (codes 17, 613, 80000)
        if (errorData.error?.code === 17 || 
            errorData.error?.code === 613 || 
            errorData.error?.code === 80000) {
          
          console.log(`Rate limit error detected (code: ${errorData.error.code}). Retrying...`)
          
          // Wait with exponential backoff
          const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000)
          await new Promise(resolve => setTimeout(resolve, backoffMs))
          
          retryCount++
          continue
        }
        
        // For other errors, return the response as-is
        return new Response(errorText, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        })
      }
      
      return response
      
    } catch (error) {
      console.error(`API call failed (attempt ${retryCount + 1}/${maxRetries}):`, error)
      
      if (retryCount === maxRetries - 1) {
        throw error
      }
      
      // Wait with exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000)
      await new Promise(resolve => setTimeout(resolve, backoffMs))
      
      retryCount++
    }
  }
  
  throw new Error(`Failed to make API call after ${maxRetries} retries`)
}

/**
 * Batch request handler with rate limiting
 */
export async function batchMetaAPIRequests(
  requests: Array<{
    method: string;
    relative_url: string;
    isWriteCall?: boolean;
  }>,
  accessToken: string,
  rateLimiter: MetaAPIRateLimiter
): Promise<Response> {
  // Calculate total points for the batch
  const totalPoints = requests.reduce((sum, req) => {
    return sum + (req.isWriteCall ? 3 : 1)
  }, 0)
  
  // Check if we can make the batch request
  const limitCheck = rateLimiter.canMakeRequest(false) // Batch requests are considered read calls
  
  if (!limitCheck.allowed) {
    throw new Error(`Cannot make batch request: ${limitCheck.reason}`)
  }
  
  // If batch would exceed reasonable limits, split it
  if (totalPoints > rateLimiter.getStatus().maxPoints * 0.8) {
    throw new Error('Batch request too large - split into smaller batches')
  }
  
  const batchPayload = {
    batch: JSON.stringify(requests),
    access_token: accessToken
  }
  
  const formData = new FormData()
  Object.entries(batchPayload).forEach(([key, value]) => {
    formData.append(key, value)
  })
  
  return rateLimitedFetch(
    'https://graph.facebook.com',
    {
      method: 'POST',
      body: formData
    },
    rateLimiter,
    false // Batch requests are read calls
  )
}

/**
 * Get rate limiter instance for a specific account/user
 */
export function getRateLimiter(accountId: string, userId: string): MetaAPIRateLimiter {
  // For production, we should use Standard tier
  // For development/testing, use Development tier
  const tier = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'standard' : 'development'
  
  return new MetaAPIRateLimiter(accountId, userId, tier)
}