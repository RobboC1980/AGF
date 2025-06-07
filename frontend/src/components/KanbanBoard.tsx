import React, { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { api } from '../api/client'

interface Task {
  id: string
  name: string
  description?: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedHours?: number
  actualHours?: number
  assignedTo?: string
  completedAt?: string
  storyId?: string
  sprintId?: string
  story?: { id: string; name: string; storyPoints?: number }
  epic?: { id: string; name: string }
  createdAt: string
  updatedAt: string
}

interface KanbanColumn {
  id: string
  title: string
  status: Task['status']
  color: string
  limit?: number
}

interface KanbanBoardProps {
  projectId?: string
  sprintId?: string
  showSwimlanes?: boolean
  compactView?: boolean
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', status: 'todo', color: '#6b7280' },
  { id: 'in-progress', title: 'In Progress', status: 'in-progress', color: '#3b82f6', limit: 3 },
  { id: 'review', title: 'Review', status: 'review', color: '#f59e0b', limit: 2 },
  { id: 'done', title: 'Done', status: 'done', color: '#10b981' }
]

export default function KanbanBoard({ projectId, sprintId, showSwimlanes = false, compactView = false }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterStory, setFilterStory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [swimlaneBy, setSwimlaneBy] = useState<'story' | 'assignee' | 'epic'>('story')

  // Fetch tasks
  const { data: tasks = [], isLoading, error } = useQuery<Task[]>({
    queryKey: ['kanban-tasks', { projectId, sprintId }],
    queryFn: async () => {
      let url = '/tasks?'
      const params = new URLSearchParams()
      
      if (projectId) params.append('projectId', projectId)
      if (sprintId) params.append('sprintId', sprintId)
      
      const response = await api.get(`/tasks?${params.toString()}`)
      return response.data
    }
  })

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const response = await api.put(`/tasks/${taskId}`, updates)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] })
    }
  })

  // Handle drag end
  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const taskId = draggableId
    const newStatus = destination.droppableId.split('-').pop() as Task['status']
    
    const updates: Partial<Task> = { status: newStatus }
    if (newStatus === 'done') {
      updates.completedAt = new Date().toISOString()
    } else if (newStatus !== 'done' && source.droppableId.endsWith('done')) {
      updates.completedAt = undefined
    }

    updateTaskMutation.mutate({ taskId, updates })
  }, [updateTaskMutation])

  // Filter and group tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filterAssignee !== 'all' && task.assignedTo !== filterAssignee) return false
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false
      if (filterStory !== 'all' && task.storyId !== filterStory) return false
      if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [tasks, filterAssignee, filterPriority, filterStory, searchQuery])

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const groups: Record<string, Task[]> = {}
    DEFAULT_COLUMNS.forEach(col => {
      groups[col.status] = filteredTasks.filter(task => task.status === col.status)
    })
    return groups
  }, [filteredTasks])

  // Group tasks by swimlane
  const swimlanes = useMemo(() => {
    if (!showSwimlanes) return null

    const groups: Record<string, Task[]> = {}
    filteredTasks.forEach(task => {
      let key = 'Unassigned'
      switch (swimlaneBy) {
        case 'story':
          key = task.story?.name || 'No Story'
          break
        case 'assignee':
          key = task.assignedTo || 'Unassigned'
          break
        case 'epic':
          key = task.epic?.name || 'No Epic'
          break
      }
      if (!groups[key]) groups[key] = []
      groups[key].push(task)
    })
    return groups
  }, [filteredTasks, showSwimlanes, swimlaneBy])

  // Get unique values for filters
  const uniqueAssignees = useMemo(() => {
    const assignees = [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))]
    return assignees.sort()
  }, [tasks])

  const uniqueStories = useMemo(() => {
    const stories = tasks.filter(t => t.story).map(t => t.story!).filter((story, index, arr) => 
      arr.findIndex(s => s.id === story.id) === index
    )
    return stories.sort((a, b) => a.name.localeCompare(b.name))
  }, [tasks])

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴'
      case 'high': return '🟠'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  const getColumnLimit = (column: KanbanColumn, tasks: Task[]) => {
    if (!column.limit) return null
    const isOverLimit = tasks.length > column.limit
    return (
      <span className={`column-limit ${isOverLimit ? 'over-limit' : ''}`}>
        {tasks.length}/{column.limit}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="kanban-loading">
        <div className="loading-spinner"></div>
        <p>Loading Kanban board...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="kanban-error">
        <div className="error-icon">⚠️</div>
        <p>Failed to load Kanban board</p>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] })}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`kanban-board ${compactView ? 'compact' : ''} ${showSwimlanes ? 'with-swimlanes' : ''}`}>
      {/* Header and Filters */}
      <div className="kanban-header">
        <div className="kanban-title">
          <h2>📋 Kanban Board</h2>
          <div className="task-count">
            {filteredTasks.length} of {tasks.length} tasks
          </div>
        </div>

        <div className="kanban-filters">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <label>Assignee:</label>
            <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
              <option value="all">All</option>
              <option value="">Unassigned</option>
              {uniqueAssignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Priority:</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="all">All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {uniqueStories.length > 0 && (
            <div className="filter-group">
              <label>Story:</label>
              <select value={filterStory} onChange={(e) => setFilterStory(e.target.value)}>
                <option value="all">All Stories</option>
                {uniqueStories.map(story => (
                  <option key={story.id} value={story.id}>
                    {story.name} {story.storyPoints ? `(${story.storyPoints}sp)` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showSwimlanes && (
            <div className="filter-group">
              <label>Group by:</label>
              <select value={swimlaneBy} onChange={(e) => setSwimlaneBy(e.target.value as any)}>
                <option value="story">Story</option>
                <option value="assignee">Assignee</option>
                <option value="epic">Epic</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {showSwimlanes && swimlanes ? (
          /* Swimlane View */
          <div className="kanban-swimlanes">
            {Object.entries(swimlanes).map(([swimlaneName, swimlaneTasks]) => (
              <div key={swimlaneName} className="swimlane">
                <div className="swimlane-header">
                  <h3>{swimlaneName}</h3>
                  <span className="swimlane-count">{swimlaneTasks.length} tasks</span>
                </div>
                
                <div className="swimlane-columns">
                  {DEFAULT_COLUMNS.map(column => {
                    const columnTasks = swimlaneTasks.filter(task => task.status === column.status)
                    const droppableId = `${swimlaneName}-${column.status}`
                    
                    return (
                      <div key={column.id} className="kanban-column">
                        <div className="column-header" style={{ borderTopColor: column.color }}>
                          <h4>{column.title}</h4>
                          <div className="column-stats">
                            <span className="task-count">{columnTasks.length}</span>
                            {getColumnLimit(column, columnTasks)}
                          </div>
                        </div>

                        <Droppable droppableId={droppableId}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`task-list ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                            >
                              {columnTasks.map((task, index) => (
                                <TaskCard key={task.id} task={task} index={index} compactView={compactView} />
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Standard Column View */
          <div className="kanban-columns">
            {DEFAULT_COLUMNS.map(column => {
              const columnTasks = tasksByStatus[column.status] || []
              
              return (
                <div key={column.id} className="kanban-column">
                  <div className="column-header" style={{ borderTopColor: column.color }}>
                    <h3>{column.title}</h3>
                    <div className="column-stats">
                      <span className="task-count">{columnTasks.length}</span>
                      {getColumnLimit(column, columnTasks)}
                    </div>
                  </div>

                  <Droppable droppableId={column.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`task-list ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                      >
                        {columnTasks.map((task, index) => (
                          <TaskCard key={task.id} task={task} index={index} compactView={compactView} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        )}
      </DragDropContext>
    </div>
  )
}

// Task Card Component
interface TaskCardProps {
  task: Task
  index: number
  compactView: boolean
}

function TaskCard({ task, index, compactView }: TaskCardProps) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴'
      case 'high': return '🟠'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`task-card ${snapshot.isDragging ? 'dragging' : ''} ${compactView ? 'compact' : ''}`}
        >
          <div className="task-header">
            <div className="task-priority">{getPriorityIcon(task.priority)}</div>
            <div className="task-title">{task.name}</div>
          </div>

          {!compactView && task.description && (
            <div className="task-description">{task.description}</div>
          )}

          {task.story && (
            <div className="task-story">
              📖 {task.story.name}
              {task.story.storyPoints && <span className="story-points">({task.story.storyPoints}sp)</span>}
            </div>
          )}

          <div className="task-footer">
            {task.assignedTo && (
              <div className="task-assignee">👤 {task.assignedTo}</div>
            )}
            
            {(task.estimatedHours || task.actualHours) && (
              <div className="task-hours">
                ⏱️ {task.actualHours || 0}h
                {task.estimatedHours && `/${task.estimatedHours}h`}
              </div>
            )}
          </div>

          {task.completedAt && (
            <div className="task-completed">
              ✅ Completed {new Date(task.completedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
} 