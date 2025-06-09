import { useState, useEffect, useCallback } from 'react'
import { ApiResponse } from '@/lib/api'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useApi<T>(
  apiFunction: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiFunction()
      
      if (response.error) {
        setError(response.error)
        setData(null)
      } else {
        setData(response.data || null)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [apiFunction])

  useEffect(() => {
    fetchData()
  }, [fetchData, ...dependencies])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch,
  }
}

// Specific hooks for different resources
export function useEpics() {
  const { getEpics } = require('@/lib/api')
  return useApi(getEpics)
}

export function useStories() {
  const { getStories } = require('@/lib/api')
  return useApi(getStories)
}

export function useProjects() {
  const { getProjects } = require('@/lib/api')
  return useApi(getProjects)
}

export function useApiHealth() {
  const { checkApiHealth } = require('@/lib/api')
  return useApi(checkApiHealth)
} 