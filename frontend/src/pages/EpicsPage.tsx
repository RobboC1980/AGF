"use client"

import React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Rocket, Plus, Search, Grid3X3, List, Calendar, Users, Target, TrendingUp, Clock, CheckCircle2, Circle, Activity, Eye, MoreHorizontal, Edit2, Trash2, Archive, Copy, Star, ArrowUpDown, Filter, Download, Settings, Sparkles, BookOpen, CheckSquare, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
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

interface Epic {
  id: string
  name: string
  description?: string
  status: "planning" | "in-progress" | "review" | "completed" | "on-hold"
  priority: "low" | "medium" | "high" | "critical"
  project: {
    id: string
    name: string
    color: string
  }
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  startDate?: string
  endDate?: string
  dueDate?: string
  progress: number
  stats: {
    totalStories: number
    completedStories: number
    totalTasks: number
    completedTasks: number
    storyPoints: number
    completedPoints: number
  }
  tags?: string[]
  createdAt: string
  updatedAt: string
}

interface EpicsPageProps {
  data?: Epic[]
  isLoading?: boolean
  error?: Error | null
  onRefresh?: () => void
  onCreateNew?: () => void
  onEdit?: (epic: Epic) => void
  onDelete?: (epic: Epic) => void
}

const EpicsPage: React.FC<EpicsPageProps> = ({
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
  const [projectFilter, setProjectFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedEpics, setSelectedEpics] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"name" | "status" | "priority" | "progress" | "updated">("updated")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState("all")

  // Mock data for demonstration
  const mockEpics: Epic[] = [
    {
      id: "1",
      name: "User Authentication & Security",
      description: "Comprehensive user authentication system with OAuth, 2FA, and security features",
      status: "in-progress",
      priority: "high",
      project: {
        id: "1",
        name: "AgileForge Platform",
        color: "bg-blue-500",
      },
      assignee: {
        id: "1",
        name: "Sarah Chen",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      startDate: "2024-01-15T00:00:00Z",
      endDate: "2024-03-15T00:00:00Z",
      dueDate: "2024-03-10T23:59:59Z",
      progress: 65,
      stats: {
        totalStories: 12,
        completedStories: 8,
        totalTasks: 45,
        completedTasks: 29,
        storyPoints: 89,
        completedPoints: 58,
      },
      tags: ["authentication", "security", "oauth"],
      createdAt: "2024-01-10T10:00:00Z",
      updatedAt: "2024-01-20T14:30:00Z",
    },
    {
      id: "2",
      name: "Analytics Dashboard",
      description: "Advanced analytics and reporting dashboard with real-time insights",
      status: "planning",
      priority: "medium",
      project: {
        id: "1",
        name: "AgileForge Platform",
        color: "bg-blue-500",
      },
      assignee: {
        id: "2",
        name: "Alex Rodriguez",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      startDate: "2024-02-01T00:00:00Z",
      endDate: "2024-04-30T00:00:00Z",
      progress: 15,
      stats: {
        totalStories: 18,
        completedStories: 2,
        totalTasks: 67,
        completedTasks: 8,
        storyPoints: 134,
        completedPoints: 21,
      },
      tags: ["analytics", "dashboard", "reporting"],
      createdAt: "2024-01-18T09:15:00Z",
      updatedAt: "2024-01-19T16:45:00Z",
    },
    {
      id: "3",
      name: "Mobile Application",
      description: "Native mobile app for iOS and Android with offline capabilities",
      status: "completed",
      priority: "critical",
      project: {
        id: "2",
        name: "Mobile Platform",
        color: "bg-purple-500",
      },
      assignee: {
        id: "3",
        name: "Emily Johnson",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      startDate: "2023-10-01T00:00:00Z",
      endDate: "2024-01-15T00:00:00Z",
      progress: 100,
      stats: {
        totalStories: 24,
        completedStories: 24,
        totalTasks: 89,
        completedTasks: 89,
        storyPoints: 198,
        completedPoints: 198,
      },
      tags: ["mobile", "ios", "android", "offline"],
      createdAt: "2023-09-25T08:00:00Z",
      updatedAt: "2024-01-15T17:30:00Z",
    },
  ]

  const epics = data.length > 0 ? data : mockEpics

  // Status and priority configurations
  const statusConfig = {
    planning: {
      color: "text-slate-700",
      bg: "bg-slate-50",
      border: "border-slate-200",
      icon: Circle,
    },
    "in-progress": {
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: Activity,
    },
    review: {
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: Eye,
    },
    completed: {
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: CheckCircle2,
    },
    "on-hold": {
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      icon: Clock,
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

  // Filter and sort epics
  const filteredAndSortedEpics = useMemo(() => {
    let filtered = epics.filter((epic) => {
      const matchesSearch =
        !searchQuery ||
        epic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epic.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epic.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = statusFilter === "all" || epic.status === statusFilter
      const matchesPriority = priorityFilter === "all" || epic.priority === priorityFilter
      const matchesProject = projectFilter === "all" || epic.project.id === projectFilter
      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && !epic.assignee) ||
        epic.assignee?.id === assigneeFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesAssignee
    })

    // Apply tab filter
    if (activeTab !== "all") {
      filtered = filtered.filter((epic) => {
        switch (activeTab) {
          case "my-epics":
            return epic.assignee?.id === "current-user-id"
          case "overdue":
            return epic.dueDate && new Date(epic.dueDate) < new Date()
          case "high-priority":
            return epic.priority === "high" || epic.priority === "critical"
          default:
            return true
        }
      })
    }

    // Sort epics
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
        case "priority":
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority]
          break
        case "progress":
          comparison = b.progress - a.progress
          break
        case "updated":
        default:
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          break
      }

      return sortOrder === "asc" ? -comparison : comparison
    })

    return filtered
  }, [epics, searchQuery, statusFilter, priorityFilter, projectFilter, assigneeFilter, activeTab, sortBy, sortOrder])

  // Selection handlers
  const handleEpicSelect = (epicId: string) => {
    setSelectedEpics((prev) => (prev.includes(epicId) ? prev.filter((id) => id !== epicId) : [...prev, epicId]))
  }

  const handleSelectAll = () => {
    if (selectedEpics.length === filteredAndSortedEpics.length) {
      setSelectedEpics([])
    } else {
      setSelectedEpics(filteredAndSortedEpics.map((epic) => epic.id))
    }
  }

  // Get statistics
  const stats = useMemo(() => {
    const total = epics.length
    const completed = epics.filter((epic) => epic.status === "completed").length
    const inProgress = epics.filter((epic) => epic.status === "in-progress").length
    const overdue = epics.filter((epic) => epic.dueDate && new Date(epic.dueDate) < new Date()).length

    return { total, completed, inProgress, overdue }
  }, [epics])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Epics</h3>
          <p className="text-slate-600">Getting your epics ready...</p>
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
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Epics</h3>
            <p className="text-slate-600 mb-6">{error.message || "Something went wrong while loading your epics."}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={onRefresh} className="bg-purple-600 hover:bg-purple-700">
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
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Rocket size={20} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Sparkles size={10} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Epics</h1>
                  <p className="text-sm text-slate-600">Large feature initiatives and major work streams</p>
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
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus size={16} className="mr-2" />
                  Create Epic
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
                <Rocket size={16} />
                <span>All Epics</span>
              </TabsTrigger>
              <TabsTrigger value="my-epics" className="flex items-center space-x-2">
                <Users size={16} />
                <span>My Epics</span>
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
                      placeholder="Search epics, descriptions, tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 border-slate-200 focus:border-purple-500 focus:ring-purple-500/20"
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
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
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

                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[120px] h-11">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated">Updated</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="progress">Progress</SelectItem>
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
              {selectedEpics.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedEpics.length === filteredAndSortedEpics.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium text-slate-700">{selectedEpics.length} selected</span>
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

          {/* Epics Display */}
          {filteredAndSortedEpics.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <Card className="max-w-md mx-auto shadow-sm">
                <CardContent className="p-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Rocket size={32} className="text-purple-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Epics Found</h3>
                  <p className="text-slate-600 mb-6">
                    {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                      ? "Try adjusting your filters or search terms"
                      : "Start creating your first epic to organize large features"}
                  </p>
                  {!searchQuery && statusFilter === "all" && priorityFilter === "all" && (
                    <Button
                      onClick={onCreateNew}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Plus size={16} className="mr-2" />
                      Create Your First Epic
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              <AnimatePresence>
                {filteredAndSortedEpics.map((epic, index) => (
                  <motion.div
                    key={epic.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`group hover:shadow-lg transition-all duration-200 border-slate-200/60 ${
                        selectedEpics.includes(epic.id) ? "ring-2 ring-purple-500 border-purple-500" : ""
                      } ${viewMode === "list" ? "hover:bg-slate-50/50" : ""}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={selectedEpics.includes(epic.id)}
                              onCheckedChange={() => handleEpicSelect(epic.id)}
                            />
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant="secondary"
                                className={`${priorityConfig[epic.priority].bg} ${priorityConfig[epic.priority].color} ${priorityConfig[epic.priority].border} border`}
                              >
                                {epic.priority}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`${statusConfig[epic.status].bg} ${statusConfig[epic.status].color} ${statusConfig[epic.status].border} border`}
                              >
                                {React.createElement(statusConfig[epic.status].icon, {
                                  size: 12,
                                  className: "mr-1.5",
                                })}
                                {epic.status.replace("-", " ")}
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
                              <DropdownMenuItem onClick={() => onEdit?.(epic)}>
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
                              <DropdownMenuItem className="text-red-600" onClick={() => onDelete?.(epic)}>
                                <Trash2 size={16} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Epic Title & Description */}
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-purple-600 transition-colors">
                            {epic.name}
                          </h3>
                          {epic.description && (
                            <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{epic.description}</p>
                          )}
                        </div>

                        {/* Project Info */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/60 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${epic.project.color}`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-purple-800 truncate">{epic.project.name}</p>
                            </div>
                            <Target size={14} className="text-purple-600 flex-shrink-0" />
                          </div>
                        </div>

                        {/* Progress & Stats */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Progress</span>
                            <span className="font-medium text-slate-900">{epic.progress}%</span>
                          </div>
                          <Progress value={epic.progress} className="h-2" />

                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-slate-50 rounded-lg p-2">
                              <div className="text-lg font-bold text-slate-900">
                                {epic.stats.completedStories}/{epic.stats.totalStories}
                              </div>
                              <div className="text-xs text-slate-600 flex items-center justify-center">
                                <BookOpen size={12} className="mr-1" />
                                Stories
                              </div>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-2">
                              <div className="text-lg font-bold text-slate-900">
                                {epic.stats.completedTasks}/{epic.stats.totalTasks}
                              </div>
                              <div className="text-xs text-slate-600 flex items-center justify-center">
                                <CheckSquare size={12} className="mr-1" />
                                Tasks
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center space-x-1">
                              <Target size={12} />
                              <span>
                                {epic.stats.completedPoints}/{epic.stats.storyPoints} SP
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        {epic.tags && epic.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {epic.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                {tag}
                              </Badge>
                            ))}
                            {epic.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                +{epic.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Assignee & Dates */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center space-x-2">
                            {epic.assignee ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={epic.assignee.avatar || "/placeholder.svg"} />
                                      <AvatarFallback className="text-xs">
                                        {epic.assignee.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-slate-600 font-medium">{epic.assignee.name}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Assigned to {epic.assignee.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-slate-500">Unassigned</span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <Calendar size={12} />
                            <span>
                              {epic.dueDate
                                ? `Due ${new Date(epic.dueDate).toLocaleDateString()}`
                                : `Updated ${new Date(epic.updatedAt).toLocaleDateString()}`}
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

export default EpicsPage 