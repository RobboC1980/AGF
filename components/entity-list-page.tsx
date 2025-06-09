"use client"

import React, { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Grid3X3,
  List,
  Calendar,
  Users,
  TrendingUp,
  Target,
  Zap,
  BookOpen,
  CheckSquare,
  Rocket,
  AlertTriangle,
  Trophy,
  Sparkles,
  Edit,
  Trash2,
  Archive,
  Copy,
  Star,
  RefreshCw,
  Settings,
  ArrowUpDown,
  Table2,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Entity types and configurations
type EntityType = "projects" | "epics" | "stories" | "tasks" | "sprints" | "initiatives" | "risks" | "okrs"

interface EntityConfig {
  icon: React.ComponentType<any>
  title: string
  description: string
  color: string
  bgColor: string
  borderColor: string
}

const ENTITY_CONFIGS: Record<EntityType, EntityConfig> = {
  projects: {
    icon: Target,
    title: "Projects",
    description: "Strategic project portfolio management",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  epics: {
    icon: Rocket,
    title: "Epics",
    description: "Large features and major initiatives",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  stories: {
    icon: BookOpen,
    title: "Stories",
    description: "User stories and requirements",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  tasks: {
    icon: CheckSquare,
    title: "Tasks",
    description: "Individual work items and deliverables",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  sprints: {
    icon: Zap,
    title: "Sprints",
    description: "Time-boxed development iterations",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
  initiatives: {
    icon: TrendingUp,
    title: "Initiatives",
    description: "Strategic business objectives",
    color: "text-pink-700",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
  },
  risks: {
    icon: AlertTriangle,
    title: "Risks",
    description: "Project risks and mitigation strategies",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  okrs: {
    icon: Trophy,
    title: "OKRs",
    description: "Objectives and Key Results tracking",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
}

// Mock data interface
interface BaseEntity {
  id: string
  name: string
  description?: string
  status: string
  priority?: "low" | "medium" | "high" | "critical"
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  updatedAt: string
  dueDate?: string
  progress?: number
  tags?: string[]
}

interface EntityListPageProps {
  entityType: EntityType
  data?: BaseEntity[]
  isLoading?: boolean
  error?: Error | null
  onRefresh?: () => void
  onCreateNew?: () => void
  onEdit?: (item: BaseEntity) => void
  onDelete?: (item: BaseEntity) => void
  onBulkAction?: (action: string, items: BaseEntity[]) => void
}

const EntityListPage: React.FC<EntityListPageProps> = ({
  entityType,
  data = [],
  isLoading = false,
  error = null,
  onRefresh,
  onCreateNew,
  onEdit,
  onDelete,
  onBulkAction,
}) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"name" | "status" | "priority" | "updated" | "created">("updated")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  const config = ENTITY_CONFIGS[entityType]
  const IconComponent = config.icon

  // Mock data for demonstration
  const mockData: BaseEntity[] = [
    {
      id: "1",
      name: "User Authentication System",
      description: "Implement secure user login and registration",
      status: "in-progress",
      priority: "high",
      assignee: {
        id: "1",
        name: "Sarah Chen",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-20T14:30:00Z",
      dueDate: "2024-01-25T23:59:59Z",
      progress: 75,
      tags: ["authentication", "security"],
    },
    {
      id: "2",
      name: "Dashboard Analytics",
      description: "Create comprehensive analytics dashboard",
      status: "ready",
      priority: "medium",
      assignee: {
        id: "2",
        name: "Alex Rodriguez",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      createdAt: "2024-01-18T09:15:00Z",
      updatedAt: "2024-01-19T16:45:00Z",
      progress: 25,
      tags: ["analytics", "dashboard"],
    },
    {
      id: "3",
      name: "Mobile App Notifications",
      description: "Push notifications for mobile application",
      status: "backlog",
      priority: "critical",
      createdAt: "2024-01-20T11:30:00Z",
      updatedAt: "2024-01-20T11:30:00Z",
      dueDate: "2024-01-22T23:59:59Z",
      progress: 0,
      tags: ["mobile", "notifications"],
    },
  ]

  const entityData = data.length > 0 ? data : mockData

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = entityData.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter
      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && !item.assignee) ||
        item.assignee?.id === assigneeFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee
    })

    // Apply tab filter
    if (activeTab !== "all") {
      filtered = filtered.filter((item) => {
        switch (activeTab) {
          case "my-items":
            return item.assignee?.id === "current-user-id"
          case "overdue":
            return item.dueDate && new Date(item.dueDate) < new Date()
          case "high-priority":
            return item.priority === "high" || item.priority === "critical"
          default:
            return true
        }
      })
    }

    // Sort data
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
          comparison =
            (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
            (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
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
  }, [entityData, searchQuery, statusFilter, priorityFilter, assigneeFilter, activeTab, sortBy, sortOrder])

  // Selection handlers
  const handleSelectItem = useCallback((itemId: string) => {
    setSelectedItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedItems.length === filteredAndSortedData.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredAndSortedData.map((item) => item.id))
    }
  }, [selectedItems.length, filteredAndSortedData])

  // Get statistics
  const stats = useMemo(() => {
    const total = entityData.length
    const completed = entityData.filter((item) => item.status === "done" || item.status === "completed").length
    const inProgress = entityData.filter((item) => item.status === "in-progress").length
    const overdue = entityData.filter((item) => item.dueDate && new Date(item.dueDate) < new Date()).length

    return { total, completed, inProgress, overdue }
  }, [entityData])

  // Priority configuration
  const priorityConfig = {
    low: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
    medium: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    high: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
    critical: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  }

  // Status configuration
  const statusConfig = {
    backlog: { color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" },
    ready: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    "in-progress": { color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
    review: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    done: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
    completed: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading {config.title}</h3>
          <p className="text-slate-600">Getting your data ready...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardContent className="p-8 text-center">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Data</h3>
            <p className="text-slate-600 mb-6">{error.message || "Something went wrong while loading your data."}</p>
            <Button onClick={onRefresh} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw size={16} className="mr-2" />
              Try Again
            </Button>
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
                  <div
                    className={`w-10 h-10 ${config.bgColor} rounded-xl flex items-center justify-center shadow-lg border ${config.borderColor}`}
                  >
                    <IconComponent size={20} className={config.color} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Sparkles size={10} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{config.title}</h1>
                  <p className="text-sm text-slate-600">{config.description}</p>
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
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus size={16} className="mr-2" />
                  Create {entityType.slice(0, -1)}
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
                <IconComponent size={16} />
                <span>All {config.title}</span>
              </TabsTrigger>
              <TabsTrigger value="my-items" className="flex items-center space-x-2">
                <Users size={16} />
                <span>My Items</span>
              </TabsTrigger>
              <TabsTrigger value="overdue" className="flex items-center space-x-2">
                <AlertTriangle size={16} />
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
                      placeholder={`Search ${entityType}...`}
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

                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[120px] h-11">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated">Updated</SelectItem>
                      <SelectItem value="created">Created</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
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
                    <Button
                      variant={viewMode === "table" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("table")}
                      className="h-9 px-3"
                    >
                      <Table2 size={16} />
                    </Button>
                  </div>

                  {/* More Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-11 px-3">
                        <MoreHorizontal size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Download size={16} className="mr-2" />
                        Export Data
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Upload size={16} className="mr-2" />
                        Import Data
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Settings size={16} className="mr-2" />
                        Configure Columns
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedItems.length === filteredAndSortedData.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium text-slate-700">{selectedItems.length} selected</span>
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

          {/* Data Display */}
          {filteredAndSortedData.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <Card className="max-w-md mx-auto shadow-sm">
                <CardContent className="p-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <IconComponent size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No {config.title} Found</h3>
                  <p className="text-slate-600 mb-6">
                    {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                      ? "Try adjusting your filters or search terms"
                      : `Start creating your first ${entityType.slice(0, -1)} to get organized`}
                  </p>
                  {!searchQuery && statusFilter === "all" && priorityFilter === "all" && (
                    <Button
                      onClick={onCreateNew}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <Plus size={16} className="mr-2" />
                      Create Your First {entityType.slice(0, -1)}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredAndSortedData.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`group hover:shadow-lg transition-all duration-200 border-slate-200/60 ${
                        selectedItems.includes(item.id) ? "ring-2 ring-blue-500 border-blue-500" : ""
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => handleSelectItem(item.id)}
                            />
                            <div className="flex items-center space-x-2">
                              {item.priority && (
                                <Badge
                                  variant="secondary"
                                  className={`${priorityConfig[item.priority].bg} ${priorityConfig[item.priority].color} ${priorityConfig[item.priority].border} border`}
                                >
                                  {item.priority}
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={`${statusConfig[item.status as keyof typeof statusConfig]?.bg || "bg-slate-50"} ${
                                  statusConfig[item.status as keyof typeof statusConfig]?.color || "text-slate-700"
                                } ${statusConfig[item.status as keyof typeof statusConfig]?.border || "border-slate-200"} border`}
                              >
                                {item.status.replace("-", " ")}
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
                              <DropdownMenuItem onClick={() => onEdit?.(item)}>
                                <Edit size={16} className="mr-2" />
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
                              <DropdownMenuItem className="text-red-600" onClick={() => onDelete?.(item)}>
                                <Trash2 size={16} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{item.description}</p>
                          )}
                        </div>

                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                +{item.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {typeof item.progress === "number" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600">Progress</span>
                              <span className="font-medium text-slate-900">{item.progress}%</span>
                            </div>
                            <Progress value={item.progress} className="h-2" />
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center space-x-2">
                            {item.assignee ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={item.assignee.avatar || "/placeholder.svg"} />
                                      <AvatarFallback className="text-xs">
                                        {item.assignee.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-slate-600 font-medium">{item.assignee.name}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Assigned to {item.assignee.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-slate-500">Unassigned</span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <Calendar size={12} />
                            <span>
                              {item.dueDate
                                ? `Due ${new Date(item.dueDate).toLocaleDateString('en-GB')}`
                                : `Updated ${new Date(item.updatedAt).toLocaleDateString('en-GB')}`}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredAndSortedData.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card
                      className={`group hover:shadow-md transition-all duration-200 border-slate-200/60 ${
                        selectedItems.includes(item.id) ? "ring-2 ring-blue-500 border-blue-500" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => handleSelectItem(item.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-1">
                                <h3 className="font-semibold text-slate-900 truncate">{item.name}</h3>
                                <div className="flex items-center space-x-2">
                                  {item.priority && (
                                    <Badge
                                      variant="secondary"
                                      className={`${priorityConfig[item.priority].bg} ${priorityConfig[item.priority].color} ${priorityConfig[item.priority].border} border text-xs`}
                                    >
                                      {item.priority}
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className={`${statusConfig[item.status as keyof typeof statusConfig]?.bg || "bg-slate-50"} ${
                                      statusConfig[item.status as keyof typeof statusConfig]?.color || "text-slate-700"
                                    } ${statusConfig[item.status as keyof typeof statusConfig]?.border || "border-slate-200"} border text-xs`}
                                  >
                                    {item.status.replace("-", " ")}
                                  </Badge>
                                </div>
                              </div>
                              {item.description && (
                                <p className="text-slate-600 text-sm truncate">{item.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            {typeof item.progress === "number" && (
                              <div className="w-24">
                                <Progress value={item.progress} className="h-2" />
                              </div>
                            )}

                            {item.assignee && (
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={item.assignee.avatar || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs">
                                  {item.assignee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div className="text-xs text-slate-500 min-w-0">
                              {item.dueDate
                                ? `Due ${new Date(item.dueDate).toLocaleDateString('en-GB')}`
                                : `Updated ${new Date(item.updatedAt).toLocaleDateString('en-GB')}`}
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
                                <DropdownMenuItem onClick={() => onEdit?.(item)}>
                                  <Edit size={16} className="mr-2" />
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
                                <DropdownMenuItem className="text-red-600" onClick={() => onDelete?.(item)}>
                                  <Trash2 size={16} className="mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card className="shadow-sm border-slate-200/60">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedItems.length === filteredAndSortedData.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedData.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => handleSelectItem(item.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-slate-900">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-slate-600 truncate max-w-xs">{item.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${statusConfig[item.status as keyof typeof statusConfig]?.bg || "bg-slate-50"} ${
                              statusConfig[item.status as keyof typeof statusConfig]?.color || "text-slate-700"
                            } ${statusConfig[item.status as keyof typeof statusConfig]?.border || "border-slate-200"} border`}
                          >
                            {item.status.replace("-", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.priority && (
                            <Badge
                              variant="secondary"
                              className={`${priorityConfig[item.priority].bg} ${priorityConfig[item.priority].color} ${priorityConfig[item.priority].border} border`}
                            >
                              {item.priority}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.assignee ? (
                            <div className="flex items-center space-x-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={item.assignee.avatar || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs">
                                  {item.assignee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{item.assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {typeof item.progress === "number" && (
                            <div className="flex items-center space-x-2">
                              <Progress value={item.progress} className="h-2 w-16" />
                              <span className="text-sm text-slate-600">{item.progress}%</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-600">
                            {item.dueDate
                              ? new Date(item.dueDate).toLocaleDateString('en-GB')
                              : new Date(item.updatedAt).toLocaleDateString('en-GB')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit?.(item)}>
                                <Edit size={16} className="mr-2" />
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
                              <DropdownMenuItem className="text-red-600" onClick={() => onDelete?.(item)}>
                                <Trash2 size={16} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

export default EntityListPage
