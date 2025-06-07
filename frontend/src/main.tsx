import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { useAuth } from './store/useAuth'
import { setAuthToken } from './api/client'
import './styles/global.css'
import './styles/agile-workflow.css'

// Initialize auth token from storage
const initializeAuth = () => {
  console.log('Initializing authentication...')
  
  // First check zustand state
  const authState = useAuth.getState()
  if (authState.token) {
    console.log('Using token from auth state')
    setAuthToken(authState.token)
    return
  }
  
  // Fallback to localStorage if zustand hasn't hydrated yet
  const storedToken = localStorage.getItem('token')
  if (storedToken) {
    console.log('Using token from localStorage as fallback')
    setAuthToken(storedToken)
    return
  }
  
  // Also check the persisted auth storage
  const authStorage = localStorage.getItem('auth-storage')
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage)
      if (parsed.state?.token) {
        console.log('Using token from persisted auth storage')
        setAuthToken(parsed.state.token)
        return
      }
    } catch (error) {
      console.warn('Failed to parse auth storage:', error)
    }
  }
  
  console.log('No authentication token found')
}

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider 
        router={router} 
        fallbackElement={<HydrateFallback />}
      />
    </QueryClientProvider>
  </React.StrictMode>
)
