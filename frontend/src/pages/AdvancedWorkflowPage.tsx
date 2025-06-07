import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import SprintPlanningBoard from '../components/SprintPlanningBoard'
import KanbanBoard from '../components/KanbanBoard'
import AnalyticsDashboard from '../components/AnalyticsDashboard'
import ReleasePlanning from '../components/ReleasePlanning'
import PredictiveAnalytics from '../components/PredictiveAnalytics'
import DependencyManager from '../components/DependencyManager'
import CollaborationHub from '../components/CollaborationHub'
import PortfolioManagement from '../components/PortfolioManagement'
import IntegrationHub from '../components/IntegrationHub'
import AutomationEngine from '../components/AutomationEngine'

type WorkflowView = 'sprint-planning' | 'kanban' | 'analytics' | 'release-planning' | 'predictive-ai' | 'dependencies' | 'collaboration' | 'portfolio' | 'integrations' | 'automation'

export default function AdvancedWorkflowPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [activeView, setActiveView] = useState<WorkflowView>('sprint-planning')
  const [kanbanSettings, setKanbanSettings] = useState({
    showSwimlanes: false,
    compactView: false,
    sprintId: undefined as string | undefined
  })

  if (!projectId) {
    return (
      <div className="workflow-error">
        <h2>Project Not Found</h2>
        <p>Please select a project to view advanced workflow features.</p>
      </div>
    )
  }

  const renderWorkflowContent = () => {
    switch (activeView) {
      case 'sprint-planning':
        return <SprintPlanningBoard projectId={projectId} />
      
      case 'kanban':
        return (
          <KanbanBoard 
            projectId={projectId}
            sprintId={kanbanSettings.sprintId}
            showSwimlanes={kanbanSettings.showSwimlanes}
            compactView={kanbanSettings.compactView}
          />
        )
      
      case 'analytics':
        return <AnalyticsDashboard projectId={projectId} />
      
      case 'release-planning':
        return <ReleasePlanning projectId={projectId} />
      
      case 'predictive-ai':
        return <PredictiveAnalytics projectId={projectId} />
      
      case 'dependencies':
        return <DependencyManager projectId={projectId} />
      
      case 'collaboration':
        return (
          <CollaborationHub 
            projectId={projectId} 
            currentUser={{
              id: 'current-user',
              name: 'Current User',
              avatar: '👤',
              color: '#3b82f6',
              status: 'online'
            }}
          />
        )
      
      case 'portfolio':
        return <PortfolioManagement organizationId="org-1" />
      
      case 'integrations':
        return <IntegrationHub projectId={projectId} />
      
      case 'automation':
        return <AutomationEngine projectId={projectId} />
      
      default:
        return <SprintPlanningBoard projectId={projectId} />
    }
  }

  return (
    <div className="advanced-workflow-page">
      {/* Navigation Header */}
      <div className="workflow-header">
        <div className="workflow-title">
          <h1>🚀 Advanced Agile Workflow</h1>
          <p>Comprehensive project management tools for agile teams</p>
        </div>

        <div className="workflow-nav">
          <button
            className={`nav-button ${activeView === 'sprint-planning' ? 'active' : ''}`}
            onClick={() => setActiveView('sprint-planning')}
          >
            <span className="nav-icon">🏃‍♂️</span>
            <span className="nav-label">Sprint Planning</span>
          </button>

          <button
            className={`nav-button ${activeView === 'kanban' ? 'active' : ''}`}
            onClick={() => setActiveView('kanban')}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">Kanban Board</span>
          </button>

          <button
            className={`nav-button ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">Analytics</span>
          </button>

          <button
            className={`nav-button ${activeView === 'release-planning' ? 'active' : ''}`}
            onClick={() => setActiveView('release-planning')}
          >
            <span className="nav-icon">🎯</span>
            <span className="nav-label">Release Planning</span>
          </button>

          <button
            className={`nav-button ${activeView === 'predictive-ai' ? 'active' : ''}`}
            onClick={() => setActiveView('predictive-ai')}
          >
            <span className="nav-icon">🤖</span>
            <span className="nav-label">AI Predictions</span>
          </button>

          <button
            className={`nav-button ${activeView === 'dependencies' ? 'active' : ''}`}
            onClick={() => setActiveView('dependencies')}
          >
            <span className="nav-icon">🔗</span>
            <span className="nav-label">Dependencies</span>
          </button>

          <button
            className={`nav-button ${activeView === 'collaboration' ? 'active' : ''}`}
            onClick={() => setActiveView('collaboration')}
          >
            <span className="nav-icon">👥</span>
            <span className="nav-label">Collaboration</span>
          </button>

          <button
            className={`nav-button ${activeView === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveView('portfolio')}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">Portfolio</span>
          </button>

          <button
            className={`nav-button ${activeView === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveView('integrations')}
          >
            <span className="nav-icon">🔗</span>
            <span className="nav-label">Integrations</span>
          </button>

          <button
            className={`nav-button ${activeView === 'automation' ? 'active' : ''}`}
            onClick={() => setActiveView('automation')}
          >
            <span className="nav-icon">🏭</span>
            <span className="nav-label">Automation</span>
          </button>
        </div>

        {/* View-specific controls */}
        {activeView === 'kanban' && (
          <div className="kanban-controls">
            <label className="control-item">
              <input
                type="checkbox"
                checked={kanbanSettings.showSwimlanes}
                onChange={(e) => setKanbanSettings(prev => ({ 
                  ...prev, 
                  showSwimlanes: e.target.checked 
                }))}
              />
              <span>Show Swimlanes</span>
            </label>

            <label className="control-item">
              <input
                type="checkbox"
                checked={kanbanSettings.compactView}
                onChange={(e) => setKanbanSettings(prev => ({ 
                  ...prev, 
                  compactView: e.target.checked 
                }))}
              />
              <span>Compact View</span>
            </label>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="workflow-content">
        {renderWorkflowContent()}
      </div>

      {/* Feature Overview */}
      <div className="feature-overview">
        <div className="feature-cards">
          <div className={`feature-card ${activeView === 'sprint-planning' ? 'active' : ''}`}>
            <div className="feature-icon">🏃‍♂️</div>
            <h3>Sprint Planning</h3>
            <p>Drag-and-drop story assignment, capacity planning, and sprint management with visual progress tracking.</p>
            <ul>
              <li>✅ Drag & drop story assignment</li>
              <li>✅ Sprint capacity tracking</li>
              <li>✅ Visual progress indicators</li>
              <li>✅ Story point estimation</li>
            </ul>
          </div>

          <div className={`feature-card ${activeView === 'kanban' ? 'active' : ''}`}>
            <div className="feature-icon">📋</div>
            <h3>Kanban Board</h3>
            <p>Advanced task management with swimlanes, filtering, and real-time collaboration features.</p>
            <ul>
              <li>✅ Swimlane grouping</li>
              <li>✅ Advanced filtering</li>
              <li>✅ WIP limits</li>
              <li>✅ Real-time updates</li>
            </ul>
          </div>

          <div className={`feature-card ${activeView === 'analytics' ? 'active' : ''}`}>
            <div className="feature-icon">📊</div>
            <h3>Analytics Dashboard</h3>
            <p>Comprehensive metrics including velocity tracking, burndown charts, and team performance insights.</p>
            <ul>
              <li>✅ Velocity tracking</li>
              <li>✅ Burndown charts</li>
              <li>✅ Cumulative flow diagrams</li>
              <li>✅ Team performance metrics</li>
            </ul>
          </div>

          <div className={`feature-card ${activeView === 'release-planning' ? 'active' : ''}`}>
            <div className="feature-icon">🎯</div>
            <h3>Release Planning</h3>
            <p>Strategic release management with roadmap visualization, milestone tracking, and capacity planning.</p>
            <ul>
              <li>✅ Release roadmaps</li>
              <li>✅ Epic assignment</li>
              <li>✅ Capacity planning</li>
              <li>✅ Risk tracking</li>
            </ul>
          </div>

          <div className={`feature-card ${activeView === 'predictive-ai' ? 'active' : ''}`}>
            <div className="feature-icon">🤖</div>
            <h3>AI-Powered Predictions</h3>
            <p>Machine learning insights for sprint success probability, velocity prediction, and intelligent risk analysis.</p>
            <ul>
              <li>🧠 Sprint success probability</li>
              <li>📈 Velocity prediction models</li>
              <li>⚠️ Risk factor analysis</li>
              <li>🎯 AI recommendations</li>
            </ul>
          </div>

          <div className={`feature-card ${activeView === 'dependencies' ? 'active' : ''}`}>
            <div className="feature-icon">🔗</div>
            <h3>Dependency Management</h3>
            <p>Advanced cross-project dependency tracking with visualization, impact analysis, and automated conflict detection.</p>
            <ul>
              <li>🕸️ Network visualization</li>
              <li>📊 Impact/Priority matrix</li>
              <li>🚨 Risk assessment</li>
              <li>🔄 Real-time tracking</li>
            </ul>
          </div>

          <div className={`feature-card ${activeView === 'collaboration' ? 'active' : ''}`}>
            <div className="feature-icon">👥</div>
            <h3>Real-time Collaboration</h3>
            <p>Live collaboration features with cursors, comments, mentions, and activity tracking for seamless teamwork.</p>
            <ul>
              <li>👆 Live cursors</li>
              <li>💬 Contextual comments</li>
              <li>👤 @mentions</li>
              <li>📊 Activity feeds</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 