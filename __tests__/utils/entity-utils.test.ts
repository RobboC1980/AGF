import {
  filterEntities,
  sortEntities,
  calculateEntityStats,
  getUniqueAssignees,
  formatDate,
  isOverdue,
  BaseEntity,
  FilterOptions,
  SortOptions,
} from '@/lib/entity-utils'

// Mock data for testing
const mockEntities: BaseEntity[] = [
  {
    id: '1',
    name: 'Test Story 1',
    description: 'First test story',
    status: 'in-progress',
    priority: 'high',
    assignee: { id: 'user1', name: 'John Doe' },
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    dueDate: '2024-01-20T23:59:59Z',
    progress: 50,
    tags: ['frontend', 'ui'],
  },
  {
    id: '2',
    name: 'Test Story 2',
    description: 'Second test story',
    status: 'done',
    priority: 'medium',
    assignee: { id: 'user2', name: 'Jane Smith' },
    createdAt: '2024-01-02T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
    dueDate: '2023-12-31T23:59:59Z', // Overdue
    progress: 100,
    tags: ['backend', 'api'],
  },
  {
    id: '3',
    name: 'Test Story 3',
    description: 'Third test story',
    status: 'backlog',
    priority: 'low',
    createdAt: '2024-01-03T10:00:00Z',
    updatedAt: '2024-01-05T10:00:00Z',
    progress: 0,
    tags: ['documentation'],
  },
]

describe('entity-utils', () => {
  describe('filterEntities', () => {
    it('should filter by search query', () => {
      const filters: FilterOptions = {
        searchQuery: 'First',
        statusFilter: 'all',
        priorityFilter: 'all',
        assigneeFilter: 'all',
        activeTab: 'all',
      }

      const result = filterEntities(mockEntities, filters)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should filter by status', () => {
      const filters: FilterOptions = {
        searchQuery: '',
        statusFilter: 'done',
        priorityFilter: 'all',
        assigneeFilter: 'all',
        activeTab: 'all',
      }

      const result = filterEntities(mockEntities, filters)
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('done')
    })

    it('should filter by priority', () => {
      const filters: FilterOptions = {
        searchQuery: '',
        statusFilter: 'all',
        priorityFilter: 'high',
        assigneeFilter: 'all',
        activeTab: 'all',
      }

      const result = filterEntities(mockEntities, filters)
      expect(result).toHaveLength(1)
      expect(result[0].priority).toBe('high')
    })

    it('should filter by overdue items', () => {
      const filters: FilterOptions = {
        searchQuery: '',
        statusFilter: 'all',
        priorityFilter: 'all',
        assigneeFilter: 'all',
        activeTab: 'overdue',
      }

      const result = filterEntities(mockEntities, filters)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })
  })

  describe('sortEntities', () => {
    it('should sort by name ascending', () => {
      const sortOptions: SortOptions = {
        sortBy: 'name',
        sortOrder: 'asc',
      }

      const result = sortEntities(mockEntities, sortOptions)
      expect(result[0].name).toBe('Test Story 1')
      expect(result[1].name).toBe('Test Story 2')
      expect(result[2].name).toBe('Test Story 3')
    })

    it('should sort by priority descending', () => {
      const sortOptions: SortOptions = {
        sortBy: 'priority',
        sortOrder: 'desc',
      }

      const result = sortEntities(mockEntities, sortOptions)
      expect(result[0].priority).toBe('high')
      expect(result[1].priority).toBe('medium')
      expect(result[2].priority).toBe('low')
    })
  })

  describe('calculateEntityStats', () => {
    it('should calculate correct statistics', () => {
      const stats = calculateEntityStats(mockEntities)
      
      expect(stats.total).toBe(3)
      expect(stats.completed).toBe(1)
      expect(stats.inProgress).toBe(1)
      expect(stats.overdue).toBe(1)
    })
  })

  describe('getUniqueAssignees', () => {
    it('should return unique assignees', () => {
      const assignees = getUniqueAssignees(mockEntities)
      
      expect(assignees).toHaveLength(2)
      expect(assignees[0].name).toBe('Jane Smith')
      expect(assignees[1].name).toBe('John Doe')
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const formatted = formatDate('2024-01-15T10:00:00Z')
      expect(formatted).toMatch(/Jan 15, 2024/)
    })
  })

  describe('isOverdue', () => {
    it('should detect overdue dates', () => {
      expect(isOverdue('2023-12-31T23:59:59Z')).toBe(true)
      expect(isOverdue('2025-12-31T23:59:59Z')).toBe(false)
      expect(isOverdue(undefined)).toBe(false)
    })
  })
}) 