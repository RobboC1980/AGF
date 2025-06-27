interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

interface Story {
  id: string
  name: string
  description?: string
  acceptanceCriteria?: string[]
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

// Base API configuration
// IMPORTANT: Using hardcoded value temporarily to ensure correct port
const API_BASE_URL = 'http://localhost:8000'

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
  async request<T>(
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
        this.clearAuth()
        // Check if it's a token expiration issue
        if (error.message.includes('Could not validate credentials') || error.message.includes('Signature has expired')) {
          throw new Error('Your session has expired. Please log in again.')
        }
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

  // Removed development fallback - production authentication required

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

  // PATCH request
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
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
      refresh_token: string
      token_type: string
      expires_in: number
      user: User
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })

    // Store token
    this.setAuthToken(response.access_token)

    // Return the expected format
    return {
      access_token: response.access_token,
      token_type: response.token_type,
      user: response.user
    }
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
      refresh_token: string
      token_type: string
      expires_in: number
      user: User
    }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, name, password }),
    })

    // Store token
    this.setAuthToken(response.access_token)

    // Return the expected format
    return {
      access_token: response.access_token,
      token_type: response.token_type,
      user: response.user
    }
  }

  async getCurrentUser(): Promise<User> {
    return this.request("/api/auth/me")
  }

  async logout() {
    this.clearAuth()
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

  async patchStory(id: string, updates: Partial<Story>): Promise<ApiResponse<Story>> {
    return this.request(`/api/stories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
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

  async generateEpic(request: {
    description: string
    priority?: string
    projectId?: string
    businessValue?: string
    includeAcceptanceCriteria?: boolean
    includeStoryBreakdown?: boolean
  }): Promise<{
    success: boolean
    epic: {
      name: string
      description: string
      acceptance_criteria: string[]
      suggested_stories: Array<{
        title: string
        description: string
        story_points: number
      }>
      total_story_points: number
      business_value: string
      impact_areas: string[]
      confidence: number
      implementation_suggestions: string[]
    }
    model_used: string
    tokens_used: number
    processing_time: number
  }> {
    return this.request("/api/ai/generate-epic", {
      method: "POST",
      body: JSON.stringify(request),
    })
  }

  async generateTasks(request: {
    storyTitle: string
    storyDescription: string
    storyPoints?: number
    acceptanceCriteria: string
    technicalContext?: string
    teamSkills?: string
    includeSubtasks?: boolean
  }): Promise<{
    success: boolean
    tasks: {
      tasks: Array<{
        title: string
        description: string
        category: string
        estimated_hours: number
        priority: string
        skills_required: string[]
        acceptance_criteria: string[]
        dependencies: string[]
        technical_notes: string
        testing_requirements: string
      }>
      total_estimated_hours: number
      critical_path: string[]
      risks: string[]
      implementation_notes: string[]
      confidence: number
    }
    model_used: string
    tokens_used: number
    processing_time: number
  }> {
    return this.request("/api/ai/generate-tasks", {
      method: "POST",
      body: JSON.stringify({
        story_title: request.storyTitle,
        story_description: request.storyDescription,
        story_points: request.storyPoints || 5,
        acceptance_criteria: request.acceptanceCriteria,
        technical_context: request.technicalContext || "",
        team_skills: request.teamSkills || "",
        include_subtasks: request.includeSubtasks !== false
      }),
    })
  }

  async generateSingleTask(request: {
    taskDescription: string
    storyTitle: string
    storyDescription?: string
    storyPoints?: number
    acceptanceCriteria?: string
    technicalContext?: string
    priority?: string
    estimatedHours?: number
  }): Promise<{
    success: boolean
    task: {
      title: string
      description: string
      estimated_hours: number
      priority: string
      category: string
      technical_notes: string
      acceptance_criteria: string[]
      subtasks: string[]
      tags: string[]
      skills_required: string[]
    }
    provider: string
    model: string
    confidence?: number
    suggestions?: string[]
  }> {
    return this.request("/api/ai/generate-single-task", {
      method: "POST",
      body: JSON.stringify({
        task_description: request.taskDescription,
        story_title: request.storyTitle,
        story_description: request.storyDescription || "",
        story_points: request.storyPoints || 5,
        acceptance_criteria: request.acceptanceCriteria || "",
        technical_context: request.technicalContext || "",
        priority: request.priority || "medium",
        estimated_hours: request.estimatedHours || 4.0
      }),
    })
  }

  async generateProject(request: {
    description: string
    domain?: string
    teamSize?: number
    timeline?: string
    technologyStack?: string
    businessObjectives?: string
    priority?: string
  }): Promise<{
    success: boolean
    project: {
      name: string
      description: string
      vision: string
      objectives: string[]
      scope: {
        included: string[]
        excluded: string[]
        assumptions: string[]
      }
      success_metrics: Array<{
        metric: string
        target: string
        measurement: string
      }>
      suggested_epics: Array<{
        name: string
        description: string
        estimated_story_points: number
        priority: string
        business_value: string
      }>
      total_estimated_points: number
      timeline: {
        estimated_duration: string
        phases: Array<{
          name: string
          duration: string
          deliverables: string[]
        }>
      }
      team_composition: {
        recommended_size: number
        roles: Array<{
          role: string
          count: number
          key_responsibilities: string[]
        }>
      }
      technology_strategy: {
        architecture_approach: string
        key_technologies: string[]
        technical_decisions: string[]
      }
      risks: Array<{
        risk: string
        impact: string
        probability: string
        mitigation: string
      }>
      dependencies: string[]
      confidence: number
    }
    provider: string
    model: string
  }> {
    return this.request("/api/ai/generate-project", {
      method: "POST",
      body: JSON.stringify({
        description: request.description,
        domain: request.domain || "",
        team_size: request.teamSize || 5,
        timeline: request.timeline || "",
        technology_stack: request.technologyStack || "",
        business_objectives: request.businessObjectives || "",
        priority: request.priority || "medium"
      }),
    })
  }

  // Epics API
  async getEpics(): Promise<ApiResponse<{ epics: Epic[] }>> {
    return this.request("/api/epics")
  }

  // Projects API
  async getProjects(): Promise<ApiResponse<{ projects: Project[] }>> {
    return this.request("/api/projects")
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return this.request(`/api/projects/${id}`)
  }

  async createProject(project: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.request("/api/projects", {
      method: "POST",
      body: JSON.stringify(project),
    })
  }

  async updateProject(id: string, project: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.request(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(project),
    })
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/projects/${id}`, {
      method: "DELETE",
    })
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

  // Analytics
  analytics = {
    getOverview: async (): Promise<AnalyticsOverview> => {
      return this.request("/api/analytics/overview")
    },
    getProjectAnalytics: async (projectId: string): Promise<AnalyticsOverview> => {
      return this.request(`/api/analytics/projects/${projectId}`)
    }
  }
}

// Create API client instance
const apiClient = new ApiClient(API_BASE_URL)

// Type definitions matching backend models
export interface User {
  id: string
  username?: string
  email: string
  name: string  // Combined first_name + last_name from backend
  first_name?: string
  last_name?: string
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
  name: string
  description?: string
  epic_key?: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  start_date?: string
  target_end_date?: string
  estimated_story_points?: number
  actual_story_points?: number
  progress: number
  created_by?: string
  created_at: string
  updated_at?: string
  assignee_id?: string
  color?: string
  project?: {
    id: string
    name: string
  }
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

export interface Sprint {
  id: string
  project_id: string
  name: string
  goal?: string
  description?: string
  sprint_number: number
  start_date: string
  end_date: string
  actual_start_date?: string
  actual_end_date?: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  team_capacity?: number
  planned_story_points?: number
  completed_story_points: number
  velocity?: number
  scope_changes: number
  what_went_well?: string
  what_to_improve?: string
  action_items?: any[]
  created_by: string
  created_at: string
  updated_at?: string
  stories_count: number
  creator?: {
    id: string
    name: string
    avatar_url?: string
  }
  project?: {
    id: string
    name: string
  }
}

export interface Team {
  id: string
  name: string
  description?: string
  color: string
  is_private: boolean
  is_default: boolean
  member_count: number
  project_count: number
  created_at: string
  created_by: string
  members: TeamMember[]
  projects: string[]
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'admin' | 'manager' | 'member'
  can_manage_team: boolean
  can_manage_projects: boolean
  can_assign_tasks: boolean
  joined_at: string
  user: User
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
      const response = await apiClient.get<{data: {users: User[]}, success: boolean}>('/api/users');
      return response.data.users;
    },
    getById: (id: string) => apiClient.get<User>(`/api/users/${id}`),
    create: (data: Omit<User, 'id' | 'created_at'>) => apiClient.post<User>('/api/users', data),
    update: (id: string, data: Partial<User>) => apiClient.put<User>(`/api/users/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/users/${id}`),
  },

  // Projects
  projects: {
    getAll: async () => {
      const response = await apiClient.get<{data: {projects: Project[]}, success: boolean}>('/api/projects');
      return response.data.projects;
    },
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
      const response = await apiClient.get<{data: {epics: Epic[]}, success: boolean}>(`/api/epics${validProjectId ? `?project_id=${validProjectId}` : ''}`);
      return response.data.epics;
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
      const response = await apiClient.get<{data: {stories: Story[]}, success: boolean}>(`/api/stories${validEpicId ? `?epic_id=${validEpicId}` : ''}`);
      return response.data.stories;
    },
    getById: (id: string) => apiClient.get<Story>(`/api/stories/${id}`),
    create: (data: Omit<Story, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'story_key'>) => 
      apiClient.post<Story>('/api/stories', data),
    update: (id: string, data: Partial<Story>) => apiClient.put<Story>(`/api/stories/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/stories/${id}`),
  },

  // Tasks
  tasks: {
    getAll: async (storyId?: string) => {
      // Ensure storyId is a string or null, not an object
      const validStoryId = storyId && typeof storyId === 'string' ? storyId : undefined;
      const response = await apiClient.get<{data: {tasks: Task[]}, success: boolean}>(`/api/tasks${validStoryId ? `?story_id=${validStoryId}` : ''}`);
      return response.data.tasks;
    },
    getById: async (id: string) => {
      const response = await apiClient.get<{data: Task, success: boolean}>(`/api/tasks/${id}`);
      return response.data;
    },
    create: async (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'task_key' | 'actual_hours'>) => {
      const response = await apiClient.post<{data: Task, success: boolean}>('/api/tasks', data);
      return response.data;
    },
    update: async (id: string, data: Partial<Task>) => {
      const response = await apiClient.put<{data: Task, success: boolean}>(`/api/tasks/${id}`, data);
      return response.data;
    },
    assign: async (id: string, data: { assignee_id: string | null; notify_assignee?: boolean }) => {
      const response = await apiClient.patch<{data: Task, success: boolean}>(`/api/tasks/${id}/assign`, data);
      return response.data;
    },
    delete: (id: string) => apiClient.delete(`/api/tasks/${id}`),
  },

  // Teams
  teams: {
    getAll: async (userId?: string, includeMembers: boolean = true) => {
      const params = new URLSearchParams()
      if (userId) params.append('user_id', userId)
      params.append('include_members', includeMembers.toString())
      const response = await apiClient.get<{data: {teams: Team[]}, success: boolean}>(`/api/teams?${params}`)
      return response.data.teams
    },
    getById: async (id: string) => {
      const response = await apiClient.get<Team>(`/api/teams/${id}`)
      return response
    },
    create: async (data: { name: string; description?: string; color?: string; is_private?: boolean }) => {
      const response = await apiClient.post<Team>('/api/teams', data)
      return response
    },
    update: async (id: string, data: Partial<Team>) => {
      const response = await apiClient.put<Team>(`/api/teams/${id}`, data)
      return response
    },
    delete: (id: string) => apiClient.delete(`/api/teams/${id}`),
    
    // Team member management
    addMember: async (teamId: string, data: { user_id: string; role?: string; can_manage_team?: boolean; can_manage_projects?: boolean; can_assign_tasks?: boolean }) => {
      const response = await apiClient.post<TeamMember>(`/api/teams/${teamId}/members`, data)
      return response
    },
    updateMember: async (teamId: string, userId: string, data: { role?: string; can_manage_team?: boolean; can_manage_projects?: boolean; can_assign_tasks?: boolean }) => {
      const response = await apiClient.patch<TeamMember>(`/api/teams/${teamId}/members/${userId}`, data)
      return response
    },
    removeMember: (teamId: string, userId: string) => apiClient.delete(`/api/teams/${teamId}/members/${userId}`),
    
    getProjects: async (teamId: string) => {
      const response = await apiClient.get<{data: {projects: Project[]}, success: boolean}>(`/api/teams/${teamId}/projects`)
      return response.data.projects
    },
  },

  // Analytics
  analytics: {
    getOverview: () => apiClient.get<AnalyticsOverview>('/api/analytics/overview'),
    getProjectAnalytics: (projectId: string) => 
      apiClient.get<AnalyticsOverview>(`/api/analytics/project/${projectId}`),
    getProjectDashboard: (projectId: string, days: number = 30) =>
      apiClient.get(`/api/analytics/dashboard/${projectId}?days=${days}`),
    getProjectVelocity: (projectId: string, days: number = 30) =>
      apiClient.get(`/api/analytics/velocity/${projectId}?days=${days}`),
    getProjectBurndown: (projectId: string, days: number = 30) =>
      apiClient.get(`/api/analytics/burndown/${projectId}?days=${days}`),
    getTeamPerformance: (projectId: string, days: number = 30) =>
      apiClient.get(`/api/analytics/team-performance/${projectId}?days=${days}`),
    getProjectInsights: (projectId: string, days: number = 30) =>
      apiClient.get(`/api/analytics/insights/${projectId}?days=${days}`),
    getTeamAnalytics: (teamId?: string, days: number = 30) =>
      apiClient.get(`/api/analytics/team${teamId ? `?team_id=${teamId}` : ''}${teamId ? '&' : '?'}days=${days}`),
  },

  // Sprints
  sprints: {
    getAll: async (projectId?: string, status?: string) => {
      const params = new URLSearchParams()
      if (projectId) params.append('project_id', projectId)
      if (status) params.append('status', status)
      const queryString = params.toString() ? `?${params.toString()}` : ''
      
      const response = await apiClient.get<Sprint[]>(`/api/sprints${queryString}`)
      return response
    },
    getById: async (id: string) => {
      const response = await apiClient.get<Sprint>(`/api/sprints/${id}`)
      return response
    },
    create: async (data: Omit<Sprint, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'sprint_number' | 'completed_story_points' | 'scope_changes' | 'stories_count'> & { project_id: string }) => {
      const response = await apiClient.post<Sprint>('/api/sprints', {
        name: data.name,
        goal: data.goal,
        description: data.description,
        project_id: data.project_id,
        start_date: data.start_date,
        end_date: data.end_date,
        team_capacity: data.team_capacity,
        planned_story_points: data.planned_story_points,
      })
      return response
    },
    update: async (id: string, data: Partial<Sprint>) => {
      const response = await apiClient.put<Sprint>(`/api/sprints/${id}`, data)
      return response
    },
    updateStatus: async (id: string, status: string, actualStartDate?: string, actualEndDate?: string) => {
      const response = await apiClient.patch<Sprint>(`/api/sprints/${id}/status`, {
        status,
        actual_start_date: actualStartDate,
        actual_end_date: actualEndDate,
      })
      return response
    },
    addStories: async (sprintId: string, storyIds: string[]) => {
      const response = await apiClient.patch<any>(`/api/sprints/${sprintId}/stories`, {
        story_ids: storyIds,
        action: 'add',
      })
      return response
    },
    removeStories: async (sprintId: string, storyIds: string[]) => {
      const response = await apiClient.patch<any>(`/api/sprints/${sprintId}/stories`, {
        story_ids: storyIds,
        action: 'remove',
      })
      return response
    },
    getStories: async (sprintId: string) => {
      const response = await apiClient.get<{stories: Story[]}>(`/api/sprints/${sprintId}/stories`)
      return response.stories
    },
    getBurndown: async (sprintId: string) => {
      const response = await apiClient.get<any>(`/api/sprints/${sprintId}/burndown`)
      return response
    },
    delete: (id: string) => apiClient.delete(`/api/sprints/${id}`),
  },

  // Search
  search: {
    search: (query: string, entityType?: string, limit: number = 20) => {
      const params = new URLSearchParams({ q: query, limit: limit.toString() })
      if (entityType) params.append('entity_type', entityType)
      return apiClient.get<SearchResult[]>(`/api/search?${params}`)
    },
  },

  // AI Services
  ai: {
    generateStory: (request: {
      description: string
      priority?: string
      epicId?: string
      includeAcceptanceCriteria?: boolean
      includeTags?: boolean
    }) => apiClient.generateStory(request),
    
    generateEpic: (request: {
      description: string
      priority?: string
      projectId?: string
      businessValue?: string
      includeAcceptanceCriteria?: boolean
      includeStoryBreakdown?: boolean
    }) => apiClient.generateEpic(request),
    
    generateTasks: (request: {
      storyTitle: string
      storyDescription: string
      storyPoints?: number
      acceptanceCriteria: string
      technicalContext?: string
      teamSkills?: string
      includeSubtasks?: boolean
    }) => apiClient.generateTasks(request),
    
    generateSingleTask: (request: {
      taskDescription: string
      storyTitle: string
      storyDescription?: string
      storyPoints?: number
      acceptanceCriteria?: string
      technicalContext?: string
      priority?: string
      estimatedHours?: number
    }) => apiClient.generateSingleTask(request),
    
    generateProject: (request: {
      description: string
      domain?: string
      teamSize?: number
      timeline?: string
      technologyStack?: string
      businessObjectives?: string
      priority?: string
    }) => apiClient.generateProject(request),
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
