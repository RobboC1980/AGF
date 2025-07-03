import { z } from 'zod'

// Environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AI_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  FRONTEND_URL: z.string().url().optional(),
  PORT: z.string().transform(Number).default('8000'),
  HOST: z.string().default('0.0.0.0'),
  // Clerk environment variables
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  // Removed deprecated after sign-in/up URLs - use fallbackRedirectUrl on components instead
  // Supabase environment variables - optional during build
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
})

// Client-side environment schema (only public variables)
const clientEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  // Removed deprecated after sign-in/up URLs
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
})

function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      // During build time, be more lenient with missing environment variables
      const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV;
      if (isBuildTime) {
        console.warn('⚠️ Some environment variables are missing during build time. This is normal for Vercel builds.');
        // Return default values for build time
        return {
          NODE_ENV: 'production' as const,
          NEXT_PUBLIC_API_URL: undefined,
          DATABASE_URL: undefined,
          JWT_SECRET: undefined,
          OPENAI_API_KEY: undefined,
          ANTHROPIC_API_KEY: undefined,
          AI_PROVIDER: 'openai' as const,
          FRONTEND_URL: undefined,
          PORT: 8000,
          HOST: '0.0.0.0',
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: undefined,
          CLERK_SECRET_KEY: undefined,
          NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
          NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
          NEXT_PUBLIC_SUPABASE_URL: undefined,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
          SUPABASE_SERVICE_ROLE_KEY: undefined,
        };
      }
      
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
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('⚠️ Some client environment variables are missing or invalid:', error.errors)
    }
    return {
      NODE_ENV: 'development' as const,
      NEXT_PUBLIC_API_URL: undefined,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: '',
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
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
// Skip validation during build time to prevent build failures
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  validateEnv()
}

// Client-side environment variables
export const clientEnvRuntime = z.object({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  // Removed deprecated after sign-in/up URLs
})

// Test environment fallback
const testFallback = {
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  STRIPE_SECRET_KEY: 'sk_test_stripe_key',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_webhook_secret',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_stripe_key',
  OPENAI_API_KEY: 'sk-test-openai-key',
  ANTHROPIC_API_KEY: 'sk-ant-test-anthropic-key',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: '',
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  // Removed deprecated after sign-in/up URLs
}

// Development fallback values
const devFallback = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'your-service-role-key',
  NEXT_PUBLIC_SUPABASE_URL: 'https://your-project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your-anon-key',
  STRIPE_SECRET_KEY: 'sk_test_your_stripe_secret_key',
  STRIPE_WEBHOOK_SECRET: 'whsec_your_webhook_secret',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_your_stripe_publishable_key',
  OPENAI_API_KEY: 'sk-your-openai-api-key',
  ANTHROPIC_API_KEY: 'sk-ant-your-anthropic-api-key',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: undefined,
  CLERK_SECRET_KEY: undefined,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  // Removed deprecated after sign-in/up URLs
} 