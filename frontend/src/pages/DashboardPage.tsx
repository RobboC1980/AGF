import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../services/api'

interface DashboardStats {
  message: string
  stats: {
    projects: number
    epics: number
    stories: number
    tasks: number
    sprints: number
    initiatives: number
    risks: number
    okrs: number
  }
  timestamp?: string
}

const ENTITY_METADATA = {
  projects: { icon: '🎯', title: 'Projects', description: 'Active project portfolio', color: 'stat-icon-blue' },
  epics: { icon: '🚀', title: 'Epics', description: 'Large feature initiatives', color: 'stat-icon-purple' },
  stories: { icon: '📖', title: 'Stories', description: 'User requirements', color: 'stat-icon-green' },
  tasks: { icon: '✅', title: 'Tasks', description: 'Work items', color: 'stat-icon-orange' },
  sprints: { icon: '⚡', title: 'Sprints', description: 'Active iterations', color: 'stat-icon-yellow' },
  initiatives: { icon: '🎪', title: 'Initiatives', description: 'Strategic goals', color: 'stat-icon-pink' },
  risks: { icon: '⚠️', title: 'Risks', description: 'Project risks', color: 'stat-icon-red' },
  okrs: { icon: '🎯', title: 'OKRs', description: 'Objectives & Key Results', color: 'stat-icon-indigo' }
}

export default function DashboardPage() {
  // Use React Query directly instead of custom hook
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.getDashboard(),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  })

  console.log('Dashboard React Query state:', { data, isLoading, error })

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div className="welcome-content">
            <div className="welcome-text">
              <h1 className="welcome-greeting">Welcome to AgileForge</h1>
              <p className="welcome-subtitle">Your agile project management hub</p>
            </div>
            <div className="welcome-icon-container">
              <div className="welcome-rocket">🚀</div>
            </div>
          </div>
        </div>
        
        <div className="dashboard-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">Dashboard data temporarily unavailable. Error: {error instanceof Error ? error.message : 'Unknown error'}</span>
        </div>

        <div className="getting-started">
          <div className="getting-started-content">
            <div className="getting-started-icon">🎯</div>
            <h2 className="getting-started-title">Get Started with AgileForge</h2>
            <p className="getting-started-description">
              Begin your agile journey by creating your first project, or explore the different modules to understand how AgileForge can streamline your workflow.
            </p>
            <div className="getting-started-actions">
              <Link to="/projects" className="btn btn-primary btn-lg">
                <span>🎯</span>
                Create Your First Project
              </Link>
              <Link to="/stories" className="btn btn-secondary btn-lg">
                <span>📖</span>
                Explore Stories
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="welcome-content">
          <div className="welcome-text">
            <h1 className="welcome-greeting">Welcome to AgileForge</h1>
            <p className="welcome-subtitle">{data?.message || 'Manage your agile workflow efficiently'}</p>
          </div>
          <div className="welcome-icon-container">
            <div className="welcome-rocket">🚀</div>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="dashboard-section">
        <h2 className="section-title">📊 Project Overview</h2>
        <div className="stats-grid">
          {data && data.stats && Object.entries(data.stats).map(([key, value]) => {
            const metadata = ENTITY_METADATA[key as keyof typeof ENTITY_METADATA]
            return (
              <Link key={key} to={`/${key}`} className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-header">
                    <div className={`stat-icon ${metadata.color}`}>
                      <span>{metadata.icon}</span>
                    </div>
                    <div className="stat-value">{value as number}</div>
                  </div>
                  <h3 className="stat-title">{metadata.title}</h3>
                  <p className="stat-description">{metadata.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2 className="section-title">⚡ Quick Actions</h2>
        <div className="quick-actions-grid">
          <Link to="/projects" className="quick-action-card">
            <div className="quick-action-content">
              <div className="quick-action-icon">🎯</div>
              <h3 className="quick-action-title">New Project</h3>
              <p className="quick-action-description">Start a new project and organize your work</p>
            </div>
          </Link>
          
          <Link to="/stories" className="quick-action-card">
            <div className="quick-action-content">
              <div className="quick-action-icon">📖</div>
              <h3 className="quick-action-title">Create Story</h3>
              <p className="quick-action-description">Add user stories with AI assistance</p>
            </div>
          </Link>
          
          <Link to="/sprints" className="quick-action-card">
            <div className="quick-action-content">
              <div className="quick-action-icon">⚡</div>
              <h3 className="quick-action-title">Plan Sprint</h3>
              <p className="quick-action-description">Organize work into time-boxed sprints</p>
            </div>
          </Link>
          
          <Link to="/tasks" className="quick-action-card">
            <div className="quick-action-content">
              <div className="quick-action-icon">✅</div>
              <h3 className="quick-action-title">Track Tasks</h3>
              <p className="quick-action-description">Monitor individual work items</p>
            </div>
          </Link>
          
          <Link to="/entity-demo" className="quick-action-card advanced-workflow">
            <div className="quick-action-content">
              <div className="quick-action-icon">🚀</div>
              <h3 className="quick-action-title">Entity Management</h3>
              <p className="quick-action-description">Modern entity list views with advanced filtering and sorting</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Activity Summary */}
      {data && (
        <div className="dashboard-section">
          <h2 className="section-title">📈 Activity Summary</h2>
          <div className="activity-summary">
            <div className="activity-stats">
              <div className="activity-stat">
                <div className="activity-icon">📊</div>
                <div className="activity-value">{Object.values(data.stats).reduce((a, b) => (a as number) + (b as number), 0) as React.ReactNode}</div>
                <p className="activity-label">Total Items</p>
              </div>
              
              <div className="activity-stat">
                <div className="activity-icon">⚡</div>
                <div className="activity-value">{data.stats.sprints}</div>
                <p className="activity-label">Active Sprints</p>
              </div>
              
              <div className="activity-stat">
                <div className="activity-icon">🎯</div>
                <div className="activity-value">{data.stats.projects}</div>
                <p className="activity-label">Active Projects</p>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                📅 Last updated: {new Date((data as any).timestamp || Date.now()).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
