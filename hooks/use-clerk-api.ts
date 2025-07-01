import { useAuth } from '@clerk/nextjs'
import { useMemo } from 'react'
import { api as originalApi } from '@/services/api'

// Hook that provides API client with Clerk authentication
export function useClerkApi() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const apiWithAuth = useMemo(() => {
    if (!isLoaded || !isSignedIn) {
      return originalApi // Return original API without token
    }

    // Create a proxy that automatically adds auth tokens to requests
    return {
      stories: {
        getAll: async () => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.stories.getAll()
        },
        create: async (story: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.stories.create(story)
        },
        update: async (id: string, story: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.stories.update(id, story)
        },
        patchStory: async (id: string, updates: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.stories.patchStory(id, updates)
        },
        delete: async (id: string) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.stories.delete(id)
        },
        generate: async (request: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.generateStory(request)
        }
      },
      epics: {
        getAll: async () => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.epics.getAll()
        },
        create: async (epic: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.epics.create(epic)
        },
        update: async (id: string, epic: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.epics.update(id, epic)
        },
        delete: async (id: string) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.epics.delete(id)
        },
        generate: async (request: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.generateEpic(request)
        }
      },
      projects: {
        getAll: async () => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.projects.getAll()
        },
        create: async (project: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.projects.create(project)
        },
        update: async (id: string, project: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.projects.update(id, project)
        },
        delete: async (id: string) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.projects.delete(id)
        },
        generate: async (request: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.generateProject(request)
        }
      },
      users: {
        getAll: async () => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.users.getAll()
        },
        create: async (user: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.users.create(user)
        },
        update: async (id: string, user: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.users.update(id, user)
        },
        delete: async (id: string) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.users.delete(id)
        }
      },
      tasks: {
        getAll: async () => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.tasks.getAll()
        },
        create: async (task: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.tasks.create(task)
        },
        update: async (id: string, task: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.tasks.update(id, task)
        },
        delete: async (id: string) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.tasks.delete(id)
        },
        generate: async (request: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.generateTasks(request)
        },
        generateSingle: async (request: any) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.generateSingleTask(request)
        }
      },
      analytics: {
        getOverview: async () => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.analytics.getOverview()
        },
        getProjectDashboard: async (projectId: string, days: number = 30) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.analytics.getProjectDashboard(projectId, days)
        },
        getProjectVelocity: async (projectId: string, days: number = 30) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.analytics.getProjectVelocity(projectId, days)
        },
        getProjectBurndown: async (projectId: string, days: number = 30) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.analytics.getProjectBurndown(projectId, days)
        },
        getTeamPerformance: async (projectId: string, days: number = 30) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.analytics.getTeamPerformance(projectId, days)
        },
        getProjectInsights: async (projectId: string, days: number = 30) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.analytics.getProjectInsights(projectId, days)
        },
        getTeamAnalytics: async (teamId?: string, days: number = 30) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.analytics.getTeamAnalytics(teamId, days)
        }
      },
      search: {
        search: async (query: string) => {
          const token = await getToken()
          if (token) originalApi.setAuthToken(token)
          return originalApi.search.search(query)
        }
      },
      health: {
        check: async () => {
          return originalApi.health.check()
        }
      }
    }
  }, [getToken, isLoaded, isSignedIn])

  return apiWithAuth
} 