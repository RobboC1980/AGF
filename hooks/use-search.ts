import { useState, useCallback } from 'react'
import { api } from '@/services/api'

export interface SearchResult {
  id: string
  type: 'project' | 'epic' | 'story' | 'task' | 'user'
  title: string
  description?: string
  key?: string
  status: string
  priority?: string
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  project?: {
    id: string
    name: string
  }
  epic?: {
    id: string
    name: string
    color: string
  }
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (
    query: string, 
    entityType?: string, 
    limit: number = 20
  ) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.search.search(query, entityType, limit)
      setResults(response || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    results,
    isLoading,
    error,
    search,
    clearResults,
    clearError
  }
} 