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

interface UserStory {
  id: string
  title: string
  description: string
  status: "backlog" | "ready" | "in-progress" | "review" | "testing" | "done"
  priority: "low" | "medium" | "high" | "critical"
  storyPoints: number
  epic?: {
    id: string
    name: string
    color: string
  }
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  reporter: {
    id: string
    name: string
    avatar?: string
  }
  sprint?: {
    id: string
    name: string
  }
  acceptanceCriteria: string[]
  tasks: {
    total: number
    completed: number
  }
  comments: number
  attachments: number
  labels?: string[]
  createdAt: string
  updatedAt: string
  dueDate?: string
  startDate?: string
}

interface UserStoriesPageProps {
  data?: UserStory[]
  isLoading?: boolean
  error?: Error | null
  onRefresh?: () => void
  onCreateNew?: () => void
  onEdit?: (story: UserStory) => void
  onDelete?: (story: UserStory) => void
}

const UserStoriesPage: React.FC<UserStoriesPageProps> = ({
  data = [],
  isLoading = false,
  error = null,
  onRefresh,
  onCreateNew,
  onEdit,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [epicFilter, setEpicFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [sprintFilter, setSprintFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedStories, setSelectedStories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"title" | "status" | "priority" | "points" | "updated">("updated")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState("all")

  // Mock data for demonstration
  const mockStories: UserStory[] = [
    {
      id: "1",
      title: "User Registration with Email Verification",
      description: "As a new user, I want to register for an account using my email address and verify it so that I can securely access the platform.",
      status: "in-progress",
      priority: "high",
      storyPoints: 8,
      epic: {
        id: "1",
        name: "User Authentication",
        color: "bg-blue-500",
      },
      assignee: {
        id: "1",
        name: "Sarah Chen",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      reporter: {
        id: "2",
        name: "Alex Rodriguez",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      sprint: {
        id: "1",
        name: "Sprint 12",
      },
      acceptanceCriteria: [
        "User can enter email and password",
        "Email verification sent upon registration",
        "User redirected to dashboard after verification",
        "Proper error handling for invalid inputs"
      ],
      tasks: {
        total: 6,
        completed: 4,
      },
      comments: 12,
      attachments: 3,
      labels: ["authentication", "security", "email"],
      createdAt: "2024-01-10T10:00:00Z",
      updatedAt: "2024-01-20T14:30:00Z",
      dueDate: "2024-01-25T23:59:59Z",
      startDate: "2024-01-15T00:00:00Z",
    },
    {
      id: "2",
      title: "Dashboard Analytics Widget",
      description: "As a project manager, I want to see real-time analytics on my dashboard so that I can track project progress and team performance.",
      status: "ready",
      priority: "medium",
      storyPoints: 5,
      epic: {
        id: "2",
        name: "Analytics Dashboard",
        color: "bg-purple-500",
      },
      assignee: {
        id: "3",
        name: "Emily Johnson",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      reporter: {
        id: "1",
        name: "Sarah Chen",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      sprint: {
        id: "2",
        name: "Sprint 13",
      },
      acceptanceCriteria: [
        "Widget displays key metrics",
        "Data updates in real-time",
        "Responsive design for mobile",
        "Export functionality available"
      ],
      tasks: {
        total: 4,
        completed: 1,
      },
      comments: 8,
      attachments: 2,
      labels: ["analytics", "dashboard", "ui"],
      createdAt: "2024-01-12T09:15:00Z",
      updatedAt: "2024-01-19T16:45:00Z",
      dueDate: "2024-02-01T23:59:59Z",
    },
    {
      id: "3",
      title: "Mobile App Push Notifications",
      description: "As a mobile user, I want to receive push notifications for important updates so that I stay informed about project changes.",
      status: "done",
      priority: "critical",
      storyPoints: 13,
      epic: {
        id: "3",
        name: "Mobile Application",
        color: "bg-green-500",
      },
      assignee: {
        id: "2",
        name: "Alex Rodriguez",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      reporter: {
        id: "3",
        name: "Emily Johnson",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      sprint: {
        id: "1",
        name: "Sprint 12",
      },
      acceptanceCriteria: [
        "Notifications sent for task assignments",
        "User can customize notification preferences",
        "Offline notification queuing",
        "Cross-platform compatibility"
      ],
      tasks: {
        total: 8,
        completed: 8,
      },
      comments: 15,
      attachments: 5,
      labels: ["mobile", "notifications", "real-time"],
      createdAt: "2024-01-05T08:00:00Z",
      updatedAt: "2024-01-18T17:30:00Z",
    },
  ]

  const stories = data.length > 0 ? data : mockStories

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

  // Filter and sort stories
  const filteredAndSortedStories = useMemo(() => {
    let filtered = stories.filter((story) => {
      const matchesSearch =
        !searchQuery ||
        story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.labels?.some((label) => label.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = statusFilter === "all" || story.status === statusFilter
      const matchesPriority = priorityFilter === "all" || story.priority === priorityFilter
      const matchesEpic = epicFilter === "all" || (epicFilter === "no-epic" && !story.epic) || story.epic?.id === epicFilter
      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && !story.assignee) ||
        story.assignee?.id === assigneeFilter
      const matchesSprint = sprintFilter === "all" || (sprintFilter === "no-sprint" && !story.sprint) || story.sprint?.id === sprintFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesEpic && matchesAssignee && matchesSprint
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
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
        case "priority":
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority]
          break
        case "points":
          comparison = b.storyPoints - a.storyPoints
          break
        case "updated":
        default:
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          break
      }

      return sortOrder === "asc" ? -comparison : comparison
    })

    return filtered
  }, [stories, searchQuery, statusFilter, priorityFilter, epicFilter, assigneeFilter, sprintFilter, activeTab, sortBy, sortOrder])

  // Selection handlers
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

  // Get statistics
  const stats = useMemo(() => {
    const total = stories.length
    const done = stories.filter((story) => story.status === "done").length
    const inProgress = stories.filter((story) => story.status === "in-progress").length
    const overdue = stories.filter((story) => story.dueDate && new Date(story.dueDate) < new Date()).length
    const totalPoints = stories.reduce((sum, story) => sum + story.storyPoints, 0)
    const completedPoints = stories.filter((story) => story.status === "done").reduce((sum, story) => sum + story.storyPoints, 0)

    return { total, done, inProgress, overdue, totalPoints, completedPoints }
  }, [stories])

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
              <Button onClick={onRefresh} className="bg-blue-600 hover:bg-blue-700">
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
          <Card className="mb-6 shadow-sm border-slate-200/60">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search stories, descriptions, labels..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
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
                    <SelectTrigger className="w-[120px] h-11">
                      <SelectValue placeholder="Epic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Epics</SelectItem>
                      <SelectItem value="no-epic">No Epic</SelectItem>
                      <SelectItem value="1">User Authentication</SelectItem>
                      <SelectItem value="2">Analytics Dashboard</SelectItem>
                      <SelectItem value="3">Mobile Application</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sprintFilter} onValueChange={setSprintFilter}>
                    <SelectTrigger className="w-[120px] h-11">
                      <SelectValue placeholder="Sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sprints</SelectItem>
                      <SelectItem value="no-sprint">No Sprint</SelectItem>
                      <SelectItem value="1">Sprint 12</SelectItem>
                      <SelectItem value="2">Sprint 13</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[120px] h-11">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated">Updated</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="points">Story Points</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="h-11 px-3"
                  >
                    <ArrowUpDown size={16} />
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
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <BookOpen size={32} className="text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No User Stories Found</h3>
                  <p className="text-slate-600 mb-6">
                    {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                      ? "Try adjusting your filters or search terms"
                      : "Start creating your first user story to define feature requirements"}
                  </p>
                  {!searchQuery && statusFilter === "all" && priorityFilter === "all" && (
                    <Button
                      onClick={onCreateNew}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                <Zap size={12} className="mr-1" />
                                {story.storyPoints} pts
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
                              <DropdownMenuItem onClick={() => onEdit?.(story)}>
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
                              <DropdownMenuItem className="text-red-600" onClick={() => onDelete?.(story)}>
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
                            {story.title}
                          </h3>
                          <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{story.description}</p>
                        </div>

                        {/* Epic & Sprint Info */}
                        {(story.epic || story.sprint) && (
                          <div className="flex gap-2">
                            {story.epic && (
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-lg p-2 flex-1">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${story.epic.color}`}></div>
                                  <span className="text-xs font-medium text-blue-800 truncate">{story.epic.name}</span>
                                </div>
                              </div>
                            )}
                            {story.sprint && (
                              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/60 rounded-lg p-2 flex-1">
                                <div className="flex items-center space-x-2">
                                  <Target size={12} className="text-purple-600 flex-shrink-0" />
                                  <span className="text-xs font-medium text-purple-800 truncate">{story.sprint.name}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Acceptance Criteria Preview */}
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Acceptance Criteria</span>
                            <span className="text-xs text-slate-500">{story.acceptanceCriteria.length} items</span>
                          </div>
                          <div className="space-y-1">
                            {story.acceptanceCriteria.slice(0, 2).map((criteria, idx) => (
                              <div key={idx} className="flex items-start space-x-2">
                                <CheckCircle2 size={12} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-slate-600 line-clamp-1">{criteria}</span>
                              </div>
                            ))}
                            {story.acceptanceCriteria.length > 2 && (
                              <div className="text-xs text-slate-500">+{story.acceptanceCriteria.length - 2} more...</div>
                            )}
                          </div>
                        </div>

                        {/* Tasks Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Tasks</span>
                            <span className="font-medium text-slate-900">
                              {story.tasks.completed}/{story.tasks.total}
                            </span>
                          </div>
                          <Progress 
                            value={story.tasks.total > 0 ? (story.tasks.completed / story.tasks.total) * 100 : 0} 
                            className="h-2" 
                          />
                        </div>

                        {/* Labels */}
                        {story.labels && story.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {story.labels.slice(0, 3).map((label) => (
                              <Badge key={label} variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                {label}
                              </Badge>
                            ))}
                            {story.labels.length > 3 && (
                              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                +{story.labels.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Footer with Assignee, Reporter & Activity */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center space-x-3">
                            {story.assignee ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={story.assignee.avatar || "/placeholder.svg"} />
                                    <AvatarFallback className="text-xs">
                                      {story.assignee.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Assigned to {story.assignee.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center">
                                <User size={12} className="text-slate-500" />
                              </div>
                            )}

                            <div className="flex items-center space-x-2 text-xs text-slate-500">
                              <span>{story.comments} comments</span>
                              <span>•</span>
                              <span>{story.attachments} files</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <Calendar size={12} />
                            <span>
                              {story.dueDate
                                ? `Due ${new Date(story.dueDate).toLocaleDateString('en-GB')}`
                                : `Updated ${new Date(story.updatedAt).toLocaleDateString('en-GB')}`}
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

export default UserStoriesPage 