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
          apiClient.setAuthToken(token)
          
          // Verify token by fetching current user
          try {
            const response = await fetch('http://localhost:8000/auth/me', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (response.ok) {
              const userData = await response.json()
              setUser({
                id: userData.id,
                username: userData.email.split('@')[0],
                email: userData.email,
                first_name: userData.name.split(' ')[0] || 'User',
                last_name: userData.name.split(' ').slice(1).join(' ') || '',
                avatar_url: userData.avatar_url,
                is_active: userData.is_active,
                created_at: userData.created_at,
              })
            } else {
              // Token is invalid, clear it
              localStorage.removeItem('auth_token')
              apiClient.clearAuth()
            }
          } catch (error) {
            console.error('Failed to verify token:', error)
            localStorage.removeItem('auth_token')
            apiClient.clearAuth()
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        localStorage.removeItem('auth_token')
        apiClient.clearAuth()
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      
      // Call real login API
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        return { 
          success: false, 
          error: errorData.detail || 'Login failed' 
        }
      }
      
      const loginData = await response.json()
      const token = loginData.access_token
      
      // Store token
      localStorage.setItem('auth_token', token)
      apiClient.setAuthToken(token)
      
      // Get user data
      const userResponse = await fetch('http://localhost:8000/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser({
          id: userData.id,
          username: userData.email.split('@')[0],
          email: userData.email,
          first_name: userData.name.split(' ')[0] || 'User',
          last_name: userData.name.split(' ').slice(1).join(' ') || '',
          avatar_url: userData.avatar_url,
          is_active: userData.is_active,
          created_at: userData.created_at,
        })
      }
      
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
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          name: `${userData.first_name} ${userData.last_name}`.trim(),
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        return { 
          success: false, 
          error: errorData.detail || 'Registration failed' 
        }
      }
      
      const registrationData = await response.json()
      
      // Auto-login after successful registration
      return await login(userData.email, userData.password)
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
    apiClient.clearAuth()
  }

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No user logged in' }
    }

    try {
      setIsLoading(true)
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return { success: false, error: 'No authentication token' }
      }
      
      // Call update profile API
      const response = await fetch('http://localhost:8000/auth/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.first_name && data.last_name ? `${data.first_name} ${data.last_name}`.trim() : undefined,
          avatar_url: data.avatar_url,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        return { 
          success: false, 
          error: errorData.detail || 'Profile update failed' 
        }
      }
      
      const updatedData = await response.json()
      const updatedUser = {
        ...user,
        first_name: updatedData.name.split(' ')[0] || user.first_name,
        last_name: updatedData.name.split(' ').slice(1).join(' ') || user.last_name,
        avatar_url: updatedData.avatar_url,
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
    if (!user) return

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return
      
      const response = await fetch('http://localhost:8000/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser({
          id: userData.id,
          username: userData.email.split('@')[0],
          email: userData.email,
          first_name: userData.name.split(' ')[0] || 'User',
          last_name: userData.name.split(' ').slice(1).join(' ') || '',
          avatar_url: userData.avatar_url,
          is_active: userData.is_active,
          created_at: userData.created_at,
        })
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 