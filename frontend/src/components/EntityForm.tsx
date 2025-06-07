import React, { useState, useEffect } from 'react'
import { Form } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Entity } from '../hooks/useEntity'
import { api } from '../api/client'
import { useAuth } from '../store/useAuth'

interface EntityFormProps {
  entity: Entity
  mode: 'create' | 'edit'
  initialData?: any
  relatedData?: {
    projects?: any[]
    epics?: any[]
    stories?: any[]
    initiatives?: any[]
  }
}

// AI Story Generation Service
const generateAIStory = async (epicName: string, projectName?: string, projectType?: string, userPersona?: string): Promise<{ suggestions: string[]; provider?: string; model?: string; confidence?: number }> => {
  try {
    // Use the backend AI endpoint with enhanced context
    const response = await api.post('/ai/generate-story', {
      epicName,
      projectName,
      projectType,
      userPersona
    })
    
    if (response.data.success) {
      return {
        suggestions: response.data.suggestions,
        provider: response.data.provider,
        model: response.data.model,
        confidence: response.data.confidence
      }
    } else {
      throw new Error(response.data.error || 'AI generation failed')
    }
  } catch (error: any) {
    console.warn('Backend AI service unavailable, using local fallback:', error)
    
    // Fallback to local mock service if backend is unavailable
    const storyTemplates = [
      `As a user, I want to ${epicName.toLowerCase().includes('login') ? 'securely log into the system' : 'interact with ' + epicName} so that I can ${epicName.toLowerCase().includes('dashboard') ? 'view my personalized dashboard' : 'accomplish my goals efficiently'}.`,
      `As a ${projectName?.toLowerCase().includes('admin') ? 'administrator' : 'user'}, I want to ${epicName.toLowerCase().includes('create') ? 'create new items' : 'manage ' + epicName} so that I can ${epicName.toLowerCase().includes('report') ? 'generate accurate reports' : 'maintain organized data'}.`,
      `As a stakeholder, I want to ${epicName.toLowerCase().includes('view') ? 'view detailed information' : 'configure ' + epicName} so that I can ${epicName.toLowerCase().includes('analytics') ? 'make data-driven decisions' : 'optimize system performance'}.`,
      `As a team member, I want to ${epicName.toLowerCase().includes('collaborate') ? 'collaborate effectively' : 'utilize ' + epicName} so that I can ${epicName.toLowerCase().includes('project') ? 'contribute to project success' : 'enhance my productivity'}.`
    ]
    
    // Simulate API delay for consistent UX
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Return contextually relevant stories
    const relevantStories = storyTemplates.filter(story => 
      story.toLowerCase().includes(epicName.toLowerCase().split(' ')[0]) ||
      story.toLowerCase().includes('user') ||
      story.toLowerCase().includes('system')
    ).slice(0, 3)
    
    return {
      suggestions: relevantStories.length > 0 ? relevantStories : storyTemplates.slice(0, 3),
      provider: 'fallback',
      model: 'template-based',
      confidence: 0.6
    }
  }
}

// AI Story Validation and Enhancement Service
const validateAndEnhanceStory = (storyText: string): { isValid: boolean; suggestions: string[]; acceptanceCriteria: string[] } => {
  const suggestions: string[] = []
  const acceptanceCriteria: string[] = []
  
  // Check if story follows "As a... I want... so that..." format
  const hasProperFormat = /^As a .+ I want .+ so that .+/i.test(storyText.trim())
  if (!hasProperFormat) {
    suggestions.push("Consider using the standard format: 'As a [user type], I want [functionality] so that [benefit]'")
  }
  
  // Check if story is specific enough
  if (storyText.length < 30) {
    suggestions.push("Story might be too brief. Consider adding more specific details about the functionality.")
  }
  
  // Check for vague terms
  const vagueTerms = ['thing', 'stuff', 'something', 'anything', 'everything']
  const hasVagueTerms = vagueTerms.some(term => storyText.toLowerCase().includes(term))
  if (hasVagueTerms) {
    suggestions.push("Avoid vague terms like 'thing' or 'stuff'. Be specific about what the user needs.")
  }
  
  // Generate acceptance criteria based on story content
  if (storyText.toLowerCase().includes('login')) {
    acceptanceCriteria.push(
      "Given I am on the login page, When I enter valid credentials, Then I should be logged in successfully",
      "Given I enter invalid credentials, When I attempt to login, Then I should see an error message",
      "Given I am already logged in, When I access the login page, Then I should be redirected to the dashboard"
    )
  } else if (storyText.toLowerCase().includes('dashboard')) {
    acceptanceCriteria.push(
      "Given I am logged in, When I access the dashboard, Then I should see my personalized data",
      "Given the dashboard loads, When I view the interface, Then all widgets should display current information",
      "Given I am on the dashboard, When I click on any widget, Then I should navigate to the detailed view"
    )
  } else if (storyText.toLowerCase().includes('create')) {
    acceptanceCriteria.push(
      "Given I have proper permissions, When I create a new item, Then it should be saved successfully",
      "Given I fill in required fields, When I submit the form, Then validation should pass",
      "Given I create an item, When the process completes, Then I should receive confirmation"
    )
  } else {
    // Generic acceptance criteria
    acceptanceCriteria.push(
      "Given the feature is available, When I perform the action, Then the expected result should occur",
      "Given proper permissions, When I access the functionality, Then it should work as intended",
      "Given the system is responsive, When I use the feature, Then it should provide appropriate feedback"
    )
  }
  
  return {
    isValid: suggestions.length === 0,
    suggestions,
    acceptanceCriteria: acceptanceCriteria.slice(0, 3)
  }
}

// AI Tips for Better Stories
const getAITips = (): string[] => [
  "🎯 Focus on the user's goal, not the technical implementation",
  "📏 Keep stories small and achievable within one sprint",
  "🔍 Be specific about who the user is (admin, customer, etc.)",
  "💡 Ensure each story delivers clear business value",
  "✅ Include acceptance criteria to define 'done'",
  "🔄 Stories should be testable and demonstrable"
]

// Utility function to convert entity names to singular form
const getSingularForm = (entity: string): string => {
  const entityMap: Record<string, string> = {
    'projects': 'project',
    'epics': 'epic',
    'stories': 'story',
    'tasks': 'task',
    'sprints': 'sprint',
    'initiatives': 'initiative',
    'risks': 'risk',
    'okrs': 'OKR'
  }
  return entityMap[entity] || entity.slice(0, -1)
}

const ENTITY_SCHEMAS = {
  projects: [
    { name: 'name', type: 'text', required: true, label: 'Project Name', placeholder: 'Enter project name...', icon: '🎯' },
    { name: 'description', type: 'textarea', required: false, label: 'Description', placeholder: 'Describe the project...', icon: '📝' },
    { name: 'ownerId', type: 'hidden', required: true, value: 'current-user-id' }
  ],
  epics: [
    { name: 'name', type: 'text', required: true, label: 'Epic Name', placeholder: 'Enter epic name...', icon: '🚀' },
    { name: 'projectId', type: 'select', required: true, label: 'Project', options: 'projects', icon: '🎯' }
  ],
  stories: [
    { name: 'name', type: 'text', required: true, label: 'Story Name', placeholder: 'Enter story name (e.g., "As a user, I want to...")...', icon: '📖', aiEnabled: true },
    { name: 'epicId', type: 'select', required: true, label: 'Epic', options: 'epics', icon: '🚀' }
  ],
  tasks: [
    { name: 'name', type: 'text', required: true, label: 'Task Name', placeholder: 'Enter task name...', icon: '✅' },
    { name: 'status', type: 'select', required: true, label: 'Status', icon: '🔄',
      staticOptions: [
        { value: 'todo', label: 'To Do' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'done', label: 'Done' }
      ]
    },
    { name: 'storyId', type: 'select', required: true, label: 'Story', options: 'stories', icon: '📖' },
    { name: 'sprintId', type: 'select', required: false, label: 'Sprint (Optional)', options: 'sprints', icon: '⚡' }
  ],
  sprints: [
    { name: 'name', type: 'text', required: true, label: 'Sprint Name', placeholder: 'Enter sprint name...', icon: '⚡' },
    { name: 'startDate', type: 'date', required: true, label: 'Start Date', icon: '📅' },
    { name: 'endDate', type: 'date', required: true, label: 'End Date', icon: '📅' },
    { name: 'projectId', type: 'select', required: true, label: 'Project', options: 'projects', icon: '🎯' }
  ],
  initiatives: [
    { name: 'title', type: 'text', required: true, label: 'Initiative Title', placeholder: 'Enter initiative title...', icon: '🎪' },
    { name: 'description', type: 'textarea', required: false, label: 'Description', placeholder: 'Describe the initiative...', icon: '📝' },
    { name: 'projectId', type: 'select', required: true, label: 'Project', options: 'projects', icon: '🎯' }
  ],
  risks: [
    { name: 'description', type: 'textarea', required: true, label: 'Risk Description', placeholder: 'Describe the risk...', icon: '⚠️' },
    { name: 'probability', type: 'select', required: true, label: 'Probability (1-5)', icon: '📊',
      staticOptions: [
        { value: 1, label: '1 - Very Low' },
        { value: 2, label: '2 - Low' },
        { value: 3, label: '3 - Medium' },
        { value: 4, label: '4 - High' },
        { value: 5, label: '5 - Very High' }
      ]
    },
    { name: 'impact', type: 'select', required: true, label: 'Impact (1-5)', icon: '💥',
      staticOptions: [
        { value: 1, label: '1 - Very Low' },
        { value: 2, label: '2 - Low' },
        { value: 3, label: '3 - Medium' },
        { value: 4, label: '4 - High' },
        { value: 5, label: '5 - Very High' }
      ]
    },
    { name: 'mitigation', type: 'textarea', required: false, label: 'Mitigation Strategy', placeholder: 'How will you mitigate this risk?', icon: '🛡️' },
    { name: 'initiativeId', type: 'select', required: true, label: 'Initiative', options: 'initiatives', icon: '🎪' }
  ],
  okrs: [
    { name: 'objective', type: 'text', required: true, label: 'Objective', placeholder: 'Enter objective...', icon: '🎯' },
    { name: 'keyResult', type: 'text', required: true, label: 'Key Result', placeholder: 'Enter key result...', icon: '📈' },
    { name: 'progress', type: 'number', required: true, label: 'Progress (0-100)', min: 0, max: 100, defaultValue: 0, icon: '📊' },
    { name: 'initiativeId', type: 'select', required: true, label: 'Initiative', options: 'initiatives', icon: '🎪' }
  ]
}

export default function EntityForm({ entity, mode, initialData, relatedData }: EntityFormProps) {
  const [formData, setFormData] = useState(initialData || {})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [aiMetadata, setAiMetadata] = useState<{ provider?: string; model?: string; confidence?: number } | null>(null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [showAITips, setShowAITips] = useState(false)
  const [storyValidation, setStoryValidation] = useState<{ isValid: boolean; suggestions: string[]; acceptanceCriteria: string[] } | null>(null)
  const [showAcceptanceCriteria, setShowAcceptanceCriteria] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  const { user, token } = useAuth()
  const queryClient = useQueryClient()
  const schema = ENTITY_SCHEMAS[entity] || []
  
  // Create mutation for entity creation/update
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      console.log('Creating entity:', entity, 'payload:', payload)
      const response = await api.post(`/${entity}`, payload)
      return response.data
    },
    onSuccess: () => {
      console.log('Create successful, invalidating queries')
      queryClient.invalidateQueries({ queryKey: [entity] })
      setIsSubmitting(false)
      setSubmitError(null)
      // Reset form
      setFormData({})
    },
    onError: (error: any) => {
      console.error('Create error:', error)
      setIsSubmitting(false)
      setSubmitError(error.response?.data?.message || error.message || 'Failed to create item')
    }
  })
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: any }) => {
      console.log('Updating entity:', entity, 'id:', id, 'payload:', payload)
      const response = await api.put(`/${entity}/${id}`, payload)
      return response.data
    },
    onSuccess: () => {
      console.log('Update successful, invalidating queries')
      queryClient.invalidateQueries({ queryKey: [entity] })
      setIsSubmitting(false)
      setSubmitError(null)
    },
    onError: (error: any) => {
      console.error('Update error:', error)
      setIsSubmitting(false)
      setSubmitError(error.response?.data?.message || error.message || 'Failed to update item')
    }
  })

  // Validate story in real-time when it's a story entity and story text changes
  useEffect(() => {
    if (entity === 'stories' && formData.name && formData.name.length > 10) {
      const validation = validateAndEnhanceStory(formData.name)
      setStoryValidation(validation)
    } else {
      setStoryValidation(null)
    }
  }, [formData.name, entity])

  const handleAIGeneration = async () => {
    if (entity !== 'stories') return
    
    setIsGeneratingAI(true)
    setShowAISuggestions(true)
    
    try {
      // Get the selected epic for context
      const selectedEpic = (relatedData?.epics || []).find((epic: any) => epic.id === formData.epicId)
      const epicName = selectedEpic?.name || 'feature development'
      
      // Get project name and additional context
      const selectedProject = (relatedData?.projects || []).find((project: any) => 
        project.id === selectedEpic?.projectId
      )
      const projectName = selectedProject?.name || 'project'
      
      // Enhanced context for better AI generation
      const projectType = selectedProject?.description?.toLowerCase().includes('e-commerce') ? 'E-commerce Platform' :
                         selectedProject?.description?.toLowerCase().includes('admin') ? 'Administration System' :
                         selectedProject?.description?.toLowerCase().includes('dashboard') ? 'Analytics Dashboard' :
                         'Business Application'
      
      const userPersona = epicName.toLowerCase().includes('admin') ? 'Administrator' :
                         epicName.toLowerCase().includes('customer') ? 'Customer' :
                         epicName.toLowerCase().includes('manager') ? 'Project Manager' :
                         'End User'
      
      const result = await generateAIStory(epicName, projectName, projectType, userPersona)
      setAiSuggestions(result.suggestions)
      setAiMetadata({
        provider: result.provider,
        model: result.model,
        confidence: result.confidence
      })
    } catch (error) {
      console.error('AI generation failed:', error)
      setAiSuggestions(['Failed to generate AI suggestions. Please try again.'])
      setAiMetadata(null)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const selectAISuggestion = (suggestion: string) => {
    setFormData((prev: any) => ({ 
      ...prev, 
      name: suggestion,
      // Add metadata to track AI-generated stories
      description: prev.description || `${suggestion}\n\n✨ This story was generated with AI assistance.`
    }))
    setShowAISuggestions(false)
    // Generate acceptance criteria for the selected story
    const validation = validateAndEnhanceStory(suggestion)
    setStoryValidation(validation)
    setShowAcceptanceCriteria(true)
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !token) {
      setSubmitError('You must be logged in to perform this action')
      return
    }
    
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      let payload = { ...formData }
      
      // Handle special fields
      if (entity === 'projects') {
        // For projects, set the current user as owner
        payload = { ...payload, ownerId: user.id }
      }
      
      // Convert string numbers to actual numbers for certain fields
      const numericFields = ['probability', 'impact', 'progress']
      numericFields.forEach(field => {
        if (payload[field] !== undefined && payload[field] !== '') {
          payload[field] = parseInt(payload[field] as string)
        }
      })
      
      if (mode === 'create') {
        await createMutation.mutateAsync(payload)
      } else if (initialData?.id) {
        await updateMutation.mutateAsync({ id: initialData.id, payload })
      }
    } catch (error) {
      // Error handling is done in the mutation onError callbacks
      console.error('Form submission error:', error)
    }
  }

  const renderField = (field: any) => {
    const value = formData[field.name] || field.defaultValue || ''
    
    const updateFormData = (newValue: any) => {
      setFormData((prev: any) => ({ ...prev, [field.name]: newValue }))
    }

    const fieldClasses = "w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
    const labelClasses = "block text-sm font-semibold text-gray-700 mb-2"

    switch (field.type) {
      case 'text':
        const textFieldId = `${entity}-${field.name}-${mode}`
        return (
          <div key={field.name} className="space-y-2">
            <label htmlFor={textFieldId} className={labelClasses}>
              <span className="flex items-center gap-2">
                <span>{field.icon}</span>
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </span>
            </label>
            <div className="relative">
              <input
                id={textFieldId}
                type="text"
                name={field.name}
                required={field.required}
                value={value}
                onChange={(e) => updateFormData(e.target.value)}
                placeholder={field.aiEnabled && entity === 'stories' && mode === 'create' ? 
                  `${field.placeholder} (type manually or use AI →)` : 
                  field.placeholder}
                className={`${fieldClasses} ${field.aiEnabled && entity === 'stories' && mode === 'create' ? 'pr-16' : ''}`}
                aria-label={`${field.label}${field.required ? ' (required)' : ''}`}
              />
              {field.aiEnabled && entity === 'stories' && mode === 'create' && (
                <button
                  type="button"
                  onClick={handleAIGeneration}
                  disabled={isGeneratingAI || !formData.epicId}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-md text-xs font-medium hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                  title={!formData.epicId ? "Please select an epic first" : "Generate AI story suggestions"}
                  aria-label={!formData.epicId ? "Please select an epic first" : "Generate AI story suggestions"}
                >
                  {isGeneratingAI ? (
                    <span className="flex items-center gap-1">
                      <span className="loading-spinner-small"></span>
                      AI
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span>🤖</span>
                      AI
                    </span>
                  )}
                </button>
              )}
            </div>
            {field.aiEnabled && entity === 'stories' && mode === 'create' && (
              <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                <span>💡</span>
                <span>Type your story manually or click the AI button for intelligent suggestions</span>
              </p>
            )}
          </div>
        )
      
      case 'textarea':
        const textareaFieldId = `${entity}-${field.name}-${mode}`
        return (
          <div key={field.name} className="space-y-2">
            <label htmlFor={textareaFieldId} className={labelClasses}>
              <span className="flex items-center gap-2">
                <span>{field.icon}</span>
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </span>
            </label>
            <textarea
              id={textareaFieldId}
              name={field.name}
              required={field.required}
              value={value}
              onChange={(e) => updateFormData(e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className={fieldClasses}
              aria-label={`${field.label}${field.required ? ' (required)' : ''}`}
            />
          </div>
        )
      
      case 'number':
        const numberFieldId = `${entity}-${field.name}-${mode}`
        return (
          <div key={field.name} className="space-y-2">
            <label htmlFor={numberFieldId} className={labelClasses}>
              <span className="flex items-center gap-2">
                <span>{field.icon}</span>
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </span>
            </label>
            <input
              id={numberFieldId}
              type="number"
              name={field.name}
              required={field.required}
              value={value}
              onChange={(e) => updateFormData(parseInt(e.target.value) || 0)}
              min={field.min}
              max={field.max}
              className={fieldClasses}
              aria-label={`${field.label}${field.required ? ' (required)' : ''}`}
            />
          </div>
        )
      
      case 'date':
        const dateFieldId = `${entity}-${field.name}-${mode}`
        return (
          <div key={field.name} className="space-y-2">
            <label htmlFor={dateFieldId} className={labelClasses}>
              <span className="flex items-center gap-2">
                <span>{field.icon}</span>
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </span>
            </label>
            <input
              id={dateFieldId}
              type="date"
              name={field.name}
              required={field.required}
              value={value}
              onChange={(e) => updateFormData(e.target.value)}
              className={fieldClasses}
              aria-label={`${field.label}${field.required ? ' (required)' : ''}`}
            />
          </div>
        )
      
      case 'select':
        const options = field.staticOptions || (relatedData as any)?.[field.options] || []
        const fieldId = `${entity}-${field.name}-${mode}`
        return (
          <div key={field.name} className="space-y-2">
            <label htmlFor={fieldId} className={labelClasses}>
              <span className="flex items-center gap-2">
                <span>{field.icon}</span>
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </span>
            </label>
            <select
              id={fieldId}
              name={field.name}
              required={field.required}
              value={value}
              onChange={(e) => updateFormData(e.target.value)}
              className={fieldClasses}
              aria-label={`Select ${field.label}${field.required ? ' (required)' : ''}`}
            >
              <option value="">-- Select {field.label} --</option>
              {options.map((option: any) => (
                <option key={option.value || option.id} value={option.value || option.id}>
                  {option.label || option.name || option.title}
                </option>
              ))}
            </select>
          </div>
        )
      
      case 'hidden':
        return <input key={field.name} type="hidden" name={field.name} value={field.value} />
      
      default:
        return null
    }
  }

  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">
              {mode === 'create' ? '➕' : '✏️'}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? `Create New ${getSingularForm(entity)}` : `Edit ${getSingularForm(entity)}`}
              {entity === 'stories' && mode === 'create' && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  🤖 AI Enabled
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500">
              {mode === 'create' 
                ? `Add a new ${getSingularForm(entity)} to your workspace${entity === 'stories' ? ' - Try the AI assistant!' : ''}`
                : `Update the details of this ${getSingularForm(entity)}`
              }
            </p>
          </div>
        </div>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span className="font-medium">Error:</span>
                <span>{submitError}</span>
              </div>
            </div>
          )}
          
          {/* AI Suggestions Panel for Stories */}
          {entity === 'stories' && showAISuggestions && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <span>🤖</span>
                    AI Story Suggestions
                  </h4>
                  {aiMetadata && aiMetadata.provider && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        {aiMetadata.provider === 'openai' ? '🧠 OpenAI' : 
                         aiMetadata.provider === 'anthropic' ? '🎯 Claude' : 
                         '⚡ Local'}
                      </span>
                      {aiMetadata.confidence && (
                        <span className="text-purple-600">
                          {Math.round(aiMetadata.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAISuggestions(false)}
                  className="text-purple-600 hover:text-purple-800"
                  aria-label="Close AI suggestions panel"
                >
                  ✖️
                </button>
              </div>
              
              {isGeneratingAI ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="loading-spinner"></div>
                  <span className="text-purple-700">AI is crafting user stories for you...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="bg-white border border-purple-200 rounded-lg p-3 cursor-pointer hover:border-purple-400 hover:shadow-sm transition-all duration-200"
                      onClick={() => selectAISuggestion(suggestion)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          selectAISuggestion(suggestion)
                        }
                      }}
                      aria-label={`Use AI suggestion: ${suggestion}`}
                    >
                      <p className="text-sm text-gray-800">{suggestion}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-purple-600">
                        <span>✨</span>
                        <span>Click to use this story</span>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={handleAIGeneration}
                    className="w-full mt-2 py-2 px-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors duration-200"
                    aria-label="Generate more AI story suggestions"
                  >
                    🔄 Generate More Suggestions
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Story Validation Panel */}
          {entity === 'stories' && storyValidation && formData.name && (
            <div className={`border rounded-lg p-4 mb-6 ${storyValidation.isValid ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={storyValidation.isValid ? 'text-green-600' : 'text-amber-600'}>
                  {storyValidation.isValid ? '✅' : '⚠️'}
                </span>
                <h4 className={`text-sm font-semibold ${storyValidation.isValid ? 'text-green-800' : 'text-amber-800'}`}>
                  Story Analysis
                </h4>
              </div>
              
              {storyValidation.isValid ? (
                <p className="text-green-700 text-sm">Great! Your story follows agile best practices.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-amber-700 text-sm font-medium">Suggestions for improvement:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {storyValidation.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-amber-700 text-sm">{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAcceptanceCriteria(!showAcceptanceCriteria)}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full transition-colors duration-200"
                  aria-label={`${showAcceptanceCriteria ? 'Hide' : 'Show'} acceptance criteria`}
                >
                  📝 {showAcceptanceCriteria ? 'Hide' : 'Show'} Acceptance Criteria
                </button>
                <button
                  type="button"
                  onClick={() => setShowAITips(!showAITips)}
                  className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded-full transition-colors duration-200"
                  aria-label={`${showAITips ? 'Hide' : 'Show'} AI tips`}
                >
                  💡 {showAITips ? 'Hide' : 'Show'} AI Tips
                </button>
              </div>
            </div>
          )}

          {/* Acceptance Criteria Panel */}
          {entity === 'stories' && showAcceptanceCriteria && storyValidation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <span>📝</span>
                  Suggested Acceptance Criteria
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAcceptanceCriteria(false)}
                  className="text-blue-600 hover:text-blue-800"
                  aria-label="Close acceptance criteria panel"
                >
                  ✖️
                </button>
              </div>
              
              <div className="space-y-2">
                {storyValidation.acceptanceCriteria.map((criteria, index) => (
                  <div key={index} className="bg-white border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-gray-800">{criteria}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 <strong>Tip:</strong> Copy these acceptance criteria to your project management tool or add them as comments to ensure clear definition of "done".
                </p>
              </div>
            </div>
          )}

          {/* AI Tips Panel */}
          {entity === 'stories' && showAITips && (
            <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                  <span>💡</span>
                  AI Best Practices for User Stories
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAITips(false)}
                  className="text-green-600 hover:text-green-800"
                  aria-label="Close AI tips panel"
                >
                  ✖️
                </button>
              </div>
              
              <div className="space-y-2">
                {getAITips().map((tip, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-green-700">
                    <span className="mt-0.5">{tip.split(' ')[0]}</span>
                    <span>{tip.substring(tip.indexOf(' ') + 1)}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 p-3 bg-green-100 rounded-lg">
                <p className="text-xs text-green-700">
                  <strong>Remember:</strong> Great user stories are the foundation of successful agile development. Take time to craft them well!
                </p>
              </div>
            </div>
          )}
          
          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schema.map(renderField)}
          </div>
          

          
          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn btn-primary flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="loading-spinner"></span>
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>{mode === 'create' ? '✨' : '💾'}</span>
                  {mode === 'create' ? 'Create' : 'Update'} {getSingularForm(entity)}
                </span>
              )}
            </button>
            
            <button 
              type="button" 
              onClick={() => setFormData({})}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              <span className="flex items-center gap-2">
                <span>🔄</span>
                Reset
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

 