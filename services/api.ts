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

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    // Determine API URL based on environment
    this.baseUrl = this.getApiUrl()
  }

  private getApiUrl(): string {
    // Check for environment-specific URLs
    if (typeof window !== "undefined") {
      // Client-side
      if (window.location.hostname === "localhost") {
        return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      }
      // Production - use Render backend
      return process.env.NEXT_PUBLIC_API_URL || "https://agilescribe-api.onrender.com"
    }

    // Server-side
    return process.env.NEXT_PUBLIC_API_URL || "https://agilescribe-api.onrender.com"
  }

  setToken(token: string) {
    this.token = token
    // Store in localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token)
    }
  }

  getToken(): string | null {
    if (this.token) return this.token

    // Try to get from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("auth_token")
      if (stored) {
        this.token = stored
        return stored
      }
    }

    return null
  }

  clearToken() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token")
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const token = this.getToken()

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (response.status === 401) {
        // Token expired or invalid
        this.clearToken()
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
        throw new Error("Authentication required")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
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
    this.setToken(response.access_token)

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
    this.setToken(response.access_token)

    return response
  }

  async getCurrentUser(): Promise<User> {
    return this.request("/api/auth/me")
  }

  async logout() {
    this.clearToken()
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

export const apiClient = new ApiClient()
export type { Story, Epic, User, ApiResponse }
