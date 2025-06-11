"use client"

import { useState } from "react"
import { QueryProvider } from "../providers/query-provider"
import { ToastProvider } from "../providers/toast-provider"
import ErrorBoundary from "../components/error-boundary"
import { NavigationProvider, useNavigation, type PageType } from "../contexts/navigation-context"
import { BreadcrumbNavigation } from "../components/breadcrumb-navigation"
import EpicsPage from "../components/epics-page"
import ProjectsPage from "../components/projects-page"
import UserStoriesPage from "../components/user-stories-page"
import TasksPage from "../components/tasks-page"
import SearchPage from "../components/search-page"
import KanbanBoard from "../components/kanban-board"
import AnalyticsDashboard from "../components/analytics-dashboard"
import CollaborationPanel from "../components/collaboration-panel"
import SimpleCreateModal from "../components/simple-create-modal"
import { CreateStoryModal } from "../components/create-story-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Rocket, Target, BookOpen, CheckSquare, Search, BarChart3, MessageSquare, Columns, LogIn, LogOut, User, Settings } from "lucide-react"
import { useStories, useEpics, useUsers, useCreateStory } from "@/hooks/useApi"
import { useAuth } from "@/contexts/auth-context"
import { AuthModal } from "@/components/auth-modal"
import { UserSettingsModal } from "@/components/user-settings-modal"
import { Logo } from "@/components/ui/logo"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

const MainContent = () => {
  const { currentPage, setCurrentPage, filters } = useNavigation()
  const { user, isAuthenticated, logout } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showCollaboration, setShowCollaboration] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  
  // Add state for story modal
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [editingStory, setEditingStory] = useState<any>(null)

  // Get data for the modals
  const { data: modalStories = [], refetch: refetchStories } = useStories()
  const { data: modalEpics = [] } = useEpics()
  const { data: modalUsers = [] } = useUsers()
  
  // Mutation hook for creating stories
  const createStoryMutation = useCreateStory()

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
  }

  const handleCreateStory = () => {
    setShowStoryModal(true)
    setEditingStory(null)
  }

  const handleCreateSubmit = async (data: any) => {
    console.log("Creating item:", data)
    // Here you would typically call your API to create the item
    // For now, just log the data
    return Promise.resolve()
  }

  const handleEdit = (item: any) => {
    console.log("Editing item:", item)
    // If we're on the stories page, open the story modal for editing
    if (currentPage === "stories") {
      setEditingStory(item)
      setShowStoryModal(true)
    }
  }

  const handleDelete = (item: any) => {
    console.log("Deleting item:", item)
  }

  const handleStoryModalSave = async (storyData: any): Promise<void> => {
    console.log("Saving story:", storyData)
    try {
      // Use the mutation hook to create the story
      const result = await createStoryMutation.mutateAsync(storyData)
      
      console.log("Story created successfully:", result)
      
      // Show success toast
      toast({
        title: "Story Created",
        description: `Successfully created "${(result as any).title || 'story'}"`,
        variant: "default",
      })
      
      // Refresh the stories list to show the new story
      await refetchStories()
      
      // If we're on the stories page, it will automatically update
    } catch (error) {
      console.error("Error creating story:", error)
      
      // Show error toast
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create story",
        variant: "destructive",
      })
      
      // Re-throw so the modal can handle the error
      throw error
    }
  }

  // Use real data for kanban columns
  const { data: kanbanStories = [] } = useStories()
  
  // Mock data has been replaced with real API integration in the KanbanBoard component

  const pages = [
    { value: "epics", label: "Epics", icon: Rocket, description: "Large feature initiatives" },
    { value: "projects", label: "Projects", icon: Target, description: "Strategic project portfolio" },
    { value: "stories", label: "User Stories", icon: BookOpen, description: "Feature requirements and user workflows" },
    { value: "tasks", label: "Tasks", icon: CheckSquare, description: "Individual work items and deliverables" },
    { value: "search", label: "Search", icon: Search, description: "Find anything quickly" },
    { value: "kanban", label: "Kanban", icon: Columns, description: "Visual workflow management" },
    { value: "analytics", label: "Analytics", icon: BarChart3, description: "Performance insights" },
    { value: "collaboration", label: "Collaboration", icon: MessageSquare, description: "Team communication" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Page Selector */}
      <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Logo size="lg" />
                  <div>
                    <CardTitle className="text-lg">Complete Platform Demo</CardTitle>
                    <p className="text-sm text-slate-600">AI-Powered Agile Project Management</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Authentication Controls */}
                  {isAuthenticated ? (
                    <div className="flex items-center space-x-3 mr-4">
                      <div className="flex items-center space-x-2">
                        <User size={16} className="text-slate-500" />
                        <span className="text-sm text-slate-700">
                          {user?.first_name} {user?.last_name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSettingsModal(true)}
                        className="text-slate-600 hover:text-slate-800"
                      >
                        <Settings size={14} className="mr-1" />
                        Settings
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={logout}
                        className="text-slate-600 hover:text-slate-800"
                      >
                        <LogOut size={14} className="mr-1" />
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAuthModal(true)}
                      className="text-slate-600 hover:text-slate-800 mr-4"
                    >
                      <LogIn size={14} className="mr-1" />
                      Login
                    </Button>
                  )}
                  
                  {/* Create Controls */}
                  <SimpleCreateModal 
                    type="epic" 
                    onSubmit={handleCreateSubmit}
                    projects={[
                      { id: "1", name: "Demo Project" },
                      { id: "2", name: "AgileForge Platform" }
                    ]}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Rocket size={14} className="mr-1" />
                        Epic
                      </Button>
                    }
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCreateStory}
                  >
                    <BookOpen size={14} className="mr-1" />
                    Story
                  </Button>
                  <SimpleCreateModal 
                    type="task" 
                    onSubmit={handleCreateSubmit}
                    stories={[
                      { id: "1", title: "User Registration", epic: "User Authentication Epic" },
                      { id: "2", title: "User Login", epic: "User Authentication Epic" },
                      { id: "3", title: "Analytics Dashboard", epic: "Dashboard Features Epic" }
                    ]}
                    users={[
                      { id: "1", name: "Sarah Chen", avatar: "/placeholder.svg" },
                      { id: "2", name: "Alex Rodriguez", avatar: "/placeholder.svg" },
                      { id: "3", name: "Emily Johnson", avatar: "/placeholder.svg" }
                    ]}
                    trigger={
                      <Button variant="outline" size="sm">
                        <CheckSquare size={14} className="mr-1" />
                        Task
                      </Button>
                    }
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                {pages.map((page) => (
                  <Button
                    key={page.value}
                    variant={currentPage === page.value ? "default" : "outline"}
                    onClick={() => setCurrentPage(page.value as PageType)}
                    className="flex flex-col h-auto p-3 space-y-2 min-h-[100px] text-center justify-start"
                  >
                    <div className="flex flex-col items-center space-y-1 flex-shrink-0">
                      <page.icon size={18} />
                      <span className="font-medium text-sm leading-tight whitespace-nowrap">{page.label}</span>
                    </div>
                    <span className="text-xs opacity-75 leading-tight text-wrap text-center line-clamp-2 flex-1 flex items-center justify-center px-1">{page.description}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <BreadcrumbNavigation />

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
              onItemMove={(itemId, fromColumn, toColumn, newIndex) => {
                console.log(`Moved ${itemId} from ${fromColumn} to ${toColumn} at index ${newIndex}`)
              }}
              onItemEdit={handleEdit}
              onItemDelete={handleDelete}
              onAddItem={(columnId) => {
                console.log(`Adding item to column ${columnId}`)
                // Could trigger the story creation modal here
                setShowStoryModal(true)
              }}
              showBothStoriesAndTasks={true}
            />
          </div>
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

      {/* Global Create Story Modal */}
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

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />

      {/* User Settings Modal */}
      <UserSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
      
      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}

export default function Page() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ToastProvider />
        <NavigationProvider>
          <MainContent />
        </NavigationProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}
