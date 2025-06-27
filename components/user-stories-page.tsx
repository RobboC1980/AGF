"use client"

import React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen,
  Plus,
  Search,
  Grid3X3,
  List,
  Calendar,
  Users,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  Activity,
  Eye,
  MoreHorizontal,
  Edit2,
  Trash2,
  Archive,
  Copy,
  Star,
  ArrowUpDown,
  Sparkles,
  Zap,
  CheckSquare,
  AlertCircle,
  RefreshCw,
  User,
  Flag,
  MessageSquare,
  Paperclip,
  ChevronDown,
  ChevronRight,
  Timer,
  PlayCircle,
  PauseCircle,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useStories, useEpics, useUsers, useTasks } from "@/hooks/useApi"
import { type Story } from "@/services/api"
import { SimpleCreateModal } from "@/components/simple-create-modal"

interface UserStoriesPageProps {
  onCreateNew?: () => void
  onEdit?: (story: Story) => void
  onDelete?: (story: Story) => void
}

interface TaskBreakdownProps {
  storyId: string
  storyTitle: string
  users: any[]
}

const TaskBreakdown: React.FC<TaskBreakdownProps> = ({ storyId, storyTitle, users }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { data: allTasks = [] } = useTasks()
  
  // Filter tasks for this story
  const storyTasks = allTasks.filter((task: any) => task.story_id === storyId)
  
  const taskStats = {
    total: storyTasks.length,
    completed: storyTasks.filter((task: any) => task.status === 'done').length,
    inProgress: storyTasks.filter((task: any) => task.status === 'in-progress').length,
    estimatedHours: storyTasks.reduce((sum: number, task: any) => sum + (task.estimated_hours || 0), 0),
    actualHours: storyTasks.reduce((sum: number, task: any) => sum + (task.actual_hours || 0), 0),
  }

  const handleCreateTask = async (taskData: any) => {
    // This will be handled by the parent component
    console.log('Creating task for story:', storyId, taskData)
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'todo':
        return <Circle size={14} className="text-slate-500" />
      case 'in-progress':
        return <PlayCircle size={14} className="text-amber-500" />
      case 'review':
        return <PauseCircle size={14} className="text-purple-500" />
      case 'done':
        return <CheckCircle2 size={14} className="text-emerald-500" />
      default:
        return <Circle size={14} className="text-slate-500" />
    }
  }

  if (storyTasks.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-500">
            <CheckSquare size={16} />
            <span className="text-sm">No engineering tasks yet</span>
          </div>
          <SimpleCreateModal
            type="task"
            onSubmit={handleCreateTask}
            stories={[{ id: storyId, title: storyTitle, epic: 'Current Epic' }]}
            users={users}
            trigger={
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Plus size={12} className="mr-1" />
                Break Down
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent">
              <div className="flex items-center space-x-2">
                {isOpen ? (
                  <ChevronDown size={16} className="text-slate-400" />
                ) : (
                  <ChevronRight size={16} className="text-slate-400" />
                )}
                <CheckSquare size={16} className="text-slate-600" />
                <span className="text-sm font-medium text-slate-700">
                  Engineering Tasks ({taskStats.completed}/{taskStats.total})
                </span>
                <Badge variant="secondary" className="text-xs">
                  {taskStats.estimatedHours}h
                </Badge>
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <div className="flex items-center space-x-2">
            {taskStats.total > 0 && (
              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(taskStats.completed / taskStats.total) * 100}%` }}
                />
              </div>
            )}
            <SimpleCreateModal
              type="task"
              onSubmit={handleCreateTask}
              stories={[{ id: storyId, title: storyTitle, epic: 'Current Epic' }]}
              users={users}
              trigger={
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Plus size={12} className="mr-1" />
                  Add Task
                </Button>
              }
            />
          </div>
        </div>

        <CollapsibleContent className="mt-3">
          <div className="space-y-2">
            {storyTasks.map((task: any) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getTaskStatusIcon(task.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {task.title}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          task.priority === 'critical' ? 'border-red-200 text-red-700' :
                          task.priority === 'high' ? 'border-orange-200 text-orange-700' :
                          task.priority === 'medium' ? 'border-amber-200 text-amber-700' :
                          'border-emerald-200 text-emerald-700'
                        }`}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-500 truncate mt-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {task.assignee_id && (
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={users.find(u => u.id === task.assignee_id)?.avatar} />
                      <AvatarFallback className="text-xs">
                        {users.find(u => u.id === task.assignee_id)?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex items-center space-x-1 text-xs text-slate-500">
                    <Timer size={12} />
                    <span>{task.estimated_hours}h</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal size={12} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit2 size={14} className="mr-2" />
                        Edit Task
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy size={14} className="mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 size={14} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

const UserStoriesPage: React.FC<UserStoriesPageProps> = ({
  onCreateNew,
  onEdit,
  onDelete,
}) => {
  // Use API hooks to fetch real data - with fallback to empty arrays
  const { data: stories = [], isLoading, error, refetch } = useStories()
  const { data: epics = [] } = useEpics()
  const { data: users = [] } = useUsers()

  // Debug logging (remove in production)
  if (stories.length > 0) {
    console.log("User Stories Page - Found", stories.length, "stories")
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [epicFilter, setEpicFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedStories, setSelectedStories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"name" | "status" | "priority" | "points" | "updated">("updated")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState("all")

  // Status and priority configurations
  const statusConfig = {
    backlog: {
      color: "text-slate-700",
      bg: "bg-slate-50",
      border: "border-slate-200",
      icon: Circle,
    },
    ready: {
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: Flag,
    },
    "in-progress": {
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: Activity,
    },
    review: {
      color: "text-purple-700",
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: Eye,
    },
    testing: {
      color: "text-orange-700",
      bg: "bg-orange-50",
      border: "border-orange-200",
      icon: CheckSquare,
    },
    done: {
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: CheckCircle2,
    },
  }

  const priorityConfig = {
    low: {
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
    medium: {
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
    high: {
      color: "text-orange-700",
      bg: "bg-orange-50",
      border: "border-orange-200",
    },
    critical: {
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
    },
  }

  // Transform stories to include nested objects
  const transformedStories = useMemo(() => {
    return (stories as any[]).map((story: any) => ({
      ...story,
      epic: story.epic_id ? epics.find(epic => epic.id === story.epic_id) : null,
      assignee: story.assignee_id ? users.find(user => user.id === story.assignee_id) : null,
    }))
  }, [stories, epics, users])

  // Filter and sort stories
  const filteredAndSortedStories = useMemo(() => {
    let filtered = transformedStories.filter((story: any) => {
      const matchesSearch =
        !searchQuery ||
        story.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || story.status === statusFilter
      const matchesPriority = priorityFilter === "all" || story.priority === priorityFilter
      const matchesEpic = epicFilter === "all" || story.epic_id === epicFilter
      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && !story.assignee_id) ||
        story.assignee_id === assigneeFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesEpic && matchesAssignee
    })

    // Apply tab filter
    if (activeTab !== "all") {
      filtered = filtered.filter((story: any) => {
        switch (activeTab) {
          case "my-stories":
            return story.assignee_id === "current-user-id"
          case "overdue":
            return story.due_date && new Date(story.due_date) < new Date()
          case "high-priority":
            return story.priority === "high" || story.priority === "critical"
          default:
            return true
        }
      })
    }

    // Sort stories
    filtered.sort((a: any, b: any) => {
      let comparison = 0

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
        case "priority":
          const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
          comparison = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
          break
        case "points":
          comparison = (b.story_points || 0) - (a.story_points || 0)
          break
        case "updated":
        default:
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          break
      }

      return sortOrder === "asc" ? -comparison : comparison
    })

    return filtered
  }, [transformedStories, searchQuery, statusFilter, priorityFilter, epicFilter, assigneeFilter, activeTab, sortBy, sortOrder])

  // Selection handlers
  const handleStorySelect = (storyId: string) => {
    setSelectedStories((prev) => (prev.includes(storyId) ? prev.filter((id) => id !== storyId) : [...prev, storyId]))
  }

  const handleSelectAll = () => {
    if (selectedStories.length === filteredAndSortedStories.length) {
      setSelectedStories([])
    } else {
      setSelectedStories(filteredAndSortedStories.map((story: any) => story.id))
    }
  }

  // Get statistics
  const stats = useMemo(() => {
    const storiesArray = transformedStories
    const total = storiesArray.length
    const done = storiesArray.filter((story: any) => story.status === "done").length
    const inProgress = storiesArray.filter((story: any) => story.status === "in-progress").length
    const overdue = storiesArray.filter((story: any) => story.due_date && new Date(story.due_date) < new Date()).length
    const totalPoints = storiesArray.reduce((sum: number, story: any) => sum + (story.story_points || 0), 0)
    const completedPoints = storiesArray.filter((story: any) => story.status === "done").reduce((sum: number, story: any) => sum + (story.story_points || 0), 0)

    return { total, done, inProgress, overdue, totalPoints, completedPoints }
  }, [transformedStories])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading User Stories</h3>
          <p className="text-slate-600">Getting your stories ready...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading User Stories</h3>
            <p className="text-slate-600 mb-6">{error.message || "Something went wrong while loading your user stories."}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw size={16} className="mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Enhanced Header */}
        <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BookOpen size={20} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Sparkles size={10} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">User Stories</h1>
                  <p className="text-sm text-slate-600">Feature requirements and user workflows</p>
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
                    <div className="text-lg font-bold text-emerald-600">{stats.done}</div>
                    <div className="text-xs text-slate-600">Done</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{stats.inProgress}</div>
                    <div className="text-xs text-slate-600">Active</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{stats.completedPoints}/{stats.totalPoints}</div>
                    <div className="text-xs text-slate-600">Points</div>
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
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus size={16} className="mr-2" />
                  Create Story
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none lg:flex">
              <TabsTrigger value="all" className="flex items-center space-x-2">
                <BookOpen size={16} />
                <span>All Stories</span>
              </TabsTrigger>
              <TabsTrigger value="my-stories" className="flex items-center space-x-2">
                <User size={16} />
                <span>My Stories</span>
              </TabsTrigger>
              <TabsTrigger value="overdue" className="flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>Overdue</span>
              </TabsTrigger>
              <TabsTrigger value="high-priority" className="flex items-center space-x-2">
                <TrendingUp size={16} />
                <span>High Priority</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Enhanced Filters & Controls */}
          <Card className="mb-8 shadow-lg border-2 border-slate-200 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between space-y-4 xl:space-y-0 xl:space-x-6">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search stories, descriptions, tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-11">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="backlog">Backlog</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[130px] h-11">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={epicFilter} onValueChange={setEpicFilter}>
                    <SelectTrigger className="w-[140px] h-11">
                      <SelectValue placeholder="Epic" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[300px]">
                      <SelectItem value="all">All Epics</SelectItem>
                      <SelectItem value="no-epic">No Epic</SelectItem>
                      {epics.map((epic) => (
                        <SelectItem key={epic.id} value={epic.id}>
                          <div className="flex items-center space-x-2 min-w-0">
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: epic.color || '#6B7280' }}
                            ></div>
                            <span className="truncate">{epic.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <SelectTrigger className="w-[140px] h-11">
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[300px]">
                      <SelectItem value="all">All Assignees</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center space-x-2 min-w-0">
                            <Avatar className="w-4 h-4 flex-shrink-0">
                              <AvatarImage 
                                src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} 
                                alt={user.name} 
                              />
                              <AvatarFallback className="text-xs">
                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{user.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[120px] h-11">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated">Updated</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="points">Story Points</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="h-11 px-3"
                    >
                      <ArrowUpDown size={16} />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                      className="h-11 px-3"
                    >
                      {viewMode === "grid" ? <List size={16} /> : <Grid3X3 size={16} />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stories Display */}
          {filteredAndSortedStories.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={48} className="text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No stories found</h3>
              <p className="text-slate-600 mb-4">
                {transformedStories.length === 0 ? "Get started by creating your first user story" : "Try adjusting your filters"}
              </p>
              {onCreateNew && (
                <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
                  <Plus size={16} className="mr-2" />
                  Create Story
                </Button>
              )}
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
              {filteredAndSortedStories.map((story) => (
                <Card key={story.id} className="group hover:shadow-xl transition-all duration-300 border-2 border-slate-200 hover:border-blue-300 bg-white/80 backdrop-blur-sm overflow-hidden hover:bg-blue-50/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <Checkbox
                          checked={selectedStories.includes(story.id)}
                          onCheckedChange={() => handleStorySelect(story.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors break-words overflow-hidden text-ellipsis line-clamp-2">
                            {story.name}
                          </h3>
                          {story.description && (
                            <p className="text-sm text-slate-600 mt-1 break-words overflow-hidden text-ellipsis line-clamp-3">{story.description}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit?.(story)}>
                            <Edit2 size={16} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy size={16} className="mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Archive size={16} className="mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete?.(story)} className="text-red-600">
                            <Trash2 size={16} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 overflow-hidden">
                    {/* Status and Priority */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Badge
                          variant="outline"
                          className={`${statusConfig[story.status]?.color || 'text-slate-700'} ${statusConfig[story.status]?.bg || 'bg-slate-50'} ${statusConfig[story.status]?.border || 'border-slate-200'} truncate max-w-[120px]`}
                        >
                          {React.createElement(statusConfig[story.status]?.icon || Circle, { size: 12, className: "mr-1 flex-shrink-0" })}
                          <span className="truncate">{story.status?.charAt(0).toUpperCase() + story.status?.slice(1).replace('-', ' ') || 'Unknown'}</span>
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`${priorityConfig[story.priority]?.color || 'text-slate-700'} ${priorityConfig[story.priority]?.bg || 'bg-slate-50'} ${priorityConfig[story.priority]?.border || 'border-slate-200'} truncate max-w-[100px]`}
                        >
                          <span className="truncate">{story.priority?.charAt(0).toUpperCase() + story.priority?.slice(1) || 'Unknown'}</span>
                        </Badge>
                      </div>
                      {story.story_points && (
                        <div className="flex items-center text-sm text-slate-600 flex-shrink-0">
                          <Target size={14} className="mr-1" />
                          {story.story_points}
                        </div>
                      )}
                    </div>

                    {/* Epic */}
                    {story.epic_id && story.epic && (
                      <div className="flex items-center text-sm text-slate-600 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                          style={{ backgroundColor: story.epic.color || '#6B7280' }}
                        ></div>
                        <span className="truncate break-words overflow-hidden text-ellipsis flex-1">{story.epic.name}</span>
                      </div>
                    )}

                    {/* Assignee */}
                    {story.assignee_id && story.assignee && (
                      <div className="flex items-center space-x-2 min-w-0">
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarImage 
                            src={story.assignee.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${story.assignee.name}`} 
                            alt={story.assignee.name} 
                          />
                          <AvatarFallback className="text-xs">
                            {story.assignee.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-slate-600 truncate break-words overflow-hidden text-ellipsis flex-1">{story.assignee.name}</span>
                      </div>
                    )}

                    {/* Tags */}
                    {story.tags && story.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {story.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs truncate max-w-[80px] break-words">
                            {tag}
                          </Badge>
                        ))}
                        {story.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{story.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    {story.stats && (
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t">
                        <div className="flex items-center space-x-3">
                          <span className="flex items-center">
                            <CheckSquare size={12} className="mr-1" />
                            {story.stats.completed_tasks}/{story.stats.total_tasks}
                          </span>
                          <span className="flex items-center">
                            <MessageSquare size={12} className="mr-1" />
                            {story.stats.comments || 0}
                          </span>
                          <span className="flex items-center">
                            <Paperclip size={12} className="mr-1" />
                            {story.stats.attachments || 0}
                          </span>
                        </div>
                        <span>{new Date(story.created_at).toLocaleDateString()}</span>
                      </div>
                    )}

                    {/* Task Breakdown */}
                    <TaskBreakdown storyId={story.id} storyTitle={story.name} users={users} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

export default UserStoriesPage 