import { PRIORITY_ORDER, Priority, Status } from './constants'

export interface BaseEntity {
  id: string
  name: string
  description?: string
  status: Status
  priority?: Priority
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

export interface FilterOptions {
  searchQuery: string
  statusFilter: string
  priorityFilter: string
  assigneeFilter: string
  activeTab: string
  currentUserId?: string
}

export interface SortOptions {
  sortBy: 'name' | 'status' | 'priority' | 'updated' | 'created'
  sortOrder: 'asc' | 'desc'
}

export interface EntityStats {
  total: number
  completed: number
  inProgress: number
  overdue: number
}

export function filterEntities(entities: BaseEntity[], filters: FilterOptions): BaseEntity[] {
  const { searchQuery, statusFilter, priorityFilter, assigneeFilter, activeTab, currentUserId } = filters

  let filtered = entities.filter((item) => {
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
          return item.assignee?.id === currentUserId
        case "overdue":
          return item.dueDate && new Date(item.dueDate) < new Date()
        case "high-priority":
          return item.priority === "high" || item.priority === "critical"
        default:
          return true
      }
    })
  }

  return filtered
}

export function sortEntities(entities: BaseEntity[], sortOptions: SortOptions): BaseEntity[] {
  const { sortBy, sortOrder } = sortOptions

  return [...entities].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
      case "status":
        comparison = a.status.localeCompare(b.status)
        break
      case "priority":
        comparison =
          (PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] || 0) -
          (PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] || 0)
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
}

export function calculateEntityStats(entities: BaseEntity[]): EntityStats {
  const total = entities.length
  const completed = entities.filter((item) => item.status === "done" || item.status === "completed").length
  const inProgress = entities.filter((item) => item.status === "in-progress").length
  const overdue = entities.filter((item) => item.dueDate && new Date(item.dueDate) < new Date()).length

  return { total, completed, inProgress, overdue }
}

export function getUniqueAssignees(entities: BaseEntity[]): Array<{ id: string; name: string }> {
  const assigneeMap = new Map<string, { id: string; name: string }>()
  
  entities.forEach((entity) => {
    if (entity.assignee) {
      assigneeMap.set(entity.assignee.id, {
        id: entity.assignee.id,
        name: entity.assignee.name,
      })
    }
  })

  return Array.from(assigneeMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function isOverdue(dateString?: string): boolean {
  if (!dateString) return false
  return new Date(dateString) < new Date()
} 