import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address')

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const uuidSchema = z.string().uuid('Invalid UUID format')

export const dateSchema = z.string().datetime('Invalid date format')

export const urlSchema = z.string().url('Invalid URL format')

// Entity validation schemas
export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name too long'),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on-hold', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  budget: z.number().positive().optional(),
  teamId: uuidSchema.optional()
})

export const epicSchema = z.object({
  title: z.string().min(1, 'Epic title is required').max(500, 'Epic title too long'),
  description: z.string().optional(),
  projectId: uuidSchema,
  status: z.enum(['backlog', 'in-progress', 'review', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  estimatedStoryPoints: z.number().int().min(0).max(1000).optional()
})

export const storySchema = z.object({
  title: z.string().min(1, 'Story title is required').max(500, 'Story title too long'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().min(1, 'Acceptance criteria is required'),
  epicId: uuidSchema,
  status: z.enum(['backlog', 'ready', 'in-progress', 'review', 'testing', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  storyPoints: z.number().int().min(1).max(21).optional(),
  assigneeId: uuidSchema.optional(),
  sprintId: uuidSchema.optional(),
  tags: z.array(z.string()).optional()
})

export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500, 'Task title too long'),
  description: z.string().optional(),
  storyId: uuidSchema,
  status: z.enum(['todo', 'in-progress', 'review', 'done', 'blocked']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  assigneeId: uuidSchema.optional(),
  estimatedHours: z.number().positive().max(100),
  dueDate: dateSchema.optional()
})

export const sprintSchema = z.object({
  name: z.string().min(1, 'Sprint name is required').max(200, 'Sprint name too long'),
  goal: z.string().optional(),
  projectId: uuidSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  teamCapacity: z.number().positive().optional(),
  plannedStoryPoints: z.number().int().positive().optional()
})

// User input validation
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  avatarUrl: urlSchema.optional()
})

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export const userProfileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: urlSchema.optional(),
  bio: z.string().max(500).optional(),
  jobTitle: z.string().max(100).optional(),
  timezone: z.string().optional()
})

// Search and filter validation
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(200),
  filters: z.object({
    status: z.array(z.string()).optional(),
    priority: z.array(z.string()).optional(),
    assignee: z.array(uuidSchema).optional(),
    project: z.array(uuidSchema).optional(),
    dateRange: z.object({
      start: dateSchema,
      end: dateSchema
    }).optional()
  }).optional(),
  sort: z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc'])
  }).optional(),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive().max(100)
  }).optional()
})

// AI request validation
export const aiStoryGenerationSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters'),
  epicId: uuidSchema.optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  includeAcceptanceCriteria: z.boolean().optional(),
  includeTags: z.boolean().optional()
})

export const aiProjectGenerationSchema = z.object({
  description: z.string().min(20, 'Description must be at least 20 characters'),
  domain: z.string().optional(),
  teamSize: z.number().int().positive().max(100).optional(),
  timeline: z.string().optional(),
  technologyStack: z.string().optional(),
  businessObjectives: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional()
})

// Utility functions
export function validateEmail(email: string): boolean {
  try {
    emailSchema.parse(email)
    return true
  } catch {
    return false
  }
}

export function validatePassword(password: string): { valid: boolean; errors?: string[] } {
  try {
    passwordSchema.parse(password)
    return { valid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => e.message)
      }
    }
    return { valid: false, errors: ['Invalid password'] }
  }
}

export function sanitizeInput(input: string): string {
  // Remove potential XSS vectors
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    // Sanitize string fields
    const sanitized = sanitizeObject(data)
    
    // Validate with schema
    const validated = schema.parse(sanitized)
    
    return {
      success: true,
      data: validated
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }
    }
    return {
      success: false,
      errors: ['Validation failed']
    }
  }
}

function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeInput(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  
  return obj
}

// Rate limiting helpers
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>()
  
  return {
    check(identifier: string): boolean {
      const now = Date.now()
      const userRequests = requests.get(identifier) || []
      
      // Remove old requests
      const validRequests = userRequests.filter(time => now - time < windowMs)
      
      if (validRequests.length >= maxRequests) {
        return false
      }
      
      validRequests.push(now)
      requests.set(identifier, validRequests)
      
      return true
    },
    
    reset(identifier: string) {
      requests.delete(identifier)
    }
  }
}

// SQL injection prevention
export function escapeSqlIdentifier(identifier: string): string {
  // Only allow alphanumeric characters and underscores
  return identifier.replace(/[^a-zA-Z0-9_]/g, '')
}

export function buildSafeQuery(
  baseQuery: string,
  params: Record<string, unknown>
): { query: string; values: unknown[] } {
  const values: unknown[] = []
  let paramIndex = 1
  
  const query = baseQuery.replace(/:(\w+)/g, (match, paramName) => {
    if (params.hasOwnProperty(paramName)) {
      values.push(params[paramName])
      return `$${paramIndex++}`
    }
    return match
  })
  
  return { query, values }
} 