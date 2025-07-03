import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createAuthenticatedApi } from '@/services/api'
import { useAuth, useUser } from '@clerk/nextjs'
import { useMemo } from 'react'

// Custom hook to create an authenticated API client
export function useAuthenticatedApi() {
  const { getToken } = useAuth()
  
  return useMemo(() => {
    return createAuthenticatedApi(getToken)
  }, [getToken])
}

// Query keys for consistent caching
export const queryKeys = {
  stories: ['stories'] as const,
  story: (id: string) => ['stories', id] as const,
  epics: ['epics'] as const,
  epic: (id: string) => ['epics', id] as const,
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  analytics: ['analytics'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
  search: (query: string) => ['search', query] as const,
}

// Stories hooks
export const useStories = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: queryKeys.stories,
    queryFn: async () => {
      try {
        const stories = await api.stories.getAll()
        return stories
      } catch (error) {
        console.error('Failed to fetch stories:', error)
        throw error
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isLoaded && isSignedIn,
  })
}

export const useCreateStory = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        const story = await api.stories.create(data)
        return story
      } catch (error) {
        console.error('Failed to create story:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
    },
  })
}

export const useUpdateStory = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      try {
        const story = await api.stories.update(id, data)
        return story
      } catch (error) {
        console.error('Failed to update story:', error)
        throw error
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.story(variables.id), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.stories })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
    },
  })
}

export const useDeleteStory = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.stories.delete(id)
        return id
      } catch (error) {
        console.error('Failed to delete story:', error)
        throw error
      }
    },
    onSuccess: (deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.story(deletedId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.stories })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
    },
  })
}

// Epics hooks
export const useEpics = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: queryKeys.epics,
    queryFn: async () => {
      try {
        const epics = await api.epics.getAll()
        return epics
      } catch (error) {
        console.error('Failed to fetch epics:', error)
        throw error
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isLoaded && isSignedIn,
  })
}

export const useCreateEpic = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        const epic = await api.epics.create(data)
        return epic
      } catch (error) {
        console.error('Failed to create epic:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.epics })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}

export const useUpdateEpic = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      try {
        const epic = await api.epics.update(id, data)
        return epic
      } catch (error) {
        console.error('Failed to update epic:', error)
        throw error
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.epic(variables.id), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.epics })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}

export const useDeleteEpic = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.epics.delete(id)
        return id
      } catch (error) {
        console.error('Failed to delete epic:', error)
        throw error
      }
    },
    onSuccess: (deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.epic(deletedId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.epics })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}

// Users hooks
export const useUsers = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      try {
        const users = await api.users.getAll()
        return users
      } catch (error) {
        console.error('Failed to fetch users:', error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - users change less frequently
    enabled: isLoaded && isSignedIn,
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        const user = await api.users.create(data)
        return user
      } catch (error) {
        console.error('Failed to create user:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users })
    },
  })
}

// Analytics hooks
export const useAnalytics = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: async () => {
      try {
        const analytics = await api.analytics.getOverview()
        return analytics
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
        throw error
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute - analytics should be fresh
    enabled: isLoaded && isSignedIn,
  })
}

export const useProjectAnalytics = (projectId: string, days: number = 30) => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: ['analytics', 'project', projectId, days],
    queryFn: async () => {
      try {
        const analytics = await api.analytics.getProjectDashboard(projectId, days)
        return analytics
      } catch (error) {
        console.error('Failed to fetch project analytics:', error)
        throw error
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: isLoaded && isSignedIn && !!projectId,
  })
}

export const useProjectVelocity = (projectId: string, days: number = 30) => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: ['analytics', 'velocity', projectId, days],
    queryFn: async () => {
      try {
        const velocity = await api.analytics.getProjectVelocity(projectId, days)
        return velocity
      } catch (error) {
        console.error('Failed to fetch project velocity:', error)
        throw error
      }
    },
    staleTime: 1 * 60 * 1000,
    enabled: isLoaded && isSignedIn && !!projectId,
  })
}

export const useProjectBurndown = (projectId: string, days: number = 30) => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: ['analytics', 'burndown', projectId, days],
    queryFn: async () => {
      try {
        const burndown = await api.analytics.getProjectBurndown(projectId, days)
        return burndown
      } catch (error) {
        console.error('Failed to fetch project burndown:', error)
        throw error
      }
    },
    staleTime: 1 * 60 * 1000,
    enabled: isLoaded && isSignedIn && !!projectId,
  })
}

export const useTeamPerformance = (projectId: string, days: number = 30) => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: ['analytics', 'team-performance', projectId, days],
    queryFn: async () => {
      try {
        const performance = await api.analytics.getTeamPerformance(projectId, days)
        return performance
      } catch (error) {
        console.error('Failed to fetch team performance:', error)
        throw error
      }
    },
    staleTime: 1 * 60 * 1000,
    enabled: isLoaded && isSignedIn && !!projectId,
  })
}

export const useProjectInsights = (projectId: string, days: number = 30) => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: ['analytics', 'insights', projectId, days],
    queryFn: async () => {
      try {
        const insights = await api.analytics.getProjectInsights(projectId, days)
        return insights
      } catch (error) {
        console.error('Failed to fetch project insights:', error)
        throw error
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for AI insights
    enabled: isLoaded && isSignedIn && !!projectId,
  })
}

export const useTeamAnalytics = (teamId?: string, days: number = 30) => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: ['analytics', 'team', teamId, days],
    queryFn: async () => {
      try {
        const analytics = await api.analytics.getTeamAnalytics(teamId, days)
        return analytics
      } catch (error) {
        console.error('Failed to fetch team analytics:', error)
        throw error
      }
    },
    staleTime: 1 * 60 * 1000,
    enabled: isLoaded && isSignedIn,
  })
}

// Projects hooks
export const useProjects = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      try {
        const projects = await api.projects.getAll()
        return projects
      } catch (error) {
        console.error('Failed to fetch projects:', error)
        throw error
      }
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    enabled: isLoaded && isSignedIn,
  })
}

export const useCreateProject = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        const project = await api.projects.create(data)
        return project
      } catch (error) {
        console.error('Failed to create project:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}

export const useUpdateProject = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      try {
        const project = await api.projects.update(id, data)
        return project
      } catch (error) {
        console.error('Failed to update project:', error)
        throw error
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.project(variables.id), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.projects.delete(id)
        return id
      } catch (error) {
        console.error('Failed to delete project:', error)
        throw error
      }
    },
    onSuccess: (deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.project(deletedId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      queryClient.invalidateQueries({ queryKey: queryKeys.epics })
    },
  })
}

// Tasks hooks
export const useTasks = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: queryKeys.tasks,
    queryFn: async () => {
      try {
        const tasks = await api.tasks.getAll()
        return tasks
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
        throw error
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute - tasks change frequently
    enabled: isLoaded && isSignedIn,
  })
}

export const useCreateTask = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        const task = await api.tasks.create(data)
        return task
      } catch (error) {
        console.error('Failed to create task:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.stories })
    },
  })
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      try {
        const task = await api.tasks.update(id, data)
        return task
      } catch (error) {
        console.error('Failed to update task:', error)
        throw error
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.task(variables.id), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.stories })
    },
  })
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient()
  const api = useAuthenticatedApi()
  
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.tasks.delete(id)
        return id
      } catch (error) {
        console.error('Failed to delete task:', error)
        throw error
      }
    },
    onSuccess: (deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.task(deletedId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.stories })
    },
  })
}

// Search hook
export const useSearch = (query: string, enabled: boolean = true) => {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: async () => {
      try {
        const results = await api.search.search(query)
        return results
      } catch (error) {
        console.error('Failed to search:', error)
        throw error
      }
    },
    enabled: enabled && query.length > 0 && isLoaded && isSignedIn,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Combined data hook for dashboard
export const useProjectData = () => {
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects()
  const { data: epics, isLoading: epicsLoading, error: epicsError } = useEpics()
  const { data: stories, isLoading: storiesLoading, error: storiesError } = useStories()
  const { data: users, isLoading: usersLoading, error: usersError } = useUsers()
  
  return {
    projects: projects || [],
    epics: epics || [],
    stories: stories || [],
    users: users || [],
    isLoading: projectsLoading || epicsLoading || storiesLoading || usersLoading,
    error: projectsError || epicsError || storiesError || usersError,
  }
}

// Health check hook
export const useHealthCheck = () => {
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      try {
        const health = await api.health.check()
        return health
      } catch (error) {
        console.error('Failed to check health:', error)
        throw error
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 3,
    retryDelay: 1000,
  })
} 