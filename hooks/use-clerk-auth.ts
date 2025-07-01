import { useAuth, useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Defensive environment variable access with fallbacks for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export function useClerkAuth() {
  const { isLoaded, userId, sessionId, getToken } = useAuth()
  const { isLoaded: isUserLoaded, user } = useUser()
  const [supabaseToken, setSupabaseToken] = useState<string | null>(null)

  useEffect(() => {
    const getSupabaseToken = async () => {
      if (isLoaded && userId) {
        try {
          // Get the Clerk session token that can be used with Supabase
          const token = await getToken({ template: 'supabase' })
          setSupabaseToken(token)
        } catch (error) {
          console.error('Error getting Supabase token:', error)
          setSupabaseToken(null)
        }
      } else {
        setSupabaseToken(null)
      }
    }

    getSupabaseToken()
  }, [isLoaded, userId, getToken])

  // Create Supabase client with Clerk auth token
  // Only create if we have valid environment variables
  const supabase = (supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key') 
    ? createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: supabaseToken ? {
            Authorization: `Bearer ${supabaseToken}`,
          } : {},
        },
      })
    : null

  return {
    isLoaded: isLoaded && isUserLoaded,
    isAuthenticated: !!userId,
    user: user ? {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: user.fullName || user.firstName || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      imageUrl: user.imageUrl,
    } : null,
    supabase,
    supabaseToken,
    clerkUser: user,
  }
} 