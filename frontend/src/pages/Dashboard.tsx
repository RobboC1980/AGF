import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../store/useAuth'

interface DashboardStats {
  projects: number
  epics: number
  stories: number
  tasks: number
  sprints: number
  initiatives: number
  risks: number
  okrs: number
}

interface QuickAction {
  title: string
  description: string
  icon: string
  href: string
  color: string
}

const quickActions: QuickAction[] = [
  {
    title: 'New Project',
    description: 'Start a new project',
    icon: '🎯',
    href: '/projects',
    color: 'blue'
  },
  {
    title: 'Create Epic',
    description: 'Add a large feature',
    icon: '🚀',
    href: '/epics',
    color: 'purple'
  },
  {
    title: 'Add Story',
    description: 'Create user story',
    icon: '📖',
    href: '/stories',
    color: 'green'
  },
  {
    title: 'Plan Sprint',
    description: 'Schedule iteration',
    icon: '⚡',
    href: '/sprints',
    color: 'yellow'
  }
]

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const response = await api.get('/dashboard')
        setStats(response.data.stats)
        setError(null)
      } catch (err: any) {
        console.error('Failed to load dashboard:', err)
        setError('Failed to load dashboard data')
        // Fallback stats
        setStats({
          projects: 0,
          epics: 0,
          stories: 0,
          tasks: 0,
          sprints: 0,
          initiatives: 0,
          risks: 0,
          okrs: 0
        })
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '🌅 Good Morning'
    if (hour < 18) return '☀️ Good Afternoon'
    return '🌙 Good Evening'
  }

  const getStatCards = () => {
    if (!stats) return []
    
    return [
      { 
        title: 'Projects', 
        value: stats.projects, 
        icon: '🎯', 
        href: '/projects',
        color: 'blue',
        description: 'Active projects'
      },
      { 
        title: 'Epics', 
        value: stats.epics, 
        icon: '🚀', 
        href: '/epics',
        color: 'purple',
        description: 'Large features'
      },
      { 
        title: 'Stories', 
        value: stats.stories, 
        icon: '📖', 
        href: '/stories',
        color: 'green',
        description: 'User stories'
      },
      { 
        title: 'Tasks', 
        value: stats.tasks, 
        icon: '✅', 
        href: '/tasks',
        color: 'orange',
        description: 'Work items'
      },
      { 
        title: 'Sprints', 
        value: stats.sprints, 
        icon: '⚡', 
        href: '/sprints',
        color: 'yellow',
        description: 'Iterations'
      },
      { 
        title: 'Initiatives', 
        value: stats.initiatives, 
        icon: '🎪', 
        href: '/initiatives',
        color: 'pink',
        description: 'Strategic goals'
      },
      { 
        title: 'Risks', 
        value: stats.risks, 
        icon: '⚠️', 
        href: '/risks',
        color: 'red',
        description: 'Project risks'
      },
      { 
        title: 'OKRs', 
        value: stats.okrs, 
        icon: '🎯', 
        href: '/okrs',
        color: 'indigo',
        description: 'Objectives'
      }
    ]
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      {/* Welcome Section */}
      <div className="dashboard-header">
        <div className="welcome-content">
          <div className="welcome-text">
            <h1 className="welcome-greeting">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="welcome-subtitle">
              Ready to tackle your agile workflow today?
            </p>
          </div>
          <div className="welcome-icon-container">
            <div className="welcome-rocket">🚀</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="dashboard-section">
        <h2 className="section-title">📊 Overview</h2>
        <div className="stats-grid">
          {getStatCards().map((stat) => (
            <Link
              key={stat.title}
              to={stat.href}
              className="stat-card"
            >
              <div className="stat-card-content">
                <div className="stat-header">
                  <div className={`stat-icon stat-icon-${stat.color}`}>
                    <span>{stat.icon}</span>
                  </div>
                  <div className="stat-value">{stat.value}</div>
                </div>
                <h3 className="stat-title">{stat.title}</h3>
                <p className="stat-description">{stat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2 className="section-title">⚡ Quick Actions</h2>
        <div className="quick-actions-grid">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.href}
              className="quick-action-card"
            >
              <div className="quick-action-content">
                <div className="quick-action-icon">{action.icon}</div>
                <h3 className="quick-action-title">{action.title}</h3>
                <p className="quick-action-description">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Activity Summary */}
      <div className="dashboard-section">
        <h2 className="section-title">📈 Activity Summary</h2>
        <div className="activity-summary">
          <div className="activity-stats">
            <div className="activity-stat">
              <div className="activity-icon">📊</div>
              <div className="activity-value">
                {stats ? stats.projects + stats.epics + stats.stories : 0}
              </div>
              <p className="activity-label">Total Work Items</p>
            </div>
            <div className="activity-stat">
              <div className="activity-icon">✅</div>
              <div className="activity-value">
                {stats ? stats.tasks : 0}
              </div>
              <p className="activity-label">Active Tasks</p>
            </div>
            <div className="activity-stat">
              <div className="activity-icon">⚠️</div>
              <div className="activity-value">
                {stats ? stats.risks : 0}
              </div>
              <p className="activity-label">Tracked Risks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      {stats && Object.values(stats).every(val => val === 0) && (
        <div className="getting-started">
          <div className="getting-started-content">
            <div className="getting-started-icon">🎯</div>
            <h3 className="getting-started-title">Welcome to AgileForge!</h3>
            <p className="getting-started-description">
              You're all set up! Start by creating your first project, then add epics, stories, and tasks to organize your work.
            </p>
            <div className="getting-started-actions">
              <Link to="/projects" className="btn btn-primary">
                <span>🎯</span>
                Create First Project
              </Link>
              <button className="btn btn-secondary">
                <span>📚</span>
                View Documentation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 