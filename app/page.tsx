"use client"

import { useState } from "react"
import { QueryProvider } from "../providers/query-provider"
import { ToastProvider } from "../providers/toast-provider"
import EpicsPage from "../components/epics-page"
import ProjectsPage from "../components/projects-page"
import UserStoriesPage from "../components/user-stories-page"
import SearchPage from "../components/search-page"
import KanbanBoard from "../components/kanban-board"
import AnalyticsDashboard from "../components/analytics-dashboard"
import CollaborationPanel from "../components/collaboration-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Rocket, Target, BookOpen, Search, BarChart3, MessageSquare, Columns } from "lucide-react"

type PageType = "epics" | "projects" | "stories" | "search" | "kanban" | "analytics" | "collaboration"

export default function Page() {
  const [currentPage, setCurrentPage] = useState<PageType>("epics")
  const [isLoading, setIsLoading] = useState(false)
  const [showCollaboration, setShowCollaboration] = useState(false)

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 1500)
  }

  const handleCreateNew = () => {
    console.log(`Creating new ${currentPage.slice(0, -1)}`)
  }

  const handleEdit = (item: any) => {
    console.log("Editing item:", item)
  }

  const handleDelete = (item: any) => {
    console.log("Deleting item:", item)
  }

  // Mock kanban data
  const mockKanbanColumns = [
    {
      id: "backlog",
      title: "Backlog",
      color: "bg-slate-500",
      items: [
        {
          id: "item-1",
          title: "User Profile Management",
          description: "Allow users to update their profile information",
          type: "story" as const,
          priority: "medium" as const,
          assignee: {
            id: "1",
            name: "Sarah Chen",
            avatar: "/placeholder.svg?height=32&width=32",
          },
          tags: ["profile", "user-management"],
          progress: 0,
          storyPoints: 5,
          createdAt: "2024-01-15T10:00:00Z",
        },
      ],
    },
    {
      id: "todo",
      title: "To Do",
      color: "bg-blue-500",
      limit: 5,
      items: [
        {
          id: "item-2",
          title: "Authentication System",
          description: "Implement secure user login and registration",
          type: "epic" as const,
          priority: "high" as const,
          assignee: {
            id: "2",
            name: "Alex Rodriguez",
            avatar: "/placeholder.svg?height=32&width=32",
          },
          tags: ["auth", "security"],
          progress: 25,
          storyPoints: 13,
          dueDate: "2024-01-25T23:59:59Z",
          createdAt: "2024-01-10T08:00:00Z",
        },
      ],
    },
    {
      id: "in-progress",
      title: "In Progress",
      color: "bg-purple-500",
      limit: 3,
      items: [
        {
          id: "item-3",
          title: "Dashboard Analytics",
          description: "Create comprehensive analytics dashboard",
          type: "project" as const,
          priority: "critical" as const,
          assignee: {
            id: "3",
            name: "Emily Johnson",
            avatar: "/placeholder.svg?height=32&width=32",
          },
          tags: ["analytics", "dashboard"],
          progress: 60,
          storyPoints: 21,
          createdAt: "2024-01-05T12:00:00Z",
        },
      ],
    },
    {
      id: "review",
      title: "Review",
      color: "bg-amber-500",
      items: [
        {
          id: "item-4",
          title: "Mobile Responsive Design",
          description: "Ensure all pages work on mobile devices",
          type: "task" as const,
          priority: "medium" as const,
          assignee: {
            id: "4",
            name: "Michael Brown",
            avatar: "/placeholder.svg?height=32&width=32",
          },
          tags: ["mobile", "responsive"],
          progress: 90,
          storyPoints: 8,
          createdAt: "2024-01-12T14:00:00Z",
        },
      ],
    },
    {
      id: "done",
      title: "Done",
      color: "bg-emerald-500",
      items: [
        {
          id: "item-5",
          title: "Database Schema Design",
          description: "Design and implement the database schema",
          type: "task" as const,
          priority: "high" as const,
          assignee: {
            id: "1",
            name: "Sarah Chen",
            avatar: "/placeholder.svg?height=32&width=32",
          },
          tags: ["database", "schema"],
          progress: 100,
          storyPoints: 8,
          createdAt: "2024-01-01T09:00:00Z",
        },
      ],
    },
  ]

  const pages = [
    { value: "epics", label: "Epics", icon: Rocket, description: "Large feature initiatives" },
    { value: "projects", label: "Projects", icon: Target, description: "Strategic project portfolio" },
    { value: "stories", label: "User Stories", icon: BookOpen, description: "Feature requirements and user workflows" },
    { value: "search", label: "Search", icon: Search, description: "Find anything quickly" },
    { value: "kanban", label: "Kanban", icon: Columns, description: "Visual workflow management" },
    { value: "analytics", label: "Analytics", icon: BarChart3, description: "Performance insights" },
    { value: "collaboration", label: "Collaboration", icon: MessageSquare, description: "Team communication" },
  ]

  return (
    <QueryProvider>
      <ToastProvider />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Page Selector */}
        <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">AgileForge Complete Platform Demo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {pages.map((page) => (
                    <Button
                      key={page.value}
                      variant={currentPage === page.value ? "default" : "outline"}
                      onClick={() => setCurrentPage(page.value as PageType)}
                      className="flex flex-col h-auto p-4 space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <page.icon size={20} />
                        <span className="font-medium">{page.label}</span>
                      </div>
                      <span className="text-xs opacity-75">{page.description}</span>
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
              isLoading={isLoading}
              onRefresh={handleRefresh}
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {currentPage === "projects" && (
            <ProjectsPage
              isLoading={isLoading}
              onRefresh={handleRefresh}
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {currentPage === "stories" && (
            <UserStoriesPage
              isLoading={isLoading}
              onRefresh={handleRefresh}
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {currentPage === "search" && <SearchPage isLoading={isLoading} />}

          {currentPage === "kanban" && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <KanbanBoard
                columns={mockKanbanColumns}
                onItemMove={(itemId, fromColumn, toColumn, newIndex) => {
                  console.log(`Moved ${itemId} from ${fromColumn} to ${toColumn} at index ${newIndex}`)
                }}
                onItemEdit={handleEdit}
                onItemDelete={handleDelete}
                onAddItem={(columnId) => {
                  console.log(`Adding item to column ${columnId}`)
                }}
                entityType="stories"
              />
            </div>
          )}

          {currentPage === "analytics" && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <AnalyticsDashboard
                timeRange="30d"
                onTimeRangeChange={(range) => console.log("Time range changed:", range)}
                onExport={() => console.log("Exporting analytics")}
                onRefresh={handleRefresh}
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
      </div>
    </QueryProvider>
  )
}
