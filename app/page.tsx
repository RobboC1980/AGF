"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser, SignOutButton } from "@clerk/nextjs"
import { QueryProvider } from "../providers/query-provider"
import { ToastProvider } from "../providers/toast-provider"
import ErrorBoundary from "../components/error-boundary"
import EpicsPage from "../components/epics-page"
import ProjectsPage from "../components/projects-page"
import UserStoriesPage from "../components/user-stories-page"
import TasksPage from "../components/tasks-page"
import SearchPage from "../components/search-page"
import KanbanBoard from "../components/kanban-board"
import SprintBoardPage from "../components/sprint-board-page"
import AnalyticsDashboard from "../components/analytics-dashboard"
import CollaborationPanel from "../components/collaboration-panel"
import SimpleCreateModal from "../components/simple-create-modal"
import { CreateStoryModal } from "../components/create-story-modal"
import { CreateEpicModal } from "../components/create-epic-modal"
import { CreateTaskModal } from "../components/create-task-modal"
import { CreateProjectModal } from "../components/create-project-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Rocket, Target, BookOpen, CheckSquare, Search, BarChart3, MessageSquare, Columns, User, LogOut, Settings, ChevronDown } from "lucide-react"
import { useStories, useEpics, useUsers } from "@/hooks/useApi"
import { api } from "@/services/api"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

type PageType = "epics" | "projects" | "stories" | "tasks" | "search" | "kanban" | "sprint-board" | "analytics" | "collaboration"

export default function Page() {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL, BEFORE ANY EARLY RETURNS
  const [currentPage, setCurrentPage] = useState<PageType>("epics")
  const [isLoading, setIsLoading] = useState(false)
  const [showCollaboration, setShowCollaboration] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [editingStory, setEditingStory] = useState<any>(null)
  const [showEpicModal, setShowEpicModal] = useState(false)
  const [editingEpic, setEditingEpic] = useState<any>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [movingItems, setMovingItems] = useState<Set<string>>(new Set())
  
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Only call API hooks when authenticated - they have built-in enabled checks
  const { data: modalStories = [] } = useStories()
  const { data: modalEpics = [] } = useEpics()
  const { data: modalUsers = [] } = useUsers()
  const { data: kanbanStories = [] } = useStories()

  // Create kanban columns from real data - using useMemo for better performance
  // MUST be called before any early returns
  const kanbanColumns = useMemo(() => [
    {
      id: "backlog",
      title: "Backlog",
      color: "bg-slate-500",
      items: kanbanStories.filter(story => story.status === 'backlog').map(story => ({
        id: story.id,
        title: story.name,
        description: story.description || '',
        type: "story" as const,
        priority: story.priority as "low" | "medium" | "high" | "critical",
        assignee: story.assignee ? {
          id: story.assignee.id,
          name: story.assignee.name,
          avatar: story.assignee.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${story.assignee.name}`,
        } : undefined,
        tags: story.tags || [],
        progress: 0,
        storyPoints: story.story_points || 0,
        createdAt: story.createdAt,
      })),
    },
    {
      id: "ready",
      title: "Ready",
      color: "bg-blue-500",
      limit: 5,
      items: kanbanStories.filter(story => story.status === 'ready').map(story => ({
        id: story.id,
        title: story.name,
        description: story.description || '',
        type: "story" as const,
        priority: story.priority as "low" | "medium" | "high" | "critical",
        assignee: story.assignee ? {
          id: story.assignee.id,
          name: story.assignee.name,
          avatar: story.assignee.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${story.assignee.name}`,
        } : undefined,
        tags: story.tags || [],
        progress: 25,
        storyPoints: story.story_points || 0,
        createdAt: story.createdAt,
      })),
    },
    {
      id: "in-progress",
      title: "In Progress",
      color: "bg-purple-500",
      limit: 3,
      items: kanbanStories.filter(story => story.status === 'in-progress').map(story => ({
        id: story.id,
        title: story.name,
        description: story.description || '',
        type: "story" as const,
        priority: story.priority as "low" | "medium" | "high" | "critical",
        assignee: story.assignee ? {
          id: story.assignee.id,
          name: story.assignee.name,
          avatar: story.assignee.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${story.assignee.name}`,
        } : undefined,
        tags: story.tags || [],
        progress: 60,
        storyPoints: story.story_points || 0,
        createdAt: story.createdAt,
      })),
    },
    {
      id: "review",
      title: "Review",
      color: "bg-amber-500",
      items: kanbanStories.filter(story => story.status === 'review').map(story => ({
        id: story.id,
        title: story.name,
        description: story.description || '',
        type: "story" as const,
        priority: story.priority as "low" | "medium" | "high" | "critical",
        assignee: story.assignee ? {
          id: story.assignee.id,
          name: story.assignee.name,
          avatar: story.assignee.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${story.assignee.name}`,
        } : undefined,
        tags: story.tags || [],
        progress: 90,
        storyPoints: story.story_points || 0,
        createdAt: story.createdAt,
      })),
    },
    {
      id: "done",
      title: "Done",
      color: "bg-emerald-500",
      items: kanbanStories.filter(story => story.status === 'done').map(story => ({
        id: story.id,
        title: story.name,
        description: story.description || '',
        type: "story" as const,
        priority: story.priority as "low" | "medium" | "high" | "critical",
        assignee: story.assignee ? {
          id: story.assignee.id,
          name: story.assignee.name,
          avatar: story.assignee.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${story.assignee.name}`,
        } : undefined,
        tags: story.tags || [],
        progress: 100,
        storyPoints: story.story_points || 0,
        createdAt: story.createdAt,
      })),
    },
  ], [kanbanStories])

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

  // NOW we can have early returns after all hooks have been called
  // Show loading while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render the page if not authenticated
  if (!isSignedIn) {
    return null
  }

  const handleLogout = () => {
    // Clerk will handle the logout and redirect
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 1500)
  }

  const handleCreateNew = () => {
    console.log(`Creating new ${currentPage.slice(0, -1)}`)
    // If we're on the stories page, open the story modal
    if (currentPage === "stories") {
      setShowStoryModal(true)
      setEditingStory(null)
    }
    // If we're on the epics page, open the epic modal
    if (currentPage === "epics") {
      setShowEpicModal(true)
      setEditingEpic(null)
    }
    // If we're on the projects page, open the project modal
    if (currentPage === "projects") {
      setShowProjectModal(true)
      setEditingProject(null)
    }
  }

  const handleCreateSubmit = async (data: any, entityType?: string) => {
    console.log("Creating item:", data, "Type:", entityType)
    
    try {
      // Determine the entity type from parameter or data
      const type = entityType || data.type || (currentPage === "projects" ? "project" : "task")
      
      if (type === "project") {
        // Handle project creation
        const projectPayload = {
          name: data.title,
          description: data.description || '',
          status: data.status || 'active',
        }
        
        await api.projects.create(projectPayload)
        await queryClient.invalidateQueries({ queryKey: ['projects'] })
        console.log("Project created successfully!")
        
      } else if (type === "task") {
        // Handle task creation
        if (!data.storyId) {
          throw new Error("Story is required for task creation")
        }
        
        const taskPayload = {
          title: data.title,
          description: data.description || '',
          story_id: data.storyId,
          assignee_id: data.assigneeId || null,
          estimated_hours: data.estimatedHours || 4,
          status: 'todo',
          priority: data.priority || 'medium',
          due_date: data.dueDate || null
        }
        
        await api.tasks.create(taskPayload)
        await queryClient.invalidateQueries({ queryKey: ['tasks'] })
        await queryClient.invalidateQueries({ queryKey: ['stories'] })
        console.log("Task created successfully!")
      }
      
      return Promise.resolve()
    } catch (error) {
      console.error("Failed to create item:", error)
      throw error
    }
  }

  const handleEdit = (item: any) => {
    console.log("Editing item:", item)
    // If we're on the stories page, open the story modal for editing
    if (currentPage === "stories") {
      setEditingStory(item)
      setShowStoryModal(true)
    }
    // If we're on the epics page, open the epic modal for editing
    if (currentPage === "epics") {
      setEditingEpic(item)
      setShowEpicModal(true)
    }
  }

  const handleDelete = (item: any) => {
    console.log("Deleting item:", item)
  }

  const handleStoryModalSave = async (storyData: any) => {
    try {
      console.log("Saving story:", storyData)
      
      // Transform the story data to match the API format
      const storyPayload = {
        name: storyData.name,
        description: storyData.description || '',
        acceptance_criteria: Array.isArray(storyData.acceptanceCriteria) 
          ? storyData.acceptanceCriteria.join('\n') 
          : storyData.acceptanceCriteria || '',
        story_points: storyData.storyPoints || null,
        priority: storyData.priority || 'medium',
        status: storyData.status || 'backlog',
        epic_id: storyData.epicId || modalEpics[0]?.id || "36697bf7-0021-49fb-a3e9-91ac20748937", // Use first epic if none selected
        assignee_id: storyData.assigneeId || null,
        tags: storyData.tags || null,
        due_date: storyData.dueDate || null,
      }

      if (editingStory) {
        // Update existing story
        await api.stories.update(editingStory.id, storyPayload)
      } else {
        // Create new story
        await api.stories.create(storyPayload)
      }

      // Invalidate React Query cache to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['stories'] })
      
      setShowStoryModal(false)
      setEditingStory(null)
      
      console.log("Story saved successfully!")
    } catch (error) {
      console.error("Failed to save story:", error)
      throw error // Re-throw so the modal can show the error
    }
  }

  const handleEpicModalSave = async (epicData: any) => {
    try {
      console.log("Saving epic:", epicData)
      
      // Transform the epic data to match the API format
      const epicPayload = {
        name: epicData.name,
        description: epicData.description || '',
        priority: epicData.priority || 'medium',
        status: epicData.status || 'planning',
        project_id: epicData.projectId || null,
        estimated_story_points: epicData.estimatedStoryPoints || null,
        target_end_date: epicData.dueDate || null,
      }

      if (editingEpic) {
        // Update existing epic
        await api.epics.update(editingEpic.id, epicPayload)
      } else {
        // Create new epic
        await api.epics.create(epicPayload)
      }

      // Invalidate React Query cache to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['epics'] })
      
      setShowEpicModal(false)
      setEditingEpic(null)
      
      console.log("Epic saved successfully!")
    } catch (error) {
      console.error("Failed to save epic:", error)
      throw error // Re-throw so the modal can show the error
    }
  }

  const pages = [
    { value: "epics", label: "Epics", icon: Rocket, description: "Large feature initiatives" },
    { value: "projects", label: "Projects", icon: Target, description: "Strategic project portfolio" },
    { value: "stories", label: "User Stories", icon: BookOpen, description: "Feature requirements and user workflows" },
    { value: "tasks", label: "Tasks", icon: CheckSquare, description: "Individual work items and deliverables" },
    { value: "search", label: "Search", icon: Search, description: "Find anything quickly" },
    { value: "kanban", label: "Kanban", icon: Columns, description: "Visual workflow management" },
    { value: "sprint-board", label: "Sprint Board", icon: Target, description: "Sprint-focused kanban workflow" },
    { value: "analytics", label: "Analytics", icon: BarChart3, description: "Performance insights" },
    { value: "collaboration", label: "Collaboration", icon: MessageSquare, description: "Team communication" },
  ]

  // Wrapper component to fetch first available project for Sprint Board
  const SprintBoardPageWrapper = () => {
    const [firstProjectId, setFirstProjectId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      // Only fetch projects when authentication is complete and user is authenticated
      if (!isLoaded || !isSignedIn) return

      const fetchFirstProject = async () => {
        try {
          setLoading(true)
          setError(null)
          const projects = await api.projects.getAll()
          if (projects && Array.isArray(projects) && projects.length > 0) {
            setFirstProjectId(projects[0].id)
          } else {
            setError('No projects found')
          }
        } catch (error) {
          console.error('Failed to fetch projects for sprint board:', error)
          setError(error instanceof Error ? error.message : 'Failed to load projects')
        } finally {
          setLoading(false)
        }
      }

      fetchFirstProject()
    }, [isLoaded, isSignedIn])

    // Show loading while auth is initializing or projects are loading
    if (!isLoaded || loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading sprint board...</p>
          </div>
        </div>
      )
    }

    // Show error state
    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-slate-600 mb-4">{error}</p>
            <div className="space-x-2">
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
              <Button variant="outline" onClick={() => setCurrentPage('projects')}>
                Go to Projects
              </Button>
            </div>
          </div>
        </div>
      )
    }

    if (!firstProjectId) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-slate-600 mb-4">No projects found. Create a project first to use the sprint board.</p>
            <Button onClick={() => setCurrentPage('projects')}>
              Go to Projects
            </Button>
          </div>
        </div>
      )
    }

    return <SprintBoardPage projectId={firstProjectId} />
  }

  return (
    <ErrorBoundary>
      <QueryProvider>
        <ToastProvider />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Page Selector */}
        <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">SynqForge Complete Platform Demo</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowProjectModal(true)
                        setEditingProject(null)
                      }}
                    >
                      <Target size={14} className="mr-1" />
                      Project
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowEpicModal(true)
                        setEditingEpic(null)
                      }}
                    >
                      <Rocket size={14} className="mr-1" />
                      Epic
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowStoryModal(true)
                        setEditingStory(null)
                      }}
                    >
                      <BookOpen size={14} className="mr-1" />
                      Story
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowTaskModal(true)}
                    >
                      <CheckSquare size={14} className="mr-1" />
                      Task
                    </Button>
                    
                    <CreateTaskModal
                      isOpen={showTaskModal}
                      onClose={() => setShowTaskModal(false)}
                      onSave={(data) => handleCreateSubmit(data, "task")}
                      stories={modalStories.map(story => ({ 
                        id: story.id, 
                        title: story.name, 
                        epic: story.epic?.name || "No Epic" 
                      }))}
                      users={modalUsers.map(user => ({ 
                        id: user.id, 
                        name: user.name, 
                        avatar: user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}` 
                      }))}
                    />
                    
                    {/* User Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center space-x-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user?.imageUrl} />
                            <AvatarFallback className="text-xs">
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="hidden sm:block">{user?.fullName || 'User'}</span>
                          <ChevronDown size={12} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem>
                          <User size={16} className="mr-2" />
                          Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings size={16} className="mr-2" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <SignOutButton>
                            <div className="flex items-center w-full cursor-pointer">
                              <LogOut size={16} className="mr-2" />
                              Logout
                            </div>
                          </SignOutButton>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                  {pages.map((page) => (
                    <Button
                      key={page.value}
                      variant={currentPage === page.value ? "default" : "outline"}
                      onClick={() => setCurrentPage(page.value as PageType)}
                      className="flex flex-col h-auto p-3 space-y-2 min-h-[80px] text-center break-words"
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <page.icon size={18} />
                        <span className="font-medium text-sm leading-tight text-wrap">{page.label}</span>
                      </div>
                      <span className="text-xs opacity-75 leading-tight break-words text-wrap overflow-hidden">{page.description}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Page Content */}
        <div className="relative">
          {currentPage === "epics" && (
            <EpicsPage
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {currentPage === "projects" && (
            <ProjectsPage
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {currentPage === "stories" && (
            <UserStoriesPage
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {currentPage === "tasks" && (
            <TasksPage
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {currentPage === "search" && <SearchPage />}

          {currentPage === "kanban" && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <KanbanBoard
                columns={kanbanColumns}
                movingItems={movingItems}
                onItemMove={async (itemId, fromColumn, toColumn, newIndex) => {
                  console.log(`Moving ${itemId} from ${fromColumn} to ${toColumn} at index ${newIndex}`)
                  
                  // Add item to moving state
                  setMovingItems(prev => new Set(prev).add(itemId))
                  
                  try {
                    // Find the story being moved to get its current data
                    const storyToMove = kanbanStories.find(story => story.id === itemId)
                    if (!storyToMove) {
                      throw new Error('Story not found')
                    }
                    
                    // Update story status based on the target column
                    const statusMap: Record<string, string> = {
                      'backlog': 'backlog',
                      'ready': 'ready', 
                      'in-progress': 'in-progress',
                      'review': 'review',
                      'done': 'done'
                    }
                    
                    const newStatus = statusMap[toColumn]
                    if (newStatus && newStatus !== storyToMove.status) {
                      // Use PATCH for efficient status-only update
                      const statusUpdate = {
                        status: newStatus
                      }
                      
                      await api.stories.patchStory(itemId, statusUpdate)
                      await queryClient.invalidateQueries({ queryKey: ['stories'] })
                      
                      // Show success feedback
                      toast.success(`Story moved to ${toColumn.replace('-', ' ')}`)
                      console.log(`Successfully updated story ${itemId} status to ${newStatus}`)
                    }
                  } catch (error) {
                    console.error('Failed to update story status:', error)
                    
                    // Show error feedback
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
                    toast.error(`Failed to move story: ${errorMessage}`)
                    
                    // Refresh the data to revert any optimistic updates
                    await queryClient.invalidateQueries({ queryKey: ['stories'] })
                  } finally {
                    // Remove item from moving state
                    setMovingItems(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(itemId)
                      return newSet
                    })
                  }
                }}
                onItemEdit={handleEdit}
                onItemDelete={handleDelete}
                onAddItem={(columnId) => {
                  console.log(`Adding item to column ${columnId}`)
                  // Open the story creation modal with pre-selected status
                  const statusMap: Record<string, string> = {
                    'backlog': 'backlog',
                    'ready': 'ready', 
                    'in-progress': 'in-progress',
                    'review': 'review',
                    'done': 'done'
                  }
                  
                  // Set the default status for the new story
                  const defaultStatus = statusMap[columnId] || 'backlog'
                  setEditingStory({ status: defaultStatus } as any)
                  setShowStoryModal(true)
                }}
                entityType="stories"
              />
            </div>
          )}

          {currentPage === "sprint-board" && (
            <SprintBoardPageWrapper />
          )}

          {currentPage === "analytics" && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <AnalyticsDashboard
                timeRange="30d"
                onTimeRangeChange={(range) => console.log("Time range changed:", range)}
                onExport={() => console.log("Exporting analytics")}
              />
            </div>
          )}

          {currentPage === "collaboration" && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex justify-center">
                <CollaborationPanel
                  entityId="story-1"
                  entityType="story"
                  onAddComment={(content, mentions, attachments) => {
                    console.log("Adding comment:", { content, mentions, attachments })
                  }}
                  onEditComment={(commentId, content) => {
                    console.log("Editing comment:", { commentId, content })
                  }}
                  onDeleteComment={(commentId) => {
                    console.log("Deleting comment:", commentId)
                  }}
                  onReactToComment={(commentId, reaction) => {
                    console.log("Reacting to comment:", { commentId, reaction })
                  }}
                  onPinComment={(commentId) => {
                    console.log("Pinning comment:", commentId)
                  }}
                />
              </div>
            </div>
          )}

          {/* Floating Collaboration Panel for other pages */}
          {currentPage !== "collaboration" && (
            <CollaborationPanel
              entityId={`${currentPage}-demo`}
              entityType="story"
              isCollapsed={!showCollaboration}
              onToggleCollapse={() => setShowCollaboration(!showCollaboration)}
              onAddComment={(content, mentions, attachments) => {
                console.log("Adding comment:", { content, mentions, attachments })
              }}
              onEditComment={(commentId, content) => {
                console.log("Editing comment:", { commentId, content })
              }}
              onDeleteComment={(commentId) => {
                console.log("Deleting comment:", commentId)
              }}
              onReactToComment={(commentId, reaction) => {
                console.log("Reacting to comment:", { commentId, reaction })
              }}
              onPinComment={(commentId) => {
                console.log("Pinning comment:", commentId)
              }}
            />
          )}
        </div>

        {/* AI-Enabled Story Creation Modal - Always Available */}
        <CreateStoryModal
          isOpen={showStoryModal}
          onClose={() => {
            setShowStoryModal(false)
            setEditingStory(null)
          }}
          onSave={handleStoryModalSave}
          epics={modalEpics}
          users={modalUsers}
          editingStory={editingStory}
        />

        {/* AI-Enabled Epic Creation Modal - Always Available */}
        <CreateEpicModal
          isOpen={showEpicModal}
          onClose={() => {
            setShowEpicModal(false)
            setEditingEpic(null)
          }}
          onSave={handleEpicModalSave}
          projects={[
            { id: "1", name: "Demo Project" },
            { id: "2", name: "AgileForge Platform" }
          ]}
          editingEpic={editingEpic}
        />

        {/* AI-Enabled Project Creation Modal - Always Available */}
        <CreateProjectModal
          isOpen={showProjectModal}
          onClose={() => {
            setShowProjectModal(false)
            setEditingProject(null)
          }}
          onSave={async (project) => {
            try {
              console.log("Saving project:", project)
              
              // Transform the project data to match the API format
              const projectPayload = {
                name: project.name,
                description: project.description || '',
                status: project.status || 'planning',
                priority: project.priority || 'medium',
                start_date: project.startDate || null,
                end_date: project.endDate || null,
              }

              if (editingProject) {
                // Update existing project
                await api.projects.update(editingProject.id, projectPayload)
              } else {
                // Create new project
                await api.projects.create(projectPayload)
              }

              // Invalidate React Query cache to refresh the data
              await queryClient.invalidateQueries({ queryKey: ['projects'] })
              
              setShowProjectModal(false)
              setEditingProject(null)
              
              console.log("Project saved successfully!")
              toast.success(editingProject ? "Project updated successfully!" : "Project created successfully!")
            } catch (error) {
              console.error("Failed to save project:", error)
              toast.error("Failed to save project. Please try again.")
              throw error // Re-throw so the modal can show the error
            }
          }}
          editingProject={editingProject}
        />
      </div>
    </QueryProvider>
    </ErrorBoundary>
  )
}
