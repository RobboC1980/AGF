import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '../services/api'

const TOKEN_STORAGE_KEY = 'auth_token' // Standardized key matching API client

interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  token: string | null
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

const isDevelopment = import.meta.env.DEV

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,

      async login(email, password) {
        set({ isLoading: true, error: null })
        if (isDevelopment) console.log('Auth store login called with:', email)
        try {
          if (isDevelopment) console.log('Making API call to /auth/login...')
          const response = await apiClient.login(email, password)
          if (isDevelopment) console.log('Login API response:', response)
          const { token, user } = response
          
          apiClient.setToken(token)
          
          // Save to localStorage with standardized key
          localStorage.setItem(TOKEN_STORAGE_KEY, token)
          
          set({ 
            token, 
            user, 
            isLoading: false,
            error: null 
          })
          if (isDevelopment) console.log('Auth state updated successfully')
        } catch (error: any) {
          console.error('Auth store login error:', error)
          const errorMessage = error.message || 'Login failed'
          set({ 
            isLoading: false, 
            error: errorMessage,
            token: null,
            user: null
          })
          throw new Error(errorMessage)
        }
      },

      async register(email, password, name) {
        set({ isLoading: true, error: null })
        try {
          await apiClient.register(email, password, name)
          // Auto-login after successful registration
          await get().login(email, password)
        } catch (error: any) {
          const errorMessage = error.message || 'Registration failed'
          set({ 
            isLoading: false, 
            error: errorMessage 
          })
          throw new Error(errorMessage)
        }
      },

      logout() {
        apiClient.clearToken()
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        localStorage.removeItem('auth-storage')
        set({ 
          token: null, 
          user: null,
          error: null
        })
      },

      clearError() {
        set({ error: null })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user 
      }),
      onRehydrateStorage: () => (state) => {
        // Restore auth token on app start
        if (state?.token) {
          if (isDevelopment) console.log('Restoring auth token from storage')
          apiClient.setToken(state.token)
        } else {
          // Fallback: check if token exists in localStorage directly
          const directToken = localStorage.getItem(TOKEN_STORAGE_KEY)
          if (directToken) {
            if (isDevelopment) console.log('Using fallback token from localStorage')
            apiClient.setToken(directToken)
            // Update the state with the fallback token
            setTimeout(() => {
              const currentState = useAuth.getState()
              if (!currentState.token && directToken) {
                if (isDevelopment) console.log('Setting state with fallback token')
                useAuth.setState({ token: directToken })
              }
            }, 100)
          }
        }
      }
    }
  )
)
