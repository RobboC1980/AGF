import { useQuery } from "@tanstack/react-query"
import { apiClient } from "../services/api"

const getAuthToken = () => {
  return localStorage.getItem("auth_token") || ""
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token")

      apiClient.setToken(token)
      const response = await apiClient.getUsers()
      return response.data.users
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  })
}
