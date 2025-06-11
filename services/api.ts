interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

interface Story {
  id: string
  name: string
  description?: string
  acceptanceCriteria?: string
  storyPoints?: number
  priority: "low" | "medium" | "high" | "critical"
  status: "backlog" | "ready" | "in-progress" | "review" | "done"
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  epic?: {
    id: string
    name: string
    color: string
    project: {
      id: string
      name: string
    }
  }
  tags?: string[]
  stats?: {
    totalTasks: number
    completedTasks: number
    completionPercentage: number
    comments: number
    attachments: number
  }
  createdAt: string
  updatedAt: string
  dueDate?: string
}

interface Epic {
  id: string
  name: string
  color: string
  project: {
    id: string
    name: string
  }
}

interface User {
  id: string
  name: string
  avatar?: string
  email: string
}

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Enhanced API client with authentication and error handling
class ApiClient {
  private baseURL: string
  private authToken: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    
    // Try to get auth token from localStorage (in browser)
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('auth_token')
    }
  }

  // Set authentication token
  setAuthToken(token: string) {
    this.authToken = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  // Alias for compatibility
  setToken(token: string) {
    this.setAuthToken(token)
  }

  // Clear authentication
  clearAuth() {
    this.authToken = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  // Make authenticated request
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
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
        // Clear invalid token and redirect to login
        this.clearAuth()
        throw new Error('Authentication failed. Please log in again.')
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
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Authentication API
  async login(
    email: string,
    password: string,
  ): Promise<{
    access_token: string
    token_type: string
    user: User
  }> {
    const response = await this.request<{
      access_token: string
      token_type: string
      user: User
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })

    // Store token
    this.setAuthToken(response.access_token)

    return response
  }

  async register(
    email: string,
    name: string,
    password: string,
  ): Promise<{
    access_token: string
    token_type: string
    user: User
  }> {
    const response = await this.request<{
      access_token: string
      token_type: string
      user: User
    }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, name, password }),
    })

    // Store token
    this.setAuthToken(response.access_token)

    return response
  }

  async getCurrentUser(): Promise<User> {
    return this.request("/api/auth/me")
  }

  async logout() {
    this.clearAuth()
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await this.request<{ message: string }>("/api/auth/password-reset-request", {
      method: "POST",
      body: JSON.stringify({ email }),
    })

    return response
  }

  async confirmPasswordReset(token: string, new_password: string): Promise<{ message: string }> {
    const response = await this.request<{ message: string }>("/api/auth/password-reset-confirm", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    })

    return response
  }

  // Stories API
  async getStories(): Promise<ApiResponse<{ stories: Story[] }>> {
    return this.request("/api/stories")
  }

  async getStory(id: string): Promise<ApiResponse<Story>> {
    return this.request(`/api/stories/${id}`)
  }

  async createStory(story: Partial<Story>): Promise<ApiResponse<Story>> {
    return this.request("/api/stories", {
      method: "POST",
      body: JSON.stringify(story),
    })
  }

  async updateStory(id: string, story: Partial<Story>): Promise<ApiResponse<Story>> {
    return this.request(`/api/stories/${id}`, {
      method: "PUT",
      body: JSON.stringify(story),
    })
  }

  async deleteStory(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/stories/${id}`, {
      method: "DELETE",
    })
  }

  async bulkDeleteStories(ids: string[]): Promise<ApiResponse<void>> {
    return this.request("/api/stories/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    })
  }

  async bulkUpdateStories(ids: string[], updates: Partial<Story>): Promise<ApiResponse<Story[]>> {
    return this.request("/api/stories/bulk-update", {
      method: "POST",
      body: JSON.stringify({ ids, updates }),
    })
  }

  async generateStory(request: {
    description: string
    priority?: string
    epicId?: string
    includeAcceptanceCriteria?: boolean
    includeTags?: boolean
  }): Promise<{
    success: boolean
    story: {
      name: string
      description: string
      acceptanceCriteria: string[]
      tags: string[]
      storyPoints?: number
    }
    provider: string
    model: string
    confidence?: number
    suggestions?: string[]
  }> {
    return this.request("/api/stories/generate", {
      method: "POST",
      body: JSON.stringify(request),
    })
  }

  // Epics API
  async getEpics(): Promise<ApiResponse<{ epics: Epic[] }>> {
    return this.request("/api/epics")
  }

  // Users API
  async getUsers(): Promise<ApiResponse<{ users: User[] }>> {
    return this.request("/api/users")
  }

  // Analytics API
  async getStoryStats(): Promise<
    ApiResponse<{
      total: number
      completed: number
      inProgress: number
      totalPoints: number
      completedPoints: number
    }>
  > {
    return this.request("/api/stories/stats")
  }

  // Health check
  async healthCheck(): Promise<{ status: string; environment: string; version: string }> {
    return this.request("/health")
  }
}

// Create API client instance
const apiClient = new ApiClient(API_BASE_URL)

// Type definitions matching backend models
export interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  avatar_url?: string
  is_active: boolean
  created_at: string
}

export interface Project {
  id: string
  name: string
  key: string
  description?: string
  status: 'backlog' | 'todo' | 'ready' | 'in-progress' | 'review' | 'testing' | 'done' | 'closed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  start_date?: string
  target_end_date?: string
  progress: number
  created_by: string
  created_at: string
  updated_at?: string
}

export interface Epic {
  id: string
  project_id: string
  title: string
  description?: string
  epic_key: string
  status: 'backlog' | 'todo' | 'ready' | 'in-progress' | 'review' | 'testing' | 'done' | 'closed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  start_date?: string
  target_end_date?: string
  estimated_story_points?: number
  actual_story_points: number
  progress: number
  created_by: string
  created_at: string
  updated_at?: string
}

export interface Story {
  id: string
  epic_id: string
  title: string
  description?: string
  story_key: string
  as_a?: string
  i_want?: string
  so_that?: string
  acceptance_criteria: string
  status: 'backlog' | 'todo' | 'ready' | 'in-progress' | 'review' | 'testing' | 'done' | 'closed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  story_points?: number
  assignee_id?: string
  due_date?: string
  created_by: string
  created_at: string
  updated_at?: string
}

export interface Task {
  id: string
  story_id: string
  title: string
  description?: string
  task_key: string
  status: 'backlog' | 'todo' | 'ready' | 'in-progress' | 'review' | 'testing' | 'done' | 'closed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee_id?: string
  estimated_hours: number
  actual_hours: number
  due_date?: string
  created_by: string
  created_at: string
  updated_at?: string
}

export interface AnalyticsOverview {
  total_stories: number
  completed_stories: number
  in_progress_stories: number
  total_story_points: number
  completed_story_points: number
  completion_rate: number
  average_story_points: number
  stories_by_status: Record<string, number>
  stories_by_priority: Record<string, number>
}

export interface SearchResult {
  id: string
  type: 'project' | 'epic' | 'story' | 'task'
  title: string
  description?: string
  key: string
  status: string
  priority: string
}

// API service object with all endpoints
export const api = {
  // Authentication
  auth: {
    setToken: (token: string) => apiClient.setAuthToken(token),
    clearToken: () => apiClient.clearAuth(),
  },

  // Health check
  health: {
    check: () => apiClient.get<{ status: string; timestamp: string }>('/health'),
    status: () => apiClient.get<{ status: string; entities: Record<string, number> }>('/api/status'),
  },

  // Users
  users: {
    getAll: async () => {
      const users = await apiClient.get<User[]>('/api/users');
      
      // Transform backend format to frontend format
      // Backend returns first_name/last_name but frontend expects name
      return users.map(user => ({
        ...user,
        name: `${user.first_name} ${user.last_name}`,
        avatar: user.avatar_url, // Also map avatar_url to avatar
      })) as any;
    },
    getById: (id: string) => apiClient.get<User>(`/api/users/${id}`),
    create: (data: Omit<User, 'id' | 'created_at'>) => apiClient.post<User>('/api/users', data),
    update: (id: string, data: Partial<User>) => apiClient.put<User>(`/api/users/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/users/${id}`),
  },

  // Projects
  projects: {
    getAll: () => apiClient.get<Project[]>('/api/projects'),
    getById: (id: string) => apiClient.get<Project>(`/api/projects/${id}`),
    create: (data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => 
      apiClient.post<Project>('/api/projects', data),
    update: (id: string, data: Partial<Project>) => apiClient.put<Project>(`/api/projects/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/projects/${id}`),
  },

  // Epics
  epics: {
    getAll: async (projectId?: string) => {
      // Ensure projectId is a string or null, not an object
      const validProjectId = projectId && typeof projectId === 'string' ? projectId : undefined;
      const epics = await apiClient.get<Epic[]>(`/api/epics${validProjectId ? `?project_id=${validProjectId}` : ''}`);
      
      // Transform backend format to frontend format
      // Backend returns 'title' but frontend expects 'name'
      return epics.map(epic => ({
        ...epic,
        name: epic.title, // Add name field for frontend compatibility
      })) as any;
    },
    getById: (id: string) => apiClient.get<Epic>(`/api/epics/${id}`),
    create: (data: Omit<Epic, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'epic_key' | 'actual_story_points' | 'progress'>) => 
      apiClient.post<Epic>('/api/epics', data),
    update: (id: string, data: Partial<Epic>) => apiClient.put<Epic>(`/api/epics/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/epics/${id}`),
  },

  // Stories
  stories: {
    getAll: async (epicId?: string) => {
      // Ensure epicId is a string or null, not an object
      const validEpicId = epicId && typeof epicId === 'string' ? epicId : undefined;
      const stories = await apiClient.get<Story[]>(`/api/stories${validEpicId ? `?epic_id=${validEpicId}` : ''}`);
      
      // Transform backend format to frontend format
      // Backend returns 'title' but some frontend components expect 'name'
      // Also need to transform nested epic and assignee data
      return stories.map(story => ({
        ...story,
        name: story.title, // Add name field for frontend compatibility
        // Transform assignee if present
        assignee: story.assignee_id ? {
          id: story.assignee_id,
          name: 'Unknown User', // This will be replaced with actual user data
          avatar: '/placeholder.svg?height=32&width=32'
        } : undefined,
        // Add epic details if needed
        epic: story.epic_id ? {
          id: story.epic_id,
          name: 'Unknown Epic', // This will be replaced with actual epic data
          color: 'bg-blue-500',
          project: {
            id: 'proj-1',
            name: 'E-commerce Platform'
          }
        } : undefined,
        // Transform dates
        createdAt: story.created_at,
        updatedAt: story.updated_at || story.created_at,
        dueDate: story.due_date,
        // Add stats
        stats: {
          totalTasks: 0,
          completedTasks: 0,
          completionPercentage: 0,
          comments: 0,
          attachments: 0
        }
      })) as any;
    },
    getById: (id: string) => apiClient.get<Story>(`/api/stories/${id}`),
    create: (data: Omit<Story, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'story_key'>) => 
      apiClient.post<Story>('/api/stories', data),
    update: (id: string, data: Partial<Story>) => apiClient.put<Story>(`/api/stories/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/stories/${id}`),
  },

  // Tasks
  tasks: {
    getAll: (storyId?: string) => {
      // Ensure storyId is a string or null, not an object
      const validStoryId = storyId && typeof storyId === 'string' ? storyId : undefined;
      return apiClient.get<Task[]>(`/api/tasks${validStoryId ? `?story_id=${validStoryId}` : ''}`);
    },
    getById: (id: string) => apiClient.get<Task>(`/api/tasks/${id}`),
    create: (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'task_key' | 'actual_hours'>) => 
      apiClient.post<Task>('/api/tasks', data),
    update: (id: string, data: Partial<Task>) => apiClient.put<Task>(`/api/tasks/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/tasks/${id}`),
  },

  // Analytics
  analytics: {
    getOverview: () => apiClient.get<AnalyticsOverview>('/api/analytics/overview'),
    getProjectAnalytics: (projectId: string) => 
      apiClient.get<AnalyticsOverview>(`/api/analytics/project/${projectId}`),
  },

  // Search
  search: {
    search: (query: string, entityType?: string, limit: number = 20) => {
      const params = new URLSearchParams({ q: query, limit: limit.toString() })
      if (entityType) params.append('entity_type', entityType)
      return apiClient.get<SearchResult[]>(`/api/search?${params}`)
    },
  },
}

// Export the client for direct access if needed
export { apiClient }

// Legacy compatibility - keeping the old apiClient structure for components not yet updated
export const legacyApiClient = {
  async getStories() {
    try {
      const stories = await api.stories.getAll()
      return { success: true, data: { stories } }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  async getEpics() {
    try {
      const epics = await api.epics.getAll()
      return { success: true, data: { epics } }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  async getUsers() {
    try {
      const users = await api.users.getAll()
      return { success: true, data: { users } }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  async getStoryStats() {
    try {
      const analytics = await api.analytics.getOverview()
      return { 
        success: true, 
        data: {
          total: analytics.total_stories,
          completed: analytics.completed_stories,
          inProgress: analytics.in_progress_stories,
          totalPoints: analytics.total_story_points,
          completedPoints: analytics.completed_story_points,
        }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
