"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Target,
  X,
  CalendarDays,
  Sparkles,
  Brain,
  Wand2,
  Loader2,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Edit3,
  Users,
  Settings,
  Code,
  TrendingUp,
  Building2,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { format } from "date-fns"
import { api } from "@/services/api"

interface Project {
  id?: string
  name: string
  description: string
  priority: "low" | "medium" | "high" | "critical"
  status?: "planning" | "active" | "on-hold" | "completed" | "cancelled"
  startDate?: string
  endDate?: string
  budget?: {
    allocated: number
    currency: string
  }
  objectives: string[]
  scope: {
    included: string[]
    excluded: string[]
    assumptions: string[]
  }
  successMetrics: Array<{
    metric: string
    target: string
    measurement: string
  }>
  technologyStack: string[]
  teamComposition: {
    recommendedSize: number
    roles: Array<{
      role: string
      count: number
      keyResponsibilities: string[]
    }>
  }
  risks: Array<{
    risk: string
    impact: string
    probability: string
    mitigation: string
  }>
  dependencies: string[]
}

interface GeneratedProjectResponse {
  success: boolean
  project: {
    name: string
    description: string
    vision: string
    objectives: string[]
    scope: {
      included: string[]
      excluded: string[]
      assumptions: string[]
    }
    success_metrics: Array<{
      metric: string
      target: string
      measurement: string
    }>
    suggested_epics: Array<{
      name: string
      description: string
      estimated_story_points: number
      priority: string
      business_value: string
    }>
    total_estimated_points: number
    timeline: {
      estimated_duration: string
      phases: Array<{
        name: string
        duration: string
        deliverables: string[]
      }>
    }
    team_composition: {
      recommended_size: number
      roles: Array<{
        role: string
        count: number
        key_responsibilities: string[]
      }>
    }
    technology_strategy: {
      architecture_approach: string
      key_technologies: string[]
      technical_decisions: string[]
    }
    risks: Array<{
      risk: string
      impact: string
      probability: string
      mitigation: string
    }>
    dependencies: string[]
    confidence: number
  }
  provider: string
  model: string
}

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (project: Project) => Promise<void>
  editingProject?: Project | null
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProject = null,
}) => {
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual")
  const [project, setProject] = useState<Project>({
    name: "",
    description: "",
    priority: "medium",
    status: "planning",
    objectives: [],
    scope: {
      included: [],
      excluded: [],
      assumptions: []
    },
    successMetrics: [],
    technologyStack: [],
    teamComposition: {
      recommendedSize: 5,
      roles: []
    },
    risks: [],
    dependencies: [],
  })
  
  // AI Generation states
  const [aiDescription, setAiDescription] = useState("")
  const [domain, setDomain] = useState("")
  const [timeline, setTimeline] = useState("")
  const [technologyStack, setTechnologyStack] = useState("")
  const [businessObjectives, setBusinessObjectives] = useState("")
  const [teamSize, setTeamSize] = useState(5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedProject, setGeneratedProject] = useState<GeneratedProjectResponse | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  
  // Form states
  const [isSaving, setIsSaving] = useState(false)
  const [newObjective, setNewObjective] = useState("")
  const [newIncluded, setNewIncluded] = useState("")
  const [newExcluded, setNewExcluded] = useState("")
  const [newAssumption, setNewAssumption] = useState("")
  const [newDependency, setNewDependency] = useState("")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [calendarOpen, setCalendarOpen] = useState<"start" | "end" | null>(null)
  
  // Refs
  const modalRef = useRef<HTMLDivElement>(null)

  // Initialize form when editing
  useEffect(() => {
    if (editingProject) {
      setProject({
        ...editingProject,
        name: editingProject.name || "",
        description: editingProject.description || "",
        objectives: editingProject.objectives || [],
        scope: editingProject.scope || { included: [], excluded: [], assumptions: [] },
        successMetrics: editingProject.successMetrics || [],
        technologyStack: editingProject.technologyStack || [],
        teamComposition: editingProject.teamComposition || { recommendedSize: 5, roles: [] },
        risks: editingProject.risks || [],
        dependencies: editingProject.dependencies || [],
      })
      setActiveTab("manual")
    } else {
      // Reset form for new project
      setProject({
        name: "",
        description: "",
        priority: "medium",
        status: "planning",
        objectives: [],
        scope: {
          included: [],
          excluded: [],
          assumptions: []
        },
        successMetrics: [],
        technologyStack: [],
        teamComposition: {
          recommendedSize: 5,
          roles: []
        },
        risks: [],
        dependencies: [],
      })
      setGeneratedProject(null)
      setAiDescription("")
      setDomain("")
      setTimeline("")
      setTechnologyStack("")
      setBusinessObjectives("")
      setTeamSize(5)
      setAiError(null)
    }
    setStartDate(undefined)
    setEndDate(undefined)
  }, [editingProject, isOpen])

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

  const handleGenerateProject = async () => {
    if (!aiDescription.trim()) {
      setAiError("Please enter a description for the project")
      return
    }

    setIsGenerating(true)
    setAiError(null)

    try {
      const response = await api.ai.generateProject({
        description: aiDescription,
        domain,
        teamSize,
        timeline,
        technologyStack,
        businessObjectives,
        priority: project.priority,
      })

      if (response.success && response.project) {
        setGeneratedProject(response)
        
        // Show warning if this is a fallback response
        if (response.provider === "fallback") {
          setAiError("Note: AI services are temporarily unavailable. Generated a basic project template based on your description.")
        }
        
        // Auto-populate the manual form with AI-generated data
        setProject(prev => ({
          ...prev,
          name: response.project.name,
          description: response.project.description,
          objectives: response.project.objectives,
          scope: response.project.scope,
          successMetrics: response.project.success_metrics.map(m => ({
            metric: m.metric,
            target: m.target,
            measurement: m.measurement
          })),
          technologyStack: response.project.technology_strategy.key_technologies,
          teamComposition: {
            recommendedSize: response.project.team_composition.recommended_size,
            roles: response.project.team_composition.roles.map(r => ({
              role: r.role,
              count: r.count,
              keyResponsibilities: r.key_responsibilities
            }))
          },
          risks: response.project.risks.map(r => ({
            risk: r.risk,
            impact: r.impact,
            probability: r.probability,
            mitigation: r.mitigation
          })),
          dependencies: response.project.dependencies,
        }))
      } else {
        throw new Error("Project generation failed. Please try again or use manual entry.")
      }
    } catch (error) {
      console.error("Project generation failed:", error)
      setAiError(
        error instanceof Error ? error.message : "Failed to generate project. Please try again."
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerateProject = () => {
    setGeneratedProject(null)
    handleGenerateProject()
  }

  const handleAddObjective = () => {
    if (newObjective.trim() && !project.objectives.includes(newObjective.trim())) {
      setProject(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()]
      }))
      setNewObjective("")
    }
  }

  const handleRemoveObjective = (objectiveToRemove: string) => {
    setProject(prev => ({
      ...prev,
      objectives: prev.objectives.filter(obj => obj !== objectiveToRemove)
    }))
  }

  const handleAddIncluded = () => {
    if (newIncluded.trim() && !project.scope.included.includes(newIncluded.trim())) {
      setProject(prev => ({
        ...prev,
        scope: {
          ...prev.scope,
          included: [...prev.scope.included, newIncluded.trim()]
        }
      }))
      setNewIncluded("")
    }
  }

  const handleRemoveIncluded = (item: string) => {
    setProject(prev => ({
      ...prev,
      scope: {
        ...prev.scope,
        included: prev.scope.included.filter(i => i !== item)
      }
    }))
  }

  const handleAddExcluded = () => {
    if (newExcluded.trim() && !project.scope.excluded.includes(newExcluded.trim())) {
      setProject(prev => ({
        ...prev,
        scope: {
          ...prev.scope,
          excluded: [...prev.scope.excluded, newExcluded.trim()]
        }
      }))
      setNewExcluded("")
    }
  }

  const handleRemoveExcluded = (item: string) => {
    setProject(prev => ({
      ...prev,
      scope: {
        ...prev.scope,
        excluded: prev.scope.excluded.filter(i => i !== item)
      }
    }))
  }

  const handleAddAssumption = () => {
    if (newAssumption.trim() && !project.scope.assumptions.includes(newAssumption.trim())) {
      setProject(prev => ({
        ...prev,
        scope: {
          ...prev.scope,
          assumptions: [...prev.scope.assumptions, newAssumption.trim()]
        }
      }))
      setNewAssumption("")
    }
  }

  const handleRemoveAssumption = (item: string) => {
    setProject(prev => ({
      ...prev,
      scope: {
        ...prev.scope,
        assumptions: prev.scope.assumptions.filter(i => i !== item)
      }
    }))
  }

  const handleAddDependency = () => {
    if (newDependency.trim() && !project.dependencies.includes(newDependency.trim())) {
      setProject(prev => ({
        ...prev,
        dependencies: [...prev.dependencies, newDependency.trim()]
      }))
      setNewDependency("")
    }
  }

  const handleRemoveDependency = (item: string) => {
    setProject(prev => ({
      ...prev,
      dependencies: prev.dependencies.filter(i => i !== item)
    }))
  }

  const handleSave = async () => {
    if (!project.name?.trim()) {
      setAiError("Project name is required")
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        ...project,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      })
      onClose()
    } catch (error) {
      console.error("Failed to save project:", error)
      setAiError("Failed to save project. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

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
          className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Target size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingProject ? "Edit Project" : "Create Project"}
                </h2>
                <p className="text-sm text-slate-600">AI-powered strategic project planning</p>
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
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-100">
                    <CardTitle className="flex items-center space-x-2">
                      <Brain size={20} className="text-blue-600" />
                      <span>AI Project Generator</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ai-description">Project Description *</Label>
                        <Textarea
                          id="ai-description"
                          placeholder="E.g., 'Build a customer support platform with AI chatbot, ticket management, and analytics dashboard for improved customer satisfaction'"
                          value={aiDescription}
                          onChange={(e) => setAiDescription(e.target.value)}
                          className="min-h-[100px] mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="business-objectives">Business Objectives</Label>
                        <Textarea
                          id="business-objectives"
                          placeholder="E.g., 'Reduce customer response time by 50%, increase satisfaction scores, automate routine inquiries'"
                          value={businessObjectives}
                          onChange={(e) => setBusinessObjectives(e.target.value)}
                          className="min-h-[100px] mt-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="domain">Domain/Industry</Label>
                        <Input
                          id="domain"
                          placeholder="E.g., 'SaaS, E-commerce, Healthcare'"
                          value={domain}
                          onChange={(e) => setDomain(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="timeline">Timeline</Label>
                        <Input
                          id="timeline"
                          placeholder="E.g., '6 months, Q2 2024'"
                          value={timeline}
                          onChange={(e) => setTimeline(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="team-size">Team Size</Label>
                        <Input
                          id="team-size"
                          type="number"
                          min="1"
                          max="50"
                          value={teamSize}
                          onChange={(e) => setTeamSize(parseInt(e.target.value) || 5)}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="tech-stack">Technology Stack</Label>
                      <Textarea
                        id="tech-stack"
                        placeholder="E.g., 'React, Node.js, PostgreSQL, Docker, AWS, TypeScript'"
                        value={technologyStack}
                        onChange={(e) => setTechnologyStack(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    
                    <div className="flex space-x-4">
                      <Button
                        onClick={handleGenerateProject}
                        disabled={isGenerating || !aiDescription.trim()}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        {isGenerating ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Wand2 size={16} className="mr-2" />
                        )}
                        {isGenerating ? "Generating..." : "Generate with AI"}
                      </Button>
                      
                      {generatedProject && (
                        <Button
                          variant="outline"
                          onClick={handleRegenerateProject}
                          disabled={isGenerating}
                        >
                          <RefreshCw size={16} className="mr-2" />
                          Regenerate
                        </Button>
                      )}
                    </div>

                    {aiError && (
                      <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                        aiError.includes("Note:") 
                          ? "text-amber-700 bg-amber-50 border border-amber-200" 
                          : "text-red-600 bg-red-50"
                      }`}>
                        {aiError.includes("Note:") ? (
                          <AlertTriangle size={16} className="text-amber-600" />
                        ) : (
                          <AlertCircle size={16} />
                        )}
                        <span className="text-sm">{aiError}</span>
                      </div>
                    )}

                    {generatedProject && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Sparkles size={16} className="text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">
                              Generated by {generatedProject.provider}
                            </span>
                          </div>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border border-blue-300">
                            {Math.round(generatedProject.project.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-blue-700 space-y-2">
                          <p className="font-medium">Project plan generated and applied to the form below.</p>
                          <p>Switch to Manual Entry tab to review and customize.</p>
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
                        <Building2 size={20} className="text-blue-600" />
                        <span>Basic Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div>
                        <Label htmlFor="project-name">Project Name *</Label>
                        <Input
                          id="project-name"
                          placeholder="Enter project name..."
                          value={project.name || ""}
                          onChange={(e) => setProject(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-2"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="project-description">Description *</Label>
                        <Textarea
                          id="project-description"
                          placeholder="Describe the project's purpose, goals, and expected outcomes..."
                          value={project.description || ""}
                          onChange={(e) => setProject(prev => ({ ...prev, description: e.target.value }))}
                          className="min-h-[100px] mt-2"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          <Select
                            value={project.priority}
                            onValueChange={(value: any) => setProject(prev => ({ ...prev, priority: value }))}
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
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={project.status}
                            onValueChange={(value: any) => setProject(prev => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="planning">Planning</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="on-hold">On Hold</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Timeline */}
                  <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-100">
                      <CardTitle className="flex items-center space-x-2">
                        <Clock size={20} className="text-green-600" />
                        <span>Timeline</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div>
                        <Label>Start Date</Label>
                        <Popover open={calendarOpen === "start"} onOpenChange={(open) => setCalendarOpen(open ? "start" : null)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal mt-2"
                            >
                              <CalendarDays size={16} className="mr-2" />
                              {startDate ? format(startDate, "PPP") : "Pick start date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={(date) => {
                                setStartDate(date)
                                setCalendarOpen(null)
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label>End Date</Label>
                        <Popover open={calendarOpen === "end"} onOpenChange={(open) => setCalendarOpen(open ? "end" : null)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal mt-2"
                            >
                              <CalendarDays size={16} className="mr-2" />
                              {endDate ? format(endDate, "PPP") : "Pick end date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={(date) => {
                                setEndDate(date)
                                setCalendarOpen(null)
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Objectives */}
                <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-100">
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp size={20} className="text-purple-600" />
                      <span>Project Objectives</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add project objective..."
                        value={newObjective}
                        onChange={(e) => setNewObjective(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleAddObjective()}
                      />
                      <Button onClick={handleAddObjective} variant="outline" size="sm">
                        Add
                      </Button>
                    </div>
                    {project.objectives && project.objectives.length > 0 && (
                      <div className="space-y-2">
                        {project.objectives.map((objective, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                          >
                            <span className="text-sm break-words flex-1">{objective}</span>
                            <X
                              size={14}
                              className="cursor-pointer hover:text-red-500 ml-2 flex-shrink-0"
                              onClick={() => handleRemoveObjective(objective)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Project Scope */}
                <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b-2 border-indigo-100">
                    <CardTitle className="flex items-center space-x-2">
                      <Settings size={20} className="text-indigo-600" />
                      <span>Project Scope</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    {/* Included */}
                    <div>
                      <Label className="text-sm font-medium text-emerald-700">Included in Scope</Label>
                      <div className="flex space-x-2 mt-2">
                        <Input
                          placeholder="What's included in this project..."
                          value={newIncluded}
                          onChange={(e) => setNewIncluded(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddIncluded()}
                        />
                        <Button onClick={handleAddIncluded} variant="outline" size="sm">
                          Add
                        </Button>
                      </div>
                      {project.scope.included && project.scope.included.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {project.scope.included.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg"
                            >
                              <div className="flex items-center space-x-2">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                <span className="text-sm break-words flex-1">{item}</span>
                              </div>
                              <X
                                size={14}
                                className="cursor-pointer hover:text-red-500 ml-2 flex-shrink-0"
                                onClick={() => handleRemoveIncluded(item)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Excluded */}
                    <div>
                      <Label className="text-sm font-medium text-red-700">Excluded from Scope</Label>
                      <div className="flex space-x-2 mt-2">
                        <Input
                          placeholder="What's explicitly excluded..."
                          value={newExcluded}
                          onChange={(e) => setNewExcluded(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddExcluded()}
                        />
                        <Button onClick={handleAddExcluded} variant="outline" size="sm">
                          Add
                        </Button>
                      </div>
                      {project.scope.excluded && project.scope.excluded.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {project.scope.excluded.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-lg"
                            >
                              <span className="text-sm break-words flex-1">{item}</span>
                              <X
                                size={14}
                                className="cursor-pointer hover:text-red-500 ml-2 flex-shrink-0"
                                onClick={() => handleRemoveExcluded(item)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assumptions */}
                    <div>
                      <Label className="text-sm font-medium text-amber-700">Key Assumptions</Label>
                      <div className="flex space-x-2 mt-2">
                        <Input
                          placeholder="Project assumptions..."
                          value={newAssumption}
                          onChange={(e) => setNewAssumption(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddAssumption()}
                        />
                        <Button onClick={handleAddAssumption} variant="outline" size="sm">
                          Add
                        </Button>
                      </div>
                      {project.scope.assumptions && project.scope.assumptions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {project.scope.assumptions.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg"
                            >
                              <span className="text-sm break-words flex-1">{item}</span>
                              <X
                                size={14}
                                className="cursor-pointer hover:text-red-500 ml-2 flex-shrink-0"
                                onClick={() => handleRemoveAssumption(item)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Dependencies */}
                <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-orange-100">
                    <CardTitle className="flex items-center space-x-2">
                      <Users size={20} className="text-orange-600" />
                      <span>Dependencies & Constraints</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add project dependency or constraint..."
                        value={newDependency}
                        onChange={(e) => setNewDependency(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleAddDependency()}
                      />
                      <Button onClick={handleAddDependency} variant="outline" size="sm">
                        Add
                      </Button>
                    </div>
                    {project.dependencies && project.dependencies.length > 0 && (
                      <div className="space-y-2">
                        {project.dependencies.map((dependency, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                          >
                            <span className="text-sm break-words flex-1">{dependency}</span>
                            <X
                              size={14}
                              className="cursor-pointer hover:text-red-500 ml-2 flex-shrink-0"
                              onClick={() => handleRemoveDependency(dependency)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center space-x-4">
              {generatedProject && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">AI Generated:</span> {generatedProject.project.name}
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !project.name?.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isSaving ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Target size={16} className="mr-2" />
                )}
                {isSaving ? "Saving..." : (editingProject ? "Update Project" : "Create Project")}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 