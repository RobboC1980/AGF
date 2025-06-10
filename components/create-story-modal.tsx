"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Plus,
  Sparkles,
  Edit3,
  Save,
  RefreshCw,
  Wand2,
  FileText,
  Target,
  Tag,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Brain,
  Lightbulb
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"

interface User {
  id: string
  name: string
  avatar?: string
}

interface Epic {
  id: string
  name: string
  color: string
  project: {
    id: string
    name: string
  }
}

interface Story {
  id?: string
  name: string
  description?: string
  priority: "low" | "medium" | "high" | "critical"
  status: "backlog" | "ready" | "in-progress" | "review" | "done"
  storyPoints?: number
  epicId?: string
  assigneeId?: string
  tags?: string[]
  acceptanceCriteria?: string[]
  dueDate?: string
}

interface GeneratedStoryResponse {
  success: boolean
  story: {
    name: string
    description: string
    acceptanceCriteria: string[]
    tags: string[]
    storyPoints?: number
  }
  provider: string
  model: string
  confidence?: number
  suggestions?: string[]
}

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (story: Story) => Promise<void>
  epics?: Epic[]
  users?: User[]
  editingStory?: Story | null
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  epics = [],
  users = [],
  editingStory = null
}) => {
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual")
  const [story, setStory] = useState<Story>({
    name: "",
    description: "",
    priority: "medium",
    status: "backlog",
    tags: [],
    acceptanceCriteria: []
  })
  
  // AI Generation states
  const [aiDescription, setAiDescription] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedStory, setGeneratedStory] = useState<GeneratedStoryResponse | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  
  // Form states
  const [isSaving, setIsSaving] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [newCriteria, setNewCriteria] = useState("")
  
  // Refs
  const modalRef = useRef<HTMLDivElement>(null)

  // Initialize form when editing
  useEffect(() => {
    if (editingStory) {
      setStory(editingStory)
      setActiveTab("manual")
    } else {
      // Reset form for new story
      setStory({
        name: "",
        description: "",
        priority: "medium", 
        status: "backlog",
        tags: [],
        acceptanceCriteria: []
      })
      setGeneratedStory(null)
      setAiDescription("")
      setAiError(null)
    }
  }, [editingStory, isOpen])

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

  const handleGenerateStory = async () => {
    if (!aiDescription.trim()) {
      setAiError("Please enter a description for the story")
      return
    }

    setIsGenerating(true)
    setAiError(null)

    try {
      const response = await fetch("/api/stories/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer demo`,
        },
        body: JSON.stringify({
          description: aiDescription,
          priority: story.priority,
          epicId: story.epicId,
          includeAcceptanceCriteria: true,
          includeTags: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: GeneratedStoryResponse = await response.json()

      if (data.success) {
        setGeneratedStory(data)
        
        // Auto-populate the manual form with AI-generated data
        setStory(prev => ({
          ...prev,
          name: data.story.name,
          description: data.story.description,
          acceptanceCriteria: data.story.acceptanceCriteria || [],
          tags: data.story.tags || [],
          storyPoints: data.story.storyPoints
        }))
      } else {
        throw new Error("AI generation failed")
      }
    } catch (error) {
      console.error("Story generation failed:", error)
      setAiError(
        error instanceof Error ? error.message : "Failed to generate story. Please try again."
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerateStory = () => {
    setGeneratedStory(null)
    handleGenerateStory()
  }

  const handleAddTag = () => {
    if (newTag.trim() && !story.tags?.includes(newTag.trim())) {
      setStory(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }))
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setStory(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }))
  }

  const handleAddCriteria = () => {
    if (newCriteria.trim() && !story.acceptanceCriteria?.includes(newCriteria.trim())) {
      setStory(prev => ({
        ...prev,
        acceptanceCriteria: [...(prev.acceptanceCriteria || []), newCriteria.trim()]
      }))
      setNewCriteria("")
    }
  }

  const handleRemoveCriteria = (criteriaToRemove: string) => {
    setStory(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria?.filter(criteria => criteria !== criteriaToRemove) || []
    }))
  }

  const handleSave = async () => {
    if (!story.name.trim()) {
      setAiError("Story name is required")
      return
    }

    setIsSaving(true)
    try {
      // Convert frontend story format to backend format
      const backendStory = {
        title: story.name, // Convert name to title
        description: story.description || "",
        epic_id: story.epicId || "epic-1", // Provide default epic if none selected
        acceptance_criteria: Array.isArray(story.acceptanceCriteria) 
          ? story.acceptanceCriteria.join('\n') 
          : (story.acceptanceCriteria || ""), // Convert array to string
        priority: story.priority,
        story_points: story.storyPoints,
        assignee_id: story.assigneeId,
        due_date: story.dueDate
      }
      
      await onSave(backendStory)
      onClose()
    } catch (error) {
      console.error("Failed to save story:", error)
      setAiError("Failed to save story. Please try again.")
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
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Plus size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingStory ? "Edit Story" : "Create New Story"}
                </h2>
                <p className="text-sm text-slate-600">
                  {editingStory ? "Update your user story" : "Create manually or use AI assistance"}
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
          <div className="flex-1 overflow-y-auto p-6">
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Brain size={20} className="text-purple-600" />
                      <span>AI Story Generator</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="ai-description">Describe your user story</Label>
                      <Textarea
                        id="ai-description"
                        placeholder="E.g., 'Users need to be able to filter products by price range and category to find what they're looking for faster'"
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                        className="min-h-[100px] mt-2"
                      />
                    </div>
                    
                    <div className="flex space-x-4">
                      <Button
                        onClick={handleGenerateStory}
                        disabled={isGenerating || !aiDescription.trim()}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {isGenerating ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Wand2 size={16} className="mr-2" />
                        )}
                        {isGenerating ? "Generating..." : "Generate with AI"}
                      </Button>
                      
                      {generatedStory && (
                        <Button
                          variant="outline"
                          onClick={handleRegenerateStory}
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

                    {generatedStory && (
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Sparkles size={16} className="text-purple-600" />
                            <span className="text-sm font-medium text-purple-800">
                              Generated by {generatedStory.provider}
                            </span>
                          </div>
                          {generatedStory.confidence && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              {Math.round(generatedStory.confidence * 100)}% confidence
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-purple-700">
                          <p className="font-medium mb-1">Generated story has been applied to the form below.</p>
                          <p>Switch to Manual Entry tab to review and edit.</p>
                        </div>

                        {generatedStory.suggestions && generatedStory.suggestions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-purple-200">
                            <div className="flex items-center space-x-1 mb-2">
                              <Lightbulb size={14} className="text-purple-600" />
                              <span className="text-xs font-medium text-purple-800">Suggestions:</span>
                            </div>
                            <ul className="text-xs text-purple-700 space-y-1">
                              {generatedStory.suggestions.map((suggestion, index) => (
                                <li key={index} className="flex items-start space-x-1">
                                  <span>•</span>
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="manual" className="space-y-6">
                {/* Manual Entry Tab */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <FileText size={20} className="text-blue-600" />
                          <span>Basic Information</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="story-name">Story Name *</Label>
                          <Input
                            id="story-name"
                            placeholder="As a user, I want to..."
                            value={story.name}
                            onChange={(e) => setStory(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-2"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="story-description">Description</Label>
                          <Textarea
                            id="story-description"
                            placeholder="Detailed description of the user need and context..."
                            value={story.description || ""}
                            onChange={(e) => setStory(prev => ({ ...prev, description: e.target.value }))}
                            className="min-h-[100px] mt-2"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                              value={story.priority}
                              onValueChange={(value: any) => setStory(prev => ({ ...prev, priority: value }))}
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
                            <Label htmlFor="story-points">Story Points</Label>
                            <Select
                              value={story.storyPoints?.toString() || ""}
                              onValueChange={(value) => setStory(prev => ({ 
                                ...prev, 
                                storyPoints: value ? parseInt(value) : undefined 
                              }))}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select points" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="8">8</SelectItem>
                                <SelectItem value="13">13</SelectItem>
                                <SelectItem value="21">21</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Assignment */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <User size={20} className="text-green-600" />
                          <span>Assignment</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="epic">Epic</Label>
                          <Select
                            value={story.epicId || "none"}
                            onValueChange={(value) => setStory(prev => ({ 
                              ...prev, 
                              epicId: value === "none" ? undefined : value 
                            }))}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select epic" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Epic</SelectItem>
                              {epics.map((epic) => (
                                <SelectItem key={epic.id} value={epic.id}>
                                  {epic.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="assignee">Assignee</Label>
                          <Select
                            value={story.assigneeId || "unassigned"}
                            onValueChange={(value) => setStory(prev => ({ 
                              ...prev, 
                              assigneeId: value === "unassigned" ? undefined : value 
                            }))}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="due-date">Due Date</Label>
                          <Input
                            id="due-date"
                            type="date"
                            value={story.dueDate || ""}
                            onChange={(e) => setStory(prev => ({ ...prev, dueDate: e.target.value }))}
                            className="mt-2"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Tags */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Tag size={20} className="text-orange-600" />
                          <span>Tags</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Add tag..."
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                            className="flex-1"
                          />
                          <Button onClick={handleAddTag} size="sm">
                            <Plus size={16} />
                          </Button>
                        </div>
                        
                        {story.tags && story.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {story.tags.map((tag, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                                onClick={() => handleRemoveTag(tag)}
                              >
                                {tag}
                                <X size={12} className="ml-1" />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Acceptance Criteria */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Target size={20} className="text-purple-600" />
                          <span>Acceptance Criteria</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Given...When...Then..."
                            value={newCriteria}
                            onChange={(e) => setNewCriteria(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleAddCriteria()}
                            className="flex-1"
                          />
                          <Button onClick={handleAddCriteria} size="sm">
                            <Plus size={16} />
                          </Button>
                        </div>
                        
                        {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
                          <div className="space-y-2">
                            {story.acceptanceCriteria.map((criteria, index) => (
                              <div
                                key={index}
                                className="flex items-start space-x-2 p-3 bg-slate-50 rounded-lg border"
                              >
                                <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm flex-1 text-wrap break-words">{criteria}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveCriteria(criteria)}
                                  className="text-slate-400 hover:text-red-600 p-0 h-auto"
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
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-600">
              {generatedStory && (
                <div className="flex items-center space-x-2">
                  <Sparkles size={14} className="text-purple-600" />
                  <span>✨ This story was enhanced with AI</span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !story.name.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isSaving ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Save size={16} className="mr-2" />
                )}
                {isSaving ? "Saving..." : editingStory ? "Update Story" : "Create Story"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default CreateStoryModal 