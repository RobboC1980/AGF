import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

interface SprintHealthData {
  sprintId: string
  sprintName: string
  healthScore: number
  riskFactors: RiskFactor[]
  predictions: SprintPrediction[]
  recommendations: Recommendation[]
  teamMetrics: TeamHealthMetrics
}

interface RiskFactor {
  id: string
  type: 'velocity' | 'scope' | 'blockers' | 'capacity' | 'quality'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: number
  likelihood: number
  mitigation: string
}

interface SprintPrediction {
  metric: string
  currentValue: number
  predictedValue: number
  confidence: number
  trend: 'improving' | 'stable' | 'declining'
}

interface Recommendation {
  id: string
  type: 'action' | 'warning' | 'optimization'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  estimatedImpact: string
}

interface TeamHealthMetrics {
  velocityStability: number
  commitmentReliability: number
  qualityTrend: number
  collaborationScore: number
  burnoutRisk: number
}

interface SprintHealthMonitorProps {
  projectId: string
  sprintId?: string
}

export default function SprintHealthMonitor({ projectId, sprintId }: SprintHealthMonitorProps) {
  const [selectedSprint, setSelectedSprint] = useState(sprintId || 'current')
  const [activeTab, setActiveTab] = useState<'overview' | 'risks' | 'predictions' | 'recommendations'>('overview')

  // Fetch sprint health data
  const { data: healthData, isLoading, error } = useQuery<SprintHealthData>({
    queryKey: ['sprint-health', projectId, selectedSprint],
    queryFn: async () => {
      // Mock data for demonstration
      return {
        sprintId: selectedSprint,
        sprintName: 'Sprint 15 - Q1 Features',
        healthScore: 78,
        riskFactors: [
          {
            id: '1',
            type: 'velocity',
            severity: 'medium',
            description: 'Team velocity is 15% below historical average',
            impact: 0.7,
            likelihood: 0.8,
            mitigation: 'Consider reducing scope or adding resources'
          },
          {
            id: '2',
            type: 'blockers',
            severity: 'high',
            description: '3 critical blockers identified in dependencies',
            impact: 0.9,
            likelihood: 0.9,
            mitigation: 'Escalate blockers to stakeholders immediately'
          },
          {
            id: '3',
            type: 'capacity',
            severity: 'low',
            description: 'Team member vacation planned for week 2',
            impact: 0.3,
            likelihood: 1.0,
            mitigation: 'Redistribute work or adjust sprint scope'
          }
        ],
        predictions: [
          {
            metric: 'Sprint Completion',
            currentValue: 65,
            predictedValue: 82,
            confidence: 0.85,
            trend: 'improving'
          },
          {
            metric: 'Story Points Delivered',
            currentValue: 23,
            predictedValue: 31,
            confidence: 0.78,
            trend: 'stable'
          },
          {
            metric: 'Defect Rate',
            currentValue: 2.1,
            predictedValue: 1.8,
            confidence: 0.72,
            trend: 'improving'
          }
        ],
        recommendations: [
          {
            id: '1',
            type: 'action',
            priority: 'high',
            title: 'Address Critical Blockers',
            description: 'Schedule immediate stakeholder meeting to resolve dependency blockers',
            estimatedImpact: '+15% sprint success probability'
          },
          {
            id: '2',
            type: 'optimization',
            priority: 'medium',
            title: 'Optimize Daily Standups',
            description: 'Focus standups on blocker resolution and cross-team coordination',
            estimatedImpact: '+8% team efficiency'
          },
          {
            id: '3',
            type: 'warning',
            priority: 'medium',
            title: 'Monitor Burnout Indicators',
            description: 'Team showing signs of increased stress - consider workload adjustment',
            estimatedImpact: 'Prevent 20% velocity drop'
          }
        ],
        teamMetrics: {
          velocityStability: 0.72,
          commitmentReliability: 0.85,
          qualityTrend: 0.78,
          collaborationScore: 0.91,
          burnoutRisk: 0.35
        }
      }
    }
  })

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626'
      case 'high': return '#ea580c'
      case 'medium': return '#d97706'
      case 'low': return '#65a30d'
      default: return '#6b7280'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈'
      case 'declining': return '📉'
      case 'stable': return '➡️'
      default: return '❓'
    }
  }

  if (isLoading) {
    return (
      <div className="sprint-health-loading">
        <div className="loading-spinner"></div>
        <p>Analyzing sprint health...</p>
      </div>
    )
  }

  if (error || !healthData) {
    return (
      <div className="sprint-health-error">
        <h3>Unable to load sprint health data</h3>
        <p>Please try again later or contact support.</p>
      </div>
    )
  }

  return (
    <div className="sprint-health-monitor">
      {/* Header with Health Score */}
      <div className="health-header">
        <div className="health-score-card">
          <div className="health-score-circle">
            <svg viewBox="0 0 100 100" className="health-score-svg">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={getHealthScoreColor(healthData.healthScore)}
                strokeWidth="8"
                strokeDasharray={`${healthData.healthScore * 2.83} 283`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="health-score-text">
              <span className="score-number">{healthData.healthScore}</span>
              <span className="score-label">Health Score</span>
            </div>
          </div>
          <div className="health-summary">
            <h2>{healthData.sprintName}</h2>
            <p className="health-status">
              {healthData.healthScore >= 80 ? '🟢 Healthy' : 
               healthData.healthScore >= 60 ? '🟡 At Risk' : '🔴 Critical'}
            </p>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="quick-metrics">
          <div className="metric-card">
            <span className="metric-label">Velocity Stability</span>
            <span className="metric-value">{Math.round(healthData.teamMetrics.velocityStability * 100)}%</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Commitment Reliability</span>
            <span className="metric-value">{Math.round(healthData.teamMetrics.commitmentReliability * 100)}%</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Collaboration Score</span>
            <span className="metric-value">{Math.round(healthData.teamMetrics.collaborationScore * 100)}%</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Burnout Risk</span>
            <span className={`metric-value ${healthData.teamMetrics.burnoutRisk > 0.5 ? 'risk-high' : 'risk-low'}`}>
              {Math.round(healthData.teamMetrics.burnoutRisk * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="health-nav">
        <button
          className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          🎯 Overview
        </button>
        <button
          className={`nav-tab ${activeTab === 'risks' ? 'active' : ''}`}
          onClick={() => setActiveTab('risks')}
        >
          ⚠️ Risk Factors ({healthData.riskFactors.length})
        </button>
        <button
          className={`nav-tab ${activeTab === 'predictions' ? 'active' : ''}`}
          onClick={() => setActiveTab('predictions')}
        >
          🔮 AI Predictions
        </button>
        <button
          className={`nav-tab ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          💡 Recommendations ({healthData.recommendations.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="health-content">
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="overview-grid">
              <div className="overview-section">
                <h3>🎯 Sprint Progress</h3>
                <div className="progress-indicators">
                  <div className="progress-item">
                    <span>Stories Completed</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '65%' }}></div>
                    </div>
                    <span>13/20</span>
                  </div>
                  <div className="progress-item">
                    <span>Story Points</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '74%' }}></div>
                    </div>
                    <span>23/31</span>
                  </div>
                </div>
              </div>

              <div className="overview-section">
                <h3>⚡ Team Velocity</h3>
                <div className="velocity-chart">
                  <div className="velocity-bars">
                    <div className="velocity-bar" style={{ height: '60%' }}>
                      <span>S13</span>
                    </div>
                    <div className="velocity-bar" style={{ height: '80%' }}>
                      <span>S14</span>
                    </div>
                    <div className="velocity-bar current" style={{ height: '70%' }}>
                      <span>S15</span>
                    </div>
                  </div>
                  <p>Current: 23 pts | Average: 27 pts</p>
                </div>
              </div>

              <div className="overview-section">
                <h3>🚨 Top Risks</h3>
                <div className="risk-summary">
                  {healthData.riskFactors.slice(0, 3).map(risk => (
                    <div key={risk.id} className="risk-item">
                      <div 
                        className="risk-indicator"
                        style={{ backgroundColor: getSeverityColor(risk.severity) }}
                      ></div>
                      <span>{risk.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="risks-content">
            <div className="risks-grid">
              {healthData.riskFactors.map(risk => (
                <div key={risk.id} className="risk-card">
                  <div className="risk-header">
                    <div className="risk-type">
                      <span className="risk-icon">
                        {risk.type === 'velocity' ? '⚡' :
                         risk.type === 'scope' ? '🎯' :
                         risk.type === 'blockers' ? '🚧' :
                         risk.type === 'capacity' ? '👥' : '🔍'}
                      </span>
                      <span className="risk-type-label">{risk.type.toUpperCase()}</span>
                    </div>
                    <span 
                      className={`risk-severity severity-${risk.severity}`}
                      style={{ color: getSeverityColor(risk.severity) }}
                    >
                      {risk.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="risk-description">{risk.description}</p>
                  <div className="risk-metrics">
                    <div className="risk-metric">
                      <span>Impact</span>
                      <div className="metric-bar">
                        <div 
                          className="metric-fill"
                          style={{ width: `${risk.impact * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="risk-metric">
                      <span>Likelihood</span>
                      <div className="metric-bar">
                        <div 
                          className="metric-fill"
                          style={{ width: `${risk.likelihood * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="risk-mitigation">
                    <strong>Mitigation:</strong>
                    <p>{risk.mitigation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="predictions-content">
            <div className="predictions-grid">
              {healthData.predictions.map((prediction, index) => (
                <div key={index} className="prediction-card">
                  <div className="prediction-header">
                    <h4>{prediction.metric}</h4>
                    <span className="trend-indicator">
                      {getTrendIcon(prediction.trend)}
                    </span>
                  </div>
                  <div className="prediction-values">
                    <div className="value-item">
                      <span className="value-label">Current</span>
                      <span className="value-number">{prediction.currentValue}</span>
                    </div>
                    <div className="value-arrow">→</div>
                    <div className="value-item">
                      <span className="value-label">Predicted</span>
                      <span className="value-number predicted">{prediction.predictedValue}</span>
                    </div>
                  </div>
                  <div className="confidence-meter">
                    <span>Confidence: {Math.round(prediction.confidence * 100)}%</span>
                    <div className="confidence-bar">
                      <div 
                        className="confidence-fill"
                        style={{ width: `${prediction.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="recommendations-content">
            <div className="recommendations-list">
              {healthData.recommendations.map(rec => (
                <div key={rec.id} className={`recommendation-card priority-${rec.priority}`}>
                  <div className="recommendation-header">
                    <div className="rec-type">
                      <span className="rec-icon">
                        {rec.type === 'action' ? '🎯' :
                         rec.type === 'warning' ? '⚠️' : '⚡'}
                      </span>
                      <span className={`rec-priority priority-${rec.priority}`}>
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                    <h4>{rec.title}</h4>
                  </div>
                  <p className="rec-description">{rec.description}</p>
                  <div className="rec-impact">
                    <strong>Estimated Impact:</strong> {rec.estimatedImpact}
                  </div>
                  <button className="implement-btn">
                    Implement Recommendation
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 