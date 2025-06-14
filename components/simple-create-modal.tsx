"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarDays, Plus, Rocket, BookOpen, CheckSquare, X, Target } from "lucide-react"
import { format } from "date-fns"

// Validation schemas
const epicSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  projectId: z.string().min(1, "Project is required"),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).default([]),
  acceptanceCriteria: z.string().optional(),
})

const storySchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  epicId: z.string().min(1, "Epic is required"),
  storyPoints: z.number().min(1).max(21),
  acceptanceCriteria: z.string().min(1, "Acceptance criteria is required"),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).default([]),
  asA: z.string().min(1, "User role is required"),
  iWant: z.string().min(1, "Goal is required"),
  soThat: z.string().min(1, "Benefit is required"),
})

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  storyId: z.string().min(1, "User story is required"),
  estimatedHours: z.number().min(0.5).max(40),
  assigneeId: z.string().optional(),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).default([]),
  subtasks: z.array(z.string()).default([]),
})

const projectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  key: z.string().min(2, "Project key must be at least 2 characters").max(10, "Key must be less than 10 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["backlog", "ready", "in-progress", "review", "testing", "done"]),
  tags: z.array(z.string()).default([]),
})

type EntityType = "epic" | "story" | "task" | "project"

interface SimpleCreateModalProps {
  type: EntityType
  trigger?: React.ReactNode
  onSubmit: (data: any) => Promise<void>
  projects?: Array<{ id: string; name: string }>
  epics?: Array<{ id: string; title: string; project: string }>
  stories?: Array<{ id: string; title: string; epic: string }>
  users?: Array<{ id: string; name: string; avatar?: string }>
  open?: boolean
  onOpenChange?: (open: boolean) => void
  editingData?: any
}

export const SimpleCreateModal: React.FC<SimpleCreateModalProps> = ({
  type,
  trigger,
  onSubmit,
  projects = [],
  epics = [],
  stories = [],
  users = [],
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  editingData,
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [newSubtask, setNewSubtask] = useState("")
  const [dueDate, setDueDate] = useState<Date>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date>()
  const [startCalendarOpen, setStartCalendarOpen] = useState(false)
  const [targetEndDate, setTargetEndDate] = useState<Date>()
  const [endCalendarOpen, setEndCalendarOpen] = useState(false)

  // Get the appropriate schema
  const getSchema = () => {
    switch (type) {
      case "epic":
        return epicSchema
      case "story":
        return storySchema
      case "task":
        return taskSchema
      case "project":
        return projectSchema
      default:
        return epicSchema
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      priority: "medium",
      tags: [],
      storyPoints: type === "story" ? 3 : undefined,
      estimatedHours: type === "task" ? 4 : undefined,
      subtasks: type === "task" ? [] : undefined,
      status: type === "project" ? "backlog" : undefined,
      progress: type === "project" ? 0 : undefined,
    },
  })

  const watchedTags = watch("tags") || []
  const watchedSubtasks = watch("subtasks") || []

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      const formData = {
        ...data,
        dueDate,
        ...(type === "project" && {
          start_date: startDate?.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
          target_end_date: targetEndDate?.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
          progress: 0, // Default progress for new projects
        })
      }
      await onSubmit(formData)
      setOpen(false)
      reset()
      setDueDate(undefined)
      setStartDate(undefined)
      setTargetEndDate(undefined)
    } catch (error) {
      console.error("Error creating item:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim())) {
      setValue("tags", [...watchedTags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setValue("tags", watchedTags.filter((tag: string) => tag !== tagToRemove))
  }

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setValue("subtasks", [...watchedSubtasks, newSubtask.trim()])
      setNewSubtask("")
    }
  }

  const removeSubtask = (index: number) => {
    setValue("subtasks", watchedSubtasks.filter((_: string, i: number) => i !== index))
  }

  const getEntityConfig = () => {
    switch (type) {
      case "epic":
        return {
          title: "Create Epic",
          icon: Rocket,
          color: "from-purple-600 to-blue-600",
          description: "Create a new epic to organize related user stories",
        }
      case "story":
        return {
          title: "Create User Story",
          icon: BookOpen,
          color: "from-emerald-600 to-teal-600",
          description: "Create a new user story with requirements and acceptance criteria",
        }
      case "task":
        return {
          title: "Create Task",
          icon: CheckSquare,
          color: "from-orange-600 to-red-600",
          description: "Create a new task for implementation work",
        }
      case "project":
        return {
          title: "Create Project",
          icon: Target,
          color: "from-blue-600 to-cyan-600",
          description: "Create a new project to organize epics and stories",
        }
    }
  }

  const config = getEntityConfig()
  const IconComponent = config.icon

  // Use real data only (no mock fallbacks)
  const mockProjects = projects
  const mockEpics = epics
  const mockStories = stories
  const mockUsers = users

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className={`bg-gradient-to-r ${config.color} text-white shadow-lg hover:shadow-xl transition-all duration-200`}>
            <IconComponent size={16} className="mr-2" />
            Create {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-4">
          <DialogTitle className="flex items-center space-x-2">
            <div className={`w-10 h-10 bg-gradient-to-r ${config.color} rounded-lg flex items-center justify-center`}>
              <IconComponent size={20} className="text-white" />
            </div>
            <span>{config.title}</span>
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-y-auto px-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pb-4">
                {/* Title/Name */}
                <div className="space-y-2">
                  <Label htmlFor={type === "project" ? "name" : "title"}>
                    {type === "project" ? "Name" : "Title"} *
                  </Label>
                  <Input
                    id={type === "project" ? "name" : "title"}
                    placeholder={`Enter ${type} ${type === "project" ? "name" : "title"}...`}
                    {...register(type === "project" ? "name" : "title")}
                    className={errors[type === "project" ? "name" : "title"] ? "border-red-500" : ""}
                  />
                  {errors[type === "project" ? "name" : "title"] && (
                    <p className="text-sm text-red-500">
                      {errors[type === "project" ? "name" : "title"]?.message as string}
                    </p>
                  )}
                </div>

                {/* Project Key (only for projects) */}
                {type === "project" && (
                  <div className="space-y-2">
                    <Label htmlFor="key">Project Key *</Label>
                    <Input
                      id="key"
                      placeholder="e.g., ECOM, WEB, PROJ"
                      {...register("key", {
                        onChange: (e) => {
                          e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                        }
                      })}
                      className={errors.key ? "border-red-500" : ""}
                      maxLength={10}
                      style={{ textTransform: 'uppercase' }}
                    />
                    {errors.key && (
                      <p className="text-sm text-red-500">{errors.key.message as string}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      A short, unique identifier for this project (2-10 characters, letters and numbers only)
                    </p>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder={`Describe the ${type} in detail...`}
                    rows={4}
                    {...register("description")}
                    className={errors.description ? "border-red-500" : ""}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message as string}</p>
                  )}
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select onValueChange={(value) => setValue("priority", value)} defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
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

                {/* Project Status (only for projects) */}
                {type === "project" && (
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select onValueChange={(value) => setValue("status", value)} defaultValue="backlog">
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="testing">Testing</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Parent Relation */}
                {type === "epic" && (
                  <div className="space-y-2">
                    <Label htmlFor="projectId">Project *</Label>
                    <Select onValueChange={(value) => setValue("projectId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.projectId && (
                      <p className="text-sm text-red-500">{errors.projectId.message as string}</p>
                    )}
                  </div>
                )}

                {type === "story" && (
                  <div className="space-y-2">
                    <Label htmlFor="epicId">Epic *</Label>
                    <Select onValueChange={(value) => setValue("epicId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select epic" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockEpics.map((epic) => (
                          <SelectItem key={epic.id} value={epic.id}>
                            <div className="flex flex-col items-start">
                              <span>{epic.title}</span>
                              <span className="text-xs text-slate-500">{epic.project}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.epicId && (
                      <p className="text-sm text-red-500">{errors.epicId.message as string}</p>
                    )}
                  </div>
                )}

                {type === "task" && (
                  <div className="space-y-2">
                    <Label htmlFor="storyId">User Story *</Label>
                    <Select onValueChange={(value) => setValue("storyId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user story" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockStories.map((story) => (
                          <SelectItem key={story.id} value={story.id}>
                            <div className="flex flex-col items-start">
                              <span>{story.title}</span>
                              <span className="text-xs text-slate-500">{story.epic}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.storyId && (
                      <p className="text-sm text-red-500">{errors.storyId.message as string}</p>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4 pb-4">
                {/* User Story Format */}
                {type === "story" && (
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <Label className="text-base font-semibold">User Story Format</Label>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="asA">As a... *</Label>
                          <Input
                            id="asA"
                            placeholder="user, admin, customer..."
                            {...register("asA")}
                            className={errors.asA ? "border-red-500" : ""}
                          />
                          {errors.asA && (
                            <p className="text-sm text-red-500">{errors.asA.message as string}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="iWant">I want... *</Label>
                          <Input
                            id="iWant"
                            placeholder="to be able to..."
                            {...register("iWant")}
                            className={errors.iWant ? "border-red-500" : ""}
                          />
                          {errors.iWant && (
                            <p className="text-sm text-red-500">{errors.iWant.message as string}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="soThat">So that... *</Label>
                          <Input
                            id="soThat"
                            placeholder="I can..."
                            {...register("soThat")}
                            className={errors.soThat ? "border-red-500" : ""}
                          />
                          {errors.soThat && (
                            <p className="text-sm text-red-500">{errors.soThat.message as string}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Story Points */}
                {type === "story" && (
                  <div className="space-y-2">
                    <Label htmlFor="storyPoints">Story Points</Label>
                    <Select onValueChange={(value) => setValue("storyPoints", parseInt(value))} defaultValue="3">
                      <SelectTrigger>
                        <SelectValue placeholder="Select story points" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 8, 13, 21].map((points) => (
                          <SelectItem key={points} value={points.toString()}>
                            {points} points
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Estimated Hours */}
                {type === "task" && (
                  <div className="space-y-2">
                    <Label htmlFor="estimatedHours">Estimated Hours</Label>
                    <Input
                      id="estimatedHours"
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="40"
                      placeholder="4"
                      {...register("estimatedHours", { valueAsNumber: true })}
                      className={errors.estimatedHours ? "border-red-500" : ""}
                    />
                    {errors.estimatedHours && (
                      <p className="text-sm text-red-500">{errors.estimatedHours.message as string}</p>
                    )}
                  </div>
                )}

                {/* Assignee */}
                {type === "task" && (
                  <div className="space-y-2">
                    <Label htmlFor="assigneeId">Assignee</Label>
                    <Select onValueChange={(value) => setValue("assigneeId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center space-x-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback className="text-xs">
                                  {user.name.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span>{user.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Due Date (for non-projects) */}
                {type !== "project" && (
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarDays size={16} className="mr-2" />
                          {dueDate ? format(dueDate, "PPP") : "Pick a date (optional)"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
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
                )}

                {/* Project Dates (only for projects) */}
                {type === "project" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarDays size={16} className="mr-2" />
                            {startDate ? format(startDate, "PPP") : "Pick start date (optional)"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => {
                              setStartDate(date)
                              setStartCalendarOpen(false)
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Target End Date</Label>
                      <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarDays size={16} className="mr-2" />
                            {targetEndDate ? format(targetEndDate, "PPP") : "Pick target end date (optional)"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={targetEndDate}
                            onSelect={(date) => {
                              setTargetEndDate(date)
                              setEndCalendarOpen(false)
                            }}
                            disabled={(date) => startDate ? date < startDate : false}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}

                {/* Acceptance Criteria */}
                {(type === "story" || type === "epic") && (
                  <div className="space-y-2">
                    <Label htmlFor="acceptanceCriteria">
                      Acceptance Criteria {type === "story" && "*"}
                    </Label>
                    <Textarea
                      id="acceptanceCriteria"
                      placeholder="Define clear acceptance criteria..."
                      rows={4}
                      {...register("acceptanceCriteria")}
                      className={errors.acceptanceCriteria ? "border-red-500" : ""}
                    />
                    {errors.acceptanceCriteria && (
                      <p className="text-sm text-red-500">{errors.acceptanceCriteria.message as string}</p>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 pb-4">
                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} size="sm">
                      <Plus size={16} />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {watchedTags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Subtasks */}
                {type === "task" && (
                  <div className="space-y-2">
                    <Label>Subtasks</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add subtask..."
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
                      />
                      <Button type="button" onClick={addSubtask} size="sm">
                        <Plus size={16} />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {watchedSubtasks.map((subtask: string, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-sm">{subtask}</span>
                          <button
                            type="button"
                            onClick={() => removeSubtask(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
 
                     {/* Submit Buttons - Fixed Footer */}
           <div className="flex-shrink-0 flex justify-end space-x-2 p-6 pt-4 border-t bg-white">
             {/* Show validation errors if any */}
             {Object.keys(errors).length > 0 && (
               <div className="flex-1 text-sm text-red-500">
                 Please fix the validation errors above
               </div>
             )}
             <Button type="button" variant="outline" onClick={() => setOpen(false)}>
               Cancel
             </Button>
             <Button
               type="submit"
               className={`bg-gradient-to-r ${config.color} text-white`}
               disabled={isSubmitting}
             >
               {isSubmitting ? "Creating..." : `Create ${type.charAt(0).toUpperCase() + type.slice(1)}`}
             </Button>
           </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default SimpleCreateModal 