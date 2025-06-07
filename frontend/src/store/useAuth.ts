import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '../services/api'

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

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,

      async login(email, password) {
        set({ isLoading: true, error: null })
        console.log('Auth store login called with:', email)
        try {
          console.log('Making API call to /auth/login...')
          const response = await apiClient.login(email, password)
          console.log('Login API response:', response)
          const { token, user } = response
          
          console.log('Setting auth token and updating state...')
          apiClient.setToken(token)
          
          // Immediately save to localStorage to prevent timing issues
          localStorage.setItem('token', token)
          
          set({ 
            token, 
            user, 
            isLoading: false,
            error: null 
          })
          console.log('Auth state updated successfully')
          console.log('Token saved to localStorage:', localStorage.getItem('token') ? 'success' : 'failed')
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
        localStorage.removeItem('token')
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
          console.log('Restoring auth token from storage')
          apiClient.setToken(state.token)
        } else {
          // Fallback: check if token exists in localStorage directly
          const directToken = localStorage.getItem('token')
          if (directToken) {
            console.log('Using fallback token from localStorage')
            apiClient.setToken(directToken)
            // Update the state with the fallback token
            setTimeout(() => {
              const currentState = useAuth.getState()
              if (!currentState.token && directToken) {
                console.log('Setting state with fallback token')
                useAuth.setState({ token: directToken })
              }
            }, 100)
          }
        }
      }
    }
  )
)
