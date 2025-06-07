import React, { useState, useEffect } from 'react'
import { useParams, Form, useNavigation, useNavigate } from 'react-router-dom'
import EntityTable from '../components/EntityTable'
import EntityForm from '../components/EntityForm'
import EpicForm from '../components/EpicForm'
import StoryForm from '../components/StoryForm'
import TaskForm from '../components/TaskForm'
import { Entity } from '../hooks/useEntity'
import { apiClient } from '../services/api'
import { useAuth } from '../store/useAuth'
import { useApi } from '../hooks/useApi'

interface LoaderResult {
  entity: Entity
  data: any[]
  relatedData: {
    projects?: any[]
    epics?: any[]
    stories?: any[]
    initiatives?: any[]
    sprints?: any[]
  }
}



const ENTITY_METADATA = {
  projects: { icon: '🎯', title: 'Projects', description: 'Manage your project portfolio' },
  epics: { icon: '🚀', title: 'Epics', description: 'Large features and initiatives' },
  stories: { icon: '📖', title: 'Stories', description: 'User stories and requirements' },
  tasks: { icon: '✅', title: 'Tasks', description: 'Individual work items' },
  sprints: { icon: '⚡', title: 'Sprints', description: 'Time-boxed iterations' },
  initiatives: { icon: '🎪', title: 'Initiatives', description: 'Strategic business goals' },
  risks: { icon: '⚠️', title: 'Risks', description: 'Project risks and mitigation' },
  okrs: { icon: '🎯', title: 'OKRs', description: 'Objectives and Key Results' }
}

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

export default function EntityListPage() {
  const params = useParams()
  const entity = params.entity as Entity
  const nav = useNavigation()
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [editingItem, setEditingItem] = useState<any>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Check authentication
  useEffect(() => {
    console.log('EntityListPage - checking auth:', { user: !!user, token: !!token })
    if (!user || !token) {
      console.log('User not authenticated, redirecting to login')
      navigate('/login', { replace: true })
      return
    }
    
    // Set the token in the API client
    console.log('Setting auth token on API client')
    apiClient.setToken(token)
  }, [user, token, navigate])
  
  // Fetch main entity data using our custom hook
  const { data: entityResponse, loading: isLoading, error, refetch } = useApi<any>(() => {
    console.log(`Fetching data for ${entity}...`)
    
    switch (entity) {
      case 'projects':
        return apiClient.getProjects()
      case 'epics':
        return apiClient.getEpics()
      case 'stories':
        return apiClient.getStories()
      case 'tasks':
        return apiClient.getTasks()
      case 'sprints':
        return apiClient.getSprints()
      default:
        throw new Error(`Entity ${entity} not supported yet`)
    }
  }, [entity, token, user])
  
  // Extract the array from the response
  const entityData = entityResponse ? (entityResponse as any)[entity] || [] : []

  // Fetch related data for dropdowns
  const relationships = {
    epics: ['projects'],
    stories: ['epics'],
    tasks: ['stories', 'sprints'],
    sprints: ['projects'],
    initiatives: ['projects'],
    risks: ['initiatives'],
    okrs: ['initiatives']
  }
  
  const requiredRelations = (relationships as any)[entity] || []
  
  // Fetch related data based on entity relationships
  const { data: projectsData } = useApi<any>(() => {
    if (requiredRelations.includes('projects')) {
      return apiClient.getProjects()
    }
    return Promise.resolve(null)
  }, [entity, requiredRelations])

  const { data: epicsData } = useApi<any>(() => {
    if (requiredRelations.includes('epics')) {
      return apiClient.getEpics()
    }
    return Promise.resolve(null)
  }, [entity, requiredRelations])

  const { data: storiesData } = useApi<any>(() => {
    if (requiredRelations.includes('stories')) {
      return apiClient.getStories()
    }
    return Promise.resolve(null)
  }, [entity, requiredRelations])

  const { data: sprintsData } = useApi<any>(() => {
    if (requiredRelations.includes('sprints')) {
      return apiClient.getSprints()
    }
    return Promise.resolve(null)
  }, [entity, requiredRelations])

  // Build relatedData object
  const relatedData = {
    projects: projectsData?.projects || [],
    epics: epicsData?.epics || [],
    stories: storiesData?.stories || [],
    sprints: sprintsData?.sprints || []
  }
  
  const metadata = ENTITY_METADATA[entity] || { icon: '📋', title: entity, description: `Manage ${entity}` }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="entity-page">
        <div className="entity-header">
          <div className="entity-header-content">
            <div className="entity-icon">
              <span>{metadata.icon}</span>
            </div>
            <div className="entity-title-section">
              <h1 className="entity-title">{metadata.title}</h1>
              <p className="entity-description">{metadata.description}</p>
            </div>
          </div>
        </div>
        
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading {entity}...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="entity-page">
        <div className="entity-header">
          <div className="entity-header-content">
            <div className="entity-icon">
              <span>{metadata.icon}</span>
            </div>
            <div className="entity-title-section">
              <h1 className="entity-title">{metadata.title}</h1>
              <p className="entity-description">{metadata.description}</p>
            </div>
          </div>
        </div>
        
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Error loading data</h3>
          <p>{(error as any)?.message || 'Failed to load data'}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Try again
          </button>
        </div>
      </div>
    )
  }

  // Filter data based on search and status
  const filteredData = entityData.filter((item: any) => {
    const matchesSearch = !searchQuery || 
      Object.values(item).some((value: any) => 
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && !item.archived) ||
      (statusFilter === 'archived' && item.archived) ||
      (item.status && item.status === statusFilter)
    
    return matchesSearch && matchesStatus
  })

  const getStatusOptions = () => {
    if (entity === 'tasks') {
      return [
        { value: 'all', label: 'All Tasks' },
        { value: 'todo', label: 'To Do' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'done', label: 'Done' }
      ]
    }
    return [
      { value: 'all', label: 'All Items' },
      { value: 'active', label: 'Active' },
      { value: 'archived', label: 'Archived' }
    ]
  }

  // Form handlers
  const handleFormSuccess = () => {
    setShowCreateForm(false)
    setEditingItem(null)
    // Refetch data after form success
    refetch()
  }

  const handleFormCancel = () => {
    setShowCreateForm(false)
    setEditingItem(null)
  }

  // Legacy epic handler for backward compatibility
  const handleEpicSuccess = (epic: any) => {
    handleFormSuccess()
  }
  
  return (
    <div className="entity-page">
      {/* Page Header */}
      <div className="entity-header">
        <div className="entity-header-content">
          <div className="entity-icon">
            <span>{metadata.icon}</span>
          </div>
          <div className="entity-title-section">
            <h1 className="entity-title">{metadata.title}</h1>
            <p className="entity-description">{metadata.description}</p>
          </div>
          <div className="entity-stats">
            <div className="stat-value">{entityData.length}</div>
            <div className="stat-label">Total {entity}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="entity-controls">
        {/* Search and Filter */}
        <div className="controls-left">
          <div className="search-wrapper">
            <div className="search-input-group">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder={`Search ${entity}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-field"
                aria-label={`Search ${entity}`}
                id={`search-${entity}`}
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
            aria-label={`Filter ${entity} by status`}
          >
            {getStatusOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="controls-right">
          <button 
            onClick={() => {
              setShowCreateForm(!showCreateForm)
              setEditingItem(null)
            }}
            className={`btn ${showCreateForm ? 'btn-secondary' : 'btn-primary'}`}
            aria-label={showCreateForm ? `Cancel creating new ${getSingularForm(entity)}` : `Add new ${getSingularForm(entity)}`}
          >
            <span>{showCreateForm ? '✖️' : '➕'}</span>
            {showCreateForm ? 'Cancel' : `Add ${getSingularForm(entity)}`}
          </button>
          
          <button 
            className="btn btn-secondary"
            aria-label={`Export ${entity} data`}
          >
            <span>📥</span>
            Export
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        <div className="summary-content">
          <span className="summary-icon">📊</span>
          <span className="summary-text">
            Showing <strong>{filteredData.length}</strong> of <strong>{entityData.length}</strong> {entity}
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="clear-search-btn"
              aria-label="Clear search query"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="form-section animate-fade-in">
          {entity === 'epics' ? (
            <EpicForm 
              mode="create"
              onSuccess={handleEpicSuccess}
              onCancel={handleFormCancel}
            />
          ) : entity === 'stories' ? (
            <StoryForm 
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          ) : entity === 'tasks' ? (
            <TaskForm 
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          ) : (
            <EntityForm 
              entity={entity}
              mode="create"
              relatedData={relatedData}
            />
          )}
        </div>
      )}
      
      {/* Edit Form */}
      {editingItem && (
        <div className="form-section animate-fade-in">
          <div className="edit-banner">
            <div className="edit-banner-content">
              <span className="edit-icon">✏️</span>
              <span className="edit-text">
                Editing: {editingItem.name || editingItem.title || editingItem.objective}
              </span>
              <button
                onClick={() => setEditingItem(null)}
                className="edit-close-btn"
                aria-label="Close edit form"
              >
                ✖️
              </button>
            </div>
          </div>
          {entity === 'epics' ? (
            <EpicForm 
              mode="edit"
              initialData={editingItem}
              onSuccess={handleEpicSuccess}
              onCancel={handleFormCancel}
            />
          ) : entity === 'stories' ? (
            <StoryForm 
              story={editingItem}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          ) : entity === 'tasks' ? (
            <TaskForm 
              task={editingItem}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          ) : (
            <EntityForm 
              entity={entity}
              mode="edit"
              initialData={editingItem}
              relatedData={relatedData}
            />
          )}
        </div>
      )}

      {/* No Results */}
      {filteredData.length === 0 && entityData.length > 0 && (
        <div className="no-results-state">
          <div className="no-results-icon">🔍</div>
          <h3>No results found</h3>
          <p>Try adjusting your search or filter criteria</p>
          <button
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('all')
            }}
            className="btn btn-secondary"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Empty State */}
      {entityData.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">{metadata.icon}</div>
          <h3 className="empty-state-title">No {entity} yet</h3>
          <p className="empty-state-description">
            Get started by creating your first {getSingularForm(entity)}. 
            It's quick and easy!
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary btn-lg"
          >
            <span>✨</span>
            Create your first {getSingularForm(entity)}
          </button>
        </div>
      )}

      {/* Data Table */}
      {filteredData.length > 0 && (
        <div className="table-section animate-fade-in">
          <EntityTable
            data={filteredData}
            onDelete={(row) => {
              if (confirm(`Are you sure you want to delete this ${getSingularForm(entity)}? This action cannot be undone.`)) {
                const form = document.createElement('form')
                form.method = 'post'
                form.style.display = 'none'
                const idInput = document.createElement('input')
                idInput.name = 'id'
                idInput.value = (row as any).id
                form.appendChild(idInput)
                const intentInput = document.createElement('input')
                intentInput.name = 'intent'
                intentInput.value = 'delete'
                form.appendChild(intentInput)
                document.body.appendChild(form)
                form.submit()
              }
            }}
            onEdit={(row) => {
              setEditingItem(row)
              setShowCreateForm(false)
              // Scroll to top to show the edit form
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        </div>
      )}
      
      {/* Loading Overlay */}
      {nav.state === 'submitting' && (
        <div className="loading-overlay">
          <div className="loading-modal">
            <div className="loading-spinner"></div>
            <span>Processing...</span>
          </div>
        </div>
      )}
    </div>
  )
}
