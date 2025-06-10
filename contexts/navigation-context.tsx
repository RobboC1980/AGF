import React, { createContext, useContext, useState } from 'react'

export type PageType = "epics" | "projects" | "stories" | "tasks" | "search" | "kanban" | "analytics" | "collaboration"

interface NavigationFilters {
  projectId?: string
  epicId?: string
  storyId?: string
  assigneeId?: string
}

interface NavigationContextType {
  currentPage: PageType
  filters: NavigationFilters
  setCurrentPage: (page: PageType) => void
  setFilters: (filters: NavigationFilters) => void
  navigateToProject: (projectId: string) => void
  navigateToEpic: (epicId: string, projectId?: string) => void
  navigateToStory: (storyId: string, epicId?: string) => void
  navigateToTask: (taskId: string, storyId?: string) => void
  navigateToProjectEpics: (projectId: string) => void
  navigateToEpicStories: (epicId: string) => void
  navigateToStoryTasks: (storyId: string) => void
  clearFilters: () => void
  getBreadcrumbs: () => Array<{ label: string; page: PageType; filters?: NavigationFilters }>
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export const useNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

interface NavigationProviderProps {
  children: React.ReactNode
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageType>("projects")
  const [filters, setFilters] = useState<NavigationFilters>({})

  const navigateToProject = (projectId: string) => {
    setCurrentPage("projects")
    setFilters({ projectId })
  }

  const navigateToEpic = (epicId: string, projectId?: string) => {
    setCurrentPage("epics")
    setFilters({ epicId, projectId })
  }

  const navigateToStory = (storyId: string, epicId?: string) => {
    setCurrentPage("stories")
    setFilters({ storyId, epicId })
  }

  const navigateToTask = (taskId: string, storyId?: string) => {
    setCurrentPage("tasks")
    setFilters({ taskId: taskId, storyId })
  }

  const navigateToProjectEpics = (projectId: string) => {
    setCurrentPage("epics")
    setFilters({ projectId })
  }

  const navigateToEpicStories = (epicId: string) => {
    setCurrentPage("stories")
    setFilters({ epicId })
  }

  const navigateToStoryTasks = (storyId: string) => {
    setCurrentPage("tasks")
    setFilters({ storyId })
  }

  const clearFilters = () => {
    setFilters({})
  }

  const getBreadcrumbs = () => {
    const breadcrumbs: Array<{ label: string; page: PageType; filters?: NavigationFilters }> = []
    
    if (filters.projectId) {
      breadcrumbs.push({
        label: "Project",
        page: "projects",
        filters: { projectId: filters.projectId }
      })
    }
    
    if (filters.epicId) {
      breadcrumbs.push({
        label: "Epic",
        page: "epics",
        filters: { epicId: filters.epicId, projectId: filters.projectId }
      })
    }
    
    if (filters.storyId) {
      breadcrumbs.push({
        label: "Story",
        page: "stories",
        filters: { storyId: filters.storyId, epicId: filters.epicId }
      })
    }

    return breadcrumbs
  }

  const value: NavigationContextType = {
    currentPage,
    filters,
    setCurrentPage,
    setFilters,
    navigateToProject,
    navigateToEpic,
    navigateToStory,
    navigateToTask,
    navigateToProjectEpics,
    navigateToEpicStories,
    navigateToStoryTasks,
    clearFilters,
    getBreadcrumbs,
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
} 