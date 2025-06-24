"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Plus,
  Target,
  Clock,
  TrendingUp,
  Users,
  BarChart3,
  Activity,
  ArrowRight,
  Edit2,
  Trash2,
  CheckSquare,
  BookOpen,
  Zap,
  Play,
  Pause,
  Square,
  MoreHorizontal,
  Settings,
  Timer,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  DragDropContext,
  Droppable,
  Draggable
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'

interface Sprint {
  id: string
  name: string
  goal?: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  startDate: string
  endDate: string
  capacity: number
  commitment: number
  actualPoints: number
  stories: SprintStory[]
  teamId?: string
  projectId: string
  createdAt: string
  velocity?: number
}

interface SprintStory {
  id: string
  title: string
  storyPoints: number
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  epic?: {
    id: string
    name: string
    color: string
  }
  tasks: SprintTask[]
  estimatedHours?: number
  actualHours?: number
}

interface SprintTask {
  id: string
  title: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  estimatedHours: number
  actualHours?: number
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
}

interface BacklogItem {
  id: string
  title: string
  storyPoints: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  epic?: {
    id: string
    name: string
    color: string
  }
  estimatedHours?: number
}

interface SprintPlanningPageProps {
  projectId?: string
  teamId?: string
  sprints?: Sprint[]
  backlogItems?: BacklogItem[]
  onCreateSprint?: (sprintData: Partial<Sprint>) => Promise<void>
  onUpdateSprint?: (sprintId: string, sprintData: Partial<Sprint>) => Promise<void>
  onDeleteSprint?: (sprintId: string) => Promise<void>
  onAddStoryToSprint?: (sprintId: string, storyId: string) => Promise<void>
  onRemoveStoryFromSprint?: (sprintId: string, storyId: string) => Promise<void>
  onStartSprint?: (sprintId: string) => Promise<void>
  onCompleteSprint?: (sprintId: string) => Promise<void>
  isLoading?: boolean
}

const priorityConfig = {
  low: { color: 'bg-gray-100 text-gray-800', label: 'Low' },
  medium: { color: 'bg-blue-100 text-blue-800', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
  critical: { color: 'bg-red-100 text-red-800', label: 'Critical' }
}

const statusConfig = {
  planning: { color: 'bg-gray-100 text-gray-800', label: 'Planning', icon: Settings },
  active: { color: 'bg-green-100 text-green-800', label: 'Active', icon: Play },
  completed: { color: 'bg-blue-100 text-blue-800', label: 'Completed', icon: CheckSquare },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: Square }
}

const SprintPlanningPage: React.FC<SprintPlanningPageProps> = ({
  projectId,
  teamId,
  sprints = [],
  backlogItems = [],
  onCreateSprint,
  onUpdateSprint,
  onDeleteSprint,
  onAddStoryToSprint,
  onRemoveStoryFromSprint,
  onStartSprint,
  onCompleteSprint,
  isLoading = false
}) => {
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(sprints[0] || null)
  const [showCreateSprintDialog, setShowCreateSprintDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('planning')
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set([sprints[0]?.id]))
  const [draggedItem, setDraggedItem] = useState<BacklogItem | null>(null)

  // Sprint creation form state
  const [newSprint, setNewSprint] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
    capacity: 40
  })

  // Auto-expand active sprint
  useEffect(() => {
    const activeSprint = sprints.find(s => s.status === 'active')
    if (activeSprint) {
      setSelectedSprint(activeSprint)
      setExpandedSprints(prev => new Set([...prev, activeSprint.id]))
    }
  }, [sprints])

  const handleCreateSprint = async () => {
    if (!newSprint.name.trim()) {
      toast.error('Sprint name is required')
      return
    }

    try {
      await onCreateSprint?.({
        ...newSprint,
        projectId: projectId || '',
        teamId,
        status: 'planning',
        commitment: 0,
        actualPoints: 0,
        stories: []
      })

      setNewSprint({ name: '', goal: '', startDate: '', endDate: '', capacity: 40 })
      setShowCreateSprintDialog(false)
      toast.success('Sprint created successfully')
    } catch (error) {
      toast.error('Failed to create sprint')
    }
  }

  const handleStartSprint = async (sprint: Sprint) => {
    try {
      await onStartSprint?.(sprint.id)
      toast.success(`Sprint "${sprint.name}" started`)
    } catch (error) {
      toast.error('Failed to start sprint')
    }
  }

  const handleCompleteSprint = async (sprint: Sprint) => {
    try {
      await onCompleteSprint?.(sprint.id)
      toast.success(`Sprint "${sprint.name}" completed`)
    } catch (error) {
      toast.error('Failed to complete sprint')
    }
  }

  const handleDragStart = (item: BacklogItem) => {
    setDraggedItem(item)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const handleDropOnSprint = async (sprintId: string) => {
    if (!draggedItem) return

    try {
      await onAddStoryToSprint?.(sprintId, draggedItem.id)
      toast.success(`Story added to sprint`)
    } catch (error) {
      toast.error('Failed to add story to sprint')
    }
  }

  const calculateSprintProgress = (sprint: Sprint) => {
    if (sprint.stories.length === 0) return 0
    const completedPoints = sprint.stories
      .filter(s => s.status === 'done')
      .reduce((sum, s) => sum + s.storyPoints, 0)
    return Math.round((completedPoints / sprint.commitment) * 100)
  }

  const calculateVelocity = (sprints: Sprint[]) => {
    const completedSprints = sprints.filter(s => s.status === 'completed')
    if (completedSprints.length === 0) return 0
    
    const totalPoints = completedSprints.reduce((sum, s) => sum + s.actualPoints, 0)
    return Math.round(totalPoints / completedSprints.length)
  }

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    return config?.icon || Settings
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    return config || statusConfig.planning
  }

  const getPriorityBadge = (priority: string) => {
    const config = priorityConfig[priority as keyof typeof priorityConfig]
    return config || priorityConfig.medium
  }

  const availableBacklogItems = backlogItems.filter(item => 
    !sprints.some(sprint => 
      sprint.stories.some(story => story.id === item.id)
    )
  )

  const averageVelocity = calculateVelocity(sprints)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Target size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Sprint Planning</h1>
                  <p className="text-slate-600">Plan and manage your agile sprints</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-lg text-green-600">{averageVelocity}</div>
                    <div className="text-gray-500">Avg Velocity</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-blue-600">{sprints.filter(s => s.status === 'active').length}</div>
                    <div className="text-gray-500">Active Sprints</div>
                  </div>
                </div>
                
                <Dialog open={showCreateSprintDialog} onOpenChange={setShowCreateSprintDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Plus size={16} className="mr-2" />
                      Create Sprint
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Sprint</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="sprint-name">Sprint Name</Label>
                        <Input
                          id="sprint-name"
                          placeholder="Sprint 1"
                          value={newSprint.name}
                          onChange={(e) => setNewSprint(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="sprint-goal">Sprint Goal</Label>
                        <Textarea
                          id="sprint-goal"
                          placeholder="What do you want to achieve in this sprint?"
                          value={newSprint.goal}
                          onChange={(e) => setNewSprint(prev => ({ ...prev, goal: e.target.value }))}
                          rows={3}
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="start-date">Start Date</Label>
                          <Input
                            id="start-date"
                            type="date"
                            value={newSprint.startDate}
                            onChange={(e) => setNewSprint(prev => ({ ...prev, startDate: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="end-date">End Date</Label>
                          <Input
                            id="end-date"
                            type="date"
                            value={newSprint.endDate}
                            onChange={(e) => setNewSprint(prev => ({ ...prev, endDate: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="capacity">Team Capacity (Story Points)</Label>
                        <Input
                          id="capacity"
                          type="number"
                          min="1"
                          max="200"
                          value={newSprint.capacity}
                          onChange={(e) => setNewSprint(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                          className="mt-1"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <Button variant="outline" onClick={() => setShowCreateSprintDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateSprint} disabled={!newSprint.name.trim()}>
                          Create Sprint
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="planning">Planning</TabsTrigger>
              <TabsTrigger value="sprints">All Sprints</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="planning" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Backlog */}
                <div className="lg:col-span-1">
                  <Card className="shadow-sm border-slate-200/60">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center">
                        <BookOpen size={18} className="mr-2 text-blue-600" />
                        Product Backlog ({availableBacklogItems.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                      {availableBacklogItems.map((item) => {
                        const priorityBadge = getPriorityBadge(item.priority)
                        
                        return (
                          <motion.div
                            key={item.id}
                            draggable
                            onDragStart={() => handleDragStart(item)}
                            onDragEnd={handleDragEnd}
                            className="p-3 border rounded-lg cursor-move hover:border-blue-300 hover:bg-blue-50 transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileDrag={{ scale: 1.05, rotate: 2 }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{item.title}</h4>
                                {item.epic && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <div 
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: item.epic.color }}
                                    />
                                    <span className="text-xs text-gray-500">{item.epic.name}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-2 ml-2">
                                <Badge className={`${priorityBadge.color} border-0 text-xs`}>
                                  {priorityBadge.label}
                                </Badge>
                                <div className="text-sm font-medium text-blue-600">
                                  {item.storyPoints}sp
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}

                      {availableBacklogItems.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <BookOpen size={32} className="mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No items in backlog</p>
                          <p className="text-xs">Create stories to start planning</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Sprint Planning Area */}
                <div className="lg:col-span-2">
                  <div className="space-y-4">
                    {sprints.filter(s => s.status !== 'completed').map((sprint) => {
                      const StatusIcon = getStatusIcon(sprint.status)
                      const statusBadge = getStatusBadge(sprint.status)
                      const progress = calculateSprintProgress(sprint)
                      const isExpanded = expandedSprints.has(sprint.id)
                      
                      return (
                        <Card 
                          key={sprint.id}
                          className={`shadow-sm border-slate-200/60 ${
                            draggedItem ? 'border-dashed border-blue-300' : ''
                          }`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDropOnSprint(sprint.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Collapsible 
                                  open={isExpanded}
                                  onOpenChange={(open) => {
                                    const newExpanded = new Set(expandedSprints)
                                    if (open) {
                                      newExpanded.add(sprint.id)
                                    } else {
                                      newExpanded.delete(sprint.id)
                                    }
                                    setExpandedSprints(newExpanded)
                                  }}
                                >
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </Button>
                                  </CollapsibleTrigger>
                                </Collapsible>
                                
                                <StatusIcon size={16} className="text-gray-600" />
                                <div>
                                  <h3 className="font-semibold">{sprint.name}</h3>
                                  {sprint.goal && (
                                    <p className="text-sm text-gray-600 mt-1">{sprint.goal}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-3">
                                <Badge className={`${statusBadge.color} border-0`}>
                                  {statusBadge.label}
                                </Badge>
                                
                                <div className="text-sm text-gray-600">
                                  {sprint.commitment}/{sprint.capacity} SP
                                </div>
                                
                                {sprint.status === 'planning' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStartSprint(sprint)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Play size={14} className="mr-1" />
                                    Start
                                  </Button>
                                )}
                                
                                {sprint.status === 'active' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCompleteSprint(sprint)}
                                  >
                                    <CheckSquare size={14} className="mr-1" />
                                    Complete
                                  </Button>
                                )}

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal size={16} />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Edit2 size={16} className="mr-2" />
                                      Edit Sprint
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <BarChart3 size={16} className="mr-2" />
                                      View Burndown
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600">
                                      <Trash2 size={16} className="mr-2" />
                                      Delete Sprint
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {sprint.status === 'active' && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-sm mb-2">
                                  <span>Progress</span>
                                  <span>{progress}% completed</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>
                            )}
                          </CardHeader>

                          <Collapsible open={isExpanded}>
                            <CollapsibleContent>
                              <CardContent className="pt-0">
                                {sprint.stories.length > 0 ? (
                                  <div className="space-y-2">
                                    {sprint.stories.map((story) => {
                                      const priorityBadge = getPriorityBadge(story.priority)
                                      
                                      return (
                                        <div key={story.id} className="p-3 bg-gray-50 rounded-lg">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                              <CheckSquare 
                                                size={16} 
                                                className={story.status === 'done' ? 'text-green-600' : 'text-gray-400'} 
                                              />
                                              <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm truncate">{story.title}</h4>
                                                <div className="flex items-center space-x-2 mt-1">
                                                  {story.epic && (
                                                    <div className="flex items-center space-x-1">
                                                      <div 
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: story.epic.color }}
                                                      />
                                                      <span className="text-xs text-gray-500">{story.epic.name}</span>
                                                    </div>
                                                  )}
                                                  {story.assignee && (
                                                    <div className="flex items-center space-x-1">
                                                      <Avatar className="w-4 h-4">
                                                        <AvatarImage src={story.assignee.avatar} />
                                                        <AvatarFallback className="text-xs">
                                                          {story.assignee.name.split(' ').map(n => n[0]).join('')}
                                                        </AvatarFallback>
                                                      </Avatar>
                                                      <span className="text-xs text-gray-500">{story.assignee.name}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            <div className="flex items-center space-x-2">
                                              <Badge className={`${priorityBadge.color} border-0 text-xs`}>
                                                {priorityBadge.label}
                                              </Badge>
                                              <div className="text-sm font-medium text-blue-600">
                                                {story.storyPoints}sp
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                                    <Target size={32} className="mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">No stories in this sprint</p>
                                    <p className="text-xs">Drag stories from the backlog</p>
                                  </div>
                                )}
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      )
                    })}

                    {sprints.filter(s => s.status !== 'completed').length === 0 && (
                      <Card className="shadow-sm border-slate-200/60">
                        <CardContent className="p-12 text-center">
                          <Target size={48} className="mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sprints</h3>
                          <p className="text-gray-600 mb-4">Create your first sprint to start planning</p>
                          <Button 
                            onClick={() => setShowCreateSprintDialog(true)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Plus size={16} className="mr-2" />
                            Create Sprint
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sprints" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sprints.map((sprint) => {
                  const statusBadge = getStatusBadge(sprint.status)
                  const progress = calculateSprintProgress(sprint)
                  
                  return (
                    <motion.div
                      key={sprint.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="cursor-pointer"
                      onClick={() => setSelectedSprint(sprint)}
                    >
                      <Card className={`shadow-sm border-slate-200/60 hover:shadow-md transition-shadow ${
                        selectedSprint?.id === sprint.id ? 'ring-2 ring-blue-500' : ''
                      }`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold truncate">{sprint.name}</h3>
                            <Badge className={`${statusBadge.color} border-0`}>
                              {statusBadge.label}
                            </Badge>
                          </div>
                          {sprint.goal && (
                            <p className="text-sm text-gray-600 line-clamp-2">{sprint.goal}</p>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Duration</span>
                              <span>{new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Stories</span>
                              <span>{sprint.stories.length}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Commitment</span>
                              <span>{sprint.commitment}/{sprint.capacity} SP</span>
                            </div>
                            
                            {sprint.status === 'active' && (
                              <div>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-gray-600">Progress</span>
                                  <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}

                {sprints.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Target size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Sprints Yet</h3>
                    <p className="text-gray-600 mb-4">Create your first sprint to get started</p>
                    <Button 
                      onClick={() => setShowCreateSprintDialog(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus size={16} className="mr-2" />
                      Create Sprint
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6 text-center">
                    <TrendingUp size={24} className="mx-auto mb-2 text-green-600" />
                    <div className="text-2xl font-bold">{averageVelocity}</div>
                    <div className="text-sm text-gray-600">Average Velocity</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Activity size={24} className="mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold">{sprints.filter(s => s.status === 'completed').length}</div>
                    <div className="text-sm text-gray-600">Completed Sprints</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <CheckSquare size={24} className="mx-auto mb-2 text-purple-600" />
                    <div className="text-2xl font-bold">
                      {sprints.reduce((sum, s) => sum + s.stories.filter(st => st.status === 'done').length, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Stories Delivered</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Zap size={24} className="mx-auto mb-2 text-orange-600" />
                    <div className="text-2xl font-bold">
                      {sprints.reduce((sum, s) => sum + s.actualPoints, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Story Points</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Sprint Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Velocity and burndown charts coming soon</p>
                    <p className="text-xs">Track sprint performance and team velocity over time</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default SprintPlanningPage 