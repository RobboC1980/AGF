"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  Target,
  BookOpen,
  CheckSquare,
  Rocket,
  Clock,
  ArrowUpDown,
  Grid3X3,
  List,
  X,
  Sparkles,
  Eye,
  Edit2,
  Star,
  MoreHorizontal,
  RefreshCw,
  Download,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"

// Search result types
interface SearchResult {
  id: string
  type: "project" | "epic" | "story" | "task"
  title: string
  description?: string
  status: string
  priority?: string
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  project?: {
    id: string
    name: string
    color: string
  }
  epic?: {
    id: string
    name: string
  }
  tags?: string[]
  createdAt: string
  updatedAt: string
  dueDate?: string
  progress?: number
  matchedFields: string[]
  relevanceScore: number
}

interface SearchFilters {
  types: string[]
  statuses: string[]
  priorities: string[]
  assignees: string[]
  projects: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  tags: string[]
}

interface SearchPageProps {
  onSearch?: (query: string, filters: SearchFilters) => Promise<SearchResult[]>
  isLoading?: boolean
  error?: Error | null
}

const SearchPage: React.FC<SearchPageProps> = ({ onSearch, isLoading = false, error = null }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    statuses: [],
    priorities: [],
    assignees: [],
    projects: [],
    tags: [],
  })
  const [sortBy, setSortBy] = useState<"relevance" | "updated" | "created" | "title">("relevance")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [selectedResults, setSelectedResults] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  // Mock data for demonstration
  const mockSearchResults: SearchResult[] = [
    {
      id: "1",
      type: "story",
      title: "User Authentication System",
      description: "Implement secure user login and registration with OAuth integration",
      status: "in-progress",
      priority: "high",
      assignee: {
        id: "1",
        name: "Sarah Chen",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      project: {
        id: "1",
        name: "AgileForge Platform",
        color: "bg-blue-500",
      },
      epic: {
        id: "1",
        name: "User Management",
      },
      tags: ["authentication", "security", "oauth"],
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-20T14:30:00Z",
      dueDate: "2024-01-25T23:59:59Z",
      progress: 75,
      matchedFields: ["title", "description", "tags"],
      relevanceScore: 95,
    },
    {
      id: "2",
      type: "epic",
      title: "Analytics Dashboard",
      description: "Advanced analytics and reporting dashboard with real-time insights",
      status: "planning",
      priority: "medium",
      assignee: {
        id: "2",
        name: "Alex Rodriguez",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      project: {
        id: "1",
        name: "AgileForge Platform",
        color: "bg-blue-500",
      },
      tags: ["analytics", "dashboard", "reporting"],
      createdAt: "2024-01-18T09:15:00Z",
      updatedAt: "2024-01-19T16:45:00Z",
      progress: 25,
      matchedFields: ["title", "description"],
      relevanceScore: 88,
    },
    {
      id: "3",
      type: "project",
      title: "Mobile Application",
      description: "Cross-platform mobile app for iOS and Android with offline capabilities",
      status: "active",
      priority: "critical",
      assignee: {
        id: "3",
        name: "Emily Johnson",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      tags: ["mobile", "ios", "android", "offline"],
      createdAt: "2024-01-10T08:00:00Z",
      updatedAt: "2024-01-20T12:00:00Z",
      progress: 60,
      matchedFields: ["title", "tags"],
      relevanceScore: 82,
    },
    {
      id: "4",
      type: "task",
      title: "Database Migration Script",
      description: "Create migration script for user authentication tables",
      status: "completed",
      priority: "high",
      assignee: {
        id: "1",
        name: "Sarah Chen",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      project: {
        id: "1",
        name: "AgileForge Platform",
        color: "bg-blue-500",
      },
      epic: {
        id: "1",
        name: "User Management",
      },
      tags: ["database", "migration", "authentication"],
      createdAt: "2024-01-12T14:00:00Z",
      updatedAt: "2024-01-18T16:30:00Z",
      dueDate: "2024-01-20T23:59:59Z",
      progress: 100,
      matchedFields: ["description", "tags"],
      relevanceScore: 76,
    },
  ]

  // Type configurations
  const typeConfig = {
    project: {
      icon: Target,
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      label: "Project",
    },
    epic: {
      icon: Rocket,
      color: "text-purple-700",
      bg: "bg-purple-50",
      border: "border-purple-200",
      label: "Epic",
    },
    story: {
      icon: BookOpen,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      label: "Story",
    },
    task: {
      icon: CheckSquare,
      color: "text-orange-700",
      bg: "bg-orange-50",
      border: "border-orange-200",
      label: "Task",
    },
  }

  // Perform search
  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    try {
      if (onSearch) {
        const results = await onSearch(searchQuery, filters)
        setSearchResults(results)
      } else {
        // Mock search implementation
        const filtered = mockSearchResults.filter((result) => {
          const matchesQuery =
            result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            result.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            result.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

          const matchesType = filters.types.length === 0 || filters.types.includes(result.type)
          const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(result.status)
          const matchesPriority =
            filters.priorities.length === 0 || !result.priority || filters.priorities.includes(result.priority)
          const matchesAssignee =
            filters.assignees.length === 0 || !result.assignee || filters.assignees.includes(result.assignee.id)
          const matchesProject =
            filters.projects.length === 0 || !result.project || filters.projects.includes(result.project.id)

          return matchesQuery && matchesType && matchesStatus && matchesPriority && matchesAssignee && matchesProject
        })

        setSearchResults(filtered)
      }

      // Add to search history
      if (!searchHistory.includes(searchQuery)) {
        setSearchHistory((prev) => [searchQuery, ...prev.slice(0, 4)])
      }
    } catch (error) {
      console.error("Search failed:", error)
    }
  }

  // Filter and sort results
  const filteredAndSortedResults = useMemo(() => {
    const sorted = [...searchResults]

    sorted.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "relevance":
          comparison = b.relevanceScore - a.relevanceScore
          break
        case "title":
          comparison = a.title.localeCompare(b.title)
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

    return sorted
  }, [searchResults, sortBy, sortOrder])

  // Handle search on Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      performSearch()
    }
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({
      types: [],
      statuses: [],
      priorities: [],
      assignees: [],
      projects: [],
      tags: [],
    })
  }

  // Get active filter count
  const activeFilterCount = Object.values(filters).reduce((count, filterArray) => {
    if (Array.isArray(filterArray)) {
      return count + filterArray.length
    }
    return count
  }, 0)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Enhanced Header */}
        <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Search size={20} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                    <Sparkles size={10} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Search</h1>
                  <p className="text-sm text-slate-600">Find projects, epics, stories, and tasks</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                  <Filter size={16} className="mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Download size={16} className="mr-2" />
                      Export Results
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings size={16} className="mr-2" />
                      Search Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Input */}
          <Card className="mb-6 shadow-sm border-slate-200/60">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search across all projects, epics, stories, and tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-12 h-14 text-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                  <Button
                    onClick={performSearch}
                    disabled={isLoading}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  >
                    {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                  </Button>
                </div>

                {/* Search History */}
                {searchHistory.length > 0 && !searchQuery && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-600">Recent searches:</span>
                    <div className="flex flex-wrap gap-2">
                      {searchHistory.map((query, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchQuery(query)}
                          className="h-7 text-xs"
                        >
                          {query}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Filters */}
          {showFilters && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="mb-6 shadow-sm border-slate-200/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Advanced Filters</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Clear All
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Type Filter */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Type</label>
                      <div className="space-y-2">
                        {Object.entries(typeConfig).map(([type, config]) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              checked={filters.types.includes(type)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters((prev) => ({ ...prev, types: [...prev.types, type] }))
                                } else {
                                  setFilters((prev) => ({ ...prev, types: prev.types.filter((t) => t !== type) }))
                                }
                              }}
                            />
                            <div className="flex items-center space-x-2">
                              <config.icon size={16} className={config.color} />
                              <span className="text-sm">{config.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
                      <Select
                        value={filters.statuses[0] || ""}
                        onValueChange={(value) => {
                          if (value) {
                            setFilters((prev) => ({ ...prev, statuses: [value] }))
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on-hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority Filter */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Priority</label>
                      <Select
                        value={filters.priorities[0] || ""}
                        onValueChange={(value) => {
                          if (value) {
                            setFilters((prev) => ({ ...prev, priorities: [value] }))
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Date Range</label>
                    <DatePickerWithRange
                      date={filters.dateRange}
                      onDateChange={(dateRange) => setFilters((prev) => ({ ...prev, dateRange }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Search Results */}
          {searchQuery && (
            <div className="space-y-6">
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Search Results
                    {filteredAndSortedResults.length > 0 && (
                      <span className="ml-2 text-slate-600">({filteredAndSortedResults.length})</span>
                    )}
                  </h2>
                  {searchQuery && (
                    <p className="text-sm text-slate-600">
                      Results for "<span className="font-medium">{searchQuery}</span>"
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="updated">Updated</SelectItem>
                      <SelectItem value="created">Created</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    <ArrowUpDown size={16} />
                  </Button>

                  <div className="flex items-center bg-slate-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="h-8 px-3"
                    >
                      <List size={16} />
                    </Button>
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className="h-8 px-3"
                    >
                      <Grid3X3 size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Results Display */}
              {filteredAndSortedResults.length === 0 ? (
                <Card className="shadow-sm border-slate-200/60">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Search size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Results Found</h3>
                    <p className="text-slate-600 mb-6">
                      Try adjusting your search terms or filters to find what you're looking for.
                    </p>
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div
                  className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}
                >
                  <AnimatePresence>
                    {filteredAndSortedResults.map((result, index) => {
                      const config = typeConfig[result.type]
                      const IconComponent = config.icon

                      return (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="group hover:shadow-lg transition-all duration-200 border-slate-200/60">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-10 h-10 ${config.bg} rounded-lg flex items-center justify-center`}>
                                    <IconComponent size={20} className={config.color} />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <Badge variant="secondary" className={`${config.bg} ${config.color} text-xs`}>
                                        {config.label}
                                      </Badge>
                                      {sortBy === "relevance" && (
                                        <Badge variant="outline" className="text-xs">
                                          {result.relevanceScore}% match
                                        </Badge>
                                      )}
                                    </div>
                                    <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                      {result.title}
                                    </h3>
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
                                    <DropdownMenuItem>
                                      <Eye size={16} className="mr-2" />
                                      View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Edit2 size={16} className="mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Star size={16} className="mr-2" />
                                      Add to Favorites
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                              {/* Description */}
                              {result.description && (
                                <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed">
                                  {result.description}
                                </p>
                              )}

                              {/* Matched Fields */}
                              <div className="flex flex-wrap gap-1">
                                {result.matchedFields.map((field) => (
                                  <Badge
                                    key={field}
                                    variant="secondary"
                                    className="text-xs bg-emerald-100 text-emerald-700"
                                  >
                                    Matched in {field}
                                  </Badge>
                                ))}
                              </div>

                              {/* Project/Epic Info */}
                              {result.project && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <div className={`w-3 h-3 rounded-full ${result.project.color}`}></div>
                                  <span className="text-slate-600">{result.project.name}</span>
                                  {result.epic && (
                                    <>
                                      <span className="text-slate-400">/</span>
                                      <span className="text-slate-600">{result.epic.name}</span>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Progress */}
                              {typeof result.progress === "number" && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Progress</span>
                                    <span className="font-medium text-slate-900">{result.progress}%</span>
                                  </div>
                                  <Progress value={result.progress} className="h-2" />
                                </div>
                              )}

                              {/* Tags */}
                              {result.tags && result.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {result.tags.slice(0, 3).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="text-xs bg-slate-100 text-slate-700"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {result.tags.length > 3 && (
                                    <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                      +{result.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Footer */}
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <div className="flex items-center space-x-2">
                                  {result.assignee ? (
                                    <div className="flex items-center space-x-2">
                                      <Avatar className="w-6 h-6">
                                        <AvatarImage src={result.assignee.avatar || "/placeholder.svg"} />
                                        <AvatarFallback className="text-xs">
                                          {result.assignee.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-slate-600 font-medium">{result.assignee.name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-500">Unassigned</span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2 text-xs text-slate-500">
                                  <Clock size={12} />
                                  <span>Updated {new Date(result.updatedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!searchQuery && (
            <Card className="shadow-sm border-slate-200/60">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Search size={32} className="text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Search Across Your Workspace</h3>
                <p className="text-slate-600 mb-6">
                  Find projects, epics, stories, and tasks quickly with our powerful search engine.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  {Object.entries(typeConfig).map(([type, config]) => (
                    <div key={type} className="text-center">
                      <div
                        className={`w-12 h-12 ${config.bg} rounded-lg flex items-center justify-center mx-auto mb-2`}
                      >
                        <config.icon size={24} className={config.color} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{config.label}s</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

export default SearchPage
