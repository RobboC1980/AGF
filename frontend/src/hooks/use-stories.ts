import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface Story {
  id: string
  name: string
  description?: string
  acceptanceCriteria?: string
  storyPoints?: number
  priority: "low" | "medium" | "high" | "critical"
  status: "backlog" | "ready" | "in-progress" | "review" | "done"
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  epic?: {
    id: string
    name: string
    color: string
    project: {
      id: string
      name: string
    }
  }
  tags?: string[]
  stats?: {
    totalTasks: number
    completedTasks: number
    completionPercentage: number
    comments: number
    attachments: number
  }
  createdAt: string
  updatedAt: string
  dueDate?: string
}

export interface StoryStats {
  total: number
  completed: number
  inProgress: number
  totalPoints: number
  completedPoints: number
}

export interface BulkUpdatePayload {
  ids: string[]
  updates: Partial<Story>
}

// Mock API functions (replace with actual API calls)
const mockStories: Story[] = [
  {
    id: "1",
    name: "User Authentication System",
    description: "Implement secure user login and registration with OAuth integration",
    storyPoints: 8,
    priority: "high",
    status: "in-progress",
    assignee: {
      id: "1",
      name: "Sarah Chen",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    epic: {
      id: "1",
      name: "User Management",
      color: "bg-blue-500",
      project: {
        id: "1",
        name: "AgileForge Platform",
      },
    },
    tags: ["authentication", "security", "oauth"],
    stats: {
      totalTasks: 12,
      completedTasks: 8,
      completionPercentage: 67,
      comments: 5,
      attachments: 3,
    },
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
    dueDate: "2024-01-25T23:59:59Z",
  },
  {
    id: "2",
    name: "Dashboard Analytics Widget",
    description: "Create interactive charts and metrics for project insights",
    storyPoints: 5,
    priority: "medium",
    status: "ready",
    assignee: {
      id: "2",
      name: "Alex Rodriguez",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    epic: {
      id: "2",
      name: "Analytics Platform",
      color: "bg-purple-500",
      project: {
        id: "1",
        name: "AgileForge Platform",
      },
    },
    tags: ["analytics", "dashboard", "charts"],
    stats: {
      totalTasks: 8,
      completedTasks: 2,
      completionPercentage: 25,
      comments: 12,
      attachments: 1,
    },
    createdAt: "2024-01-18T09:15:00Z",
    updatedAt: "2024-01-19T16:45:00Z",
  },
  {
    id: "3",
    name: "Mobile App Notifications",
    description: "Push notifications for task updates and deadlines",
    storyPoints: 3,
    priority: "critical",
    status: "backlog",
    tags: ["mobile", "notifications", "push"],
    stats: {
      totalTasks: 6,
      completedTasks: 0,
      completionPercentage: 0,
      comments: 2,
      attachments: 0,
    },
    createdAt: "2024-01-20T11:30:00Z",
    updatedAt: "2024-01-20T11:30:00Z",
    dueDate: "2024-01-22T23:59:59Z",
  },
  {
    id: "4",
    name: "Real-time Collaboration Features",
    description: "Add real-time editing and commenting capabilities to project boards",
    storyPoints: 13,
    priority: "high",
    status: "review",
    assignee: {
      id: "3",
      name: "Maria Garcia",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    epic: {
      id: "3",
      name: "Collaboration Platform",
      color: "bg-green-500",
      project: {
        id: "1",
        name: "AgileForge Platform",
      },
    },
    tags: ["real-time", "collaboration", "websockets"],
    stats: {
      totalTasks: 15,
      completedTasks: 12,
      completionPercentage: 80,
      comments: 8,
      attachments: 2,
    },
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-01-22T12:00:00Z",
    dueDate: "2024-01-28T23:59:59Z",
  },
  {
    id: "5",
    name: "API Rate Limiting",
    description: "Implement proper rate limiting and throttling for API endpoints",
    storyPoints: 5,
    priority: "medium",
    status: "done",
    assignee: {
      id: "4",
      name: "David Kim",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    tags: ["api", "security", "performance"],
    stats: {
      totalTasks: 7,
      completedTasks: 7,
      completionPercentage: 100,
      comments: 3,
      attachments: 1,
    },
    createdAt: "2024-01-05T10:00:00Z",
    updatedAt: "2024-01-19T16:30:00Z",
  },
]

const storyApi = {
  getStories: async (): Promise<Story[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    return mockStories
  },
  
  deleteStory: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300))
    // In real implementation, make API call to delete story
  },
  
  bulkDeleteStories: async (ids: string[]): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    // In real implementation, make API call to bulk delete stories
  },
  
  bulkUpdateStories: async (payload: BulkUpdatePayload): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    // In real implementation, make API call to bulk update stories
  },
  
  getStoryStats: async (): Promise<StoryStats> => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const stories = mockStories
    return {
      total: stories.length,
      completed: stories.filter(s => s.status === 'done').length,
      inProgress: stories.filter(s => s.status === 'in-progress').length,
      totalPoints: stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0),
      completedPoints: stories.filter(s => s.status === 'done').reduce((sum, s) => sum + (s.storyPoints || 0), 0),
    }
  },
}

export const useStories = () => {
  return useQuery({
    queryKey: ['stories'],
    queryFn: storyApi.getStories,
  })
}

export const useDeleteStory = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: storyApi.deleteStory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['story-stats'] })
    },
  })
}

export const useBulkDeleteStories = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: storyApi.bulkDeleteStories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['story-stats'] })
    },
  })
}

export const useBulkUpdateStories = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: storyApi.bulkUpdateStories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['story-stats'] })
    },
  })
}

export const useStoryStats = () => {
  return useQuery({
    queryKey: ['story-stats'],
    queryFn: storyApi.getStoryStats,
  })
} 