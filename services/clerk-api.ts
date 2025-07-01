import { auth } from '@clerk/nextjs'

interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Enhanced API client with Clerk authentication
class ClerkApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  // Get Clerk auth token from the current session
  private async getAuthToken(): Promise<string | null> {
    if (typeof window === 'undefined') {
      // Server-side: use auth() from Clerk
      try {
        const { getToken } = auth()
        return await getToken()
      } catch (error) {
        console.error('Failed to get server-side auth token:', error)
        return null
      }
    } else {
      // Client-side: will be handled by the auth hook
      return null
    }
  }

  // Make authenticated request
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    authToken?: string
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    // Get auth token if not provided
    let token = authToken
    if (!token) {
      token = await this.getAuthToken()
    }

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }

    try {
      console.log(`API Request: ${config.method || 'GET'} ${url}`)
      const response = await fetch(url, config)
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.text()
          errorMessage += `: ${errorData}`
        } catch {
          errorMessage += ': Unknown error'
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log(`API Response: ${config.method || 'GET'} ${url} - Success`)
      return data
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error)
      
      // Provide user-friendly error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Please check your internet connection.')
      }
      
      if (error instanceof Error && error.message.includes('HTTP 401')) {
        throw new Error('Authentication failed. Please sign in again.')
      }
      
      if (error instanceof Error && error.message.includes('HTTP 403')) {
        throw new Error('Access denied. You do not have permission to perform this action.')
      }
      
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        throw new Error('Resource not found.')
      }
      
      if (error instanceof Error && error.message.includes('HTTP 5')) {
        throw new Error('Server error. Please try again later.')
      }
      
      throw error
    }
  }

  // GET request
  async get<T>(endpoint: string, authToken?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, authToken)
  }

  // POST request
  async post<T>(endpoint: string, data?: any, authToken?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, authToken)
  }

  // PUT request
  async put<T>(endpoint: string, data?: any, authToken?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, authToken)
  }

  // DELETE request
  async delete<T>(endpoint: string, authToken?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, authToken)
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any, authToken?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }, authToken)
  }

  // Health check
  async healthCheck(): Promise<{ status: string; environment: string; version: string }> {
    return this.request("/health")
  }
}

// Create a singleton instance
export const clerkApiClient = new ClerkApiClient(API_BASE_URL)

// Hook to create API client with Clerk auth token
export function useClerkApiClient(authToken?: string) {
  const client = new ClerkApiClient(API_BASE_URL)
  
  // Wrapper methods that include the auth token
  return {
    get: <T>(endpoint: string) => client.get<T>(endpoint, authToken),
    post: <T>(endpoint: string, data?: any) => client.post<T>(endpoint, data, authToken),
    put: <T>(endpoint: string, data?: any) => client.put<T>(endpoint, data, authToken),
    delete: <T>(endpoint: string) => client.delete<T>(endpoint, authToken),
    patch: <T>(endpoint: string, data?: any) => client.patch<T>(endpoint, data, authToken),
    healthCheck: () => client.healthCheck(),
  }
}

// Re-export types from the original API service
export type { 
  ApiResponse,
  Story,
  Epic,
  Project,
  User,
  Task,
  Sprint,
  Team,
  TeamMember,
  AnalyticsOverview 
} from './api' 