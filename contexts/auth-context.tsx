"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api, apiClient } from '@/services/api'
import { User } from '@/services/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>
  confirmPasswordReset: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>
}

interface RegisterData {
  username: string
  email: string
  password: string
  first_name: string
  last_name: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
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
        if (token) {
          // Set token in API client
          api.auth.setToken(token)
          
          // Verify token by fetching current user
          // Note: This would require a /api/me endpoint in the backend
          // For now, we'll assume token is valid if it exists
          // In a real app, you'd want to verify with the server
          
          // Mock user data - in real app, fetch from /api/me
          const mockUser: User = {
            id: 'current-user',
            username: 'current.user',
            email: 'user@company.com',
            first_name: 'Current',
            last_name: 'User',
            avatar_url: '/placeholder.svg?height=32&width=32',
            is_active: true,
            created_at: new Date().toISOString(),
          }
          setUser(mockUser)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        // Clear invalid token
        localStorage.removeItem('auth_token')
        api.auth.clearToken()
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      
      // Call login API - this would be a real API call
      // For now, we'll simulate successful login
      const mockToken = 'mock-jwt-token-' + Date.now()
      
      // Store token
      localStorage.setItem('auth_token', mockToken)
      api.auth.setToken(mockToken)
      
      // Mock user data - in real app, this would come from the login response
      const mockUser: User = {
        id: 'user-' + Date.now(),
        username: email.split('@')[0],
        email: email,
        first_name: 'Demo',
        last_name: 'User',
        avatar_url: '/placeholder.svg?height=32&width=32',
        is_active: true,
        created_at: new Date().toISOString(),
      }
      
      setUser(mockUser)
      
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
      
      // Call register API - this would be a real API call
      const mockToken = 'mock-jwt-token-' + Date.now()
      
      // Store token
      localStorage.setItem('auth_token', mockToken)
      api.auth.setToken(mockToken)
      
      // Create user from registration data
      const newUser: User = {
        id: 'user-' + Date.now(),
        username: userData.username,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        avatar_url: '/placeholder.svg?height=32&width=32',
        is_active: true,
        created_at: new Date().toISOString(),
      }
      
      setUser(newUser)
      
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

  const logout = (): void => {
    setUser(null)
    localStorage.removeItem('auth_token')
    api.auth.clearToken()
  }

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No user logged in' }
    }

    try {
      setIsLoading(true)
      
      // Call update profile API
      // For now, we'll simulate successful update
      const updatedUser = { ...user, ...data }
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
    if (!user) return

    try {
      // Refresh user data from API
      // For now, we'll just keep the current user
      console.log('Refreshing user data...')
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      setIsLoading(true)
      
      const response = await apiClient.requestPasswordReset(email)
      
      return { 
        success: true, 
        message: response.message 
      }
    } catch (error) {
      console.error('Password reset request failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Password reset request failed' 
      }
    } finally {
      setIsLoading(false)
    }
  }

  const confirmPasswordReset = async (token: string, newPassword: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      setIsLoading(true)
      
      const response = await apiClient.confirmPasswordReset(token, newPassword)
      
      return { 
        success: true, 
        message: response.message 
      }
    } catch (error) {
      console.error('Password reset confirmation failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Password reset failed' 
      }
    } finally {
      setIsLoading(false)
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
    confirmPasswordReset,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 