"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import {
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Archive,
  Star,
  Users,
  Target,
  BookOpen,
  CheckSquare,
  Rocket,
  Clock,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/services/api"
import type { Story, Task } from "@/services/api"

interface KanbanItem {
  id: string
  title: string
  description?: string
  type: "project" | "epic" | "story" | "task"
  priority: "low" | "medium" | "high" | "critical"
  status: "backlog" | "todo" | "ready" | "in-progress" | "review" | "testing" | "done" | "closed" | "cancelled"
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  tags?: string[]
  progress?: number
  storyPoints?: number
  estimatedHours?: number
  actualHours?: number
  dueDate?: string
  createdAt: string
  // Additional fields for API integration
  epic_id?: string
  story_id?: string
  acceptance_criteria?: string
}

interface KanbanColumn {
  id: string
  title: string
  items: KanbanItem[]
  color: string
  limit?: number
}

interface KanbanBoardProps {
  columns?: KanbanColumn[]
  onItemMove?: (itemId: string, fromColumn: string, toColumn: string, newIndex: number) => void
  onItemEdit?: (item: KanbanItem) => void
  onItemDelete?: (item: KanbanItem) => void
  onAddItem?: (columnId: string) => void
  entityType?: "projects" | "epics" | "stories" | "tasks"
  showBothStoriesAndTasks?: boolean
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "backlog", title: "Backlog", color: "bg-slate-500", items: [] },
  { id: "todo", title: "To Do", color: "bg-blue-500", items: [], limit: 5 },
  { id: "ready", title: "Ready", color: "bg-indigo-500", items: [] },
  { id: "in-progress", title: "In Progress", color: "bg-purple-500", items: [], limit: 3 },
  { id: "review", title: "Review", color: "bg-amber-500", items: [] },
  { id: "testing", title: "Testing", color: "bg-orange-500", items: [] },
  { id: "done", title: "Done", color: "bg-emerald-500", items: [] },
]

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns: initialColumns,
  onItemMove,
  onItemEdit,
  onItemDelete,
  onAddItem,
  entityType = "stories",
  showBothStoriesAndTasks = true,
}) => {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns || DEFAULT_COLUMNS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const typeConfig = {
    project: { icon: Target, color: "text-blue-700", bg: "bg-blue-50" },
    epic: { icon: Rocket, color: "text-purple-700", bg: "bg-purple-50" },
    story: { icon: BookOpen, color: "text-emerald-700", bg: "bg-emerald-50" },
    task: { icon: CheckSquare, color: "text-orange-700", bg: "bg-orange-50" },
  }

  const priorityConfig = {
    low: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
    medium: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    high: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
    critical: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  }

  // Convert API data to KanbanItem format
  const convertStoryToKanbanItem = (story: Story): KanbanItem => ({
    id: story.id,
    title: story.title,
    description: story.description,
    type: "story",
    priority: story.priority,
    status: story.status,
    storyPoints: story.story_points,
    dueDate: story.due_date,
    createdAt: story.created_at,
    epic_id: story.epic_id,
    acceptance_criteria: story.acceptance_criteria,
    assignee: story.assignee_id ? {
      id: story.assignee_id,
      name: "Assigned User", // We'll need to fetch user data
      avatar: "/placeholder.svg"
    } : undefined,
    tags: [],
  })

  const convertTaskToKanbanItem = (task: Task): KanbanItem => ({
    id: task.id,
    title: task.title,
    description: task.description,
    type: "task",
    priority: task.priority,
    status: task.status,
    estimatedHours: task.estimated_hours,
    actualHours: task.actual_hours,
    dueDate: task.due_date,
    createdAt: task.created_at,
    story_id: task.story_id,
    assignee: task.assignee_id ? {
      id: task.assignee_id,
      name: "Assigned User", // We'll need to fetch user data
      avatar: "/placeholder.svg"
    } : undefined,
    tags: [],
    progress: task.actual_hours > 0 && task.estimated_hours > 0 
      ? Math.min(100, Math.round((task.actual_hours / task.estimated_hours) * 100))
      : 0,
  })

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let allItems: KanbanItem[] = []

      if (showBothStoriesAndTasks || entityType === "stories") {
        const storiesResponse = await api.stories.getAll()
        const stories = storiesResponse.map(convertStoryToKanbanItem)
        allItems = [...allItems, ...stories]
      }

      if (showBothStoriesAndTasks || entityType === "tasks") {
        const tasksResponse = await api.tasks.getAll()
        const tasks = tasksResponse.map(convertTaskToKanbanItem)
        allItems = [...allItems, ...tasks]
      }

      // Distribute items across columns based on status
      const newColumns = DEFAULT_COLUMNS.map(column => ({
        ...column,
        items: allItems.filter(item => item.status === column.id)
      }))

      setColumns(newColumns)
    } catch (err) {
      console.error("Error fetching kanban data:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch data")
      toast({
        title: "Error",
        description: "Failed to load kanban board data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [entityType, showBothStoriesAndTasks, toast])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Update item status via API
  const updateItemStatus = async (item: KanbanItem, newStatus: string) => {
    try {
      if (item.type === "story") {
        await api.stories.update(item.id, { 
          status: newStatus as any 
        })
      } else if (item.type === "task") {
        await api.tasks.update(item.id, { 
          status: newStatus as any 
        })
      }
      
      toast({
        title: "Success",
        description: `${item.type} status updated successfully`,
      })
    } catch (err) {
      console.error("Error updating item status:", err)
      toast({
        title: "Error",
        description: `Failed to update ${item.type} status`,
        variant: "destructive",
      })
      throw err // Re-throw to handle in drag handler
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const sourceColumn = columns.find((col) => col.id === source.droppableId)
    const destColumn = columns.find((col) => col.id === destination.droppableId)

    if (!sourceColumn || !destColumn) return

    const sourceItems = Array.from(sourceColumn.items)
    const destItems = source.droppableId === destination.droppableId ? sourceItems : Array.from(destColumn.items)

    const [movedItem] = sourceItems.splice(source.index, 1)

    // Optimistically update UI
    if (source.droppableId === destination.droppableId) {
      sourceItems.splice(destination.index, 0, movedItem)
      setColumns((prev) => prev.map((col) => (col.id === source.droppableId ? { ...col, items: sourceItems } : col)))
    } else {
      destItems.splice(destination.index, 0, movedItem)
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === source.droppableId) {
            return { ...col, items: sourceItems }
          }
          if (col.id === destination.droppableId) {
            return { ...col, items: destItems }
          }
          return col
        }),
      )
    }

    // Update via API
    try {
      await updateItemStatus(movedItem, destination.droppableId)
      onItemMove?.(draggableId, source.droppableId, destination.droppableId, destination.index)
    } catch (err) {
      // Revert UI changes on API failure
      fetchData()
    }
  }

  const handleRefresh = () => {
    fetchData()
  }

  const handleItemEdit = (item: KanbanItem) => {
    onItemEdit?.(item)
  }

  const handleItemDelete = async (item: KanbanItem) => {
    try {
      if (item.type === "story") {
        await api.stories.delete(item.id)
      } else if (item.type === "task") {
        await api.tasks.delete(item.id)
      }
      
      toast({
        title: "Success",
        description: `${item.type} deleted successfully`,
      })
      
      // Refresh data
      fetchData()
      onItemDelete?.(item)
    } catch (err) {
      console.error("Error deleting item:", err)
      toast({
        title: "Error",
        description: `Failed to delete ${item.type}`,
        variant: "destructive",
      })
    }
  }

  const getTotalItems = () => {
    return columns.reduce((total, column) => total + column.items.length, 0)
  }

  const getEntityTypeLabel = () => {
    if (showBothStoriesAndTasks) return "Stories & Tasks"
    return entityType === "stories" ? "Stories" : "Tasks"
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading kanban board...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Error Loading Kanban Board</h2>
            <p className="text-gray-600">{error}</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Board Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Kanban Board</h2>
            <p className="text-sm text-slate-600">
              {getTotalItems()} {getEntityTypeLabel().toLowerCase()} across {columns.length} columns
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Users size={16} className="mr-2" />
              Team View
            </Button>
            <Button variant="outline" size="sm">
              <TrendingUp size={16} className="mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto">
            <div className="flex space-x-6 h-full min-w-max pb-6">
              {columns.map((column) => (
                <div key={column.id} className="flex-shrink-0 w-80">
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`h-full flex flex-col rounded-lg border-2 transition-colors ${
                          snapshot.isDraggingOver ? "border-blue-300 bg-blue-50/50" : "border-slate-200 bg-slate-50/50"
                        }`}
                      >
                        {/* Column Header */}
                        <div className="p-4 border-b border-slate-200 bg-white rounded-t-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                              <h3 className="font-semibold text-slate-900">{column.title}</h3>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                {column.items.length}
                              </Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onAddItem?.(column.id)}>
                                  <Plus size={16} className="mr-2" />
                                  Add Item
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit2 size={16} className="mr-2" />
                                  Edit Column
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Archive size={16} className="mr-2" />
                                  Archive All
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {column.limit && (
                            <div className="flex items-center space-x-2 text-xs text-slate-600">
                              <span>WIP Limit: {column.limit}</span>
                              {column.items.length > column.limit && (
                                <Badge variant="destructive" className="text-xs">
                                  Over Limit
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Column Content */}
                        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                          <AnimatePresence>
                            {column.items.map((item, index) => {
                              const config = typeConfig[item.type]
                              const IconComponent = config.icon

                              return (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                  {(provided, snapshot) => (
                                    <motion.div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`transform transition-transform ${
                                        snapshot.isDragging ? "rotate-2 scale-105" : ""
                                      }`}
                                    >
                                      <Card
                                        className={`group hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${
                                          snapshot.isDragging ? "shadow-lg ring-2 ring-blue-500" : ""
                                        }`}
                                      >
                                        <CardHeader className="pb-2">
                                          <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-2">
                                              <div
                                                className={`w-6 h-6 ${config.bg} rounded flex items-center justify-center`}
                                              >
                                                <IconComponent size={12} className={config.color} />
                                              </div>
                                              <Badge
                                                variant="secondary"
                                                className={`${priorityConfig[item.priority].bg} ${priorityConfig[item.priority].color} ${priorityConfig[item.priority].border} border text-xs`}
                                              >
                                                {item.priority}
                                              </Badge>
                                            </div>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <MoreHorizontal size={12} />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleItemEdit(item)}>
                                                  <Edit2 size={16} className="mr-2" />
                                                  Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                  <Star size={16} className="mr-2" />
                                                  Favorite
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                  className="text-red-600"
                                                  onClick={() => handleItemDelete(item)}
                                                >
                                                  <Trash2 size={16} className="mr-2" />
                                                  Delete
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </CardHeader>

                                        <CardContent className="space-y-3">
                                          <div>
                                            <h4 className="font-medium text-slate-900 text-sm line-clamp-2 leading-snug">
                                              {item.title}
                                            </h4>
                                            {item.description && (
                                              <p className="text-slate-600 text-xs line-clamp-2 mt-1 leading-relaxed">
                                                {item.description}
                                              </p>
                                            )}
                                          </div>

                                          {typeof item.progress === "number" && (
                                            <div className="space-y-1">
                                              <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-600">Progress</span>
                                                <span className="font-medium text-slate-900">{item.progress}%</span>
                                              </div>
                                              <Progress value={item.progress} className="h-1.5" />
                                            </div>
                                          )}

                                          {item.tags && item.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                              {item.tags.slice(0, 2).map((tag) => (
                                                <Badge
                                                  key={tag}
                                                  variant="secondary"
                                                  className="text-xs bg-slate-100 text-slate-700"
                                                >
                                                  {tag}
                                                </Badge>
                                              ))}
                                              {item.tags.length > 2 && (
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs bg-slate-100 text-slate-700"
                                                >
                                                  +{item.tags.length - 2}
                                                </Badge>
                                              )}
                                            </div>
                                          )}

                                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                            <div className="flex items-center space-x-2">
                                              {item.assignee ? (
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Avatar className="w-5 h-5">
                                                      <AvatarImage src={item.assignee.avatar || "/placeholder.svg"} />
                                                      <AvatarFallback className="text-xs">
                                                        {item.assignee.name
                                                          .split(" ")
                                                          .map((n) => n[0])
                                                          .join("")}
                                                      </AvatarFallback>
                                                    </Avatar>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>{item.assignee.name}</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              ) : (
                                                <div className="w-5 h-5 bg-slate-200 rounded-full"></div>
                                              )}
                                              {item.storyPoints && (
                                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                                  {item.storyPoints} SP
                                                </Badge>
                                              )}
                                              {item.estimatedHours && (
                                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                                  {item.estimatedHours}h
                                                </Badge>
                                              )}
                                            </div>

                                            {item.dueDate && (
                                              <div className="flex items-center space-x-1 text-xs text-slate-500">
                                                <Clock size={10} />
                                                <span>{new Date(item.dueDate).toLocaleDateString('en-GB')}</span>
                                              </div>
                                            )}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </motion.div>
                                  )}
                                </Draggable>
                              )
                            })}
                          </AnimatePresence>
                          {provided.placeholder}

                          {/* Add Item Button */}
                          <Button
                            variant="ghost"
                            className="w-full border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 h-12"
                            onClick={() => onAddItem?.(column.id)}
                          >
                            <Plus size={16} className="mr-2" />
                            Add {showBothStoriesAndTasks ? "Item" : entityType.slice(0, -1)}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </div>
        </DragDropContext>
      </div>
    </TooltipProvider>
  )
}

export default KanbanBoard
