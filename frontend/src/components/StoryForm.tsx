import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  X,
  Bot,
  Sparkles,
  Loader2,
  Lightbulb,
  Crown,
  Rocket,
  RotateCcw,
  Save,
  RefreshCw
} from 'lucide-react';

interface Epic {
  id: string;
  name: string;
  project: {
    id: string;
    name: string;
  };
}

interface Story {
  id?: string;
  name: string;
  description?: string;
  acceptanceCriteria?: string;
  storyPoints?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  epicId?: string; // Made optional
}

interface StoryFormProps {
  story?: Story;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// AI Generation Service
const generateAIStory = async (context: { epicName?: string; projectName?: string; storyType?: string }): Promise<{ suggestions: string[]; provider?: string; confidence?: number }> => {
  try {
    const response = await fetch('http://localhost:4000/ai/generate-story', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        epicName: context.epicName || 'feature development',
        projectName: context.projectName || 'project',
        projectType: 'Business Application',
        userPersona: 'End User'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        suggestions: data.suggestions || [],
        provider: data.provider,
        confidence: data.confidence
      };
    } else {
      throw new Error('AI service unavailable');
    }
  } catch (error) {
    console.warn('AI generation failed, using fallback:', error);
    
    // Enhanced fallback templates
    const fallbackSuggestions = [
      `As a user, I want to ${context.epicName ? context.epicName.toLowerCase() : 'access the system'} so that I can accomplish my goals efficiently.`,
      `As a ${context.projectName?.toLowerCase().includes('admin') ? 'administrator' : 'user'}, I want to manage ${context.epicName || 'content'} so that I can maintain organized data.`,
      `As a stakeholder, I want to view ${context.epicName || 'analytics'} so that I can make informed decisions.`
    ];
    
    return {
      suggestions: fallbackSuggestions,
      provider: 'fallback',
      confidence: 0.7
    };
  }
};

const StoryForm: React.FC<StoryFormProps> = ({ story, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Story>({
    name: story?.name || '',
    description: story?.description || '',
    acceptanceCriteria: story?.acceptanceCriteria || '',
    storyPoints: story?.storyPoints || undefined,
    priority: story?.priority || 'medium',
    epicId: story?.epicId || undefined // Now optional
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiMetadata, setAiMetadata] = useState<{ provider?: string; confidence?: number } | null>(null);

  // Fetch epics for dropdown
  const { data: epicsData, isLoading: epicsLoading } = useQuery({
    queryKey: ['epics'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/epics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch epics');
      return response.json();
    }
  });

  const createStoryMutation = useMutation({
    mutationFn: async (storyData: Story) => {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/stories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storyData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create story');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess?.();
    }
  });

  const updateStoryMutation = useMutation({
    mutationFn: async (storyData: Story) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/stories/${story?.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storyData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update story');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess?.();
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Story name is required';
    } else if (formData.name.length > 200) {
      newErrors.name = 'Story name must be less than 200 characters';
    }

    // Epic is now optional
    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    if (formData.acceptanceCriteria && formData.acceptanceCriteria.length > 2000) {
      newErrors.acceptanceCriteria = 'Acceptance criteria must be less than 2000 characters';
    }

    if (formData.storyPoints && (formData.storyPoints < 1 || formData.storyPoints > 100)) {
      newErrors.storyPoints = 'Story points must be between 1 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (story?.id) {
        await updateStoryMutation.mutateAsync(formData);
      } else {
        await createStoryMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Story submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof Story, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAIGeneration = async () => {
    setIsGeneratingAI(true);
    setShowAIPanel(true);
    
    try {
      const selectedEpic = epicsData?.epics?.find((epic: Epic) => epic.id === formData.epicId);
      const result = await generateAIStory({
        epicName: selectedEpic?.name || 'feature development',
        projectName: selectedEpic?.project?.name || 'project',
        storyType: 'user_story'
      });
      
      setAiSuggestions(result.suggestions);
      setAiMetadata({ provider: result.provider, confidence: result.confidence });
    } catch (error) {
      console.error('AI generation failed:', error);
      setAiSuggestions(['Failed to generate AI suggestions. Please try again.']);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const selectAISuggestion = (suggestion: string) => {
    setFormData(prev => ({ ...prev, name: suggestion }));
    setShowAIPanel(false);
    
    // Auto-generate acceptance criteria based on the story
    if (suggestion.toLowerCase().includes('login')) {
      setFormData(prev => ({ 
        ...prev, 
        acceptanceCriteria: '- Given I am on the login page, When I enter valid credentials, Then I should be logged in successfully\n- Given I enter invalid credentials, When I attempt to login, Then I should see an error message\n- Given I am already logged in, When I access the login page, Then I should be redirected to the dashboard'
      }));
    }
  };

  const epics = epicsData?.epics || [];

  const priorityConfig = {
    low: {
      color: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200'
    },
    medium: {
      color: 'text-yellow-700',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200'
    },
    high: {
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-200'
    },
    critical: {
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200'
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {story?.id ? 'Edit Story' : 'Create New Story'}
                </h2>
                <p className="text-sm text-gray-500">
                  {story?.id ? 'Update your user story details' : 'Craft the perfect user story with AI assistance'}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Story Name with AI Button */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Story Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="As a [user type], I want [goal] so that [benefit]..."
                  className={`w-full pl-4 pr-20 py-3 border rounded-lg text-gray-900 placeholder-gray-400 transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300 hover:border-gray-400'
                  }`}
                />
                <motion.button
                  type="button"
                  onClick={handleAIGeneration}
                  disabled={isGeneratingAI}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-1.5 rounded-md font-medium text-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center space-x-1"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>AI</span>
                    </>
                  ) : (
                    <>
                      <Bot size={14} />
                      <span>AI</span>
                    </>
                  )}
                </motion.button>
              </div>
              {errors.name && (
                <p className="text-sm text-red-600 flex items-center space-x-1">
                  <span>⚠</span>
                  <span>{errors.name}</span>
                </p>
              )}
              <p className="text-xs text-gray-500 flex items-center space-x-1">
                <Lightbulb size={12} />
                <span>Use the AI button for intelligent story suggestions, or write your own following the user story format</span>
              </p>
            </div>

            {/* AI Suggestions Panel */}
            <AnimatePresence>
              {showAIPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-blue-900 flex items-center space-x-2">
                      <Sparkles size={16} />
                      <span>AI Story Suggestions</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAIPanel(false)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  {isGeneratingAI ? (
                    <div className="flex items-center space-x-3 py-4">
                      <Loader2 size={20} className="animate-spin text-blue-600" />
                      <span className="text-blue-700">AI is crafting perfect user stories for you...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiSuggestions.map((suggestion, index) => (
                        <motion.div
                          key={index}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => selectAISuggestion(suggestion)}
                          className="bg-white border border-blue-200 rounded-lg p-4 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all"
                        >
                          <p className="text-gray-800">{suggestion}</p>
                          <div className="mt-2 flex items-center space-x-2 text-xs text-blue-600">
                            <Sparkles size={12} />
                            <span>Click to use this story</span>
                          </div>
                        </motion.div>
                      ))}
                      
                      {aiMetadata && (
                        <div className="text-xs text-gray-500 flex items-center justify-between pt-2 border-t border-blue-200">
                          <span>Generated by {aiMetadata.provider || 'AI'}</span>
                          {aiMetadata.confidence && (
                            <span>Confidence: {Math.round((aiMetadata.confidence || 0) * 100)}%</span>
                          )}
                        </div>
                      )}
                      
                      <motion.button
                        type="button"
                        onClick={handleAIGeneration}
                        whileHover={{ scale: 1.02 }}
                        className="w-full mt-3 py-2 px-4 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        <RefreshCw size={14} />
                        <span>Generate More Suggestions</span>
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Epic Selection - Now Optional */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Epic <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={formData.epicId || ''}
                onChange={(e) => handleInputChange('epicId', e.target.value || undefined)}
                disabled={epicsLoading}
                className="w-full px-4 py-3 border border-gray-300 hover:border-gray-400 rounded-lg text-gray-900 transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">
                  Independent Story (No Epic)
                </option>
                {epics.map((epic: Epic) => (
                  <option key={epic.id} value={epic.id}>
                    {epic.name} ({epic.project.name})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 flex items-center space-x-1">
                <Lightbulb size={12} />
                <span>Stories can now exist independently or be linked to an epic</span>
              </p>
            </div>

            {/* Priority and Story Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['low', 'medium', 'high', 'critical'] as const).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => handleInputChange('priority', priority)}
                      className={`p-3 rounded-lg border font-medium transition-all capitalize ${
                        formData.priority === priority
                          ? `${priorityConfig[priority].bg} ${priorityConfig[priority].color} ${priorityConfig[priority].border}`
                          : 'border-gray-300 hover:border-gray-400 bg-white text-gray-700'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Story Points
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.storyPoints || ''}
                  onChange={(e) => handleInputChange('storyPoints', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="1-100"
                  className={`w-full px-4 py-3 border rounded-lg text-gray-900 transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.storyPoints ? 'border-red-300' : 'border-gray-300 hover:border-gray-400'
                  }`}
                />
                {errors.storyPoints && (
                  <p className="text-sm text-red-600">{errors.storyPoints}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Provide additional context, business value, or implementation notes..."
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none ${
                  errors.description ? 'border-red-300' : 'border-gray-300 hover:border-gray-400'
                }`}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* Acceptance Criteria */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Acceptance Criteria
              </label>
              <textarea
                value={formData.acceptanceCriteria}
                onChange={(e) => handleInputChange('acceptanceCriteria', e.target.value)}
                placeholder="- Given [context], when [action], then [outcome]&#10;- Feature should handle [edge case]&#10;- User should see [feedback]"
                rows={5}
                className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none ${
                  errors.acceptanceCriteria ? 'border-red-300' : 'border-gray-300 hover:border-gray-400'
                }`}
              />
              {errors.acceptanceCriteria && (
                <p className="text-sm text-red-600">{errors.acceptanceCriteria}</p>
              )}
              <p className="text-xs text-gray-500 flex items-center space-x-1">
                <Lightbulb size={12} />
                <span>Use Given-When-Then format for clear, testable criteria</span>
              </p>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center space-x-1">
              <Save size={14} />
              <span>Auto-saved as draft</span>
            </span>
            <span>⌘+Enter to save</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <motion.button
              type="button"
              onClick={onCancel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{story?.id ? 'Update Story' : 'Create Story'}</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StoryForm; 