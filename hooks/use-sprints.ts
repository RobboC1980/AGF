import { useState, useCallback, useEffect } from 'react'
import { api, Sprint } from '@/services/api'
import { toast } from 'sonner'

export function useSprints(projectId?: string) {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSprints = useCallback(async (status?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.sprints.getAll(projectId, status)
      setSprints(response || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sprints'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const createSprint = useCallback(async (sprintData: Omit<Sprint, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'sprint_number' | 'completed_story_points' | 'scope_changes' | 'stories_count'> & { project_id: string }) => {
    try {
      const newSprint = await api.sprints.create(sprintData)
      setSprints(prev => [newSprint, ...prev])
      toast.success('Sprint created successfully')
      return newSprint
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create sprint'
      toast.error(errorMessage)
      throw err
    }
  }, [])

  const updateSprint = useCallback(async (id: string, sprintData: Partial<Sprint>) => {
    try {
      const updatedSprint = await api.sprints.update(id, sprintData)
      setSprints(prev => prev.map(sprint => 
        sprint.id === id ? updatedSprint : sprint
      ))
      toast.success('Sprint updated successfully')
      return updatedSprint
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update sprint'
      toast.error(errorMessage)
      throw err
    }
  }, [])

  const updateSprintStatus = useCallback(async (
    id: string, 
    status: string, 
    actualStartDate?: string, 
    actualEndDate?: string
  ) => {
    try {
      const updatedSprint = await api.sprints.updateStatus(id, status, actualStartDate, actualEndDate)
      setSprints(prev => prev.map(sprint => 
        sprint.id === id ? updatedSprint : sprint
      ))
      toast.success(`Sprint ${status} successfully`)
      return updatedSprint
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${status} sprint`
      toast.error(errorMessage)
      throw err
    }
  }, [])

  const addStoriesToSprint = useCallback(async (sprintId: string, storyIds: string[]) => {
    try {
      await api.sprints.addStories(sprintId, storyIds)
      // Refresh sprints to get updated story count
      await fetchSprints()
      toast.success(`Added ${storyIds.length} ${storyIds.length === 1 ? 'story' : 'stories'} to sprint`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add stories to sprint'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchSprints])

  const removeStoriesFromSprint = useCallback(async (sprintId: string, storyIds: string[]) => {
    try {
      await api.sprints.removeStories(sprintId, storyIds)
      // Refresh sprints to get updated story count
      await fetchSprints()
      toast.success(`Removed ${storyIds.length} ${storyIds.length === 1 ? 'story' : 'stories'} from sprint`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove stories from sprint'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchSprints])

  const deleteSprint = useCallback(async (id: string) => {
    try {
      await api.sprints.delete(id)
      setSprints(prev => prev.filter(sprint => sprint.id !== id))
      toast.success('Sprint deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete sprint'
      toast.error(errorMessage)
      throw err
    }
  }, [])

  const getActiveSprint = useCallback(() => {
    return sprints.find(sprint => sprint.status === 'active')
  }, [sprints])

  const getPlanningSprints = useCallback(() => {
    return sprints.filter(sprint => sprint.status === 'planning')
  }, [sprints])

  const getCompletedSprints = useCallback(() => {
    return sprints.filter(sprint => sprint.status === 'completed')
  }, [sprints])

  // Auto-fetch sprints when projectId changes
  useEffect(() => {
    if (projectId) {
      fetchSprints()
    }
  }, [projectId, fetchSprints])

  return {
    sprints,
    isLoading,
    error,
    fetchSprints,
    createSprint,
    updateSprint,
    updateSprintStatus,
    addStoriesToSprint,
    removeStoriesFromSprint,
    deleteSprint,
    getActiveSprint,
    getPlanningSprints,
    getCompletedSprints,
  }
}

export function useSprint(sprintId: string) {
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSprint = useCallback(async () => {
    if (!sprintId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.sprints.getById(sprintId)
      setSprint(response)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sprint'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [sprintId])

  const getSprintStories = useCallback(async () => {
    if (!sprintId) return []

    try {
      return await api.sprints.getStories(sprintId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sprint stories'
      toast.error(errorMessage)
      return []
    }
  }, [sprintId])

  const getSprintBurndown = useCallback(async () => {
    if (!sprintId) return null

    try {
      return await api.sprints.getBurndown(sprintId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sprint burndown'
      toast.error(errorMessage)
      return null
    }
  }, [sprintId])

  useEffect(() => {
    if (sprintId) {
      fetchSprint()
    }
  }, [sprintId, fetchSprint])

  return {
    sprint,
    isLoading,
    error,
    fetchSprint,
    getSprintStories,
    getSprintBurndown,
  }
} 