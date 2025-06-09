import { useQuery } from "@tanstack/react-query"
import { apiClient } from "../services/api"

const getAuthToken = () => {
  return localStorage.getItem("auth_token") || ""
}

export function useStoryStats() {
  return useQuery({
    queryKey: ["story-stats"],
    queryFn: async () => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      apiClient.setToken(token)
      const response = await apiClient.getStoryStats()
      return response.data
    },
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  })
}
