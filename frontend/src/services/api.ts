// Unified API client for AgileForge backend
import axios, { AxiosInstance, AxiosResponse } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const TOKEN_STORAGE_KEY = 'auth_token' // Standardized key

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Initialize token from storage
    this.token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (this.token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
    }

    // Add response interceptor for auth error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error('Authentication failed')
          this.clearToken()
          // Redirect to login if not already there
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(error)
      }
    )
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  clearToken() {
    this.token = null
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem('auth-storage') // Clear zustand storage too
    delete this.client.defaults.headers.common['Authorization']
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    try {
      const response = await this.client.request({
        method,
        url: endpoint,
        data,
      })
      return response.data
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Request failed'
      throw new Error(errorMessage)
    }
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('POST', '/auth/login', { email, password })
  }

  async register(email: string, password: string, name: string) {
    return this.request<{ token: string; user: any }>('POST', '/auth/register', { email, password, name })
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('GET', '/auth/me')
  }

  // Dashboard
  async getDashboard() {
    return this.request<{ stats: any; message: string }>('GET', '/dashboard')
  }

  // Projects
  async getProjects() {
    return this.request<{ projects: any[] }>('GET', '/projects')
  }

  async getProject(id: string) {
    return this.request<{ project: any }>('GET', `/projects/${id}`)
  }

  async createProject(project: any) {
    return this.request<{ project: any }>('POST', '/projects', project)
  }

  async updateProject(id: string, project: any) {
    return this.request<{ project: any }>('PUT', `/projects/${id}`, project)
  }

  async deleteProject(id: string) {
    return this.request('DELETE', `/projects/${id}`)
  }

  // Epics
  async getEpics(projectId?: string) {
    const query = projectId ? `?projectId=${projectId}` : ''
    return this.request<{ epics: any[] }>('GET', `/epics${query}`)
  }

  async getEpic(id: string) {
    return this.request<{ epic: any }>('GET', `/epics/${id}`)
  }

  async createEpic(epic: any) {
    return this.request<{ epic: any }>('POST', '/epics', epic)
  }

  async updateEpic(id: string, epic: any) {
    return this.request<{ epic: any }>('PUT', `/epics/${id}`, epic)
  }

  async deleteEpic(id: string) {
    return this.request('DELETE', `/epics/${id}`)
  }

  // Stories
  async getStories(epicId?: string) {
    const query = epicId ? `?epicId=${epicId}` : ''
    return this.request<{ stories: any[] }>('GET', `/stories${query}`)
  }

  async getStory(id: string) {
    return this.request<{ story: any }>('GET', `/stories/${id}`)
  }

  async createStory(story: any) {
    return this.request<{ story: any }>('POST', '/stories', story)
  }

  async updateStory(id: string, story: any) {
    return this.request<{ story: any }>('PUT', `/stories/${id}`, story)
  }

  async deleteStory(id: string) {
    return this.request('DELETE', `/stories/${id}`)
  }

  // Tasks
  async getTasks(filters?: { storyId?: string; sprintId?: string; status?: string; assignedTo?: string }) {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<{ tasks: any[] }>('GET', `/tasks${query}`)
  }

  async getTask(id: string) {
    return this.request<{ task: any }>('GET', `/tasks/${id}`)
  }

  async createTask(task: any) {
    return this.request<{ task: any }>('POST', '/tasks', task)
  }

  async updateTask(id: string, task: any) {
    return this.request<{ task: any }>('PUT', `/tasks/${id}`, task)
  }

  async updateTaskStatus(id: string, status: string) {
    return this.request<{ task: any }>('PATCH', `/tasks/${id}/status`, { status })
  }

  async deleteTask(id: string) {
    return this.request('DELETE', `/tasks/${id}`)
  }

  // Sprints
  async getSprints(projectId?: string) {
    const query = projectId ? `?projectId=${projectId}` : ''
    return this.request<{ sprints: any[] }>('GET', `/sprints${query}`)
  }

  async getSprint(id: string) {
    return this.request<{ sprint: any }>('GET', `/sprints/${id}`)
  }

  async createSprint(sprint: any) {
    return this.request<{ sprint: any }>('POST', '/sprints', sprint)
  }

  async updateSprint(id: string, sprint: any) {
    return this.request<{ sprint: any }>('PUT', `/sprints/${id}`, sprint)
  }

  async deleteSprint(id: string) {
    return this.request('DELETE', `/sprints/${id}`)
  }

  // AI Generation
  async generateStory(epicName: string, projectName: string) {
    return this.request<{ story: any }>('POST', '/ai/generate-story', {
      epicName,
      projectName,
    })
  }

  // Analytics
  async getAnalytics(projectId?: string, timeRange?: string) {
    const params = new URLSearchParams()
    if (projectId) params.append('projectId', projectId)
    if (timeRange) params.append('timeRange', timeRange)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<{ analytics: any }>('GET', `/analytics${query}`)
  }

  async getVelocityData(projectId?: string, sprints?: number) {
    const params = new URLSearchParams()
    if (projectId) params.append('projectId', projectId)
    if (sprints) params.append('sprints', sprints.toString())
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<{ velocity: any }>('GET', `/analytics/velocity${query}`)
  }

  async getBurndownData(sprintId: string) {
    return this.request<{ burndown: any }>('GET', `/analytics/burndown/${sprintId}`)
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL)

// For backward compatibility
export default apiClient 