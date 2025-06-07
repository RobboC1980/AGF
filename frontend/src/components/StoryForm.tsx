import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';

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
  epicId: string;
}

interface StoryFormProps {
  story?: Story;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const StoryForm: React.FC<StoryFormProps> = ({ story, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Story>({
    name: story?.name || '',
    description: story?.description || '',
    acceptanceCriteria: story?.acceptanceCriteria || '',
    storyPoints: story?.storyPoints || undefined,
    priority: story?.priority || 'medium',
    epicId: story?.epicId || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch epics for dropdown
  const { data: epicsData, isLoading: epicsLoading } = useQuery({
    queryKey: ['epics'],
    queryFn: () => apiClient.getEpics(),
  });

  const createStoryMutation = useMutation({
    mutationFn: async (storyData: Story) => {
      return apiClient.createStory(storyData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess?.();
    }
  });

  const updateStoryMutation = useMutation({
    mutationFn: async (storyData: Story) => {
      if (!story?.id) throw new Error('Story ID missing');
      return apiClient.updateStory(story.id, storyData);
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

    if (!formData.epicId) {
      newErrors.epicId = 'Epic selection is required';
    }

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

  const epics = epicsData?.epics || [];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '1rem'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            {story?.id ? 'Edit Story' : 'Create New Story'}
          </h2>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Story Name */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Story Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter story name..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${errors.name ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = errors.name ? '#ef4444' : '#d1d5db'}
            />
            {errors.name && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                {errors.name}
              </p>
            )}
          </div>

          {/* Epic Selection */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Epic *
            </label>
            <select
              value={formData.epicId}
              onChange={(e) => handleInputChange('epicId', e.target.value)}
              disabled={epicsLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${errors.epicId ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none',
                backgroundColor: 'white',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select an epic...</option>
              {epics.map((epic: Epic) => (
                <option key={epic.id} value={epic.id}>
                  {epic.name} ({epic.project.name})
                </option>
              ))}
            </select>
            {errors.epicId && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                {errors.epicId}
              </p>
            )}
          </div>

          {/* Priority and Story Points Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  outline: 'none',
                  backgroundColor: 'white',
                  boxSizing: 'border-box'
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Story Points
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.storyPoints || ''}
                onChange={(e) => handleInputChange('storyPoints', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="1-100"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.storyPoints ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {errors.storyPoints && (
                <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  {errors.storyPoints}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="As a [user type], I want [goal] so that [benefit]..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${errors.description ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
            {errors.description && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                {errors.description}
              </p>
            )}
          </div>

          {/* Acceptance Criteria */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Acceptance Criteria
            </label>
            <textarea
              value={formData.acceptanceCriteria}
              onChange={(e) => handleInputChange('acceptanceCriteria', e.target.value)}
              placeholder="- Given [context], when [action], then [outcome]&#10;- Feature should handle [edge case]&#10;- User should see [feedback]"
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${errors.acceptanceCriteria ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
            {errors.acceptanceCriteria && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                {errors.acceptanceCriteria}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: isSubmitting ? '#9ca3af' : '#3b82f6',
                color: 'white',
                fontSize: '1rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseOut={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              {isSubmitting ? 'Saving...' : (story?.id ? 'Update Story' : 'Create Story')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoryForm; 