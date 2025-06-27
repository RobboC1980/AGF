"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Circle,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  Timer,
  Avatar as AvatarIcon,
  Sparkles,
  Wand2,
  Brain,
  User,
  Loader2,
  AlertCircle,
  RefreshCw,
  Settings,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useTasks, useCreateTask, useUpdateTask } from "@/hooks/useApi"
import { CreateTaskModal } from "@/components/create-task-modal"
import { api } from "@/services/api"

interface EnhancedTaskBreakdownProps {
  storyId: string
  storyTitle: string
  storyDescription?: string
  storyPoints?: number
  acceptanceCriteria?: string
  users: any[]
  onTaskCreated?: (task: any) => void
  onTaskUpdated?: (task: any) => void
  onTaskDeleted?: (taskId: string) => void
}

interface AIGeneratedTask {
  title: string
  description: string
  category: string
  estimated_hours: number
  priority: string
  skills_required: string[]
  acceptance_criteria: string[]
  dependencies: string[]
  technical_notes: string
  testing_requirements: string
}

export const EnhancedTaskBreakdown: React.FC<EnhancedTaskBreakdownProps> = ({
  storyId,
  storyTitle,
  storyDescription = "",
  storyPoints = 5,
  acceptanceCriteria = "",
  users,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedTasks, setGeneratedTasks] = useState<AIGeneratedTask[]>([])
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [technicalContext, setTechnicalContext] = useState("")
  const [teamSkills, setTeamSkills] = useState("")
  const [editingTask, setEditingTask] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // API hooks
  const { data: allTasks = [], refetch: refetchTasks } = useTasks()
  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()

  // Filter tasks for this story
  const storyTasks = allTasks.filter((task: any) => task.story_id === storyId)

  const taskStats = {
    total: storyTasks.length,
    completed: storyTasks.filter((task: any) => task.status === 'done').length,
    inProgress: storyTasks.filter((task: any) => task.status === 'in-progress').length,
    estimatedHours: storyTasks.reduce((sum: number, task: any) => sum + (task.estimated_hours || 0), 0),
    actualHours: storyTasks.reduce((sum: number, task: any) => sum + (task.actual_hours || 0), 0),
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'todo':
        return <Circle size={14} className="text-slate-500" />
      case 'in-progress':
        return <PlayCircle size={14} className="text-amber-500" />
      case 'review':
        return <PauseCircle size={14} className="text-purple-500" />
      case 'done':
        return <CheckCircle2 size={14} className="text-emerald-500" />
      default:
        return <Circle size={14} className="text-slate-500" />
    }
  }

  const generateAITasks = async () => {
    setIsGenerating(true)
    try {
      const response = await api.ai.generateTasks({
        storyTitle,
        storyDescription,
        storyPoints,
        acceptanceCriteria,
        technicalContext,
        teamSkills,
        includeSubtasks: true,
      })

      if (response.success && response.tasks?.tasks) {
        setGeneratedTasks(response.tasks.tasks)
        setSelectedTasks(response.tasks.tasks.map((_, index) => index.toString()))
      } else {
        console.error("AI task generation failed:", response)
      }
    } catch (error) {
      console.error("Error generating AI tasks:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const createTasksFromAI = async () => {
    if (selectedTasks.length === 0) return

    try {
      const tasksToCreate = selectedTasks.map(index => generatedTasks[parseInt(index)])
      
      for (const aiTask of tasksToCreate) {
        const taskData = {
          title: aiTask.title,
          description: aiTask.description,
          story_id: storyId,
          priority: aiTask.priority as any,
          estimated_hours: aiTask.estimated_hours,
          status: 'todo' as any,
          technical_notes: aiTask.technical_notes,
        }
        
        await createTaskMutation.mutateAsync(taskData)
      }

      // Refresh tasks and close modal
      await refetchTasks()
      setShowBreakdownModal(false)
      setGeneratedTasks([])
      setSelectedTasks([])
      
      if (onTaskCreated) {
        onTaskCreated({ count: tasksToCreate.length })
      }
    } catch (error) {
      console.error("Error creating AI tasks:", error)
    }
  }

  const handleTaskEdit = (task: any) => {
    setEditingTask(task)
    setShowEditModal(true)
  }

  const handleTaskUpdate = async (taskData: any) => {
    if (!editingTask) return

    try {
      await updateTaskMutation.mutateAsync({
        id: editingTask.id,
        data: taskData,
      })
      
      await refetchTasks()
      setShowEditModal(false)
      setEditingTask(null)
      
      if (onTaskUpdated) {
        onTaskUpdated({ ...editingTask, ...taskData })
      }
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const handleTaskDelete = async (task: any) => {
    try {
      await api.tasks.delete(task.id)
      await refetchTasks()
      
      if (onTaskDeleted) {
        onTaskDeleted(task.id)
      }
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const handleManualTaskCreate = async (taskData: any) => {
    try {
      const fullTaskData = {
        ...taskData,
        story_id: storyId,
      }
      
      await createTaskMutation.mutateAsync(fullTaskData)
      await refetchTasks()
      
      if (onTaskCreated) {
        onTaskCreated(fullTaskData)
      }
    } catch (error) {
      console.error("Error creating manual task:", error)
    }
  }

  if (storyTasks.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-500">
            <CheckSquare size={16} />
            <span className="text-sm">No engineering tasks yet</span>
          </div>
          
          <Dialog open={showBreakdownModal} onOpenChange={setShowBreakdownModal}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Plus size={12} className="mr-1" />
                Break Down
              </Button>
            </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <CheckSquare size={20} className="text-blue-600" />
                    <span>Break Down Story into Tasks</span>
                  </DialogTitle>
                  <DialogDescription className="break-words">
                    Create tasks for "{storyTitle}" using AI assistance or manual creation
                  </DialogDescription>
                </DialogHeader>

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "ai" | "manual")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ai" className="flex items-center space-x-2">
                    <Sparkles size={16} />
                    <span>AI Assistant</span>
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex items-center space-x-2">
                    <User size={16} />
                    <span>Manual Creation</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="mt-6">
                  <div className="space-y-6">
                    {/* AI Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="technical-context">Technical Context</Label>
                        <Textarea
                          id="technical-context"
                          placeholder="e.g., React, Node.js, PostgreSQL, existing API patterns..."
                          value={technicalContext}
                          onChange={(e) => setTechnicalContext(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="team-skills">Team Skills</Label>
                        <Textarea
                          id="team-skills"
                          placeholder="e.g., Frontend: React/TypeScript, Backend: Python/FastAPI..."
                          value={teamSkills}
                          onChange={(e) => setTeamSkills(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Generate Button */}
                    <div className="flex justify-center">
                      <Button
                        onClick={generateAITasks}
                        disabled={isGenerating}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Generating Tasks...
                          </>
                        ) : (
                          <>
                            <Wand2 size={16} className="mr-2" />
                            Generate AI Tasks
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Generated Tasks */}
                    {generatedTasks.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-900">Generated Tasks</h4>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTasks(generatedTasks.map((_, i) => i.toString()))}
                            >
                              Select All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTasks([])}
                            >
                              Clear All
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid gap-3">
                          {generatedTasks.map((task, index) => (
                            <Card key={index} className="border border-slate-200">
                              <CardContent className="p-4">
                                <div className="flex items-start space-x-3">
                                  <Checkbox
                                    checked={selectedTasks.includes(index.toString())}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedTasks([...selectedTasks, index.toString()])
                                      } else {
                                        setSelectedTasks(selectedTasks.filter(id => id !== index.toString()))
                                      }
                                    }}
                                    className="mt-1"
                                  />
                                  
                                                                      <div className="flex-1 min-w-0">
                                      <div className="flex flex-col gap-2 mb-2">
                                        <h5 className="font-medium text-slate-900 break-words">{task.title}</h5>
                                        <div className="flex items-center space-x-2 flex-wrap">
                                          <Badge variant="outline" className="text-xs">
                                            {task.category}
                                          </Badge>
                                          <Badge 
                                            variant="outline" 
                                            className={`text-xs ${
                                              task.priority === 'high' ? 'border-orange-200 text-orange-700' :
                                              task.priority === 'medium' ? 'border-amber-200 text-amber-700' :
                                              'border-emerald-200 text-emerald-700'
                                            }`}
                                          >
                                            {task.priority}
                                          </Badge>
                                        </div>
                                      </div>
                                      <p className="text-sm text-slate-600 mb-2 break-words">{task.description}</p>
                                    <div className="flex items-center space-x-4 text-xs text-slate-500 flex-wrap">
                                      <div className="flex items-center space-x-1">
                                        <Clock size={12} />
                                        <span>{task.estimated_hours}h</span>
                                      </div>
                                      {task.skills_required.length > 0 && (
                                        <div className="flex items-start space-x-1 flex-wrap">
                                          <span className="break-words">Skills: {task.skills_required.join(", ")}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        <div className="flex justify-end space-x-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setGeneratedTasks([])
                              setSelectedTasks([])
                            }}
                          >
                            Regenerate
                          </Button>
                          <Button
                            onClick={createTasksFromAI}
                            disabled={selectedTasks.length === 0}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Create {selectedTasks.length} Task{selectedTasks.length !== 1 ? 's' : ''}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="mt-6">
                  <Card 
                    className="p-6 border-2 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer transition-colors"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <div className="text-center">
                      <Plus size={24} className="mx-auto text-slate-400 mb-2" />
                      <h4 className="font-medium text-slate-900 mb-1">Create Task Manually</h4>
                      <p className="text-sm text-slate-600">
                        Create a task with full control over all details
                      </p>
                    </div>
                  </Card>
                  
                  <CreateTaskModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSave={handleManualTaskCreate}
                    stories={[{ id: storyId, title: storyTitle, epic: 'Current Epic' }]}
                    users={users}
                    defaultStoryId={storyId}
                  />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent">
              <div className="flex items-center space-x-2">
                {isOpen ? (
                  <ChevronDown size={16} className="text-slate-400" />
                ) : (
                  <ChevronRight size={16} className="text-slate-400" />
                )}
                <CheckSquare size={16} className="text-slate-600" />
                <span className="text-sm font-medium text-slate-700">
                  Engineering Tasks ({taskStats.completed}/{taskStats.total})
                </span>
                <Badge variant="secondary" className="text-xs">
                  {taskStats.estimatedHours}h
                </Badge>
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <div className="flex items-center space-x-2">
            {taskStats.total > 0 && (
              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(taskStats.completed / taskStats.total) * 100}%` }}
                />
              </div>
            )}
            
            <Dialog open={showBreakdownModal} onOpenChange={setShowBreakdownModal}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Plus size={12} className="mr-1" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <CheckSquare size={20} className="text-blue-600" />
                    <span>Add Tasks to Story</span>
                  </DialogTitle>
                  <DialogDescription className="break-words">
                    Add more tasks to "{storyTitle}" using AI assistance or manual creation
                  </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "ai" | "manual")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ai" className="flex items-center space-x-2">
                      <Sparkles size={16} />
                      <span>AI Assistant</span>
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="flex items-center space-x-2">
                      <User size={16} />
                      <span>Manual Creation</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="ai" className="mt-6">
                    <div className="space-y-6">
                      {/* AI Configuration */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="technical-context">Technical Context</Label>
                          <Textarea
                            id="technical-context"
                            placeholder="e.g., React, Node.js, PostgreSQL, existing API patterns..."
                            value={technicalContext}
                            onChange={(e) => setTechnicalContext(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="team-skills">Team Skills</Label>
                          <Textarea
                            id="team-skills"
                            placeholder="e.g., Frontend: React/TypeScript, Backend: Python/FastAPI..."
                            value={teamSkills}
                            onChange={(e) => setTeamSkills(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Generate Button */}
                      <div className="flex justify-center">
                        <Button
                          onClick={generateAITasks}
                          disabled={isGenerating}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 size={16} className="mr-2 animate-spin" />
                              Generating Tasks...
                            </>
                          ) : (
                            <>
                              <Wand2 size={16} className="mr-2" />
                              Generate AI Tasks
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Generated Tasks */}
                      {generatedTasks.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-900">Generated Tasks</h4>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedTasks(generatedTasks.map((_, i) => i.toString()))}
                              >
                                Select All
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedTasks([])}
                              >
                                Clear All
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid gap-3">
                            {generatedTasks.map((task, index) => (
                              <Card key={index} className="border border-slate-200">
                                <CardContent className="p-4">
                                  <div className="flex items-start space-x-3">
                                    <Checkbox
                                      checked={selectedTasks.includes(index.toString())}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedTasks([...selectedTasks, index.toString()])
                                        } else {
                                          setSelectedTasks(selectedTasks.filter(id => id !== index.toString()))
                                        }
                                      }}
                                      className="mt-1"
                                    />
                                    
                                    <div className="flex-1 min-w-0">
                                    <div className="flex flex-col gap-2 mb-2">
                                      <h5 className="font-medium text-slate-900 break-words">{task.title}</h5>
                                      <div className="flex items-center space-x-2 flex-wrap">
                                        <Badge variant="outline" className="text-xs">
                                          {task.category}
                                        </Badge>
                                        <Badge 
                                          variant="outline" 
                                          className={`text-xs ${
                                            task.priority === 'high' ? 'border-orange-200 text-orange-700' :
                                            task.priority === 'medium' ? 'border-amber-200 text-amber-700' :
                                            'border-emerald-200 text-emerald-700'
                                          }`}
                                        >
                                          {task.priority}
                                        </Badge>
                                      </div>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-2 break-words">{task.description}</p>
                                      <div className="flex items-center space-x-4 text-xs text-slate-500 flex-wrap">
                                        <div className="flex items-center space-x-1">
                                          <Clock size={12} />
                                          <span>{task.estimated_hours}h</span>
                                        </div>
                                        {task.skills_required.length > 0 && (
                                          <div className="flex items-start space-x-1 flex-wrap">
                                            <span className="break-words">Skills: {task.skills_required.join(", ")}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          <div className="flex justify-end space-x-3">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setGeneratedTasks([])
                                setSelectedTasks([])
                              }}
                            >
                              Regenerate
                            </Button>
                            <Button
                              onClick={createTasksFromAI}
                              disabled={selectedTasks.length === 0}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Create {selectedTasks.length} Task{selectedTasks.length !== 1 ? 's' : ''}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="manual" className="mt-6">
                    <Card 
                      className="p-6 border-2 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer transition-colors"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <div className="text-center">
                        <Plus size={24} className="mx-auto text-slate-400 mb-2" />
                        <h4 className="font-medium text-slate-900 mb-1">Create Task Manually</h4>
                        <p className="text-sm text-slate-600">
                          Create a task with full control over all details
                        </p>
                      </div>
                    </Card>
                    
                    <CreateTaskModal
                      isOpen={showCreateModal}
                      onClose={() => setShowCreateModal(false)}
                      onSave={handleManualTaskCreate}
                      stories={[{ id: storyId, title: storyTitle, epic: 'Current Epic' }]}
                      users={users}
                      defaultStoryId={storyId}
                    />
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <CollapsibleContent className="mt-3">
          <div className="space-y-2">
            {storyTasks.map((task: any) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  {getTaskStatusIcon(task.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700 break-words">
                        {task.title}
                      </span>
                      <div className="flex items-center flex-wrap gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            task.priority === 'critical' ? 'border-red-200 text-red-700' :
                            task.priority === 'high' ? 'border-orange-200 text-orange-700' :
                            task.priority === 'medium' ? 'border-amber-200 text-amber-700' :
                            'border-emerald-200 text-emerald-700'
                          }`}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-500 break-words mt-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {task.assignee_id && (
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={users.find(u => u.id === task.assignee_id)?.avatar} />
                      <AvatarFallback className="text-xs">
                        {users.find(u => u.id === task.assignee_id)?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex items-center space-x-1 text-xs text-slate-500">
                    <Timer size={12} />
                    <span>{task.estimated_hours}h</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal size={12} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleTaskEdit(task)}>
                        <Edit2 size={14} className="mr-2" />
                        Edit Task
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy size={14} className="mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleTaskDelete(task)}
                      >
                        <Trash2 size={14} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit Task Modal */}
      <CreateTaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleTaskUpdate}
        stories={[{ id: storyId, title: storyTitle, epic: 'Current Epic' }]}
        users={users}
        editingTask={editingTask}
        defaultStoryId={storyId}
      />
    </div>
  )
} 