import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from '@clerk/nextjs'
import { useAuthenticatedApi } from './useApi'
import { toast } from "sonner"

// Get authentication token (replace with your auth implementation)
const getAuthToken = () => {
  // This should come from your auth context/store
  return localStorage.getItem("auth_token") || ""
}

export function useStories() {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      try {
        const stories = await api.stories.getAll()
        return stories
      } catch (error) {
        console.error('Failed to fetch stories:', error)
        throw error
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    enabled: isLoaded && isSignedIn,
  })
}

export function useStory(id: string) {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: ["stories", id],
    queryFn: async () => {
      try {
        const story = await api.stories.getById(id)
        return story
      } catch (error) {
        console.error('Failed to fetch story:', error)
        throw error
      }
    },
    enabled: isLoaded && isSignedIn && !!id,
  })
}

export function useCreateStory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (story: Partial<Story>) => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      apiClient.setToken(token)
      const response = await apiClient.createStory(story)
      return response.data
    },
    onSuccess: (newStory) => {
      // Optimistically update the cache
      queryClient.setQueryData(["stories"], (old: Story[] | undefined) => {
        return old ? [...old, newStory] : [newStory]
      })

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["stories"] })
      queryClient.invalidateQueries({ queryKey: ["story-stats"] })

      toast.success("Story created successfully!")
    },
    onError: (error: Error) => {
      toast.error(`Failed to create story: ${error.message}`)
    },
  })
}

export function useUpdateStory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, story }: { id: string; story: Partial<Story> }) => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      apiClient.setToken(token)
      const response = await apiClient.updateStory(id, story)
      return response.data
    },
    onSuccess: (updatedStory) => {
      // Optimistically update the cache
      queryClient.setQueryData(["stories"], (old: Story[] | undefined) => {
        return old?.map((story) => (story.id === updatedStory.id ? updatedStory : story)) || []
      })

      // Update individual story cache
      queryClient.setQueryData(["stories", updatedStory.id], updatedStory)

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["stories"] })
      queryClient.invalidateQueries({ queryKey: ["story-stats"] })

      toast.success("Story updated successfully!")
    },
    onError: (error: Error) => {
      toast.error(`Failed to update story: ${error.message}`)
    },
  })
}

export function useDeleteStory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      apiClient.setToken(token)
      await apiClient.deleteStory(id)
      return id
    },
    onSuccess: (deletedId) => {
      // Optimistically update the cache
      queryClient.setQueryData(["stories"], (old: Story[] | undefined) => {
        return old?.filter((story) => story.id !== deletedId) || []
      })

      // Remove individual story from cache
      queryClient.removeQueries({ queryKey: ["stories", deletedId] })

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["stories"] })
      queryClient.invalidateQueries({ queryKey: ["story-stats"] })

      toast.success("Story deleted successfully!")
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete story: ${error.message}`)
    },
  })
}

export function useBulkDeleteStories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      apiClient.setToken(token)
      await apiClient.bulkDeleteStories(ids)
      return ids
    },
    onSuccess: (deletedIds) => {
      // Optimistically update the cache
      queryClient.setQueryData(["stories"], (old: Story[] | undefined) => {
        return old?.filter((story) => !deletedIds.includes(story.id)) || []
      })

      // Remove individual stories from cache
      deletedIds.forEach((id) => {
        queryClient.removeQueries({ queryKey: ["stories", id] })
      })

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["stories"] })
      queryClient.invalidateQueries({ queryKey: ["story-stats"] })

      toast.success(`${deletedIds.length} stories deleted successfully!`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete stories: ${error.message}`)
    },
  })
}

export function useBulkUpdateStories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Story> }) => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      apiClient.setToken(token)
      const response = await apiClient.bulkUpdateStories(ids, updates)
      return response.data
    },
    onSuccess: (updatedStories) => {
      // Optimistically update the cache
      queryClient.setQueryData(["stories"], (old: Story[] | undefined) => {
        if (!old) return []

        const updatedMap = new Map(updatedStories.map((story) => [story.id, story]))
        return old.map((story) => updatedMap.get(story.id) || story)
      })

      // Update individual story caches
      updatedStories.forEach((story) => {
        queryClient.setQueryData(["stories", story.id], story)
      })

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["stories"] })
      queryClient.invalidateQueries({ queryKey: ["story-stats"] })

      toast.success(`${updatedStories.length} stories updated successfully!`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to update stories: ${error.message}`)
    },
  })
}
