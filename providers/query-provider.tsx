"use client"

import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

// Create a client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: (failureCount, error) => {
        // Don't retry for client errors (4xx)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          return false
        }
        return failureCount < 3
      },
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Only refetch on window focus for critical data
      refetchOnWindowFocus: process.env.NODE_ENV === 'development',
      // Refetch on network reconnect
      refetchOnReconnect: true,
      // Disable background refetch by default for better performance
      refetchInterval: false,
      // Network mode for better offline handling
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations once for server errors only
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('HTTP 5')) {
          return failureCount < 1
        }
        return false
      },
      // Network mode for mutations
      networkMode: 'online',
      // Error handling
      onError: (error) => {
        console.error('Mutation error:', error)
        
        // Show user-friendly error message
        if (error instanceof Error) {
          // You can integrate with a toast library here
          console.error('User-facing error:', error.message)
        }
      },
    },
  },
})

interface QueryProviderProps {
  children: React.ReactNode
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Development tools - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
