"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Calendar,
  User,
  Tag,
  Target,
  BookOpen,
  CheckSquare,
  Folder,
  Clock,
  Star,
  ArrowRight,
  Loader2,
  SlidersHorizontal,
  Hash
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useDebounce } from '@/hooks/use-debounce'
import { api } from '@/services/api'
import { toast } from 'sonner'

interface SearchResult {
  id: string
  type: 'project' | 'epic' | 'story' | 'task' | 'user'
  title: string
  description?: string
  key?: string
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
    color?: string
  }
  epic?: {
    id: string
    name: string
    color?: string
  }
  story?: {
    id: string
    name: string
  }
  tags?: string[]
  createdAt: string
  updatedAt: string
  dueDate?: string
  score?: number
}

interface SearchFilters {
  entityTypes: string[]
  statuses: string[]
  priorities: string[]
  assignees: string[]
  projects: string[]
  dateRange: {
    start?: string
    end?: string
  }
  tags: string[]
}

interface AdvancedSearchProps {
  onResultSelect?: (result: SearchResult) => void
  onClose?: () => void
  isModal?: boolean
  placeholder?: string
  showFilters?: boolean
}

const entityTypeConfig = {
  project: { icon: Folder, color: 'text-blue-600', label: 'Projects' },
  epic: { icon: Target, color: 'text-purple-600', label: 'Epics' },
  story: { icon: BookOpen, color: 'text-green-600', label: 'Stories' },
  task: { icon: CheckSquare, color: 'text-orange-600', label: 'Tasks' },
  user: { icon: User, color: 'text-gray-600', label: 'Users' }
}

const statusConfig = {
  backlog: { color: 'bg-gray-100 text-gray-800', label: 'Backlog' },
  todo: { color: 'bg-blue-100 text-blue-800', label: 'To Do' },
  'in-progress': { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
  review: { color: 'bg-purple-100 text-purple-800', label: 'Review' },
  done: { color: 'bg-green-100 text-green-800', label: 'Done' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
}

const priorityConfig = {
  low: { color: 'bg-gray-100 text-gray-800', label: 'Low' },
  medium: { color: 'bg-blue-100 text-blue-800', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
  critical: { color: 'bg-red-100 text-red-800', label: 'Critical' }
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onResultSelect,
  onClose,
  isModal = false,
  placeholder = "Search projects, epics, stories, tasks, and users...",
  showFilters = true
}) => {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedResult, setSelectedResult] = useState<string | null>(null)
  
  // Search filters
  const [filters, setFilters] = useState<SearchFilters>({
    entityTypes: [],
    statuses: [],
    priorities: [],
    assignees: [],
    projects: [],
    dateRange: {},
    tags: []
  })

  // Reference data for filters
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  const debouncedQuery = useDebounce(query, 300)

  // Load reference data
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [usersData, projectsData] = await Promise.all([
          api.users.getAll(),
          api.projects.getAll()
        ])
        
        setUsers(usersData)
        setProjects(projectsData)
        
        // Extract available tags from stories (simplified)
        // In a real implementation, you'd have a dedicated tags endpoint
        setAvailableTags(['frontend', 'backend', 'api', 'ui', 'database', 'testing', 'performance'])
      } catch (error) {
        console.error('Failed to load reference data:', error)
      }
    }
    
    loadReferenceData()
  }, [])

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    if (!searchQuery.trim() && searchFilters.entityTypes.length === 0) {
      setResults([])
      return
    }

    setIsSearching(true)
    try {
      // Simulate API call - replace with actual search endpoint
      const response = await api.search.search(
        searchQuery,
        searchFilters.entityTypes.length > 0 ? searchFilters.entityTypes.join(',') : undefined,
        50
      )
      
      // Mock additional filtering since the API might not support all filters
      let filteredResults = response

      if (searchFilters.statuses.length > 0) {
        filteredResults = filteredResults.filter(r => 
          searchFilters.statuses.includes(r.status)
        )
      }

      if (searchFilters.priorities.length > 0) {
        filteredResults = filteredResults.filter(r => 
          r.priority && searchFilters.priorities.includes(r.priority)
        )
      }

      if (searchFilters.assignees.length > 0) {
        filteredResults = filteredResults.filter(r => 
          r.assignee && searchFilters.assignees.includes(r.assignee.id)
        )
      }

      setResults(filteredResults.slice(0, 20)) // Limit results
    } catch (error) {
      console.error('Search failed:', error)
      toast.error('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Trigger search when query or filters change
  useEffect(() => {
    performSearch(debouncedQuery, filters)
  }, [debouncedQuery, filters, performSearch])

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const toggleFilterValue = (filterType: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const currentValues = prev[filterType] as string[]
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      
      return { ...prev, [filterType]: newValues }
    })
  }

  const clearFilters = () => {
    setFilters({
      entityTypes: [],
      statuses: [],
      priorities: [],
      assignees: [],
      projects: [],
      dateRange: {},
      tags: []
    })
  }

  const handleResultClick = (result: SearchResult) => {
    setSelectedResult(result.id)
    onResultSelect?.(result)
  }

  const getEntityIcon = (type: string) => {
    const config = entityTypeConfig[type as keyof typeof entityTypeConfig]
    if (!config) return Target
    return config.icon
  }

  const getEntityColor = (type: string) => {
    const config = entityTypeConfig[type as keyof typeof entityTypeConfig]
    return config?.color || 'text-gray-600'
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    return config || { color: 'bg-gray-100 text-gray-800', label: status }
  }

  const getPriorityBadge = (priority: string) => {
    const config = priorityConfig[priority as keyof typeof priorityConfig]
    return config || { color: 'bg-gray-100 text-gray-800', label: priority }
  }

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).reduce((count, value) => {
      if (Array.isArray(value)) {
        return count + value.length
      }
      if (typeof value === 'object' && value !== null) {
        return count + Object.keys(value).length
      }
      return count
    }, 0)
  }, [filters])

  const hasActiveFilters = activeFiltersCount > 0

  return (
    <div className={`w-full ${isModal ? 'max-w-4xl mx-auto' : ''}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-12 pr-12 h-12 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl"
        />
        
        {showFilters && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {hasActiveFilters && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {activeFiltersCount}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`h-8 w-8 p-0 ${showAdvancedFilters ? 'bg-blue-100 text-blue-600' : ''}`}
            >
              <SlidersHorizontal size={16} />
            </Button>
          </div>
        )}
        
        {isSearching && (
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
            <Loader2 className="animate-spin text-gray-400" size={16} />
          </div>
        )}
      </div>

      {/* Quick Filters */}
      {showFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(entityTypeConfig).map(([type, config]) => (
            <Button
              key={type}
              variant={filters.entityTypes.includes(type) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFilterValue('entityTypes', type)}
              className="h-8"
            >
              <config.icon size={14} className="mr-1" />
              {config.label}
            </Button>
          ))}
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X size={14} className="mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Advanced Filters */}
      <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <CollapsibleContent className="mt-4">
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Filter size={18} className="mr-2" />
                Advanced Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <h4 className="font-medium mb-2">Status</h4>
                  <div className="space-y-2">
                    {Object.entries(statusConfig).map(([status, config]) => (
                      <label key={status} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={filters.statuses.includes(status)}
                          onCheckedChange={() => toggleFilterValue('statuses', status)}
                        />
                        <Badge className={`${config.color} border-0`}>
                          {config.label}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Priority Filter */}
                <div>
                  <h4 className="font-medium mb-2">Priority</h4>
                  <div className="space-y-2">
                    {Object.entries(priorityConfig).map(([priority, config]) => (
                      <label key={priority} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={filters.priorities.includes(priority)}
                          onCheckedChange={() => toggleFilterValue('priorities', priority)}
                        />
                        <Badge className={`${config.color} border-0`}>
                          {config.label}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Assignee Filter */}
                <div>
                  <h4 className="font-medium mb-2">Assignee</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {users.slice(0, 8).map((user) => (
                      <label key={user.id} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={filters.assignees.includes(user.id)}
                          onCheckedChange={() => toggleFilterValue('assignees', user.id)}
                        />
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {user.name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Search Results */}
      <AnimatePresence>
        {(query.trim() || hasActiveFilters) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            <Card className="border-gray-200 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Search Results ({results.length})
                  </CardTitle>
                  {isModal && onClose && (
                    <Button variant="ghost" size="sm" onClick={onClose}>
                      <X size={16} />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {results.length > 0 ? (
                    <div className="space-y-1">
                      {results.map((result, index) => {
                        const EntityIcon = getEntityIcon(result.type)
                        const entityColor = getEntityColor(result.type)
                        const statusBadge = getStatusBadge(result.status)
                        const priorityBadge = result.priority ? getPriorityBadge(result.priority) : null
                        
                        return (
                          <motion.div
                            key={result.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-4 hover:bg-gray-50 cursor-pointer border-l-4 ${
                              selectedResult === result.id ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'
                            }`}
                            onClick={() => handleResultClick(result)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1 min-w-0">
                                <EntityIcon className={`${entityColor} mt-1 flex-shrink-0`} size={18} />
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h3 className="font-medium text-gray-900 truncate">{result.title}</h3>
                                    {result.key && (
                                      <Badge variant="outline" className="text-xs">
                                        {result.key}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {result.description && (
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                      {result.description}
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    <Badge className={`${statusBadge.color} border-0`}>
                                      {statusBadge.label}
                                    </Badge>
                                    
                                    {priorityBadge && (
                                      <Badge className={`${priorityBadge.color} border-0`}>
                                        {priorityBadge.label}
                                      </Badge>
                                    )}
                                    
                                    {result.assignee && (
                                      <div className="flex items-center space-x-1">
                                        <Avatar className="w-4 h-4">
                                          <AvatarImage src={result.assignee.avatar} />
                                          <AvatarFallback className="text-xs">
                                            {result.assignee.name.split(' ').map(n => n[0]).join('')}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span>{result.assignee.name}</span>
                                      </div>
                                    )}
                                    
                                    {result.project && (
                                      <div className="flex items-center space-x-1">
                                        <Folder size={12} />
                                        <span>{result.project.name}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <ArrowRight size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  ) : query.trim() || hasActiveFilters ? (
                    <div className="p-8 text-center text-gray-500">
                      <Search size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="font-medium">No results found</p>
                      <p className="text-sm">Try adjusting your search terms or filters</p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdvancedSearch 