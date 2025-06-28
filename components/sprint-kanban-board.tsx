"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import {
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Users,
  Target,
  BookOpen,
  CheckSquare,
  Rocket,
  Clock,
  TrendingUp,
  Loader2,
  Calendar,
  Play,
  Square,
  Settings,
  ChevronDown,
  Timer,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from 'sonner'
import KanbanBoard from './kanban-board'
import type { Sprint } from '@/services/api'

interface SprintKanbanItem {
  id: string
  title: string
  description?: string
  type: "story" | "task"
  priority: "low" | "medium" | "high" | "critical"
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  tags?: string[]
  progress?: number
  storyPoints?: number
  dueDate?: string
  createdAt: string
  sprintId?: string
  status: string
  epic?: {
    id: string
    name: string
    color: string
  }
}

interface SprintKanbanColumn {
  id: string
  title: string
  items: SprintKanbanItem[]
  color: string
  limit?: number
}

interface SprintKanbanBoardProps {
  projectId: string
  sprints: Sprint[]
  selectedSprintId?: string
  onSprintChange?: (sprintId: string) => void
  onCreateSprint?: () => void
  columns: SprintKanbanColumn[]
  onItemMove?: (itemId: string, fromColumn: string, toColumn: string, newIndex: number) => void
  onItemEdit?: (item: SprintKanbanItem) => void
  onItemDelete?: (item: SprintKanbanItem) => void
  onAddItem?: (columnId: string) => void
  movingItems?: Set<string>
  isLoading?: boolean
}

const statusConfig = {
  planning: { color: 'bg-gray-100 text-gray-800', label: 'Planning', icon: Settings },
  active: { color: 'bg-green-100 text-green-800', label: 'Active', icon: Play },
  completed: { color: 'bg-blue-100 text-blue-800', label: 'Completed', icon: CheckSquare },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: Square }
}

const SprintKanbanBoard: React.FC<SprintKanbanBoardProps> = ({
  projectId,
  sprints,
  selectedSprintId,
  onSprintChange,
  onCreateSprint,
  columns,
  onItemMove,
  onItemEdit,
  onItemDelete,
  onAddItem,
  movingItems = new Set(),
  isLoading = false
}) => {
  const [showSprintDetails, setShowSprintDetails] = useState(false)

  const selectedSprint = useMemo(() => {
    return sprints.find(sprint => sprint.id === selectedSprintId)
  }, [sprints, selectedSprintId])

  const activeSprints = useMemo(() => {
    return sprints.filter(sprint => sprint.status !== 'completed' && sprint.status !== 'cancelled')
  }, [sprints])

  const calculateSprintProgress = (sprint: Sprint) => {
    if (!sprint.planned_story_points || sprint.planned_story_points === 0) return 0
    return Math.round((sprint.completed_story_points / sprint.planned_story_points) * 100)
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    return config || statusConfig.planning
  }

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    return config?.icon || Settings
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Sprint Header */}
        <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Target size={20} className="text-white" />
            </div>
            
            <div className="flex items-center space-x-3">
              <Select value={selectedSprintId || ""} onValueChange={onSprintChange}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a sprint">
                    {selectedSprint ? (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{selectedSprint.name}</span>
                        <Badge className={`${getStatusBadge(selectedSprint.status).color} border-0 text-xs`}>
                          {getStatusBadge(selectedSprint.status).label}
                        </Badge>
                      </div>
                    ) : (
                      "Select a sprint"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeSprints.map((sprint) => {
                    const StatusIcon = getStatusIcon(sprint.status)
                    const statusBadge = getStatusBadge(sprint.status)
                    
                    return (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        <div className="flex items-center space-x-2">
                          <StatusIcon size={14} className="text-slate-600" />
                          <span>{sprint.name}</span>
                          <Badge className={`${statusBadge.color} border-0 text-xs ml-2`}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    )
                  })}
                  {activeSprints.length === 0 && (
                    <SelectItem value="" disabled>
                      No active sprints
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {selectedSprint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSprintDetails(!showSprintDetails)}
                  className="h-10"
                >
                  <ChevronDown size={16} className={`transition-transform ${showSprintDetails ? 'rotate-180' : ''}`} />
                  Details
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {selectedSprint && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg text-blue-600">
                    {selectedSprint.completed_story_points}/{selectedSprint.planned_story_points || 0}
                  </div>
                  <div className="text-gray-500">Story Points</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">
                    {selectedSprint.stories_count || 0}
                  </div>
                  <div className="text-gray-500">Stories</div>
                </div>
              </div>
            )}

            <Button onClick={onCreateSprint} className="bg-green-600 hover:bg-green-700">
              <Plus size={16} className="mr-2" />
              New Sprint
            </Button>
          </div>
        </div>

        {/* Sprint Details Panel */}
        {showSprintDetails && selectedSprint && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Sprint Goal</h4>
                <p className="text-sm text-slate-600">
                  {selectedSprint.goal || "No goal specified"}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Timeline</h4>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Calendar size={14} />
                  <span>
                    {new Date(selectedSprint.start_date).toLocaleDateString()} - {new Date(selectedSprint.end_date).toLocaleDateString()}
                  </span>
                </div>
                
                {selectedSprint.status === 'active' && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>{calculateSprintProgress(selectedSprint)}%</span>
                    </div>
                    <Progress value={calculateSprintProgress(selectedSprint)} className="h-2" />
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Capacity</h4>
                <div className="flex items-center space-x-2 text-sm">
                  <Zap size={14} className="text-amber-600" />
                  <span className="text-slate-600">
                    {selectedSprint.team_capacity || 0} hours capacity
                  </span>
                </div>
                {selectedSprint.velocity && (
                  <div className="flex items-center space-x-2 text-sm mt-1">
                    <TrendingUp size={14} className="text-green-600" />
                    <span className="text-slate-600">
                      {selectedSprint.velocity} velocity
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No Sprint Selected State */}
        {!selectedSprintId && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Target size={48} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Select a Sprint</h3>
              <p className="text-slate-600 mb-4">Choose a sprint to view and manage its stories</p>
              {activeSprints.length === 0 ? (
                <Button onClick={onCreateSprint} className="bg-green-600 hover:bg-green-700">
                  <Plus size={16} className="mr-2" />
                  Create Your First Sprint
                </Button>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <Select onValueChange={onSprintChange}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={onCreateSprint} variant="outline">
                    <Plus size={16} className="mr-2" />
                    New Sprint
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Kanban Board */}
        {selectedSprintId && (
          <div className="flex-1">
            <KanbanBoard
              columns={columns}
              onItemMove={onItemMove}
              onItemEdit={onItemEdit}
              onItemDelete={onItemDelete}
              onAddItem={onAddItem}
              entityType="stories"
              movingItems={movingItems}
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex items-center space-x-3">
              <Loader2 size={20} className="animate-spin text-blue-600" />
              <span className="text-slate-600">Loading sprint data...</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default SprintKanbanBoard 