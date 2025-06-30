"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar, Target, Users, Clock, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'

interface CreateSprintModalProps {
  projectId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSprintCreated: (sprintData: any) => Promise<void>
  trigger?: React.ReactNode
  defaultValues?: {
    name?: string
    goal?: string
    startDate?: string
    endDate?: string
    teamCapacity?: number
    plannedStoryPoints?: number
  }
}

const CreateSprintModal: React.FC<CreateSprintModalProps> = ({
  projectId,
  open: isOpen,
  onOpenChange,
  onSprintCreated,
  trigger,
  defaultValues
}) => {
  const [open, setOpen] = useState(isOpen || false)
  const [isLoading, setIsLoading] = useState(false)

  // Sync external isOpen prop with internal state
  useEffect(() => {
    if (isOpen !== undefined) {
      setOpen(isOpen)
    }
  }, [isOpen])

  // Form state with better defaults
  const [formData, setFormData] = useState({
    name: defaultValues?.name || '',
    goal: defaultValues?.goal || '',
    description: '',
    startDate: defaultValues?.startDate || '',
    endDate: defaultValues?.endDate || '',
    teamCapacity: defaultValues?.teamCapacity || 40,
    plannedStoryPoints: defaultValues?.plannedStoryPoints || 0
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Calculate default dates (2-week sprint starting next Monday)
  React.useEffect(() => {
    if (!formData.startDate && !defaultValues?.startDate) {
      const today = new Date()
      const nextMonday = new Date(today)
      
      // Find next Monday
      const daysUntilMonday = (8 - today.getDay()) % 7 || 7
      nextMonday.setDate(today.getDate() + daysUntilMonday)
      
      const startDate = nextMonday.toISOString().split('T')[0]
      
      // End date is 2 weeks later (Friday)
      const endDate = new Date(nextMonday)
      endDate.setDate(endDate.getDate() + 11) // 2 weeks minus 3 days to end on Friday
      const endDateStr = endDate.toISOString().split('T')[0]
      
      setFormData(prev => ({
        ...prev,
        startDate,
        endDate: endDateStr
      }))
    }
  }, [formData.startDate, defaultValues?.startDate])

  // Generate smart sprint name
  React.useEffect(() => {
    if (!formData.name && formData.startDate) {
      const startDate = new Date(formData.startDate)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const month = monthNames[startDate.getMonth()]
      const day = startDate.getDate()
      
      setFormData(prev => ({
        ...prev,
        name: `Sprint ${month} ${day}`
      }))
    }
  }, [formData.startDate, formData.name])

  // Validation function
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Sprint name is required'
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Sprint name must be at least 3 characters'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date'
      }
      
      const diffTime = end.getTime() - start.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays > 28) {
        newErrors.endDate = 'Sprint duration should not exceed 4 weeks'
      } else if (diffDays < 3) {
        newErrors.endDate = 'Sprint should be at least 3 days long'
      }
    }

    if (formData.teamCapacity < 1 || formData.teamCapacity > 100) {
      newErrors.teamCapacity = 'Team capacity should be between 1 and 100 hours'
    }

    if (formData.plannedStoryPoints < 0 || formData.plannedStoryPoints > 200) {
      newErrors.plannedStoryPoints = 'Story points should be between 0 and 200'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      await onSprintCreated({
        name: formData.name.trim(),
        goal: formData.goal.trim() || undefined,
        description: formData.description.trim() || undefined,
        start_date: formData.startDate,
        end_date: formData.endDate,
        team_capacity: formData.teamCapacity,
        planned_story_points: formData.plannedStoryPoints || undefined,
      })

      // Reset form
      setFormData({
        name: '',
        goal: '',
        description: '',
        startDate: '',
        endDate: '',
        teamCapacity: 40,
        plannedStoryPoints: 0
      })
      setErrors({})
      setOpen(false)
    } catch (error) {
      console.error('Failed to create sprint:', error)
      toast.error('Failed to create sprint. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
    
    // Reset form when closing
    if (!newOpen) {
      setErrors({})
    }
  }

  const calculateSprintDuration = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }
    return 0
  }

  const sprintDuration = calculateSprintDuration()

  // Get sprint duration badge color
  const getDurationBadgeVariant = () => {
    if (sprintDuration <= 7) return 'default'
    if (sprintDuration <= 14) return 'secondary'
    if (sprintDuration <= 21) return 'outline'
    return 'destructive'
  }

  const getDurationText = () => {
    if (sprintDuration === 0) return ''
    const weeks = Math.floor(sprintDuration / 7)
    const days = sprintDuration % 7
    
    if (weeks === 0) {
      return `${days} day${days !== 1 ? 's' : ''}`
    } else if (days === 0) {
      return `${weeks} week${weeks !== 1 ? 's' : ''}`
    } else {
      return `${weeks}w ${days}d`
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Target size={16} className="text-white" />
            </div>
            <span>Create New Sprint</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sprint Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Sprint Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Sprint Mar 15, Feature Sprint, Bug Fix Sprint"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Sprint Goal */}
          <div className="space-y-2">
            <Label htmlFor="goal" className="text-sm font-medium">
              Sprint Goal
            </Label>
            <Input
              id="goal"
              value={formData.goal}
              onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
              placeholder="What is the main objective of this sprint?"
            />
            <p className="text-xs text-gray-500">
              💡 A clear goal helps the team stay focused and make decisions during the sprint
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about this sprint..."
              rows={3}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm font-medium flex items-center space-x-1">
                <Calendar size={14} />
                <span>Start Date *</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className={errors.startDate ? 'border-red-500' : ''}
              />
              {errors.startDate && <p className="text-sm text-red-500">{errors.startDate}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm font-medium flex items-center space-x-1">
                <Calendar size={14} />
                <span>End Date *</span>
              </Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className={errors.endDate ? 'border-red-500' : ''}
              />
              {errors.endDate && <p className="text-sm text-red-500">{errors.endDate}</p>}
            </div>
          </div>

          {/* Duration Display */}
          {sprintDuration > 0 && (
            <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
              <Clock size={16} className="text-slate-600" />
              <span className="text-sm text-slate-600">Duration:</span>
              <Badge variant={getDurationBadgeVariant()}>
                {getDurationText()}
              </Badge>
              {sprintDuration > 21 && (
                <span className="text-xs text-amber-600">⚠️ Consider shorter sprints for better agility</span>
              )}
            </div>
          )}

          {/* Capacity and Story Points */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teamCapacity" className="text-sm font-medium flex items-center space-x-1">
                <Users size={14} />
                <span>Team Capacity (hours)</span>
              </Label>
              <Input
                id="teamCapacity"
                type="number"
                min="1"
                max="100"
                value={formData.teamCapacity}
                onChange={(e) => setFormData(prev => ({ ...prev, teamCapacity: parseInt(e.target.value) || 0 }))}
                className={errors.teamCapacity ? 'border-red-500' : ''}
              />
              {errors.teamCapacity && <p className="text-sm text-red-500">{errors.teamCapacity}</p>}
              <p className="text-xs text-gray-500">Total available hours for the team</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plannedStoryPoints" className="text-sm font-medium flex items-center space-x-1">
                <Target size={14} />
                <span>Planned Story Points</span>
              </Label>
              <Input
                id="plannedStoryPoints"
                type="number"
                min="0"
                max="200"
                value={formData.plannedStoryPoints}
                onChange={(e) => setFormData(prev => ({ ...prev, plannedStoryPoints: parseInt(e.target.value) || 0 }))}
                className={errors.plannedStoryPoints ? 'border-red-500' : ''}
              />
              {errors.plannedStoryPoints && <p className="text-sm text-red-500">{errors.plannedStoryPoints}</p>}
              <p className="text-xs text-gray-500">Leave 0 to set after adding stories</p>
            </div>
          </div>

          {/* Sprint Planning Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Lightbulb size={16} className="text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-900">Sprint Planning Tips</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Keep sprints 1-4 weeks long (2 weeks is most common)</li>
                  <li>• Start sprints on Monday and end on Friday when possible</li>
                  <li>• Set a clear, achievable goal that provides value</li>
                  <li>• You can adjust story points after creating the sprint</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Target size={16} className="mr-2" />
                Create Sprint
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateSprintModal 