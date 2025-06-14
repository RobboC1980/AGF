import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

// AI API client extensions
class AIApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl
  }

  setToken(token: string) {
    this.token = token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }
    return await response.json()
  }

  // Sprint Planning
  async planSprint(data: {
    team_id: string
    team_capacity: number
    candidate_story_ids: string[]
    sprint_goal?: string
  }) {
    return this.request("/api/ai/sprint-planning", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Standup Reports
  async generateStandupReport(data: {
    team_id: string
    date?: string
    include_individual_summaries?: boolean
  }) {
    return this.request("/api/ai/standup-report", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Retrospective Summary
  async summarizeRetrospective(data: {
    sprint_id: string
    feedback_entries: Array<{ author?: string; content: string }>
    auto_create_tasks?: boolean
  }) {
    return this.request("/api/ai/retrospective-summary", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Story Validation
  async validateStory(data: {
    story_id?: string
    title: string
    description: string
    acceptance_criteria?: string
    story_points?: number
  }) {
    return this.request("/api/ai/validate-story", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Backlog Refinement
  async analyzeBacklog(data: {
    project_id: string
    include_completed?: boolean
    max_stories?: number
  }) {
    return this.request("/api/ai/backlog-refinement", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Release Notes
  async generateReleaseNotes(data: {
    release_id: string
    version: string
    custom_highlights?: string[]
    include_technical_details?: boolean
  }) {
    return this.request("/api/ai/release-notes", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Risk Analysis
  async analyzeRisks(data: {
    project_id: string
    analysis_period_days?: number
    include_predictions?: boolean
  }) {
    return this.request("/api/ai/risk-analysis", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Velocity Forecast
  async getVelocityForecast(teamId: string, sprintsBack = 6) {
    return this.request(`/api/ai/velocity-forecast/${teamId}?sprints_back=${sprintsBack}`)
  }
}

export const aiApiClient = new AIApiClient()

// Authentication helper
const getAuthToken = () => {
  return localStorage.getItem("auth_token") || ""
}

// Sprint Planning Hook
export function useSprintPlanning() {
  return useMutation({
    mutationFn: async (data: {
      team_id: string
      team_capacity: number
      candidate_story_ids: string[]
      sprint_goal?: string
    }) => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      aiApiClient.setToken(token)
      return await aiApiClient.planSprint(data)
    },
    onSuccess: (data) => {
      toast.success("Sprint planning completed successfully!")
    },
    onError: (error: Error) => {
      toast.error(`Sprint planning failed: ${error.message}`)
    },
  })
}

// Standup Report Hook
export function useStandupReport() {
  return useMutation({
    mutationFn: async (data: {
      team_id: string
      date?: string
      include_individual_summaries?: boolean
    }) => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      aiApiClient.setToken(token)
      return await aiApiClient.generateStandupReport(data)
    },
    onSuccess: () => {
      toast.success("Standup report generated successfully!")
    },
    onError: (error: Error) => {
      toast.error(`Standup report failed: ${error.message}`)
    },
  })
}

// Retrospective Summary Hook
export function useRetrospectiveSummary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      sprint_id: string
      feedback_entries: Array<{ author?: string; content: string }>
      auto_create_tasks?: boolean
    }) => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      aiApiClient.setToken(token)
      return await aiApiClient.summarizeRetrospective(data)
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["stories"] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })

      toast.success("Retrospective summary completed!")
      if (data.created_task_ids?.length) {
        toast.info(`Created ${data.created_task_ids.length} action item tasks`)
      }
    },
    onError: (error: Error) => {
      toast.error(`Retrospective summary failed: ${error.message}`)
    },
  })
}

// Story Validation Hook
export function useStoryValidation() {
  return useMutation({
    mutationFn: async (data: {
      story_id?: string
      title: string
      description: string
      acceptance_criteria?: string
      story_points?: number
    }) => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      aiApiClient.setToken(token)
      return await aiApiClient.validateStory(data)
    },
    onError: (error: Error) => {
      toast.error(`Story validation failed: ${error.message}`)
    },
  })
}

// Backlog Refinement Hook
export function useBacklogRefinement() {
  return useMutation({
    mutationFn: async (data: {
      project_id: string
      include_completed?: boolean
      max_stories?: number
    }) => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      aiApiClient.setToken(token)
      return await aiApiClient.analyzeBacklog(data)
    },
    onSuccess: () => {
      toast.success("Backlog analysis completed!")
    },
    onError: (error: Error) => {
      toast.error(`Backlog analysis failed: ${error.message}`)
    },
  })
}

// Release Notes Hook
export function useReleaseNotes() {
  return useMutation({
    mutationFn: async (data: {
      release_id: string
      version: string
      custom_highlights?: string[]
      include_technical_details?: boolean
    }) => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      aiApiClient.setToken(token)
      return await aiApiClient.generateReleaseNotes(data)
    },
    onSuccess: () => {
      toast.success("Release notes generated successfully!")
    },
    onError: (error: Error) => {
      toast.error(`Release notes generation failed: ${error.message}`)
    },
  })
}

// Risk Analysis Hook
export function useRiskAnalysis() {
  return useMutation({
    mutationFn: async (data: {
      project_id: string
      analysis_period_days?: number
      include_predictions?: boolean
    }) => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      aiApiClient.setToken(token)
      return await aiApiClient.analyzeRisks(data)
    },
    onSuccess: () => {
      toast.success("Risk analysis completed!")
    },
    onError: (error: Error) => {
      toast.error(`Risk analysis failed: ${error.message}`)
    },
  })
}

// Velocity Forecast Hook
export function useVelocityForecast(teamId: string, sprintsBack = 6) {
  return useQuery({
    queryKey: ["velocity-forecast", teamId, sprintsBack],
    queryFn: async () => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      aiApiClient.setToken(token)
      return await aiApiClient.getVelocityForecast(teamId, sprintsBack)
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Real-time Story Validation Hook (for forms)
export function useRealTimeStoryValidation() {
  const { mutateAsync: validateStory } = useStoryValidation()

  return {
    validateStory: async (storyData: {
      title: string
      description: string
      acceptance_criteria?: string
      story_points?: number
    }) => {
      try {
        const result = await validateStory(storyData)
        return result
      } catch (error) {
        console.error("Real-time validation failed:", error)
        return null
      }
    },
  }
}
