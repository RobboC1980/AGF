import { useQuery } from "@tanstack/react-query"
import { useAuth } from '@clerk/nextjs'
import { useAuthenticatedApi } from './useApi'

export function useEpics() {
  const { isLoaded, isSignedIn } = useAuth()
  const api = useAuthenticatedApi()
  
  return useQuery({
    queryKey: ["epics"],
    queryFn: async () => {
      try {
        const epics = await api.epics.getAll()
        return epics
      } catch (error) {
        console.error('Failed to fetch epics:', error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: isLoaded && isSignedIn,
  })
}
