import React, { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { api } from '../api/client'

interface Story {
  id: string
  name: string
  description?: string
  storyPoints?: number
  priority: string
  epic?: { id: string; name: string }
  tasks: Task[]
  status?: 'todo' | 'in-progress' | 'done'
}

interface Task {
  id: string
  name: string
  status: string
  estimatedHours?: number
  assignedTo?: string
  storyId: string
  sprintId?: string
}

interface Sprint {
  id: string
  name: string
  startDate: string
  endDate: string
  projectId: string
  tasks: Task[]
  capacity?: number
  velocity?: number
}

interface SprintPlanningBoardProps {
  projectId: string
  activeSprint?: Sprint
}

export default function SprintPlanningBoard({ projectId, activeSprint }: SprintPlanningBoardProps) {
  const queryClient = useQueryClient()
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(activeSprint || null)
  const [storyFilter, setStoryFilter] = useState<'all' | 'unassigned' | 'assigned'>('unassigned')
  const [showCreateSprint, setShowCreateSprint] = useState(false)

  // Fetch project stories
  const { data: stories = [], isLoading: storiesLoading } = useQuery<Story[]>({
    queryKey: ['stories', projectId],
    queryFn: async () => {
      const response = await api.get(`/stories?projectId=${projectId}`)
      return response.data
    }
  })

  // Fetch project sprints
  const { data: sprints = [], isLoading: sprintsLoading } = useQuery<Sprint[]>({
    queryKey: ['sprints', projectId],
    queryFn: async () => {
      const response = await api.get(`/sprints?projectId=${projectId}`)
      return response.data
    }
  })

  // Move story to sprint mutation
  const moveStoryMutation = useMutation({
    mutationFn: async ({ storyId, sprintId, taskIds }: { storyId: string; sprintId: string | null; taskIds: string[] }) => {
      // Update all tasks in the story to be assigned to the sprint
      const updatePromises = taskIds.map(taskId => 
        api.put(`/tasks/${taskId}`, { sprintId })
      )
      await Promise.all(updatePromises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories', projectId] })
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] })
    }
  })

  // Create sprint mutation
  const createSprintMutation = useMutation({
    mutationFn: async (sprintData: Partial<Sprint>) => {
      const response = await api.post('/sprints', sprintData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] })
      setShowCreateSprint(false)
    }
  })

  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const storyId = draggableId
    const story = stories.find(s => s.id === storyId)
    if (!story) return

    const sprintId = destination.droppableId === 'backlog' ? null : destination.droppableId
    const taskIds = story.tasks.map(t => t.id)

    moveStoryMutation.mutate({ storyId, sprintId, taskIds })
  }, [stories, moveStoryMutation])

  const getStoryPointsTotal = (stories: Story[]) => {
    return stories.reduce((total, story) => (total + (story.storyPoints || 0)), 0)
  }

  const getSprintStories = (sprintId: string) => {
    return stories.filter(story => 
      story.tasks.some(task => task.sprintId === sprintId)
    )
  }

  const getBacklogStories = () => {
    return stories.filter(story => 
      !story.tasks.some(task => task.sprintId)
    ).filter(story => {
      if (storyFilter === 'all') return true
      if (storyFilter === 'unassigned') return !story.tasks.some(task => task.assignedTo)
      if (storyFilter === 'assigned') return story.tasks.some(task => task.assignedTo)
      return true
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  if (storiesLoading || sprintsLoading) {
    return (
      <div className="sprint-planning-loading">
        <div className="loading-spinner"></div>
        <p>Loading sprint planning board...</p>
      </div>
    )
  }

  return (
    <div className="sprint-planning-board">
      <div className="sprint-planning-header">
        <div className="sprint-planning-title">
          <h2>🏃‍♂️ Sprint Planning Board</h2>
          <p>Plan and manage your sprints with drag-and-drop story assignment</p>
        </div>
        
        <div className="sprint-planning-controls">
          <div className="story-filter">
            <label>Filter Stories:</label>
            <select 
              value={storyFilter} 
              onChange={(e) => setStoryFilter(e.target.value as any)}
              className="form-select"
            >
              <option value="all">All Stories</option>
              <option value="unassigned">Unassigned</option>
              <option value="assigned">Assigned</option>
            </select>
          </div>
          
          <button 
            onClick={() => setShowCreateSprint(true)}
            className="btn btn-primary"
          >
            ➕ Create Sprint
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="sprint-planning-container">
          {/* Product Backlog */}
          <div className="backlog-column">
            <div className="column-header">
              <h3>📋 Product Backlog</h3>
              <div className="story-count">
                {getBacklogStories().length} stories • {getStoryPointsTotal(getBacklogStories())} points
              </div>
            </div>
            
            <Droppable droppableId="backlog">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`story-list ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                >
                  {getBacklogStories().map((story, index) => (
                    <Draggable key={story.id} draggableId={story.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`story-card ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <div className="story-header">
                            <div className="story-priority" style={{ backgroundColor: getPriorityColor(story.priority) }}></div>
                            <div className="story-title">{story.name}</div>
                            {story.storyPoints && (
                              <div className="story-points">{story.storyPoints}sp</div>
                            )}
                          </div>
                          
                          {story.description && (
                            <div className="story-description">{story.description}</div>
                          )}
                          
                          {story.epic && (
                            <div className="story-epic">Epic: {story.epic.name}</div>
                          )}
                          
                          <div className="story-footer">
                            <div className="task-count">{story.tasks.length} tasks</div>
                            <div className="assigned-count">
                              {story.tasks.filter(t => t.assignedTo).length} assigned
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder as React.ReactNode}
                </div>
              )}
            </Droppable>
          </div>

          {/* Sprint Columns */}
          <div className="sprints-container">
            {sprints.map(sprint => {
              const sprintStories = getSprintStories(sprint.id)
              const totalPoints = getStoryPointsTotal(sprintStories)
              
              return (
                <div key={sprint.id} className="sprint-column">
                  <div className="column-header">
                    <h3>🏃‍♂️ {sprint.name}</h3>
                    <div className="sprint-info">
                      <div className="sprint-dates">
                        {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                      </div>
                      <div className="sprint-stats">
                        {sprintStories.length} stories • {totalPoints} points
                        {sprint.capacity && (
                          <span className={`capacity ${totalPoints > sprint.capacity ? 'over-capacity' : ''}`}>
                            / {sprint.capacity} capacity
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Droppable droppableId={sprint.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`story-list ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                      >
                        {sprintStories.map((story, index) => (
                          <Draggable key={story.id} draggableId={story.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`story-card ${snapshot.isDragging ? 'dragging' : ''}`}
                              >
                                <div className="story-header">
                                  <div className="story-priority" style={{ backgroundColor: getPriorityColor(story.priority) }}></div>
                                  <div className="story-title">{story.name}</div>
                                  {story.storyPoints && (
                                    <div className="story-points">{story.storyPoints}sp</div>
                                  )}
                                </div>
                                
                                {story.description && (
                                  <div className="story-description">{story.description}</div>
                                )}
                                
                                {story.epic && (
                                  <div className="story-epic">Epic: {story.epic.name}</div>
                                )}
                                
                                <div className="story-footer">
                                  <div className="task-count">{story.tasks.length} tasks</div>
                                  <div className="task-progress">
                                    {story.tasks.filter(t => t.status === 'done').length}/{story.tasks.length} done
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder as React.ReactNode}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </div>
      </DragDropContext>

      {/* Create Sprint Modal */}
      {showCreateSprint && (
        <CreateSprintModal
          projectId={projectId}
          onClose={() => setShowCreateSprint(false)}
          onSubmit={(sprintData) => createSprintMutation.mutate(sprintData)}
          isLoading={createSprintMutation.isPending}
        />
      )}
    </div>
  )
}

// Create Sprint Modal Component
interface CreateSprintModalProps {
  projectId: string
  onClose: () => void
  onSubmit: (data: Partial<Sprint>) => void
  isLoading: boolean
}

function CreateSprintModal({ projectId, onClose, onSubmit, isLoading }: CreateSprintModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    capacity: 40
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      projectId,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString()
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Create New Sprint</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Sprint Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="e.g., Sprint 1, Week 42, etc."
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Sprint Capacity (Story Points)</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
              min="1"
              placeholder="Expected story points for this sprint"
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? 'Creating...' : 'Create Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 