// API utility functions for connecting to the FastAPI backend

// IMPORTANT: Using hardcoded value temporarily to ensure correct port
const API_BASE_URL = 'http://localhost:8000'

// Types
export interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

export interface Epic {
  id: string
  name: string
  description?: string
  status: "planning" | "in-progress" | "review" | "completed" | "on-hold"
  priority: "low" | "medium" | "high" | "critical"
  project: {
    id: string
    name: string
    color: string
  }
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  startDate?: string
  endDate?: string
  dueDate?: string
  progress: number
  stats: {
    totalStories: number
    completedStories: number
    totalTasks: number
    completedTasks: number
    storyPoints: number
    completedPoints: number
  }
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface UserStory {
  id: string
  title: string
  description: string
  status: "backlog" | "ready" | "in-progress" | "review" | "testing" | "done"
  priority: "low" | "medium" | "high" | "critical"
  storyPoints: number
  epic?: {
    id: string
    name: string
    color: string
  }
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  reporter: {
    id: string
    name: string
    avatar?: string
  }
  sprint?: {
    id: string
    name: string
  }
  acceptanceCriteria: string[]
  tasks: {
    total: number
    completed: number
  }
  comments: number
  attachments: number
  labels?: string[]
  createdAt: string
  updatedAt: string
  dueDate?: string
  startDate?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  status: "planning" | "active" | "on-hold" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "critical"
  startDate: string
  endDate?: string
  dueDate?: string
  progress: number
  budget?: {
    allocated: number
    spent: number
    currency: string
  }
  team: {
    lead: {
      id: string
      name: string
      avatar?: string
    }
    members: Array<{
      id: string
      name: string
      avatar?: string
      role: string
    }>
  }
  stats: {
    totalEpics: number
    completedEpics: number
    totalStories: number
    completedStories: number
    totalTasks: number
    completedTasks: number
    storyPoints: number
    completedPoints: number
  }
  tags?: string[]
  createdAt: string
  updatedAt: string
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        error: data.detail || data.error || 'An error occurred',
        status: response.status,
      }
    }

    return {
      data,
      status: response.status,
    }
  } catch (error) {
    console.error('API Request failed:', error)
    return {
      error: error instanceof Error ? error.message : 'Network error occurred',
      status: 500,
    }
  }
}

// Health check
export async function checkApiHealth(): Promise<ApiResponse<{ status: string }>> {
  return apiRequest<{ status: string }>('/health')
}

// Epic API functions
export async function getEpics(): Promise<ApiResponse<Epic[]>> {
  return apiRequest<Epic[]>('/api/epics')
}

export async function getEpic(id: string): Promise<ApiResponse<Epic>> {
  return apiRequest<Epic>(`/api/epics/${id}`)
}

export async function createEpic(epic: Partial<Epic>): Promise<ApiResponse<Epic>> {
  return apiRequest<Epic>('/api/epics', {
    method: 'POST',
    body: JSON.stringify(epic),
  })
}

export async function updateEpic(id: string, epic: Partial<Epic>): Promise<ApiResponse<Epic>> {
  return apiRequest<Epic>(`/api/epics/${id}`, {
    method: 'PUT',
    body: JSON.stringify(epic),
  })
}

export async function deleteEpic(id: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/epics/${id}`, {
    method: 'DELETE',
  })
}

// User Stories API functions
export async function getStories(): Promise<ApiResponse<UserStory[]>> {
  return apiRequest<UserStory[]>('/api/stories')
}

export async function getStory(id: string): Promise<ApiResponse<UserStory>> {
  return apiRequest<UserStory>(`/api/stories/${id}`)
}

export async function createStory(story: Partial<UserStory>): Promise<ApiResponse<UserStory>> {
  return apiRequest<UserStory>('/api/stories', {
    method: 'POST',
    body: JSON.stringify(story),
  })
}

export async function updateStory(id: string, story: Partial<UserStory>): Promise<ApiResponse<UserStory>> {
  return apiRequest<UserStory>(`/api/stories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(story),
  })
}

export async function deleteStory(id: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/stories/${id}`, {
    method: 'DELETE',
  })
}

// Projects API functions
export async function getProjects(): Promise<ApiResponse<Project[]>> {
  return apiRequest<Project[]>('/api/projects')
}

export async function getProject(id: string): Promise<ApiResponse<Project>> {
  return apiRequest<Project>(`/api/projects/${id}`)
}

export async function createProject(project: Partial<Project>): Promise<ApiResponse<Project>> {
  return apiRequest<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(project),
  })
}

export async function updateProject(id: string, project: Partial<Project>): Promise<ApiResponse<Project>> {
  return apiRequest<Project>(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(project),
  })
}

export async function deleteProject(id: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/projects/${id}`, {
    method: 'DELETE',
  })
}

// AI API functions
export async function generateStory(prompt: string): Promise<ApiResponse<{ story: Partial<UserStory> }>> {
  return apiRequest<{ story: Partial<UserStory> }>('/api/ai/generate-story', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  })
}

export async function generateAcceptanceCriteria(storyDescription: string): Promise<ApiResponse<{ criteria: string[] }>> {
  return apiRequest<{ criteria: string[] }>('/api/ai/generate-acceptance-criteria', {
    method: 'POST',
    body: JSON.stringify({ story_description: storyDescription }),
  })
}

export default {
  // Health
  checkApiHealth,
  
  // Epics
  getEpics,
  getEpic,
  createEpic,
  updateEpic,
  deleteEpic,
  
  // Stories
  getStories,
  getStory,
  createStory,
  updateStory,
  deleteStory,
  
  // Projects
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  
  // AI
  generateStory,
  generateAcceptanceCriteria,
} 