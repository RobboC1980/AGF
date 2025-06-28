"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Target, Plus, Calendar, Users, TrendingUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSprints } from '@/hooks/use-sprints'
import { useStories } from '@/hooks/use-stories'
import { api } from '@/services/api'
import SprintKanbanBoard from './sprint-kanban-board'
import CreateSprintModal from './create-sprint-modal'

interface SprintBoardPageProps {
  projectId: string
}

const SprintBoardPage: React.FC<SprintBoardPageProps> = ({ projectId }) => {
  const [selectedSprintId, setSelectedSprintId] = useState<string>('')
  const [showCreateSprintModal, setShowCreateSprintModal] = useState(false)
  const [movingItems, setMovingItems] = useState<Set<string>>(new Set())

  // Fetch sprints for the project
  const {
    sprints,
    isLoading: sprintsLoading,
    createSprint,
    addStoriesToSprint,
    removeStoriesFromSprint,
  } = useSprints(projectId)

  // Fetch stories for the selected sprint
  const [stories, setStories] = useState<any[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)

  // Fetch stories when sprint changes
  useEffect(() => {
    if (!selectedSprintId) {
      setStories([])
      return
    }

    const fetchSprintStories = async () => {
      setStoriesLoading(true)
      try {
        const sprintStories = await api.sprints.getStories(selectedSprintId)
        setStories(sprintStories)
      } catch (error) {
        console.error('Failed to fetch sprint stories:', error)
        toast.error('Failed to load sprint stories')
        setStories([])
      } finally {
        setStoriesLoading(false)
      }
    }

    fetchSprintStories()
  }, [selectedSprintId])

  // Update story function
  const updateStory = async (storyId: string, updates: any) => {
    try {
      await api.stories.update(storyId, updates)
      // Refresh stories
      if (selectedSprintId) {
        const sprintStories = await api.sprints.getStories(selectedSprintId)
        setStories(sprintStories)
      }
    } catch (error) {
      throw error
    }
  }

  // Delete story function
  const deleteStory = async (storyId: string) => {
    try {
      await api.stories.delete(storyId)
      // Remove from local state
      setStories(prev => prev.filter(story => story.id !== storyId))
    } catch (error) {
      throw error
    }
  }

  // Auto-select active sprint or first planning sprint
  useEffect(() => {
    if (sprints.length > 0 && !selectedSprintId) {
      const activeSprint = sprints.find(s => s.status === 'active')
      const planningSprint = sprints.find(s => s.status === 'planning')
      const defaultSprint = activeSprint || planningSprint || sprints[0]
      setSelectedSprintId(defaultSprint.id)
    }
  }, [sprints, selectedSprintId])

  // Stories are already filtered by sprint from the API

  // Create kanban columns
  const kanbanColumns = useMemo(() => {
    const columns = [
      { id: 'todo', title: 'To Do', color: 'bg-slate-100', limit: undefined },
      { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100', limit: 3 },
      { id: 'review', title: 'Review', color: 'bg-yellow-100', limit: 2 },
      { id: 'done', title: 'Done', color: 'bg-green-100', limit: undefined },
    ]

    return columns.map(column => ({
      ...column,
      items: stories
        .filter(story => story.status === column.id)
        .map(story => ({
          id: story.id,
          title: story.name,
          description: story.description,
          type: 'story' as const,
          priority: story.priority as 'low' | 'medium' | 'high' | 'critical',
          assignee: story.assignee ? {
            id: story.assignee.id,
            name: story.assignee.name,
            avatar: story.assignee.avatar_url
          } : undefined,
          tags: story.tags || [],
          storyPoints: story.story_points,
          dueDate: story.due_date,
          createdAt: story.created_at,
          sprintId: story.sprint_id,
          status: story.status,
          epic: story.epic ? {
            id: story.epic.id,
            name: story.epic.name,
            color: story.epic.color
          } : undefined,
        }))
    }))
  }, [stories])

  // Handle sprint creation
  const handleCreateSprint = async (sprintData: {
    name: string
    goal?: string
    description?: string
    start_date: string
    end_date: string
    team_capacity?: number
    planned_story_points?: number
  }) => {
    try {
      const newSprint = await createSprint({
        ...sprintData,
        project_id: projectId,
      })
      setSelectedSprintId(newSprint.id)
      setShowCreateSprintModal(false)
    } catch (error) {
      console.error('Failed to create sprint:', error)
      throw error
    }
  }

  // Handle item movement in kanban board
  const handleItemMove = async (
    itemId: string,
    fromColumn: string,
    toColumn: string,
    newIndex: number
  ) => {
    // Add item to moving set
    setMovingItems(prev => new Set([...prev, itemId]))

    try {
      // Update story status
      await updateStory(itemId, { status: toColumn })
      toast.success('Story moved successfully')
    } catch (error) {
      console.error('Failed to move story:', error)
      toast.error('Failed to move story')
    } finally {
      // Remove item from moving set
      setMovingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  // Handle item editing
  const handleItemEdit = (item: any) => {
    // TODO: Open edit story modal
    toast.info('Story editing not implemented yet')
  }

  // Handle item deletion
  const handleItemDelete = async (item: any) => {
    if (confirm('Are you sure you want to delete this story?')) {
      try {
        await deleteStory(item.id)
        toast.success('Story deleted successfully')
      } catch (error) {
        console.error('Failed to delete story:', error)
        toast.error('Failed to delete story')
      }
    }
  }

  // Handle adding new item
  const handleAddItem = (columnId: string) => {
    // TODO: Open create story modal with pre-set status
    toast.info('Story creation not implemented yet')
  }

  const isLoading = sprintsLoading || storiesLoading

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Target size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Sprint Board</h1>
                <p className="text-slate-600">Manage your sprint stories with kanban workflow</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg text-blue-600">{sprints.length}</div>
                  <div className="text-gray-500">Total Sprints</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">
                    {sprints.filter(s => s.status === 'active').length}
                  </div>
                  <div className="text-gray-500">Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sprint Kanban Board */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SprintKanbanBoard
          projectId={projectId}
          sprints={sprints}
          selectedSprintId={selectedSprintId}
          onSprintChange={setSelectedSprintId}
          onCreateSprint={() => setShowCreateSprintModal(true)}
          columns={kanbanColumns}
          onItemMove={handleItemMove}
          onItemEdit={handleItemEdit}
          onItemDelete={handleItemDelete}
          onAddItem={handleAddItem}
          movingItems={movingItems}
          isLoading={isLoading}
        />
      </div>

      {/* Create Sprint Modal */}
      <CreateSprintModal
        projectId={projectId}
        isOpen={showCreateSprintModal}
        onOpenChange={setShowCreateSprintModal}
        onCreateSprint={handleCreateSprint}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl flex items-center space-x-3">
            <Loader2 size={20} className="animate-spin text-blue-600" />
            <span className="text-slate-700">Loading sprint data...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default SprintBoardPage 