import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  BaseEntity,
  FilterOptions,
  SortOptions,
  EntityStats,
  filterEntities,
  sortEntities,
  calculateEntityStats,
  getUniqueAssignees,
} from '@/lib/entity-utils'

interface UseEntityManagementProps {
  entities: BaseEntity[]
  currentUserId?: string
}

interface UseEntityManagementReturn {
  // Filtered and sorted data
  filteredAndSortedEntities: BaseEntity[]
  stats: EntityStats
  assignees: Array<{ id: string; name: string }>
  
  // Filter state
  searchQuery: string
  setSearchQuery: (query: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  priorityFilter: string
  setPriorityFilter: (priority: string) => void
  assigneeFilter: string
  setAssigneeFilter: (assignee: string) => void
  activeTab: string
  setActiveTab: (tab: string) => void
  
  // Sort state
  sortBy: SortOptions['sortBy']
  setSortBy: (sort: SortOptions['sortBy']) => void
  sortOrder: SortOptions['sortOrder']
  setSortOrder: (order: SortOptions['sortOrder']) => void
  
  // Selection state
  selectedItems: string[]
  setSelectedItems: (items: string[]) => void
  handleSelectItem: (itemId: string) => void
  handleSelectAll: () => void
  
  // View state
  viewMode: 'grid' | 'list' | 'table'
  setViewMode: (mode: 'grid' | 'list' | 'table') => void
  
  // Reset functions
  resetFilters: () => void
  resetAll: () => void
}

export function useEntityManagement({
  entities,
  currentUserId,
}: UseEntityManagementProps): UseEntityManagementReturn {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('all')
  
  // Sort state
  const [sortBy, setSortBy] = useState<SortOptions['sortBy']>('updated')
  const [sortOrder, setSortOrder] = useState<SortOptions['sortOrder']>('desc')
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid')

  // Memoized computations
  const filterOptions = useMemo<FilterOptions>(() => ({
    searchQuery,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    activeTab,
    currentUserId,
  }), [searchQuery, statusFilter, priorityFilter, assigneeFilter, activeTab, currentUserId])

  const sortOptions = useMemo<SortOptions>(() => ({
    sortBy,
    sortOrder,
  }), [sortBy, sortOrder])

  const filteredEntities = useMemo(() => 
    filterEntities(entities, filterOptions),
    [entities, filterOptions]
  )

  const filteredAndSortedEntities = useMemo(() => 
    sortEntities(filteredEntities, sortOptions),
    [filteredEntities, sortOptions]
  )

  const stats = useMemo(() => 
    calculateEntityStats(entities),
    [entities]
  )

  const assignees = useMemo(() => 
    getUniqueAssignees(entities),
    [entities]
  )

  // Selection handlers
  const handleSelectItem = useCallback((itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedItems.length === filteredAndSortedEntities.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredAndSortedEntities.map(item => item.id))
    }
  }, [selectedItems.length, filteredAndSortedEntities])

  // Reset functions
  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setAssigneeFilter('all')
    setActiveTab('all')
  }, [])

  const resetAll = useCallback(() => {
    resetFilters()
    setSortBy('updated')
    setSortOrder('desc')
    setSelectedItems([])
    setViewMode('grid')
  }, [resetFilters])

  // Clear selection when filters change
  useEffect(() => {
    setSelectedItems([])
  }, [searchQuery, statusFilter, priorityFilter, assigneeFilter, activeTab])

  return {
    filteredAndSortedEntities,
    stats,
    assignees,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    activeTab,
    setActiveTab,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedItems,
    setSelectedItems,
    handleSelectItem,
    handleSelectAll,
    viewMode,
    setViewMode,
    resetFilters,
    resetAll,
  }
} 