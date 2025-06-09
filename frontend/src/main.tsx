import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { useAuth } from './store/useAuth'
import { apiClient } from './services/api'
import { initTheme } from './utils/theme'
import './styles/global.css'
import './styles/agile-workflow.css'
import './styles/modern.css'

// Apply saved theme preference
initTheme()

// Initialize auth token from storage
function initializeAuth() {
  const TOKEN_STORAGE_KEY = 'auth_token' // Standardized key
  const isDevelopment = import.meta.env.DEV

  if (isDevelopment) console.log('Initializing authentication...')
  
  // First check zustand state
  const authState = useAuth.getState()
  if (authState.token) {
    if (isDevelopment) console.log('Using token from auth state')
    apiClient.setToken(authState.token)
    return
  }
  
  // Fallback to localStorage if zustand hasn't hydrated yet
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (storedToken) {
    if (isDevelopment) console.log('Using token from localStorage as fallback')
    apiClient.setToken(storedToken)
    return
  }
  
  // Also check the persisted auth storage
  const authStorage = localStorage.getItem('auth-storage')
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage)
      if (parsed.state?.token) {
        if (isDevelopment) console.log('Using token from persisted auth storage')
        apiClient.setToken(parsed.state.token)
        return
      }
    } catch (error) {
      if (isDevelopment) console.warn('Failed to parse auth storage:', error)
    }
  }
  
  if (isDevelopment) console.log('No authentication token found')
}

// Initialize auth
initializeAuth()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// Add a fallback component for hydration
function HydrateFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px',
      color: '#666'
    }}>
      Loading AgileForge...
    </div>
  )
}

// Main App component
function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider 
          router={router} 
          fallbackElement={<HydrateFallback />}
        />
      </QueryClientProvider>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
