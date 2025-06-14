"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { apiClient } from '@/services/api'
import { User } from '@/services/api'

// Get API base URL - hardcoded to ensure correct port
const API_BASE_URL = 'http://localhost:8000'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
}

interface RegisterData {
  email: string
  name: string
  password: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (token && token !== 'demo') {
          // Set token in API client
          apiClient.setAuthToken(token)
          
          // Verify token by fetching current user
          try {
            const userData = await apiClient.getCurrentUser()
            setUser(userData)
          } catch (error) {
            console.log('Token verification failed, using demo mode')
            // Clear invalid token
            localStorage.removeItem('auth_token')
            apiClient.clearAuth()
            
            // Set demo token for demo mode
            apiClient.setAuthToken('demo')
            localStorage.setItem('auth_token', 'demo')
          }
        } else {
          // Demo mode - set demo token
          apiClient.setAuthToken('demo')
          localStorage.setItem('auth_token', 'demo')
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        // Fallback to demo mode
        apiClient.setAuthToken('demo')
        localStorage.setItem('auth_token', 'demo')
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      
      // For demo mode, just set demo user
      if (email === 'demo@agileforge.com' || !email || !password) {
        apiClient.setAuthToken('demo')
        localStorage.setItem('auth_token', 'demo')
        setUser({
          id: 'demo-user',
          username: 'demo',
          email: 'demo@agileforge.com',
          first_name: 'Demo',
          last_name: 'User',
          is_active: true,
          created_at: new Date().toISOString()
        })
        return { success: true }
      }
      
      // Call real login API
      const loginData = await apiClient.login(email, password)
      
      // Get user data
      const userData = await apiClient.getCurrentUser()
      setUser(userData)
      
      return { success: true }
    } catch (error) {
      console.error('Login failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      
      // Call real register API
      const registerData = await apiClient.register(userData.email, userData.name, userData.password)
      
      // Get user data
      const userResponse = await apiClient.getCurrentUser()
      setUser(userResponse)
      
      return { success: true }
    } catch (error) {
      console.error('Registration failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    apiClient.logout()
    // Set back to demo mode
    apiClient.setAuthToken('demo')
    localStorage.setItem('auth_token', 'demo')
  }

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No user logged in' }
    }

    try {
      setIsLoading(true)
      
      // For demo user, just update locally
      if (user.id === 'demo-user') {
        const updatedUser = { ...user, ...data }
        setUser(updatedUser)
        return { success: true }
      }
      
      // Call update profile API
      const response = await apiClient.request("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          name: data.first_name && data.last_name ? `${data.first_name} ${data.last_name}`.trim() : undefined,
          avatar_url: data.avatar_url,
        }),
      })
      
      const updatedUser = {
        ...user,
        ...data
      }
      setUser(updatedUser)
      
      return { success: true }
    } catch (error) {
      console.error('Profile update failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Profile update failed' 
      }
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async (): Promise<void> => {
    if (!user || user.id === 'demo-user') return

    try {
      const userData = await apiClient.getCurrentUser()
      setUser(userData)
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiClient.request("/api/auth/password-reset", {
        method: "POST",
        body: JSON.stringify({ email }),
      })

      return { success: true }
    } catch (error) {
      console.error('Password reset request failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Password reset request failed' 
      }
    }
  }

  const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiClient.request("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, new_password: newPassword }),
      })

      return { success: true }
    } catch (error) {
      console.error('Password reset failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Password reset failed' 
      }
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    requestPasswordReset,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 