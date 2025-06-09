"use client"

import React, { useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  CheckSquare,
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Star,
  Clock,
  User,
  Tag,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Grid3X3,
  List,
  Table2,
  ArrowUpDown,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useStories, useUsers } from "@/hooks/useApi"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "review" | "done"
  priority: "low" | "medium" | "high" | "critical"
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  storyId: string
  storyTitle: string
  estimatedHours: number
  actualHours?: number
  createdAt: string
  updatedAt: string
  dueDate?: string
  tags: string[]
  subtasks?: number
  completedSubtasks?: number
}

interface TasksPageProps {
  onCreateNew?: () => void
  onEdit?: (task: any) => void
  onDelete?: (task: any) => void
}

const TasksPage: React.FC<TasksPageProps> = ({
  onCreateNew,
  onEdit,
  onDelete,
}) => {
  // Use real API data instead of mock data
  const { stories, isLoading: storiesLoading, error: storiesError, refetch } = useStories()
  const { users, isLoading: usersLoading, error: usersError } = useUsers()

  const isLoading = storiesLoading || usersLoading
  const error = storiesError || usersError

  // Create tasks from stories data (since stories contain task-like information)
  const mockTasks = stories.map((story, index) => ({
    id: `task-${story.id}`,
    title: story.name,
    description: story.description || '',
    status: story.status === 'done' ? 'done' as const : 
             story.status === 'in-progress' ? 'in-progress' as const :
             story.status === 'review' ? 'review' as const : 'todo' as const,
    priority: story.priority,
    assignee: story.assignee,
    storyId: story.id,
    storyTitle: story.name,
    estimatedHours: story.storyPoints ? story.storyPoints * 2 : 4, // Estimate 2 hours per story point
    actualHours: story.stats ? Math.round(story.stats.completedTasks * 2.5) : undefined,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
    dueDate: story.dueDate,
    tags: story.tags || [],
    subtasks: story.stats?.totalTasks,
    completedSubtasks: story.stats?.completedTasks,
  }))
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid")
  const [sortBy, setSortBy] = useState<"title" | "status" | "priority" | "dueDate">("dueDate")
  const [activeTab, setActiveTab] = useState("all")



  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = mockTasks.filter((task) => {
      const matchesSearch =
        !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.storyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && !task.assignee) ||
        task.assignee?.id === assigneeFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee
    })

    // Apply tab filter
    if (activeTab !== "all") {
      filtered = filtered.filter((task) => {
        switch (activeTab) {
          case "my-tasks":
            return task.assignee?.id === "current-user-id"
          case "overdue":
            return task.dueDate && new Date(task.dueDate) < new Date()
          case "high-priority":
            return task.priority === "high" || task.priority === "critical"
          case "in-progress":
            return task.status === "in-progress"
          default:
            return true
        }
      })
    }

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title)
        case "status":
          return a.status.localeCompare(b.status)
        case "priority":
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
        case "dueDate":
        default:
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
    })

    return filtered
  }, [mockTasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, activeTab, sortBy])

  const handleSelectTask = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    )
  }

  const handleSelectAll = () => {
    if (selectedTasks.length === filteredAndSortedTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(filteredAndSortedTasks.map((task) => task.id))
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-700 bg-red-50 border-red-200"
      case "high":
        return "text-orange-700 bg-orange-50 border-orange-200"
      case "medium":
        return "text-amber-700 bg-amber-50 border-amber-200"
      case "low":
        return "text-emerald-700 bg-emerald-50 border-emerald-200"
      default:
        return "text-slate-700 bg-slate-50 border-slate-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "text-slate-700 bg-slate-50 border-slate-200"
      case "in-progress":
        return "text-purple-700 bg-purple-50 border-purple-200"
      case "review":
        return "text-amber-700 bg-amber-50 border-amber-200"
      case "done":
        return "text-emerald-700 bg-emerald-50 border-emerald-200"
      default:
        return "text-slate-700 bg-slate-50 border-slate-200"
    }
  }

  const getProgressPercentage = (task: Task) => {
    if (task.subtasks && task.completedSubtasks !== undefined) {
      return Math.round((task.completedSubtasks / task.subtasks) * 100)
    }
    return task.status === "done" ? 100 : task.status === "in-progress" ? 50 : 0
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const stats = {
    total: mockTasks.length,
    todo: mockTasks.filter((t) => t.status === "todo").length,
    inProgress: mockTasks.filter((t) => t.status === "in-progress").length,
    review: mockTasks.filter((t) => t.status === "review").length,
    done: mockTasks.filter((t) => t.status === "done").length,
    overdue: mockTasks.filter((t) => isOverdue(t.dueDate)).length,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Tasks</h3>
          <p className="text-slate-600">Getting your tasks ready...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shadow-lg border border-orange-200">
                    <CheckSquare size={20} className="text-orange-700" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Tasks</h1>
                  <p className="text-sm text-slate-600">Individual work items and deliverables</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Quick Stats */}
                <div className="hidden md:flex items-center space-x-4 bg-slate-50 px-4 py-2 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900">{stats.total}</div>
                    <div className="text-xs text-slate-600">Total</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{stats.inProgress}</div>
                    <div className="text-xs text-slate-600">Active</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-600">{stats.done}</div>
                    <div className="text-xs text-slate-600">Done</div>
                  </div>
                  {stats.overdue > 0 && (
                    <>
                      <div className="w-px h-8 bg-slate-200"></div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{stats.overdue}</div>
                        <div className="text-xs text-slate-600">Overdue</div>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  onClick={onCreateNew}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus size={16} className="mr-2" />
                  Create Task
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-none lg:flex">
              <TabsTrigger value="all">All Tasks</TabsTrigger>
              <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
              <TabsTrigger value="in-progress">Active</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="high-priority">High Priority</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters & Controls */}
          <Card className="mb-6 shadow-sm border-slate-200/60">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search tasks, stories, or tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-11">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[130px] h-11">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <SelectTrigger className="w-[140px] h-11">
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignees</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy as any}>
                    <SelectTrigger className="w-[120px] h-11">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dueDate">Due Date</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Mode Toggle */}
                  <div className="flex border border-slate-200 rounded-lg p-1">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className="h-8 w-8 p-0"
                    >
                      <Grid3X3 size={16} />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="h-8 w-8 p-0"
                    >
                      <List size={16} />
                    </Button>
                    <Button
                      variant={viewMode === "table" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("table")}
                      className="h-8 w-8 p-0"
                    >
                      <Table2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedTasks.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <span className="text-blue-800 font-medium">
                    {selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""} selected
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline">
                      Bulk Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      Move to Status
                    </Button>
                    <Button size="sm" variant="outline">
                      Assign to
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks Grid/List */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-200 border-slate-200/60 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedTasks.includes(task.id)}
                            onCheckedChange={() => handleSelectTask(task.id)}
                          />
                          <CheckSquare size={16} className="text-orange-600" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit?.(task)}>
                              <Edit size={16} className="mr-2" />
                              Edit Task
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy size={16} className="mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Star size={16} className="mr-2" />
                              Add to Favorites
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => onDelete?.(task)}
                              className="text-red-600"
                            >
                              <Trash2 size={16} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-base leading-tight">{task.title}</CardTitle>
                      <p className="text-sm text-slate-600 line-clamp-2">{task.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Story Reference */}
                      <div className="flex items-center space-x-2 text-sm">
                        <BookOpen size={14} className="text-slate-400" />
                        <span className="text-slate-600 truncate">{task.storyTitle}</span>
                      </div>

                      {/* Status & Priority */}
                      <div className="flex items-center justify-between">
                        <Badge className={`border ${getStatusColor(task.status)}`}>
                          {task.status.replace("-", " ").toUpperCase()}
                        </Badge>
                        <Badge className={`border ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Progress</span>
                          <span className="font-medium">{getProgressPercentage(task)}%</span>
                        </div>
                        <Progress value={getProgressPercentage(task)} className="h-2" />
                        {task.subtasks && (
                          <div className="text-xs text-slate-500">
                            {task.completedSubtasks || 0} of {task.subtasks} subtasks completed
                          </div>
                        )}
                      </div>

                      {/* Time Tracking */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1">
                          <Clock size={14} className="text-slate-400" />
                          <span className="text-slate-600">
                            {task.actualHours || 0}h / {task.estimatedHours}h
                          </span>
                        </div>
                        {task.dueDate && (
                          <div className={`flex items-center space-x-1 ${isOverdue(task.dueDate) ? "text-red-600" : "text-slate-600"}`}>
                            <Calendar size={14} />
                            <span className="text-xs">
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {task.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {task.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{task.tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Assignee */}
                      <div className="flex items-center justify-between">
                        {task.assignee ? (
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={task.assignee.avatar} />
                              <AvatarFallback className="text-xs">
                                {task.assignee.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-slate-600">{task.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Unassigned</span>
                        )}
                        
                        {isOverdue(task.dueDate) && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle size={16} className="text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Overdue</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* No Results */}
          {filteredAndSortedTasks.length === 0 && (
            <Card className="p-12 text-center">
              <CheckSquare size={48} className="mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No tasks found</h3>
              <p className="text-slate-600 mb-6">
                {searchQuery || statusFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all"
                  ? "No tasks match your current filters. Try adjusting your search criteria."
                  : "Get started by creating your first task."}
              </p>
              <Button onClick={onCreateNew} className="bg-orange-600 hover:bg-orange-700">
                <Plus size={16} className="mr-2" />
                Create Task
              </Button>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

export default TasksPage 