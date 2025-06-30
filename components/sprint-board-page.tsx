"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Target, Plus, Calendar, Users, TrendingUp, Loader2, Brain, AlertCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useSprints } from '@/hooks/use-sprints'
import { useStories } from '@/hooks/use-stories'
import { api } from '@/services/api'
import SprintKanbanBoard from './sprint-kanban-board'
import CreateSprintModal from './create-sprint-modal'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import AIFeatureLibrary from './ai-features/ai-feature-library'

interface SprintBoardPageProps {
  projectId: string
}

const SprintBoardPage: React.FC<SprintBoardPageProps> = ({ projectId }) => {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState('board')
  const [showCreateSprint, setShowCreateSprint] = useState(false)
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [selectedSprintId, setSelectedSprintId] = useState<string>('')
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
      setShowCreateSprint(false)
      toast.success(`Sprint "${newSprint.name}" created successfully!`)
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

  // Get sprint stats
  const selectedSprint = sprints.find(s => s.id === selectedSprintId)
  const sprintStats = useMemo(() => {
    if (!selectedSprint) return null
    
    const totalStories = stories.length
    const completedStories = stories.filter(s => s.status === 'done').length
    const inProgressStories = stories.filter(s => s.status === 'in_progress').length
    const totalPoints = stories.reduce((sum, story) => sum + (story.story_points || 0), 0)
    const completedPoints = stories.filter(s => s.status === 'done').reduce((sum, story) => sum + (story.story_points || 0), 0)
    
    return {
      totalStories,
      completedStories,
      inProgressStories,
      totalPoints,
      completedPoints,
      progressPercentage: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0
    }
  }, [selectedSprint, stories])

  const isLoading = sprintsLoading || storiesLoading

  // Show empty state if no sprints exist
  if (!sprintsLoading && sprints.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Target size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to Start Your First Sprint?</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Sprints help you organize work into manageable time-boxed iterations. Create your first sprint to get started with agile project management.
          </p>
          <div className="space-y-4">
            <Button 
              onClick={() => setShowCreateSprint(true)}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Sprint
            </Button>
            <div className="text-sm text-slate-500">
              <p>💡 <strong>Tip:</strong> A typical sprint lasts 1-4 weeks and focuses on delivering specific features.</p>
            </div>
          </div>
        </div>

        <CreateSprintModal
          open={showCreateSprint}
          onOpenChange={setShowCreateSprint}
          projectId={projectId}
          onSprintCreated={handleCreateSprint}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sprint Board</h1>
          <p className="text-gray-600">Manage your sprints and track progress</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setShowCreateStory(true)}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Story
          </Button>
          <Button 
            onClick={() => setShowCreateSprint(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Sprint
          </Button>
        </div>
      </div>

      {/* Sprint Stats Card */}
      {selectedSprint && sprintStats && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Sprint {selectedSprint.sprint_number}: {selectedSprint.name}
                </h3>
                <p className="text-sm text-slate-600">{selectedSprint.goal}</p>
              </div>
              <Badge variant={selectedSprint.status === 'active' ? 'default' : 'secondary'}>
                {selectedSprint.status}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{sprintStats.totalStories}</div>
                <div className="text-sm text-slate-600">Total Stories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{sprintStats.completedStories}</div>
                <div className="text-sm text-slate-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{sprintStats.inProgressStories}</div>
                <div className="text-sm text-slate-600">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{sprintStats.progressPercentage}%</div>
                <div className="text-sm text-slate-600">Progress</div>
              </div>
            </div>
            
            {selectedSprint.start_date && selectedSprint.end_date && (
              <div className="mt-4 flex items-center text-sm text-slate-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>
                  {new Date(selectedSprint.start_date).toLocaleDateString()} - {new Date(selectedSprint.end_date).toLocaleDateString()}
                </span>
                <Clock className="h-4 w-4 ml-4 mr-2" />
                <span>
                  {Math.ceil((new Date(selectedSprint.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="board" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Kanban Board</span>
          </TabsTrigger>
          <TabsTrigger value="sprints" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>All Sprints</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Team View</span>
          </TabsTrigger>
          <TabsTrigger value="ai-features" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI Features</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-4">
          {/* Sprint selector */}
          <div className="flex items-center space-x-4">
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="px-3 py-2 border rounded-md bg-white"
            >
              <option value="">Select a sprint</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  Sprint {sprint.sprint_number}: {sprint.name}
                </option>
              ))}
            </select>
            {selectedSprintId && (
              <Badge variant="outline">
                {sprints.find(s => s.id === selectedSprintId)?.status}
              </Badge>
            )}
          </div>

          {selectedSprintId ? (
            <SprintKanbanBoard 
              sprintId={selectedSprintId}
              projectId={projectId}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <span>Select a Sprint</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Choose a sprint from the dropdown above to view the kanban board.</p>
                <Button onClick={() => setShowCreateSprint(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Sprint
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sprints" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">All Sprints</h3>
            <Button onClick={() => setShowCreateSprint(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Sprint
            </Button>
          </div>
          
          <div className="grid gap-4">
            {sprints.map((sprint) => (
              <Card key={sprint.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <span>Sprint {sprint.sprint_number}: {sprint.name}</span>
                      <Badge variant={sprint.status === 'active' ? 'default' : 'secondary'}>
                        {sprint.status}
                      </Badge>
                    </CardTitle>
                    <div className="text-sm text-gray-500">
                      {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                    </div>
                  </div>
                  {sprint.goal && (
                    <p className="text-sm text-gray-600">{sprint.goal}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Stories</div>
                      <div className="font-semibold">{sprint.stories_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Story Points</div>
                      <div className="font-semibold">{sprint.planned_story_points || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Completed</div>
                      <div className="font-semibold">{sprint.completed_story_points || 0}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Team performance metrics and insights coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-features" className="space-y-4">
          <AIFeatureLibrary 
            projectId={projectId}
            sprintId={selectedSprintId}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateSprintModal
        open={showCreateSprint}
        onOpenChange={setShowCreateSprint}
        projectId={projectId}
        onSprintCreated={handleCreateSprint}
      />

      {/* TODO: Add CreateStoryModal when available */}
    </div>
  )
}

export default SprintBoardPage 