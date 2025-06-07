import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'

interface RateLimitConfig {
  windowMs: number
  max: number
  message: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// Different rate limits for different endpoint types
const RATE_LIMITS = {
  // AI endpoints - very restrictive due to cost
  ai: {
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: 'Too many AI requests. AI endpoints are rate limited to 5 requests per minute.',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  // Authentication endpoints - moderate limiting
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },
  // CRUD endpoints - generous but protective
  crud: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests. Please slow down.',
    skipSuccessfulRequests: false,
    skipFailedRequests: true
  },
  // General endpoints - very generous
  general: {
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute
    message: 'Rate limit exceeded. Please try again later.',
    skipSuccessfulRequests: false,
    skipFailedRequests: true
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  
  private getKey(ip: string, endpoint: string): string {
    return `${ip}:${endpoint}`
  }
  
  private cleanupExpired(): void {
    const now = Date.now()
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    })
  }
  
  check(ip: string, endpoint: string, config: RateLimitConfig): boolean {
    this.cleanupExpired()
    
    const key = this.getKey(ip, endpoint)
    const now = Date.now()
    
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 1,
        resetTime: now + config.windowMs
      }
      return true
    }
    
    if (this.store[key].count >= config.max) {
      return false
    }
    
    this.store[key].count++
    return true
  }
  
  getRemainingRequests(ip: string, endpoint: string, config: RateLimitConfig): number {
    const key = this.getKey(ip, endpoint)
    const record = this.store[key]
    
    if (!record || record.resetTime < Date.now()) {
      return config.max
    }
    
    return Math.max(0, config.max - record.count)
  }
  
  getResetTime(ip: string, endpoint: string): number {
    const key = this.getKey(ip, endpoint)
    const record = this.store[key]
    
    if (!record || record.resetTime < Date.now()) {
      return Date.now()
    }
    
    return record.resetTime
  }
}

const rateLimiter = new RateLimiter()

function determineRateLimit(path: string): RateLimitConfig {
  // AI endpoints - most restrictive
  if (path.startsWith('/ai/')) {
    return RATE_LIMITS.ai
  }
  
  // Authentication endpoints
  if (path === '/login' || path === '/register') {
    return RATE_LIMITS.auth
  }
  
  // CRUD endpoints
  const crudPaths = ['/projects', '/epics', '/stories', '/tasks', '/sprints', '/initiatives', '/risks', '/okrs']
  if (crudPaths.some(crudPath => path.startsWith(crudPath))) {
    return RATE_LIMITS.crud
  }
  
  // Default to general rate limit
  return RATE_LIMITS.general
}

async function rateLimitPlugin(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip
    const path = request.url.split('?')[0] // Remove query parameters
    const method = request.method
    
    // Skip rate limiting for health checks and admin endpoints
    if (path === '/health' || path === '/' || path.startsWith('/admin/')) {
      return
    }
    
    const config = determineRateLimit(path)
    const endpointKey = `${method}:${path}`
    
    const allowed = rateLimiter.check(ip, endpointKey, config)
    
    if (!allowed) {
      const remaining = rateLimiter.getRemainingRequests(ip, endpointKey, config)
      const resetTime = rateLimiter.getResetTime(ip, endpointKey)
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
      
      reply.status(429)
      reply.header('X-RateLimit-Limit', config.max)
      reply.header('X-RateLimit-Remaining', remaining)
      reply.header('X-RateLimit-Reset', resetTime)
      reply.header('Retry-After', retryAfter)
      
      throw new Error(config.message)
    }
    
    // Add rate limit headers to successful requests
    const remaining = rateLimiter.getRemainingRequests(ip, endpointKey, config)
    const resetTime = rateLimiter.getResetTime(ip, endpointKey)
    
    reply.header('X-RateLimit-Limit', config.max)
    reply.header('X-RateLimit-Remaining', remaining)
    reply.header('X-RateLimit-Reset', resetTime)
  })
  
  // Rate limit status endpoint moved to main index.ts to avoid conflicts
}

export default fp(rateLimitPlugin, {
  name: 'rate-limit'
}) 