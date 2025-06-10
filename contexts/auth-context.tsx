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
          
          // Verify token by fetching current user from backend
          try {
            const currentUser = await apiClient.getCurrentUser()
            
            // Convert backend user format to frontend User format
            const frontendUser: User = {
              id: currentUser.id,
              username: currentUser.name,
              email: currentUser.email,
              first_name: currentUser.name.split(' ')[0] || currentUser.name,
              last_name: currentUser.name.split(' ').slice(1).join(' ') || '',
              avatar_url: currentUser.avatar_url || '/placeholder.svg?height=32&width=32',
              is_active: true,
              created_at: new Date().toISOString(),
            }
            setUser(frontendUser)
          } catch (error) {
            // Token is invalid, clear it
            console.error('Token verification failed:', error)
            localStorage.removeItem('auth_token')
            api.auth.clearToken()
          }
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
      
      // Call the real login API
      const response = await apiClient.login(email, password)
      
      // Store token
      localStorage.setItem('auth_token', response.access_token)
      api.auth.setToken(response.access_token)
      
      // Convert backend user format to frontend User format
      const frontendUser: User = {
        id: response.user.id,
        username: response.user.name, // Backend uses 'name', frontend expects 'username'
        email: response.user.email,
        first_name: response.user.name.split(' ')[0] || response.user.name,
        last_name: response.user.name.split(' ').slice(1).join(' ') || '',
        avatar_url: response.user.avatar_url || '/placeholder.svg?height=32&width=32',
        is_active: true,
        created_at: new Date().toISOString(),
      }
      
      setUser(frontendUser)
      
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
      
      // Call the real register API
      const response = await apiClient.register(
        userData.email,
        `${userData.first_name} ${userData.last_name}`, // Backend expects full name
        userData.password
      )
      
      // Store token
      localStorage.setItem('auth_token', response.access_token)
      api.auth.setToken(response.access_token)
      
      // Convert backend user format to frontend User format
      const frontendUser: User = {
        id: response.user.id,
        username: userData.username || response.user.name,
        email: response.user.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        avatar_url: response.user.avatar_url || '/placeholder.svg?height=32&width=32',
        is_active: true,
        created_at: new Date().toISOString(),
      }
      
      setUser(frontendUser)
      
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