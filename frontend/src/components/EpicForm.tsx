import React, { useState, useEffect } from 'react'
import { api } from '../api/client'

interface Project {
  id: string
  name: string
  description?: string
}

interface EpicFormProps {
  onSuccess?: (epic: any) => void
  onCancel?: () => void
  initialData?: {
    id?: string
    name?: string
    description?: string
    projectId?: string
  }
  mode?: 'create' | 'edit'
}

export default function EpicForm({ onSuccess, onCancel, initialData, mode = 'create' }: EpicFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    projectId: initialData?.projectId || ''
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingProjects, setLoadingProjects] = useState(true)

  // Load projects for the dropdown
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await api.get('/projects')
        setProjects(response.data.projects || [])
      } catch (err: any) {
        console.error('Failed to load projects:', err)
        setError('Failed to load projects')
      } finally {
        setLoadingProjects(false)
      }
    }

    loadProjects()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'create') {
        const response = await api.post('/epics', formData)
        onSuccess?.(response.data.epic)
      } else {
        const response = await api.put(`/epics/${initialData?.id}`, {
          name: formData.name,
          description: formData.description
        })
        onSuccess?.(response.data.epic)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${mode} epic`)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (loadingProjects) {
    return (
      <div className="epic-form-loading">
        <div className="loading-spinner"></div>
        <p>Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="epic-form-container">
      <div className="epic-form-header">
        <h2 className="epic-form-title">
          {mode === 'create' ? '🚀 Create New Epic' : '✏️ Edit Epic'}
        </h2>
        <p className="epic-form-subtitle">
          {mode === 'create' 
            ? 'Epics represent large features or initiatives that span multiple user stories'
            : 'Update the epic details below'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="epic-form">
        {error && (
          <div className="form-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Epic Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g., User Authentication System"
            required
            maxLength={200}
          />
          <div className="form-hint">
            Choose a clear, descriptive name for your epic
          </div>
        </div>

        {mode === 'create' && (
          <div className="form-group">
            <label htmlFor="projectId" className="form-label">
              Project *
            </label>
            <select
              id="projectId"
              name="projectId"
              value={formData.projectId}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select a project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <div className="form-hint">
              Choose which project this epic belongs to
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-textarea"
            placeholder="Describe the epic's goals, scope, and expected outcomes..."
            rows={4}
            maxLength={1000}
          />
          <div className="form-hint">
            Optional: Provide additional context and goals for this epic
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !formData.name.trim() || (mode === 'create' && !formData.projectId)}
          >
            {loading ? (
              <>
                <span className="loading-spinner-small"></span>
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <span>{mode === 'create' ? '🚀' : '✏️'}</span>
                {mode === 'create' ? 'Create Epic' : 'Update Epic'}
              </>
            )}
          </button>
        </div>
      </form>

      <style jsx>{`
        .epic-form-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .epic-form-header {
          margin-bottom: 2rem;
          text-align: center;
        }

        .epic-form-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .epic-form-subtitle {
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .epic-form-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 3rem;
          color: #6b7280;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .form-hint {
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .form-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .loading-spinner,
        .loading-spinner-small {
          width: 1rem;
          height: 1rem;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-spinner {
          width: 2rem;
          height: 2rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
} 