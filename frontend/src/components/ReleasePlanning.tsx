import React, { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { api } from '../api/client'

interface Release {
  id: string
  name: string
  version: string
  startDate: string
  targetDate: string
  actualDate?: string
  description?: string
  status: 'planning' | 'in-progress' | 'testing' | 'released' | 'cancelled'
  epics: Epic[]
  totalStoryPoints: number
  completedStoryPoints: number
  confidence: number
  risks: Risk[]
}

interface Epic {
  id: string
  name: string
  description?: string
  storyPoints: number
  completedStoryPoints: number
  status: 'not-started' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  dependencies: string[]
  stories: Story[]
  releaseId?: string
}

interface Story {
  id: string
  name: string
  storyPoints?: number
  status: string
}

interface Risk {
  id: string
  description: string
  probability: number
  impact: number
  mitigation?: string
  status: 'open' | 'mitigated' | 'closed'
}

interface TeamCapacity {
  teamName: string
  sprintCapacity: number
  availablePoints: number
  allocatedPoints: number
}

interface ReleasePlanningProps {
  projectId: string
}

export default function ReleasePlanning({ projectId }: ReleasePlanningProps) {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'roadmap' | 'timeline' | 'capacity'>('roadmap')
  const [showCreateRelease, setShowCreateRelease] = useState(false)
  const [timeHorizon, setTimeHorizon] = useState<'quarter' | 'year' | 'all'>('year')

  // Fetch releases
  const { data: releases = [], isLoading: releasesLoading } = useQuery<Release[]>({
    queryKey: ['releases', projectId],
    queryFn: async () => {
      const response = await api.get(`/releases?projectId=${projectId}`)
      return response.data
    }
  })

  // Fetch unassigned epics
  const { data: unassignedEpics = [], isLoading: epicsLoading } = useQuery<Epic[]>({
    queryKey: ['unassigned-epics', projectId],
    queryFn: async () => {
      const response = await api.get(`/epics?projectId=${projectId}&unassigned=true`)
      return response.data
    }
  })

  // Create release mutation
  const createReleaseMutation = useMutation({
    mutationFn: async (releaseData: Partial<Release>) => {
      const response = await api.post('/releases', releaseData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases', projectId] })
      setShowCreateRelease(false)
    }
  })

  // Calculate release progress
  const calculateProgress = (release: Release) => {
    if (release.totalStoryPoints === 0) return 0
    return Math.round((release.completedStoryPoints / release.totalStoryPoints) * 100)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return '#6b7280'
      case 'in-progress': return '#3b82f6'
      case 'testing': return '#f59e0b'
      case 'released': return '#10b981'
      case 'cancelled': return '#ef4444'
      default: return '#6b7280'
    }
  }

  if (releasesLoading || epicsLoading) {
    return (
      <div className="release-planning-loading">
        <div className="loading-spinner"></div>
        <p>Loading release planning...</p>
      </div>
    )
  }

  return (
    <div className="release-planning">
      <div className="release-planning-header">
        <div className="release-planning-title">
          <h2>🚀 Release Planning</h2>
          <p>Plan and track releases with epic assignments and capacity management</p>
        </div>

        <div className="release-planning-controls">
          <div className="view-controls">
            <label>View:</label>
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)}>
              <option value="roadmap">Roadmap</option>
              <option value="timeline">Timeline</option>
              <option value="capacity">Capacity Planning</option>
            </select>
          </div>

          <button 
            onClick={() => setShowCreateRelease(true)}
            className="btn btn-primary"
          >
            ➕ Create Release
          </button>
        </div>
      </div>

      {viewMode === 'roadmap' && (
        <div className="release-roadmap">
          <div className="releases-container">
            {releases.map(release => (
              <div key={release.id} className="release-column">
                <div className="release-header">
                  <div className="release-title">
                    <h3>{release.name}</h3>
                    <span className="release-version">v{release.version}</span>
                  </div>
                  
                  <div className="release-meta">
                    <div className="release-status" style={{ backgroundColor: getStatusColor(release.status) }}>
                      {release.status}
                    </div>
                    <div className="release-date">
                      📅 {new Date(release.targetDate).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="release-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${calculateProgress(release)}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {calculateProgress(release)}% ({release.completedStoryPoints}/{release.totalStoryPoints} points)
                    </span>
                  </div>
                </div>

                <div className="epic-list">
                  {release.epics.map((epic) => (
                    <div key={epic.id} className="epic-card">
                      <div className="epic-header">
                        <div className="epic-title">{epic.name}</div>
                        <div className="epic-points">{epic.storyPoints}sp</div>
                      </div>
                      <div className="epic-progress">
                        <div className="progress-bar small">
                          <div 
                            className="progress-fill"
                            style={{ width: `${(epic.completedStoryPoints / epic.storyPoints) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateRelease && (
        <CreateReleaseModal
          projectId={projectId}
          onClose={() => setShowCreateRelease(false)}
          onSubmit={(releaseData) => createReleaseMutation.mutate(releaseData)}
          isLoading={createReleaseMutation.isPending}
        />
      )}
    </div>
  )
}

interface CreateReleaseModalProps {
  projectId: string
  onClose: () => void
  onSubmit: (data: Partial<Release>) => void
  isLoading: boolean
}

function CreateReleaseModal({ projectId, onClose, onSubmit, isLoading }: CreateReleaseModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    startDate: '',
    targetDate: '',
    description: '',
    status: 'planning' as const
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      startDate: new Date(formData.startDate).toISOString(),
      targetDate: new Date(formData.targetDate).toISOString(),
      totalStoryPoints: 0,
      completedStoryPoints: 0,
      confidence: 80,
      epics: [],
      risks: []
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Create New Release</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Release Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="e.g., Mobile App v2.0"
            />
          </div>
          
          <div className="form-group">
            <label>Version</label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
              required
              placeholder="e.g., 2.0.0"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Target Date</label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Describe the goals and scope of this release..."
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? 'Creating...' : 'Create Release'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 