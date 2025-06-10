"use client"

import React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Target,
  Plus,
  Search,
  Grid3X3,
  List,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  Activity,
  MoreHorizontal,
  Edit2,
  Trash2,
  Archive,
  Copy,
  Star,
  ArrowUpDown,
  Sparkles,
  BookOpen,
  CheckSquare,
  AlertCircle,
  RefreshCw,
  Rocket,
  BarChart3,
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
import { useStories, useEpics, useUsers } from "@/hooks/useApi"
import { useNavigation } from "@/contexts/navigation-context"

interface Project {
  id: string
  name: string
  description?: string
  status: "planning" | "active" | "on-hold" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "critical"
  startDate: string
  endDate?: string
  dueDate?: string
  progress: number
  budget?: {
    allocated: number
    spent: number
    currency: string
  }
  team: {
    lead: {
      id: string
      name: string
      avatar?: string
    }
    members: Array<{
      id: string
      name: string
      avatar?: string
      role: string
    }>
  }
  stats: {
    totalEpics: number
    completedEpics: number
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

interface ProjectsPageProps {
  onCreateNew?: () => void
  onEdit?: (project: any) => void
  onDelete?: (project: any) => void
}

const ProjectsPage: React.FC<ProjectsPageProps> = ({
  onCreateNew,
  onEdit,
  onDelete,
}) => {
  // Use API hooks to fetch real data
  const { data: stories = [], isLoading: storiesLoading, error: storiesError, refetch: refetchStories } = useStories()
  const { data: epics = [], isLoading: epicsLoading, error: epicsError } = useEpics()
  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers()
  const { navigateToProjectEpics, navigateToEpicStories, filters } = useNavigation()

  // Combine loading and error states
  const isLoading = storiesLoading || epicsLoading || usersLoading
  const error = storiesError || epicsError || usersError

  // Create projects from epics data (since projects contain epics)
  const projects = epics.map(epic => ({
    id: epic.id,
    name: epic.name,
    description: epic.description,
    status: epic.status,
    priority: epic.priority,
    progress: Math.round((stories.filter(s => s.epic?.id === epic.id && s.status === 'done').length / 
                          Math.max(stories.filter(s => s.epic?.id === epic.id).length, 1)) * 100),
    project: epic.project,
    createdAt: epic.createdAt,
    updatedAt: epic.updatedAt,
    stories: stories.filter(s => s.epic?.id === epic.id),
    stats: {
      totalStories: stories.filter(s => s.epic?.id === epic.id).length,
      completedStories: stories.filter(s => s.epic?.id === epic.id && s.status === 'done').length,
    }
  }))

  const refetch = () => {
    refetchStories()
  }
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [teamFilter, setTeamFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"name" | "status" | "priority" | "progress" | "updated">("updated")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState("all")



  // Status and priority configurations
  const statusConfig = {
    planning: {
      color: "text-slate-700",
      bg: "bg-slate-50",
      border: "border-slate-200",
      icon: Circle,
    },
    active: {
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: Activity,
    },
    "on-hold": {
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: Clock,
    },
    completed: {
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: CheckCircle2,
    },
    cancelled: {
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      icon: AlertCircle,
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

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter((project) => {
      const matchesSearch =
        !searchQuery ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = statusFilter === "all" || project.status === statusFilter
      const matchesPriority = priorityFilter === "all" || project.priority === priorityFilter
      const matchesTeam =
        teamFilter === "all" ||
        project.team.lead.id === teamFilter ||
        project.team.members.some((member) => member.id === teamFilter)

      return matchesSearch && matchesStatus && matchesPriority && matchesTeam
    })

    // Apply tab filter
    if (activeTab !== "all") {
      filtered = filtered.filter((project) => {
        switch (activeTab) {
          case "my-projects":
            return (
              project.team.lead.id === "current-user-id" || project.team.members.some((m) => m.id === "current-user-id")
            )
          case "overdue":
            return project.dueDate && new Date(project.dueDate) < new Date()
          case "high-priority":
            return project.priority === "high" || project.priority === "critical"
          default:
            return true
        }
      })
    }

    // Sort projects
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
          comparison = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
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
  }, [projects, searchQuery, statusFilter, priorityFilter, teamFilter, activeTab, sortBy, sortOrder])

  // Selection handlers
  const handleProjectSelect = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
    )
  }

  const handleSelectAll = () => {
    if (selectedProjects.length === filteredAndSortedProjects.length) {
      setSelectedProjects([])
    } else {
      setSelectedProjects(filteredAndSortedProjects.map((project) => project.id))
    }
  }

  // Get statistics
  const stats = useMemo(() => {
    const total = projects.length
    const completed = projects.filter((project) => project.status === "completed").length
    const active = projects.filter((project) => project.status === "active").length
    const overdue = projects.filter((project) => project.dueDate && new Date(project.dueDate) < new Date()).length

    return { total, completed, active, overdue }
  }, [projects])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Projects</h3>
          <p className="text-slate-600">Getting your projects ready...</p>
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
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Projects</h3>
            <p className="text-slate-600 mb-6">
              {error.message || "Something went wrong while loading your projects."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={refetch} className="bg-blue-600 hover:bg-blue-700">
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
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Target size={20} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Sparkles size={10} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Projects</h1>
                  <p className="text-sm text-slate-600">Strategic project portfolio management</p>
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
                    <div className="text-lg font-bold text-blue-600">{stats.active}</div>
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
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus size={16} className="mr-2" />
                  Create Project
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
                <Target size={16} />
                <span>All Projects</span>
              </TabsTrigger>
              <TabsTrigger value="my-projects" className="flex items-center space-x-2">
                <Users size={16} />
                <span>My Projects</span>
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
                      placeholder="Search projects, descriptions, tags..."
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
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
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
              {selectedProjects.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedProjects.length === filteredAndSortedProjects.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium text-slate-700">{selectedProjects.length} selected</span>
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

          {/* Projects Display */}
          {filteredAndSortedProjects.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <Card className="max-w-md mx-auto shadow-sm">
                <CardContent className="p-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Target size={32} className="text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Projects Found</h3>
                  <p className="text-slate-600 mb-6">
                    {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                      ? "Try adjusting your filters or search terms"
                      : "Start creating your first project to organize your work"}
                  </p>
                  {!searchQuery && statusFilter === "all" && priorityFilter === "all" && (
                    <Button
                      onClick={onCreateNew}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    >
                      <Plus size={16} className="mr-2" />
                      Create Your First Project
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              <AnimatePresence>
                {filteredAndSortedProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`group hover:shadow-lg transition-all duration-200 border-slate-200/60 ${
                        selectedProjects.includes(project.id) ? "ring-2 ring-blue-500 border-blue-500" : ""
                      } ${viewMode === "list" ? "hover:bg-slate-50/50" : ""}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={selectedProjects.includes(project.id)}
                              onCheckedChange={() => handleProjectSelect(project.id)}
                            />
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant="secondary"
                                className={`${priorityConfig[project.priority]?.bg || 'bg-slate-50'} ${priorityConfig[project.priority]?.color || 'text-slate-700'} ${priorityConfig[project.priority]?.border || 'border-slate-200'} border`}
                              >
                                {project.priority || 'Unknown'}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`${statusConfig[project.status]?.bg || 'bg-slate-50'} ${statusConfig[project.status]?.color || 'text-slate-700'} ${statusConfig[project.status]?.border || 'border-slate-200'} border`}
                              >
                                {React.createElement(statusConfig[project.status]?.icon || Circle, {
                                  size: 12,
                                  className: "mr-1.5",
                                })}
                                {project.status?.replace("-", " ") || 'Unknown'}
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
                              <DropdownMenuItem onClick={() => onEdit?.(project)}>
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
                              <DropdownMenuItem className="text-red-600" onClick={() => onDelete?.(project)}>
                                <Trash2 size={16} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Project Title & Description */}
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                            {project.name}
                          </h3>
                          {project.description && (
                            <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{project.description}</p>
                          )}
                        </div>

                        {/* Progress & Stats */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Progress</span>
                            <span className="font-medium text-slate-900">{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />

                          <div className="grid grid-cols-3 gap-2 text-center">
                            <button 
                              onClick={() => navigateToProjectEpics(project.id)}
                              className="bg-slate-50 hover:bg-blue-50 rounded-lg p-2 transition-colors cursor-pointer group"
                            >
                              <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
                                {project.stats.completedEpics || 0}/{project.stats.totalEpics || 0}
                              </div>
                              <div className="text-xs text-slate-600 group-hover:text-blue-600 flex items-center justify-center">
                                <Rocket size={10} className="mr-1" />
                                Epics
                              </div>
                            </button>
                            <button 
                              onClick={() => navigateToEpicStories(project.id)}
                              className="bg-slate-50 hover:bg-green-50 rounded-lg p-2 transition-colors cursor-pointer group"
                            >
                              <div className="text-sm font-bold text-slate-900 group-hover:text-green-700">
                                {project.stats.completedStories}/{project.stats.totalStories}
                              </div>
                              <div className="text-xs text-slate-600 group-hover:text-green-600 flex items-center justify-center">
                                <BookOpen size={10} className="mr-1" />
                                Stories
                              </div>
                            </button>
                            <div className="bg-slate-50 rounded-lg p-2">
                              <div className="text-sm font-bold text-slate-900">
                                {project.stats.completedTasks || 0}/{project.stats.totalTasks || 0}
                              </div>
                              <div className="text-xs text-slate-600 flex items-center justify-center">
                                <CheckSquare size={10} className="mr-1" />
                                Tasks
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Budget Info */}
                        {project.budget && (
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-emerald-800">Budget</span>
                              <span className="text-xs text-emerald-600">
                                {Math.round((project.budget.spent / project.budget.allocated) * 100)}% used
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-emerald-700">
                                ${project.budget.spent.toLocaleString()} / ${project.budget.allocated.toLocaleString()}
                              </span>
                              <BarChart3 size={14} className="text-emerald-600" />
                            </div>
                          </div>
                        )}

                        {/* Team Info */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">Team Lead</span>
                            <div className="flex items-center space-x-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={project.team.lead.avatar || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs">
                                  {project.team.lead.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-slate-600">{project.team.lead.name}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Team Members</span>
                            <div className="flex items-center space-x-1">
                              {project.team.members.slice(0, 3).map((member) => (
                                <Tooltip key={member.id}>
                                  <TooltipTrigger asChild>
                                    <Avatar className="w-6 h-6 border-2 border-white">
                                      <AvatarImage src={member.avatar || "/placeholder.svg"} />
                                      <AvatarFallback className="text-xs">
                                        {member.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {member.name} - {member.role}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                              {project.team.members.length > 3 && (
                                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs text-slate-600 border-2 border-white">
                                  +{project.team.members.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {project.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                {tag}
                              </Badge>
                            ))}
                            {project.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                +{project.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Dates */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <Calendar size={12} />
                            <span>
                              {new Date(project.startDate).toLocaleDateString('en-GB')} -{" "}
                              {project.endDate ? new Date(project.endDate).toLocaleDateString('en-GB') : "Ongoing"}
                            </span>
                          </div>

                          {project.dueDate && (
                            <div className="flex items-center space-x-2 text-xs text-slate-500">
                              <Clock size={12} />
                              <span>Due {new Date(project.dueDate).toLocaleDateString('en-GB')}</span>
                            </div>
                          )}
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

export default ProjectsPage
