import { z } from 'zod'

// Environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AI_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  FRONTEND_URL: z.string().url().optional(),
  PORT: z.string().transform(Number).default('8000'),
  HOST: z.string().default('0.0.0.0'),
})

// Client-side environment schema (only public variables)
const clientEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
})

function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      throw new Error(
        `❌ Invalid environment variables:\n${missingVars.join('\n')}\n\n` +
        `💡 Please check your .env file and ensure all required variables are set.`
      )
    }
    throw error
  }
}

function validateClientEnv() {
  try {
    return clientEnvSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('⚠️ Some client environment variables are missing or invalid:', error.errors)
    }
    return {
      NODE_ENV: 'development' as const,
      NEXT_PUBLIC_API_URL: undefined,
    }
  }
}

// Server-side environment (all variables)
export const env = typeof window === 'undefined' ? validateEnv() : {} as ReturnType<typeof validateEnv>

// Client-side environment (only public variables)
export const clientEnv = validateClientEnv()

// Utility functions
export function isDevelopment() {
  return (typeof window === 'undefined' ? env.NODE_ENV : clientEnv.NODE_ENV) === 'development'
}

export function isProduction() {
  return (typeof window === 'undefined' ? env.NODE_ENV : clientEnv.NODE_ENV) === 'production'
}

export function getApiUrl() {
  if (typeof window !== 'undefined') {
    return clientEnv.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  }
  return env.FRONTEND_URL || 'http://localhost:8000'
}

// Environment validation on module load (server-side only)
if (typeof window === 'undefined') {
  validateEnv()
} 