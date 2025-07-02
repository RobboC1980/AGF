"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@clerk/nextjs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  CheckSquare,
  X,
  CalendarDays,
  Clock,
  Sparkles,
  Brain,
  Wand2,
  Loader2,
  RefreshCw,
  AlertCircle,
  Edit3,
  Target,
  Settings,
  Code,
  Zap,
} from "lucide-react"
import { format } from "date-fns"
import { createAuthenticatedApi } from "@/services/api"

interface Task {
  id?: string
  title: string
  description: string
  priority: "low" | "medium" | "high" | "critical"
  status?: "todo" | "in-progress" | "review" | "done"
  storyId: string
  estimatedHours: number
  assigneeId?: string
  dueDate?: string
  tags: string[]
  subtasks: string[]
  technicalNotes?: string
  acceptanceCriteria: string[]
}

interface Story {
  id: string
  title: string
  epic: string
  description?: string
  storyPoints?: number
  acceptanceCriteria?: string
}

interface User {
  id: string
  name: string
  avatar?: string
}

interface GeneratedTaskResponse {
  success: boolean
  task: {
    title: string
    description: string
    estimated_hours: number
    priority: string
    category: string
    technical_notes: string
    acceptance_criteria: string[]
    subtasks: string[]
    tags: string[]
    skills_required: string[]
  }
  provider: string
  model: string
  confidence?: number
  suggestions?: string[]
}

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (task: Task) => Promise<void>
  stories?: Story[]
  users?: User[]
  editingTask?: Task | null
  defaultStoryId?: string
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  stories = [],
  users = [],
  editingTask = null,
  defaultStoryId = "",
}) => {
  const { getToken } = useAuth()
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual")
  const [task, setTask] = useState<Task>({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    storyId: defaultStoryId,
    estimatedHours: 4,
    tags: [],
    subtasks: [],
    acceptanceCriteria: [],
  })
  
  // Create authenticated API client
  const api = createAuthenticatedApi(getToken)
  
  // AI Generation states
  const [aiDescription, setAiDescription] = useState("")
  const [technicalContext, setTechnicalContext] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedTask, setGeneratedTask] = useState<GeneratedTaskResponse | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  
  // Form states
  const [isSaving, setIsSaving] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [newSubtask, setNewSubtask] = useState("")
  const [newCriteria, setNewCriteria] = useState("")
  const [dueDate, setDueDate] = useState<Date>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  
  // Refs
  const modalRef = useRef<HTMLDivElement>(null)

  // Initialize form when editing or with default story
  useEffect(() => {
    if (editingTask) {
      setTask({
        ...editingTask,
        title: editingTask.title || "",
        description: editingTask.description || "",
        dueDate: editingTask.dueDate || "",
        tags: editingTask.tags || [],
        subtasks: editingTask.subtasks || [],
        acceptanceCriteria: editingTask.acceptanceCriteria || [],
      })
      setActiveTab("manual")
    } else {
      // Reset form for new task
      setTask({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        storyId: defaultStoryId,
        estimatedHours: 4,
        tags: [],
        subtasks: [],
        acceptanceCriteria: [],
      })
      setGeneratedTask(null)
      setAiDescription("")
      setTechnicalContext("")
      setAiError(null)
    }
    setDueDate(undefined)
  }, [editingTask, isOpen, defaultStoryId])

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  const handleGenerateTask = async () => {
    if (!aiDescription.trim()) {
      setAiError("Please enter a description for the task")
      return
    }

    if (!task.storyId) {
      setAiError("Please select a user story first")
      return
    }

    setIsGenerating(true)
    setAiError(null)

    try {
      // Get story details for context
      const selectedStory = stories.find(s => s.id === task.storyId)
      
      const response = await api.ai.generateSingleTask({
        taskDescription: aiDescription,
        storyTitle: selectedStory?.title || "",
        storyDescription: selectedStory?.description || "",
        storyPoints: selectedStory?.storyPoints || 5,
        acceptanceCriteria: selectedStory?.acceptanceCriteria || "",
        technicalContext,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
      })

      if (response.success && response.task) {
        setGeneratedTask(response)
        
        // Auto-populate the manual form with AI-generated data
        setTask(prev => ({
          ...prev,
          title: response.task.title,
          description: response.task.description,
          estimatedHours: response.task.estimated_hours,
          priority: response.task.priority as any,
          technicalNotes: response.task.technical_notes,
          acceptanceCriteria: response.task.acceptance_criteria || [],
          subtasks: response.task.subtasks || [],
          tags: response.task.tags || [],
        }))
      } else {
        throw new Error("AI generation failed")
      }
    } catch (error) {
      console.error("Task generation failed:", error)
      setAiError(
        error instanceof Error ? error.message : "Failed to generate task. Please try again."
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerateTask = () => {
    setGeneratedTask(null)
    handleGenerateTask()
  }

  const handleAddTag = () => {
    if (newTag.trim() && !task.tags?.includes(newTag.trim())) {
      setTask(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }))
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTask(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }))
  }

  const handleAddSubtask = () => {
    if (newSubtask.trim() && !task.subtasks?.includes(newSubtask.trim())) {
      setTask(prev => ({
        ...prev,
        subtasks: [...(prev.subtasks || []), newSubtask.trim()]
      }))
      setNewSubtask("")
    }
  }

  const handleRemoveSubtask = (subtaskToRemove: string) => {
    setTask(prev => ({
      ...prev,
      subtasks: prev.subtasks?.filter(subtask => subtask !== subtaskToRemove) || []
    }))
  }

  const handleAddCriteria = () => {
    if (newCriteria.trim() && !task.acceptanceCriteria?.includes(newCriteria.trim())) {
      setTask(prev => ({
        ...prev,
        acceptanceCriteria: [...(prev.acceptanceCriteria || []), newCriteria.trim()]
      }))
      setNewCriteria("")
    }
  }

  const handleRemoveCriteria = (criteriaToRemove: string) => {
    setTask(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria?.filter(criteria => criteria !== criteriaToRemove) || []
    }))
  }

  const handleSave = async () => {
    if (!task.title?.trim()) {
      setAiError("Task title is required")
      return
    }

    if (!task.storyId) {
      setAiError("Please select a user story")
      return
    }

    setIsSaving(true)
    try {
      await onSave({ ...task, dueDate: dueDate?.toISOString() })
      onClose()
    } catch (error) {
      console.error("Failed to save task:", error)
      setAiError("Failed to save task. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const selectedStory = stories.find(s => s.id === task.storyId)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center">
                <CheckSquare size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingTask ? "Edit Task" : "Create Task"}
                </h2>
                <p className="text-sm text-slate-600">AI-powered task creation and management</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "manual" | "ai")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="manual" className="flex items-center space-x-2">
                  <Edit3 size={16} />
                  <span>Manual Entry</span>
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center space-x-2">
                  <Sparkles size={16} />
                  <span>AI Generation</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ai" className="space-y-6">
                {/* AI Generation Tab */}
                <Card className="border-2 border-slate-200 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-orange-100">
                    <CardTitle className="flex items-center space-x-2">
                      <Brain size={20} className="text-orange-600" />
                      <span>AI Task Generator</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    {/* Story Selection */}
                    <div>
                      <Label htmlFor="story-select">User Story *</Label>
                      <Select
                        value={task.storyId}
                        onValueChange={(value) => setTask(prev => ({ ...prev, storyId: value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select user story" />
                        </SelectTrigger>
                        <SelectContent>
                          {stories.map((story) => (
                            <SelectItem key={story.id} value={story.id}>
                              <div className="flex flex-col items-start">
                                <span className="break-words">{story.title}</span>
                                <span className="text-xs text-slate-500">{story.epic}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="ai-description">Describe the task</Label>
                      <Textarea
                        id="ai-description"
                        placeholder="E.g., 'Create a React component for the user profile form with validation and API integration'"
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                        className="min-h-[100px] mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="technical-context">Technical Context (Optional)</Label>
                      <Textarea
                        id="technical-context"
                        placeholder="E.g., 'Using React Hook Form, Zod validation, TypeScript, Tailwind CSS'"
                        value={technicalContext}
                        onChange={(e) => setTechnicalContext(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    
                    <div className="flex space-x-4">
                      <Button
                        onClick={handleGenerateTask}
                        disabled={isGenerating || !aiDescription.trim() || !task.storyId}
                        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                      >
                        {isGenerating ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Wand2 size={16} className="mr-2" />
                        )}
                        {isGenerating ? "Generating..." : "Generate with AI"}
                      </Button>
                      
                      {generatedTask && (
                        <Button
                          variant="outline"
                          onClick={handleRegenerateTask}
                          disabled={isGenerating}
                        >
                          <RefreshCw size={16} className="mr-2" />
                          Regenerate
                        </Button>
                      )}
                    </div>

                    {aiError && (
                      <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                        <AlertCircle size={16} />
                        <span className="text-sm">{aiError}</span>
                      </div>
                    )}

                    {generatedTask && (
                      <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Sparkles size={16} className="text-orange-600" />
                            <span className="text-sm font-medium text-orange-800">
                              Generated by {generatedTask.provider}
                            </span>
                          </div>
                          {generatedTask.confidence && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border border-orange-300">
                              {Math.round(generatedTask.confidence * 100)}% confidence
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-orange-700 space-y-2">
                          <p className="font-medium">Generated task has been applied to the form below.</p>
                          <p>Switch to Manual Entry tab to review and edit.</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="manual" className="space-y-6">
                {/* Manual Entry Tab */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-100">
                      <CardTitle className="flex items-center space-x-2">
                        <CheckSquare size={20} className="text-blue-600" />
                        <span>Basic Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div>
                        <Label htmlFor="task-title">Task Title *</Label>
                        <Input
                          id="task-title"
                          placeholder="Enter task title..."
                          value={task.title || ""}
                          onChange={(e) => setTask(prev => ({ ...prev, title: e.target.value }))}
                          className="mt-2"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="task-description">Description *</Label>
                        <Textarea
                          id="task-description"
                          placeholder="Describe what needs to be done..."
                          value={task.description || ""}
                          onChange={(e) => setTask(prev => ({ ...prev, description: e.target.value }))}
                          className="min-h-[100px] mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="user-story">User Story *</Label>
                        <Select
                          value={task.storyId}
                          onValueChange={(value) => setTask(prev => ({ ...prev, storyId: value }))}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select user story" />
                          </SelectTrigger>
                          <SelectContent>
                            {stories.map((story) => (
                              <SelectItem key={story.id} value={story.id}>
                                <div className="flex flex-col items-start">
                                  <span className="break-words">{story.title}</span>
                                  <span className="text-xs text-slate-500">{story.epic}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Task Details */}
                  <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-100">
                      <CardTitle className="flex items-center space-x-2">
                        <Settings size={20} className="text-green-600" />
                        <span>Task Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          <Select
                            value={task.priority}
                            onValueChange={(value: any) => setTask(prev => ({ ...prev, priority: value }))}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                  <span>Low</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="medium">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                  <span>Medium</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="high">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                  <span>High</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="critical">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                  <span>Critical</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="estimated-hours">Estimated Hours</Label>
                          <Input
                            id="estimated-hours"
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="40"
                            placeholder="4"
                            value={task.estimatedHours || ""}
                            onChange={(e) => setTask(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="assignee">Assignee</Label>
                        <Select
                          value={task.assigneeId || "unassigned"}
                          onValueChange={(value) => setTask(prev => ({ ...prev, assigneeId: value === "unassigned" ? undefined : value }))}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">
                              <span className="text-slate-500">Unassigned</span>
                            </SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center space-x-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback className="text-xs">
                                      {user.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{user.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Due Date</Label>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal mt-2"
                            >
                              <CalendarDays size={16} className="mr-2" />
                              {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={dueDate}
                              onSelect={(date) => {
                                setDueDate(date)
                                setCalendarOpen(false)
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Advanced Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tags */}
                  <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-100">
                      <CardTitle className="flex items-center space-x-2">
                        <Target size={20} className="text-purple-600" />
                        <span>Tags & Categories</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div>
                        <Label>Tags</Label>
                        <div className="flex space-x-2 mt-2">
                          <Input
                            placeholder="Add tag..."
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                          />
                          <Button onClick={handleAddTag} variant="outline" size="sm">
                            Add
                          </Button>
                        </div>
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {task.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="flex items-center space-x-1"
                              >
                                <span>{tag}</span>
                                <X
                                  size={12}
                                  className="cursor-pointer hover:text-red-500"
                                  onClick={() => handleRemoveTag(tag)}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Technical Notes */}
                  <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b-2 border-indigo-100">
                      <CardTitle className="flex items-center space-x-2">
                        <Code size={20} className="text-indigo-600" />
                        <span>Technical Notes</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <Textarea
                        placeholder="Add technical implementation notes, considerations, or requirements..."
                        value={task.technicalNotes || ""}
                        onChange={(e) => setTask(prev => ({ ...prev, technicalNotes: e.target.value }))}
                        className="min-h-[100px]"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Subtasks and Acceptance Criteria */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Subtasks */}
                  <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b-2 border-teal-100">
                      <CardTitle className="flex items-center space-x-2">
                        <CheckSquare size={20} className="text-teal-600" />
                        <span>Subtasks</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Add subtask..."
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddSubtask()}
                        />
                        <Button onClick={handleAddSubtask} variant="outline" size="sm">
                          Add
                        </Button>
                      </div>
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="space-y-2">
                          {task.subtasks.map((subtask, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                            >
                              <span className="text-sm break-words flex-1">{subtask}</span>
                              <X
                                size={14}
                                className="cursor-pointer hover:text-red-500 ml-2 flex-shrink-0"
                                onClick={() => handleRemoveSubtask(subtask)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Acceptance Criteria */}
                  <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 border-b-2 border-rose-100">
                      <CardTitle className="flex items-center space-x-2">
                        <Zap size={20} className="text-rose-600" />
                        <span>Acceptance Criteria</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Add acceptance criteria..."
                          value={newCriteria}
                          onChange={(e) => setNewCriteria(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddCriteria()}
                        />
                        <Button onClick={handleAddCriteria} variant="outline" size="sm">
                          Add
                        </Button>
                      </div>
                      {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
                        <div className="space-y-2">
                          {task.acceptanceCriteria.map((criteria, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                            >
                              <span className="text-sm break-words flex-1">{criteria}</span>
                              <X
                                size={14}
                                className="cursor-pointer hover:text-red-500 ml-2 flex-shrink-0"
                                onClick={() => handleRemoveCriteria(criteria)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center space-x-4">
              {selectedStory && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Story:</span> {selectedStory.title}
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !task.title?.trim() || !task.storyId}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                {isSaving ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <CheckSquare size={16} className="mr-2" />
                )}
                {isSaving ? "Saving..." : (editingTask ? "Update Task" : "Create Task")}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 