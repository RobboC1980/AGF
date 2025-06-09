"use client"

import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen,
  Plus,
  Search,
  Grid3X3,
  List,
  AlertCircle,
  Edit2,
  Trash2,
  Calendar,
  Tag,
  Rocket,
  Crown,
  Sparkles,
  MoreHorizontal,
  Archive,
  Copy,
  Star,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  Circle,
  Target,
  Zap,
  SortAsc,
  SortDesc,
  Eye,
  MessageSquare,
  GitBranch,
  Activity,
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

interface Story {
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

const StoriesPage: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [epicFilter, setEpicFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list" | "kanban">("grid")
  const [selectedStories, setSelectedStories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"updated" | "created" | "priority" | "points">("updated")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState("all")

  // Mock data - replace with actual API calls
  const stories: Story[] = [
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
  ]

  const priorityConfig = {
    low: {
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      icon: Circle,
    },
    medium: {
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      dot: "bg-amber-500",
      icon: Clock,
    },
    high: {
      color: "text-orange-700",
      bg: "bg-orange-50",
      border: "border-orange-200",
      dot: "bg-orange-500",
      icon: TrendingUp,
    },
    critical: {
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      dot: "bg-red-500",
      icon: Zap,
    },
  }

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
      icon: Target,
    },
    "in-progress": {
      color: "text-purple-700",
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: Activity,
    },
    review: {
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: Eye,
    },
    done: {
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: CheckCircle2,
    },
  }

  // Filter and sort stories
  const filteredAndSortedStories = useMemo(() => {
    let filtered = stories.filter((story) => {
      const matchesSearch =
        !searchQuery ||
        story.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesPriority = priorityFilter === "all" || story.priority === priorityFilter
      const matchesStatus = statusFilter === "all" || story.status === statusFilter
      const matchesEpic =
        epicFilter === "all" || (epicFilter === "independent" && !story.epic) || story.epic?.id === epicFilter
      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && !story.assignee) ||
        story.assignee?.id === assigneeFilter

      return matchesSearch && matchesPriority && matchesStatus && matchesEpic && matchesAssignee
    })

    // Apply tab filter
    if (activeTab !== "all") {
      filtered = filtered.filter((story) => {
        switch (activeTab) {
          case "my-stories":
            return story.assignee?.id === "current-user-id" // Replace with actual user ID
          case "overdue":
            return story.dueDate && new Date(story.dueDate) < new Date()
          case "high-priority":
            return story.priority === "high" || story.priority === "critical"
          default:
            return true
        }
      })
    }

    // Sort stories
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "priority":
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority]
          break
        case "points":
          comparison = (b.storyPoints || 0) - (a.storyPoints || 0)
          break
        case "created":
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          break
        case "updated":
        default:
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          break
      }

      return sortOrder === "asc" ? -comparison : comparison
    })

    return filtered
  }, [stories, searchQuery, priorityFilter, statusFilter, epicFilter, assigneeFilter, activeTab, sortBy, sortOrder])

  const handleStorySelect = (storyId: string) => {
    setSelectedStories((prev) => (prev.includes(storyId) ? prev.filter((id) => id !== storyId) : [...prev, storyId]))
  }

  const handleSelectAll = () => {
    if (selectedStories.length === filteredAndSortedStories.length) {
      setSelectedStories([])
    } else {
      setSelectedStories(filteredAndSortedStories.map((story) => story.id))
    }
  }

  const getStoryStats = () => {
    const total = stories.length
    const completed = stories.filter((s) => s.status === "done").length
    const inProgress = stories.filter((s) => s.status === "in-progress").length
    const totalPoints = stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)
    const completedPoints = stories.filter((s) => s.status === "done").reduce((sum, s) => sum + (s.storyPoints || 0), 0)

    return { total, completed, inProgress, totalPoints, completedPoints }
  }

  const stats = getStoryStats()

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Enhanced Header */}
        <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BookOpen size={20} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Sparkles size={10} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">User Stories</h1>
                  <p className="text-sm text-slate-600">AI-powered story management</p>
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
                    <div className="text-lg font-bold text-emerald-600">{stats.completed}</div>
                    <div className="text-xs text-slate-600">Done</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{stats.inProgress}</div>
                    <div className="text-xs text-slate-600">Active</div>
                  </div>
                </div>

                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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
                <Users size={16} />
                <span>My Stories</span>
              </TabsTrigger>
              <TabsTrigger value="overdue" className="flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>Overdue</span>
              </TabsTrigger>
              <TabsTrigger value="high-priority" className="flex items-center space-x-2">
                <Zap size={16} />
                <span>High Priority</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Enhanced Filters & Controls */}
          <Card className="mb-6 shadow-sm border-slate-200/60">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
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
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[140px] h-11">
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
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[120px] h-11">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated">Updated</SelectItem>
                      <SelectItem value="created">Created</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="points">Points</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="h-11 px-3"
                  >
                    {sortOrder === "asc" ? <SortAsc size={16} /> : <SortDesc size={16} />}
                  </Button>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className="h-9 px-3"
                    >
                      <Grid3X3 size={16} />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="h-9 px-3"
                    >
                      <List size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedStories.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedStories.length === filteredAndSortedStories.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium text-slate-700">{selectedStories.length} selected</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Archive size={16} className="mr-2" />
                      Archive
                    </Button>
                    <Button variant="outline" size="sm">
                      <Copy size={16} className="mr-2" />
                      Duplicate
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Stories Display */}
          {filteredAndSortedStories.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <Card className="max-w-md mx-auto shadow-sm">
                <CardContent className="p-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <BookOpen size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Stories Found</h3>
                  <p className="text-slate-600 mb-6">
                    {searchQuery || priorityFilter !== "all" || statusFilter !== "all"
                      ? "Try adjusting your filters or search terms"
                      : "Start creating your first user story to get organized"}
                  </p>
                  {!searchQuery && priorityFilter === "all" && statusFilter === "all" && (
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <Plus size={16} className="mr-2" />
                      Create Your First Story
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              <AnimatePresence>
                {filteredAndSortedStories.map((story, index) => (
                  <motion.div
                    key={story.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`group hover:shadow-lg transition-all duration-200 border-slate-200/60 ${
                        selectedStories.includes(story.id) ? "ring-2 ring-blue-500 border-blue-500" : ""
                      } ${viewMode === "list" ? "hover:bg-slate-50/50" : ""}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={selectedStories.includes(story.id)}
                              onCheckedChange={() => handleStorySelect(story.id)}
                            />
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant="secondary"
                                className={`${priorityConfig[story.priority].bg} ${priorityConfig[story.priority].color} ${priorityConfig[story.priority].border} border`}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${priorityConfig[story.priority].dot} mr-1.5`}
                                ></div>
                                {story.priority}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`${statusConfig[story.status].bg} ${statusConfig[story.status].color} ${statusConfig[story.status].border} border`}
                              >
                                {React.createElement(statusConfig[story.status].icon, {
                                  size: 12,
                                  className: "mr-1.5",
                                })}
                                {story.status.replace("-", " ")}
                              </Badge>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingStory(story)}>
                                <Edit2 size={16} className="mr-2" />
                                Edit
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
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 size={16} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Story Title & Description */}
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                            {story.name}
                          </h3>
                          {story.description && (
                            <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{story.description}</p>
                          )}
                        </div>

                        {/* Tags */}
                        {story.tags && story.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {story.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                <Tag size={10} className="mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {story.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                +{story.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Epic/Project Info */}
                        {story.epic ? (
                          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200/60 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${story.epic.color}`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-purple-800 truncate">{story.epic.name}</p>
                                <p className="text-xs text-purple-600 truncate">{story.epic.project.name}</p>
                              </div>
                              <Rocket size={14} className="text-purple-600 flex-shrink-0" />
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <Crown size={14} className="text-emerald-600" />
                              <p className="text-sm font-medium text-emerald-800">Independent Story</p>
                            </div>
                          </div>
                        )}

                        {/* Progress & Stats */}
                        {story.stats && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600">Progress</span>
                              <span className="font-medium text-slate-900">
                                {story.stats.completedTasks}/{story.stats.totalTasks} tasks
                              </span>
                            </div>
                            <Progress value={story.stats.completionPercentage} className="h-2" />

                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center space-x-3">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center space-x-1">
                                      <MessageSquare size={12} />
                                      <span>{story.stats.comments}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Comments</p>
                                  </TooltipContent>
                                </Tooltip>

                                {story.stats.attachments > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center space-x-1">
                                        <GitBranch size={12} />
                                        <span>{story.stats.attachments}</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Attachments</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>

                              {story.storyPoints && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {story.storyPoints} SP
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Assignee & Due Date */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center space-x-2">
                            {story.assignee ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={story.assignee.avatar || "/placeholder.svg"} />
                                      <AvatarFallback className="text-xs">
                                        {story.assignee.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-slate-600 font-medium">{story.assignee.name}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Assigned to {story.assignee.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-slate-500">Unassigned</span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <Calendar size={12} />
                            <span>
                              {story.dueDate
                                ? `Due ${new Date(story.dueDate).toLocaleDateString()}`
                                : `Updated ${new Date(story.updatedAt).toLocaleDateString()}`}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

export default StoriesPage
