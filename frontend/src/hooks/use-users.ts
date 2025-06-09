import { useQuery } from '@tanstack/react-query'

export interface User {
  id: string
  name: string
  avatar?: string
  email?: string
  role?: string
}

// Mock data for users
const mockUsers: User[] = [
  {
    id: "1",
    name: "Sarah Chen",
    avatar: "/placeholder.svg?height=32&width=32",
    email: "sarah.chen@agileforge.com",
    role: "Frontend Developer",
  },
  {
    id: "2", 
    name: "Alex Rodriguez",
    avatar: "/placeholder.svg?height=32&width=32",
    email: "alex.rodriguez@agileforge.com",
    role: "Full Stack Developer",
  },
  {
    id: "3",
    name: "Maria Garcia",
    avatar: "/placeholder.svg?height=32&width=32",
    email: "maria.garcia@agileforge.com",
    role: "Backend Developer",
  },
  {
    id: "4",
    name: "David Kim",
    avatar: "/placeholder.svg?height=32&width=32",
    email: "david.kim@agileforge.com",
    role: "DevOps Engineer",
  },
  {
    id: "5",
    name: "Emma Johnson",
    avatar: "/placeholder.svg?height=32&width=32",
    email: "emma.johnson@agileforge.com",
    role: "UI/UX Designer",
  },
]

const userApi = {
  getUsers: async (): Promise<User[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    return mockUsers
  },
}

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
  })
} 