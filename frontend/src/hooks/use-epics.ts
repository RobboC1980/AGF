import { useQuery } from '@tanstack/react-query'

export interface Epic {
  id: string
  name: string
  color: string
  project: {
    id: string
    name: string
  }
}

// Mock data for epics
const mockEpics: Epic[] = [
  {
    id: "1",
    name: "User Management",
    color: "bg-blue-500",
    project: {
      id: "1",
      name: "AgileForge Platform",
    },
  },
  {
    id: "2",
    name: "Analytics Platform",
    color: "bg-purple-500",
    project: {
      id: "1",
      name: "AgileForge Platform",
    },
  },
  {
    id: "3",
    name: "Collaboration Platform",
    color: "bg-green-500",
    project: {
      id: "1",
      name: "AgileForge Platform",
    },
  },
  {
    id: "4",
    name: "Mobile Experience",
    color: "bg-orange-500",
    project: {
      id: "2",
      name: "Mobile App",
    },
  },
]

const epicApi = {
  getEpics: async (): Promise<Epic[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    return mockEpics
  },
}

export const useEpics = () => {
  return useQuery({
    queryKey: ['epics'],
    queryFn: epicApi.getEpics,
  })
} 