"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@clerk/nextjs"
import {
  Plus,
  X,
  Edit3,
  Sparkles,
  Brain,
  Wand2,
  Loader2,
  RefreshCw,
  AlertCircle,
  Save,
  Target,
  Calendar,
  User,
  Tag,
  CheckSquare,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { createAuthenticatedApi } from "@/services/api"

interface Project {
  id: string
  name: string
}

interface Epic {
  id?: string
  name: string
  description?: string
  priority: "low" | "medium" | "high" | "critical"
  status: "planning" | "in-progress" | "review" | "completed" | "on-hold"
  projectId?: string
  businessValue?: string
  acceptanceCriteria?: string[]
  estimatedStoryPoints?: number
  dueDate?: string
}

interface GeneratedEpicResponse {
  success: boolean
  epic: {
    name: string
    description: string
    acceptance_criteria: string[]
    suggested_stories: Array<{
      title: string
      description: string
      story_points: number
    }>
    total_story_points: number
    business_value: string
    impact_areas: string[]
    confidence: number
    implementation_suggestions: string[]
  }
  model_used: string
  tokens_used: number
  processing_time: number
}

interface CreateEpicModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (epic: Epic) => Promise<void>
  projects?: Project[]
  editingEpic?: Epic | null
}

export const CreateEpicModal: React.FC<CreateEpicModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects = [],
  editingEpic = null
}) => {
  const { getToken } = useAuth()
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual")
  const [epic, setEpic] = useState<Epic>({
    name: "",
    description: "",
    priority: "medium",
    status: "planning",
    acceptanceCriteria: []
  })
  
  // AI Generation states
  const [aiDescription, setAiDescription] = useState("")
  const [aiBusinessValue, setAiBusinessValue] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedEpic, setGeneratedEpic] = useState<GeneratedEpicResponse | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  
  // Form states
  const [isSaving, setIsSaving] = useState(false)
  const [newCriteria, setNewCriteria] = useState("")
  
  // Refs
  const modalRef = useRef<HTMLDivElement>(null)

  // Initialize form when editing
  useEffect(() => {
    if (editingEpic) {
      setEpic({
        ...editingEpic,
        name: editingEpic.name || "",
        description: editingEpic.description || "",
        businessValue: editingEpic.businessValue || "",
        dueDate: editingEpic.dueDate || "",
        acceptanceCriteria: editingEpic.acceptanceCriteria || []
      })
      setActiveTab("manual")
    } else {
      // Reset form for new epic
      setEpic({
        name: "",
        description: "",
        priority: "medium",
        status: "planning",
        acceptanceCriteria: []
      })
      setGeneratedEpic(null)
      setAiDescription("")
      setAiBusinessValue("")
      setAiError(null)
    }
  }, [editingEpic, isOpen])

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

  const handleGenerateEpic = async () => {
    if (!aiDescription.trim()) {
      setAiError("Please enter a description for the epic")
      return
    }

    setIsGenerating(true)
    setAiError(null)

    try {
      // Create authenticated API client
      const api = createAuthenticatedApi(getToken)
      
      const data: GeneratedEpicResponse = await api.ai.generateEpic({
        description: aiDescription,
        priority: epic.priority,
        projectId: epic.projectId,
        businessValue: aiBusinessValue,
        includeAcceptanceCriteria: true,
        includeStoryBreakdown: true,
      })

      if (data.success) {
        setGeneratedEpic(data)
        
        // Auto-populate the manual form with AI-generated data
        setEpic(prev => ({
          ...prev,
          name: data.epic.name,
          description: data.epic.description,
          acceptanceCriteria: data.epic.acceptance_criteria || [],
          estimatedStoryPoints: data.epic.total_story_points,
          businessValue: data.epic.business_value
        }))
      } else {
        throw new Error("AI generation failed")
      }
    } catch (error) {
      console.error("Epic generation failed:", error)
      setAiError(
        error instanceof Error ? error.message : "Failed to generate epic. Please try again."
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerateEpic = () => {
    setGeneratedEpic(null)
    handleGenerateEpic()
  }

  const handleAddCriteria = () => {
    if (newCriteria.trim() && !epic.acceptanceCriteria?.includes(newCriteria.trim())) {
      setEpic(prev => ({
        ...prev,
        acceptanceCriteria: [...(prev.acceptanceCriteria || []), newCriteria.trim()]
      }))
      setNewCriteria("")
    }
  }

  const handleRemoveCriteria = (criteriaToRemove: string) => {
    setEpic(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria?.filter(criteria => criteria !== criteriaToRemove) || []
    }))
  }

  const handleSave = async () => {
    if (!epic.name?.trim()) {
      setAiError("Epic name is required")
      return
    }

    setIsSaving(true)
    try {
      await onSave(epic)
      onClose()
    } catch (error) {
      console.error("Failed to save epic:", error)
      setAiError("Failed to save epic. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Target size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingEpic ? "Edit Epic" : "Create New Epic"}
                </h2>
                <p className="text-sm text-slate-600">
                  {editingEpic ? "Update your epic" : "Create manually or use AI assistance"}
                </p>
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
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-100">
                    <CardTitle className="flex items-center space-x-2">
                      <Brain size={20} className="text-purple-600" />
                      <span>AI Epic Generator</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div>
                      <Label htmlFor="ai-description">Describe your epic</Label>
                      <Textarea
                        id="ai-description"
                        placeholder="E.g., 'We need a comprehensive user authentication system that supports multiple login methods, user profiles, and security features to improve user experience and platform security'"
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                        className="min-h-[100px] mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ai-business-value">Business Value (Optional)</Label>
                      <Textarea
                        id="ai-business-value"
                        placeholder="E.g., 'Increase user retention by 25%, reduce support tickets related to login issues, enable premium features for authenticated users'"
                        value={aiBusinessValue}
                        onChange={(e) => setAiBusinessValue(e.target.value)}
                        className="min-h-[80px] mt-2"
                      />
                    </div>
                    
                    <div className="flex space-x-4">
                      <Button
                        onClick={handleGenerateEpic}
                        disabled={isGenerating || !aiDescription.trim()}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        {isGenerating ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Wand2 size={16} className="mr-2" />
                        )}
                        {isGenerating ? "Generating..." : "Generate with AI"}
                      </Button>
                      
                      {generatedEpic && (
                        <Button
                          variant="outline"
                          onClick={handleRegenerateEpic}
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

                    {generatedEpic && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Sparkles size={16} className="text-purple-600" />
                            <span className="text-sm font-medium text-purple-800">
                              Generated by {generatedEpic.model_used}
                            </span>
                          </div>
                          {generatedEpic.epic.confidence && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border border-purple-300">
                              {Math.round(generatedEpic.epic.confidence * 100)}% confidence
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-purple-700 space-y-3">
                          <p className="font-medium">Generated epic has been applied to the form below.</p>
                          <p>Switch to Manual Entry tab to review and edit.</p>
                          
                          {generatedEpic.epic.suggested_stories.length > 0 && (
                            <div className="mt-4 p-4 bg-white/70 border border-purple-100 rounded-lg shadow-sm">
                              <p className="font-medium mb-3">Suggested User Stories:</p>
                              <ul className="space-y-2 text-xs">
                                {generatedEpic.epic.suggested_stories.slice(0, 3).map((story, index) => (
                                  <li key={index} className="flex items-start space-x-2 p-2 bg-white/50 rounded border border-purple-100">
                                    <span className="text-purple-500 font-bold">•</span>
                                    <span>{story.title} ({story.story_points} pts)</span>
                                  </li>
                                ))}
                                {generatedEpic.epic.suggested_stories.length > 3 && (
                                  <li className="text-purple-600 font-medium text-center p-2">
                                    +{generatedEpic.epic.suggested_stories.length - 3} more stories
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="manual" className="space-y-6">
                {/* Manual Entry Tab */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-6">
                    <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-100">
                        <CardTitle className="flex items-center space-x-2">
                          <Target size={20} className="text-blue-600" />
                          <span>Epic Details</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        <div>
                          <Label htmlFor="epic-name">Epic Name *</Label>
                          <Input
                            id="epic-name"
                            placeholder="Enter epic name"
                            value={epic.name || ""}
                            onChange={(e) => setEpic(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="epic-description">Description</Label>
                          <Textarea
                            id="epic-description"
                            placeholder="Describe the epic's purpose and scope"
                            value={epic.description || ""}
                            onChange={(e) => setEpic(prev => ({ ...prev, description: e.target.value }))}
                            className="min-h-[100px] mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="business-value">Business Value</Label>
                          <Textarea
                            id="business-value"
                            placeholder="Describe the business value and impact"
                            value={epic.businessValue || ""}
                            onChange={(e) => setEpic(prev => ({ ...prev, businessValue: e.target.value }))}
                            className="min-h-[80px] mt-2"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-100">
                        <CardTitle className="flex items-center space-x-2">
                          <CheckSquare size={20} className="text-green-600" />
                          <span>Acceptance Criteria</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Add acceptance criteria"
                            value={newCriteria}
                            onChange={(e) => setNewCriteria(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleAddCriteria()}
                          />
                          <Button onClick={handleAddCriteria} size="sm">
                            <Plus size={16} />
                          </Button>
                        </div>

                        {epic.acceptanceCriteria && epic.acceptanceCriteria.length > 0 && (
                          <div className="space-y-3">
                            {epic.acceptanceCriteria.map((criteria, index) => (
                              <div key={index} className="flex items-start space-x-2 p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200 rounded-lg shadow-sm">
                                <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm flex-1 text-wrap break-words text-slate-800 font-medium">{criteria}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveCriteria(criteria)}
                                  className="text-slate-400 hover:text-red-600 p-0 h-auto hover:bg-red-50 rounded-full"
                                >
                                  <X size={14} />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column - Settings */}
                  <div className="space-y-6">
                    <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-100">
                        <CardTitle className="flex items-center space-x-2">
                          <User size={20} className="text-orange-600" />
                          <span>Epic Settings</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        <div>
                          <Label htmlFor="project">Project</Label>
                          <Select
                            value={epic.projectId || "none"}
                            onValueChange={(value) => setEpic(prev => ({ 
                              ...prev, 
                              projectId: value === "none" ? undefined : value 
                            }))}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Project</SelectItem>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          <Select
                            value={epic.priority}
                            onValueChange={(value) => setEpic(prev => ({ 
                              ...prev, 
                              priority: value as Epic["priority"]
                            }))}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={epic.status}
                            onValueChange={(value) => setEpic(prev => ({ 
                              ...prev, 
                              status: value as Epic["status"]
                            }))}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="planning">Planning</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="review">Review</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="on-hold">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="estimated-points">Estimated Story Points</Label>
                          <Input
                            id="estimated-points"
                            type="number"
                            placeholder="Enter estimated story points"
                            value={epic.estimatedStoryPoints || ""}
                            onChange={(e) => setEpic(prev => ({ 
                              ...prev, 
                              estimatedStoryPoints: e.target.value ? parseInt(e.target.value) : undefined 
                            }))}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="due-date">Due Date</Label>
                          <Input
                            id="due-date"
                            type="date"
                            value={epic.dueDate || ""}
                            onChange={(e) => setEpic(prev => ({ ...prev, dueDate: e.target.value }))}
                            className="mt-2"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {generatedEpic && generatedEpic.epic.implementation_suggestions.length > 0 && (
                      <Card className="border-2 border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                        <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b-2 border-yellow-100">
                          <CardTitle className="flex items-center space-x-2">
                            <Lightbulb size={20} className="text-yellow-600" />
                            <span>AI Suggestions</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <ul className="space-y-2">
                            {generatedEpic.epic.implementation_suggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-start space-x-2 text-sm">
                                <span className="text-yellow-500 mt-1">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <div className="text-sm text-slate-600">
              {generatedEpic && (
                <div className="flex items-center space-x-2">
                  <Sparkles size={14} className="text-purple-600" />
                  <span>✨ This epic was enhanced with AI</span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !epic.name?.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isSaving ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Save size={16} className="mr-2" />
                )}
                {isSaving ? "Saving..." : editingEpic ? "Update Epic" : "Create Epic"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
} 