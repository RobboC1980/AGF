import { clerkApiClient, useClerkApiClient } from './clerk-api'
import type { 
  ApiResponse, 
  Story, 
  Epic, 
  Project, 
  User, 
  Task, 
  Sprint, 
  Team,
  AnalyticsOverview 
} from './api'

// API service factory that uses Clerk authentication
export function createApiService(authToken?: string) {
  const client = useClerkApiClient(authToken)

  return {
    // Health check
    health: {
      check: () => client.healthCheck()
    },

    // Stories API
    stories: {
      getAll: async (): Promise<Story[]> => {
        const response = await client.get<ApiResponse<{ stories: Story[] }>>('/api/stories')
        return response.data?.stories || []
      },

      getById: async (id: string): Promise<Story> => {
        const response = await client.get<ApiResponse<Story>>(`/api/stories/${id}`)
        return response.data
      },

      create: async (story: Partial<Story>): Promise<Story> => {
        const response = await client.post<ApiResponse<Story>>('/api/stories', story)
        return response.data
      },

      update: async (id: string, story: Partial<Story>): Promise<Story> => {
        const response = await client.put<ApiResponse<Story>>(`/api/stories/${id}`, story)
        return response.data
      },

      patchStory: async (id: string, updates: Partial<Story>): Promise<Story> => {
        const response = await client.patch<ApiResponse<Story>>(`/api/stories/${id}`, updates)
        return response.data
      },

      delete: async (id: string): Promise<void> => {
        await client.delete<ApiResponse<void>>(`/api/stories/${id}`)
      },

      bulkDelete: async (ids: string[]): Promise<void> => {
        await client.post<ApiResponse<void>>('/api/stories/bulk-delete', { ids })
      },

      bulkUpdate: async (ids: string[], updates: Partial<Story>): Promise<Story[]> => {
        const response = await client.post<ApiResponse<Story[]>>('/api/stories/bulk-update', { ids, updates })
        return response.data
      },

      generate: async (request: {
        description: string
        priority?: string
        epicId?: string
        includeAcceptanceCriteria?: boolean
        includeTags?: boolean
      }) => {
        return client.post('/api/stories/generate', request)
      }
    },

    // Epics API
    epics: {
      getAll: async (): Promise<Epic[]> => {
        const response = await client.get<ApiResponse<{ epics: Epic[] }>>('/api/epics')
        return response.data?.epics || []
      },

      getById: async (id: string): Promise<Epic> => {
        const response = await client.get<ApiResponse<Epic>>(`/api/epics/${id}`)
        return response.data
      },

      create: async (epic: Partial<Epic>): Promise<Epic> => {
        const response = await client.post<ApiResponse<Epic>>('/api/epics', epic)
        return response.data
      },

      update: async (id: string, epic: Partial<Epic>): Promise<Epic> => {
        const response = await client.put<ApiResponse<Epic>>(`/api/epics/${id}`, epic)
        return response.data
      },

      delete: async (id: string): Promise<void> => {
        await client.delete<ApiResponse<void>>(`/api/epics/${id}`)
      },

      generate: async (request: {
        description: string
        priority?: string
        projectId?: string
        businessValue?: string
        includeAcceptanceCriteria?: boolean
        includeStoryBreakdown?: boolean
      }) => {
        return client.post('/api/ai/generate-epic', request)
      }
    },

    // Projects API
    projects: {
      getAll: async (): Promise<Project[]> => {
        const response = await client.get<ApiResponse<{ projects: Project[] }>>('/api/projects')
        return response.data?.projects || []
      },

      getById: async (id: string): Promise<Project> => {
        const response = await client.get<ApiResponse<Project>>(`/api/projects/${id}`)
        return response.data
      },

      create: async (project: Partial<Project>): Promise<Project> => {
        const response = await client.post<ApiResponse<Project>>('/api/projects', project)
        return response.data
      },

      update: async (id: string, project: Partial<Project>): Promise<Project> => {
        const response = await client.put<ApiResponse<Project>>(`/api/projects/${id}`, project)
        return response.data
      },

      delete: async (id: string): Promise<void> => {
        await client.delete<ApiResponse<void>>(`/api/projects/${id}`)
      },

      generate: async (request: {
        description: string
        domain?: string
        teamSize?: number
        timeline?: string
        technologyStack?: string
        businessObjectives?: string
        priority?: string
      }) => {
        return client.post('/api/ai/generate-project', request)
      }
    },

    // Users API
    users: {
      getAll: async (): Promise<User[]> => {
        const response = await client.get<ApiResponse<{ users: User[] }>>('/api/users')
        return response.data?.users || []
      },

      getById: async (id: string): Promise<User> => {
        const response = await client.get<ApiResponse<User>>(`/api/users/${id}`)
        return response.data
      },

      create: async (user: Partial<User>): Promise<User> => {
        const response = await client.post<ApiResponse<User>>('/api/users', user)
        return response.data
      },

      update: async (id: string, user: Partial<User>): Promise<User> => {
        const response = await client.put<ApiResponse<User>>(`/api/users/${id}`, user)
        return response.data
      },

      delete: async (id: string): Promise<void> => {
        await client.delete<ApiResponse<void>>(`/api/users/${id}`)
      }
    },

    // Tasks API
    tasks: {
      getAll: async (): Promise<Task[]> => {
        const response = await client.get<ApiResponse<{ tasks: Task[] }>>('/api/tasks')
        return response.data?.tasks || []
      },

      getById: async (id: string): Promise<Task> => {
        const response = await client.get<ApiResponse<Task>>(`/api/tasks/${id}`)
        return response.data
      },

      create: async (task: Partial<Task>): Promise<Task> => {
        const response = await client.post<ApiResponse<Task>>('/api/tasks', task)
        return response.data
      },

      update: async (id: string, task: Partial<Task>): Promise<Task> => {
        const response = await client.put<ApiResponse<Task>>(`/api/tasks/${id}`, task)
        return response.data
      },

      delete: async (id: string): Promise<void> => {
        await client.delete<ApiResponse<void>>(`/api/tasks/${id}`)
      },

      generate: async (request: {
        storyTitle: string
        storyDescription: string
        storyPoints?: number
        acceptanceCriteria: string
        technicalContext?: string
        teamSkills?: string
        includeSubtasks?: boolean
      }) => {
        return client.post('/api/ai/generate-tasks', {
          story_title: request.storyTitle,
          story_description: request.storyDescription,
          story_points: request.storyPoints || 5,
          acceptance_criteria: request.acceptanceCriteria,
          technical_context: request.technicalContext || "",
          team_skills: request.teamSkills || "",
          include_subtasks: request.includeSubtasks !== false
        })
      },

      generateSingle: async (request: {
        taskDescription: string
        storyTitle: string
        storyDescription?: string
        storyPoints?: number
        acceptanceCriteria?: string
        technicalContext?: string
        priority?: string
        estimatedHours?: number
      }) => {
        return client.post('/api/ai/generate-single-task', {
          task_description: request.taskDescription,
          story_title: request.storyTitle,
          story_description: request.storyDescription || "",
          story_points: request.storyPoints || 5,
          acceptance_criteria: request.acceptanceCriteria || "",
          technical_context: request.technicalContext || "",
          priority: request.priority || "medium",
          estimated_hours: request.estimatedHours || 4.0
        })
      }
    },

    // Sprints API
    sprints: {
      getAll: async (projectId?: string): Promise<Sprint[]> => {
        const endpoint = projectId ? `/api/sprints?project_id=${projectId}` : '/api/sprints'
        const response = await client.get<ApiResponse<{ sprints: Sprint[] }>>(endpoint)
        return response.data?.sprints || []
      },

      getById: async (id: string): Promise<Sprint> => {
        const response = await client.get<ApiResponse<Sprint>>(`/api/sprints/${id}`)
        return response.data
      },

      create: async (sprint: Partial<Sprint>): Promise<Sprint> => {
        const response = await client.post<ApiResponse<Sprint>>('/api/sprints', sprint)
        return response.data
      },

      update: async (id: string, sprint: Partial<Sprint>): Promise<Sprint> => {
        const response = await client.put<ApiResponse<Sprint>>(`/api/sprints/${id}`, sprint)
        return response.data
      },

      delete: async (id: string): Promise<void> => {
        await client.delete<ApiResponse<void>>(`/api/sprints/${id}`)
      },

      addStory: async (sprintId: string, storyId: string): Promise<void> => {
        await client.post(`/api/sprints/${sprintId}/stories`, { story_id: storyId })
      },

      removeStory: async (sprintId: string, storyId: string): Promise<void> => {
        await client.delete(`/api/sprints/${sprintId}/stories/${storyId}`)
      }
    },

    // Analytics API
    analytics: {
      getOverview: async (): Promise<AnalyticsOverview> => {
        const response = await client.get<ApiResponse<AnalyticsOverview>>('/api/analytics/overview')
        return response.data
      },

      getProjectDashboard: async (projectId: string, days: number = 30) => {
        const response = await client.get(`/api/analytics/project/${projectId}/dashboard?days=${days}`)
        return response.data
      },

      getProjectVelocity: async (projectId: string, days: number = 30) => {
        const response = await client.get(`/api/analytics/project/${projectId}/velocity?days=${days}`)
        return response.data
      },

      getProjectBurndown: async (projectId: string, days: number = 30) => {
        const response = await client.get(`/api/analytics/project/${projectId}/burndown?days=${days}`)
        return response.data
      },

      getTeamPerformance: async (projectId: string, days: number = 30) => {
        const response = await client.get(`/api/analytics/project/${projectId}/team-performance?days=${days}`)
        return response.data
      },

      getProjectInsights: async (projectId: string, days: number = 30) => {
        const response = await client.get(`/api/analytics/project/${projectId}/insights?days=${days}`)
        return response.data
      },

      getTeamAnalytics: async (teamId?: string, days: number = 30) => {
        const endpoint = teamId 
          ? `/api/analytics/team/${teamId}?days=${days}`
          : `/api/analytics/team?days=${days}`
        const response = await client.get(endpoint)
        return response.data
      }
    },

    // Search API
    search: {
      search: async (query: string) => {
        const response = await client.get(`/api/search?q=${encodeURIComponent(query)}`)
        return response.data
      }
    },

    // Teams API
    teams: {
      getAll: async (): Promise<Team[]> => {
        const response = await client.get<ApiResponse<{ teams: Team[] }>>('/api/teams')
        return response.data?.teams || []
      },

      getById: async (id: string): Promise<Team> => {
        const response = await client.get<ApiResponse<Team>>(`/api/teams/${id}`)
        return response.data
      },

      create: async (team: Partial<Team>): Promise<Team> => {
        const response = await client.post<ApiResponse<Team>>('/api/teams', team)
        return response.data
      },

      update: async (id: string, team: Partial<Team>): Promise<Team> => {
        const response = await client.put<ApiResponse<Team>>(`/api/teams/${id}`, team)
        return response.data
      },

      delete: async (id: string): Promise<void> => {
        await client.delete<ApiResponse<void>>(`/api/teams/${id}`)
      }
    }
  }
}

// Create default API instance (for non-authenticated requests)
export const clerkApi = createApiService()

// Export the factory function for authenticated requests
export { createApiService as api } 