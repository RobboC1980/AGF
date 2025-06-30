"use client"

import React, { useState, useEffect } from 'react'
import { Calendar, Plus, Target, Clock, Users, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface CreateSprintModalProps {
  projectId: string
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onCreateSprint: (sprintData: {
    name: string
    goal?: string
    description?: string
    start_date: string
    end_date: string
    team_capacity?: number
    planned_story_points?: number
  }) => Promise<void>
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
  isOpen,
  onOpenChange,
  onCreateSprint,
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

  // Form state
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

  // Calculate default dates (2-week sprint starting tomorrow)
  React.useEffect(() => {
    if (!formData.startDate && !defaultValues?.startDate) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const startDate = tomorrow.toISOString().split('T')[0]
      
      const endDate = new Date(tomorrow)
      endDate.setDate(endDate.getDate() + 13) // 2-week sprint
      const endDateStr = endDate.toISOString().split('T')[0]
      
      setFormData(prev => ({
        ...prev,
        startDate,
        endDate: endDateStr
      }))
    }
  }, [formData.startDate, defaultValues?.startDate])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Sprint name is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date'
      }

      // Check if start date is in the past
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (startDate < today) {
        newErrors.startDate = 'Start date cannot be in the past'
      }
    }

    if (formData.teamCapacity < 1) {
      newErrors.teamCapacity = 'Team capacity must be at least 1 hour'
    }

    if (formData.plannedStoryPoints < 0) {
      newErrors.plannedStoryPoints = 'Planned story points cannot be negative'
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
      await onCreateSprint({
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
      toast.success('Sprint created successfully!')
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Target size={16} className="text-white" />
            </div>
            <span>Create New Sprint</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Sprint Name */}
          <div>
            <Label htmlFor="sprint-name">
              Sprint Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="sprint-name"
              placeholder="e.g., Sprint 1, Q1 Goals Sprint"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Sprint Goal */}
          <div>
            <Label htmlFor="sprint-goal">Sprint Goal</Label>
            <Textarea
              id="sprint-goal"
              placeholder="What do you want to achieve in this sprint?"
              value={formData.goal}
              onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
              rows={2}
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">
              A clear, concise statement of what the team plans to accomplish
            </p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="sprint-description">Description (Optional)</Label>
            <Textarea
              id="sprint-description"
              placeholder="Additional details about this sprint..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start-date">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className={`mt-1 ${errors.startDate ? 'border-red-500' : ''}`}
              />
              {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
            </div>
            
            <div>
              <Label htmlFor="end-date">
                End Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className={`mt-1 ${errors.endDate ? 'border-red-500' : ''}`}
              />
              {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
            </div>
          </div>

          {/* Sprint Duration Info */}
          {sprintDuration > 0 && (
            <div className="flex items-center space-x-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
              <Clock size={14} />
              <span>
                Sprint duration: <strong>{sprintDuration} days</strong>
                {sprintDuration < 7 && " (shorter than typical)"}
                {sprintDuration > 21 && " (longer than typical)"}
              </span>
            </div>
          )}

          {/* Capacity & Planning */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="team-capacity">Team Capacity (Hours)</Label>
              <Input
                id="team-capacity"
                type="number"
                min="1"
                max="1000"
                value={formData.teamCapacity}
                onChange={(e) => setFormData(prev => ({ ...prev, teamCapacity: Number(e.target.value) }))}
                className={`mt-1 ${errors.teamCapacity ? 'border-red-500' : ''}`}
              />
              {errors.teamCapacity && <p className="text-red-500 text-sm mt-1">{errors.teamCapacity}</p>}
              <p className="text-xs text-slate-500 mt-1">Total available hours for the sprint</p>
            </div>
            
            <div>
              <Label htmlFor="planned-points">Planned Story Points</Label>
              <Input
                id="planned-points"
                type="number"
                min="0"
                max="500"
                value={formData.plannedStoryPoints}
                onChange={(e) => setFormData(prev => ({ ...prev, plannedStoryPoints: Number(e.target.value) }))}
                className={`mt-1 ${errors.plannedStoryPoints ? 'border-red-500' : ''}`}
              />
              {errors.plannedStoryPoints && <p className="text-red-500 text-sm mt-1">{errors.plannedStoryPoints}</p>}
              <p className="text-xs text-slate-500 mt-1">Target story points to complete</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-3 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center mb-1">
                  <Calendar size={14} className="text-blue-600 mr-1" />
                  <span className="text-xs text-slate-600">Duration</span>
                </div>
                <div className="font-semibold text-blue-600">
                  {sprintDuration > 0 ? `${sprintDuration}d` : '-'}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-1">
                  <Zap size={14} className="text-amber-600 mr-1" />
                  <span className="text-xs text-slate-600">Capacity</span>
                </div>
                <div className="font-semibold text-amber-600">{formData.teamCapacity}h</div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-1">
                  <Target size={14} className="text-green-600 mr-1" />
                  <span className="text-xs text-slate-600">Points</span>
                </div>
                <div className="font-semibold text-green-600">{formData.plannedStoryPoints}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !formData.name.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
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