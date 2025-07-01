import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useAuth, useUser } from '@clerk/nextjs'

// Helper hook to set up API with Clerk auth
function useApiWithAuth() {
  const { getToken } = useAuth()
  
  // Function to set token before making API calls
  const setAuthTokenIfNeeded = async () => {
    try {
      const token = await getToken()
      if (token) {
        api.auth.setToken(token)
      } else {
        // Development mode: use a dummy token
        api.auth.setToken('dev-token')
      }
    } catch (error) {
      console.error('Failed to get auth token:', error)
      // Development fallback: use a dummy token
      api.auth.setToken('dev-token')
    }
  }

  return { setAuthTokenIfNeeded }
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
  const { user } = useUser()
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: queryKeys.stories,
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.stories.getAll()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isLoaded && isSignedIn && !!user, // Only run when auth is complete and authenticated
  })
}

export const useCreateStory = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.stories.create,
    onSuccess: () => {
      // Invalidate and refetch stories
      queryClient.invalidateQueries({ queryKey: queryKeys.stories })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
    },
    onError: (error) => {
      console.error('Failed to create story:', error)
    },
  })
}

export const useUpdateStory = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.stories.update(id, data),
    onSuccess: (data, variables) => {
      // Update the specific story in cache
      queryClient.setQueryData(queryKeys.story(variables.id), data)
      // Invalidate stories list
      queryClient.invalidateQueries({ queryKey: queryKeys.stories })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
    },
    onError: (error) => {
      console.error('Failed to update story:', error)
    },
  })
}

export const useDeleteStory = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.stories.delete,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.story(deletedId) })
      // Invalidate stories list
      queryClient.invalidateQueries({ queryKey: queryKeys.stories })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
    },
    onError: (error) => {
      console.error('Failed to delete story:', error)
    },
  })
}

// Epics hooks
export const useEpics = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: queryKeys.epics,
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.epics.getAll()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isLoaded && isSignedIn && !!user, // Only run when auth is complete and authenticated
  })
}

export const useCreateEpic = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.epics.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.epics })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
    onError: (error) => {
      console.error('Failed to create epic:', error)
    },
  })
}

export const useUpdateEpic = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.epics.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.epic(variables.id), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.epics })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
    onError: (error) => {
      console.error('Failed to update epic:', error)
    },
  })
}

export const useDeleteEpic = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.epics.delete,
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.epic(deletedId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.epics })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
    onError: (error) => {
      console.error('Failed to delete epic:', error)
    },
  })
}

// Users hooks
export const useUsers = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.users.getAll()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - users change less frequently
    enabled: isLoaded && isSignedIn && !!user, // Only run when auth is complete and authenticated
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.users.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users })
    },
    onError: (error) => {
      console.error('Failed to create user:', error)
    },
  })
}

// Analytics hooks
export const useAnalytics = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.analytics.getOverview()
    },
    staleTime: 1 * 60 * 1000, // 1 minute - analytics should be fresh
    enabled: isLoaded && isSignedIn && !!user, // Only run when auth is complete and authenticated
  })
}

export const useProjectAnalytics = (projectId: string, days: number = 30) => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: ['analytics', 'project', projectId, days],
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.analytics.getProjectDashboard(projectId, days)
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: isLoaded && isSignedIn && !!user && !!projectId,
  })
}

export const useProjectVelocity = (projectId: string, days: number = 30) => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: ['analytics', 'velocity', projectId, days],
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.analytics.getProjectVelocity(projectId, days)
    },
    staleTime: 1 * 60 * 1000,
    enabled: isLoaded && isSignedIn && !!user && !!projectId,
  })
}

export const useProjectBurndown = (projectId: string, days: number = 30) => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: ['analytics', 'burndown', projectId, days],
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.analytics.getProjectBurndown(projectId, days)
    },
    staleTime: 1 * 60 * 1000,
    enabled: isLoaded && isSignedIn && !!user && !!projectId,
  })
}

export const useTeamPerformance = (projectId: string, days: number = 30) => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: ['analytics', 'team-performance', projectId, days],
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.analytics.getTeamPerformance(projectId, days)
    },
    staleTime: 1 * 60 * 1000,
    enabled: isLoaded && isSignedIn && !!user && !!projectId,
  })
}

export const useProjectInsights = (projectId: string, days: number = 30) => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: ['analytics', 'insights', projectId, days],
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.analytics.getProjectInsights(projectId, days)
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for AI insights
    enabled: isLoaded && isSignedIn && !!user && !!projectId,
  })
}

export const useTeamAnalytics = (teamId?: string, days: number = 30) => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: ['analytics', 'team', teamId, days],
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.analytics.getTeamAnalytics(teamId, days)
    },
    staleTime: 1 * 60 * 1000,
    enabled: isLoaded && isSignedIn && !!user,
  })
}

// Projects hooks
export const useProjects = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.projects.getAll()
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    enabled: isLoaded && isSignedIn && !!user, // Only run when auth is complete and authenticated
  })
}

export const useCreateProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.projects.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
    onError: (error) => {
      console.error('Failed to create project:', error)
    },
  })
}

export const useUpdateProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.projects.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.project(variables.id), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
    onError: (error) => {
      console.error('Failed to update project:', error)
    },
  })
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.projects.delete,
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.project(deletedId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      queryClient.invalidateQueries({ queryKey: queryKeys.epics })
    },
    onError: (error) => {
      console.error('Failed to delete project:', error)
    },
  })
}

// Tasks hooks
export const useTasks = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: queryKeys.tasks,
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.tasks.getAll()
    },
    staleTime: 1 * 60 * 1000, // 1 minute - tasks change frequently
    enabled: isLoaded && isSignedIn && !!user, // Only run when auth is complete and authenticated
  })
}

export const useCreateTask = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.tasks.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.stories })
    },
    onError: (error) => {
      console.error('Failed to create task:', error)
    },
  })
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.tasks.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.task(variables.id), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.stories })
    },
    onError: (error) => {
      console.error('Failed to update task:', error)
    },
  })
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.tasks.delete,
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.task(deletedId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.stories })
    },
    onError: (error) => {
      console.error('Failed to delete task:', error)
    },
  })
}

// Search hooks
export const useSearch = (query: string, enabled: boolean = true) => {
  const { setAuthTokenIfNeeded } = useApiWithAuth()
  
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: async () => {
      await setAuthTokenIfNeeded()
      return api.search.search(query)
    },
    enabled: enabled && query.length > 0,
    staleTime: 30 * 1000, // 30 seconds - search results should be fresh
  })
}

// Combined data hook with better error handling
export const useProjectData = () => {
  const storiesQuery = useStories()
  const epicsQuery = useEpics()
  const usersQuery = useUsers()
  const analyticsQuery = useAnalytics()

  return {
    stories: storiesQuery.data || [],
    epics: epicsQuery.data || [],
    users: usersQuery.data || [],
    analytics: analyticsQuery.data || null,
    
    // Loading states
    isLoading: storiesQuery.isLoading || epicsQuery.isLoading || usersQuery.isLoading || analyticsQuery.isLoading,
    isStoriesLoading: storiesQuery.isLoading,
    isEpicsLoading: epicsQuery.isLoading,
    isUsersLoading: usersQuery.isLoading,
    isAnalyticsLoading: analyticsQuery.isLoading,
    
    // Error states
    hasError: storiesQuery.isError || epicsQuery.isError || usersQuery.isError || analyticsQuery.isError,
    storiesError: storiesQuery.error,
    epicsError: epicsQuery.error,
    usersError: usersQuery.error,
    analyticsError: analyticsQuery.error,
    
    // Refetch functions
    refetch: () => {
      storiesQuery.refetch()
      epicsQuery.refetch()
      usersQuery.refetch()
      analyticsQuery.refetch()
    },
    refetchStories: storiesQuery.refetch,
    refetchEpics: epicsQuery.refetch,
    refetchUsers: usersQuery.refetch,
    refetchAnalytics: analyticsQuery.refetch,
  }
} 