import { useQuery } from "@tanstack/react-query"
import { apiClient } from "../services/api"

const getAuthToken = () => {
  return localStorage.getItem("auth_token") || ""
}

export function useEpics() {
  return useQuery({
    queryKey: ["epics"],
    queryFn: async () => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      apiClient.setToken(token)
      const response = await apiClient.getEpics()
      return response.data.epics
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}
