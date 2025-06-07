import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { api } from '../api/client'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface AnalyticsData {
  sprints: Sprint[]
  tasks: Task[]
  stories: Story[]
  epics: Epic[]
  velocityHistory: VelocityData[]
  burndownData: BurndownData[]
  cumulativeFlow: CumulativeFlowData[]
  teamMetrics: TeamMetrics
}

interface Sprint {
  id: string
  name: string
  startDate: string
  endDate: string
  capacity?: number
  velocity?: number
  completed: boolean
}

interface Task {
  id: string
  name: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  storyPoints?: number
  estimatedHours?: number
  actualHours?: number
  assignedTo?: string
  completedAt?: string
  sprintId?: string
  createdAt: string
}

interface Story {
  id: string
  name: string
  storyPoints?: number
  status: string
  completedAt?: string
  sprintId?: string
}

interface Epic {
  id: string
  name: string
  totalStoryPoints: number
  completedStoryPoints: number
  progress: number
}

interface VelocityData {
  sprintName: string
  plannedPoints: number
  completedPoints: number
  date: string
}

interface BurndownData {
  date: string
  remainingWork: number
  idealBurndown: number
  actualBurndown: number
}

interface CumulativeFlowData {
  date: string
  todo: number
  inProgress: number
  review: number
  done: number
}

interface TeamMetrics {
  averageVelocity: number
  predictability: number
  throughput: number
  cycleTime: number
  leadTime: number
  defectRate: number
}

interface AnalyticsDashboardProps {
  projectId: string
  sprintId?: string
  initialTimeRange?: 'week' | 'month' | 'quarter' | 'year'
}

export default function AnalyticsDashboard({ projectId, sprintId, initialTimeRange = 'month' }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'velocity' | 'burndown' | 'flow' | 'team'>('velocity')
  const [selectedSprint, setSelectedSprint] = useState<string>(sprintId || 'current')
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>(initialTimeRange)

  // Fetch analytics data
  const { data: analyticsData, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['analytics', projectId, timeRange],
    queryFn: async () => {
      const response = await api.get(`/analytics/dashboard?projectId=${projectId}&timeRange=${timeRange}`)
      return response.data
    }
  })

  // Generate velocity chart data
  const velocityChartData = useMemo(() => {
    if (!analyticsData?.velocityHistory) return null

    return {
      labels: analyticsData.velocityHistory.map(v => v.sprintName),
      datasets: [
        {
          label: 'Completed Points',
          data: analyticsData.velocityHistory.map(v => v.completedPoints),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Planned Points',
          data: analyticsData.velocityHistory.map(v => v.plannedPoints),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          tension: 0.4,
          borderDash: [5, 5]
        }
      ]
    }
  }, [analyticsData?.velocityHistory])

  // Generate burndown chart data
  const burndownChartData = useMemo(() => {
    if (!analyticsData?.burndownData) return null

    return {
      labels: analyticsData.burndownData.map(b => new Date(b.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Ideal Burndown',
          data: analyticsData.burndownData.map(b => b.idealBurndown),
          borderColor: '#6b7280',
          backgroundColor: 'transparent',
          borderDash: [10, 5],
          tension: 0
        },
        {
          label: 'Actual Burndown',
          data: analyticsData.burndownData.map(b => b.actualBurndown),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    }
  }, [analyticsData?.burndownData])

  // Generate cumulative flow diagram data
  const cumulativeFlowData = useMemo(() => {
    if (!analyticsData?.cumulativeFlow) return null

    return {
      labels: analyticsData.cumulativeFlow.map(cf => new Date(cf.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Done',
          data: analyticsData.cumulativeFlow.map(cf => cf.done),
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          fill: true
        },
        {
          label: 'Review',
          data: analyticsData.cumulativeFlow.map(cf => cf.review + cf.done),
          backgroundColor: '#f59e0b',
          borderColor: '#f59e0b',
          fill: true
        },
        {
          label: 'In Progress',
          data: analyticsData.cumulativeFlow.map(cf => cf.inProgress + cf.review + cf.done),
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          fill: true
        },
        {
          label: 'To Do',
          data: analyticsData.cumulativeFlow.map(cf => cf.todo + cf.inProgress + cf.review + cf.done),
          backgroundColor: '#6b7280',
          borderColor: '#6b7280',
          fill: true
        }
      ]
    }
  }, [analyticsData?.cumulativeFlow])

  // Generate team performance data
  const teamPerformanceData = useMemo(() => {
    if (!analyticsData?.teamMetrics) return null

    return {
      labels: ['Velocity', 'Predictability', 'Throughput', 'Quality'],
      datasets: [
        {
          data: [
            Math.min(analyticsData.teamMetrics.averageVelocity / 50 * 100, 100),
            analyticsData.teamMetrics.predictability,
            Math.min(analyticsData.teamMetrics.throughput / 10 * 100, 100),
            Math.max(100 - analyticsData.teamMetrics.defectRate * 10, 0)
          ],
          backgroundColor: [
            '#10b981',
            '#3b82f6',
            '#f59e0b',
            '#8b5cf6'
          ],
          borderWidth: 0
        }
      ]
    }
  }, [analyticsData?.teamMetrics])

  if (isLoading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics dashboard...</p>
      </div>
    )
  }

  if (error || !analyticsData) {
    return (
      <div className="analytics-error">
        <div className="error-icon">📊</div>
        <h3>Analytics Unavailable</h3>
        <p>Unable to load analytics data. Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="analytics-header">
        <div className="analytics-title">
          <h2>📊 Project Analytics</h2>
          <p>Insights and metrics for data-driven decisions</p>
        </div>

        <div className="analytics-controls">
          <div className="time-range-selector">
            <label>Time Range:</label>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as any)}>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="metrics-summary">
        <div className="metric-card">
          <div className="metric-icon">⚡</div>
          <div className="metric-content">
            <h3>Average Velocity</h3>
            <div className="metric-value">{analyticsData.teamMetrics.averageVelocity}</div>
            <div className="metric-label">Story Points/Sprint</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <h3>Predictability</h3>
            <div className="metric-value">{analyticsData.teamMetrics.predictability}%</div>
            <div className="metric-label">Commitment Accuracy</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🔄</div>
          <div className="metric-content">
            <h3>Throughput</h3>
            <div className="metric-value">{analyticsData.teamMetrics.throughput}</div>
            <div className="metric-label">Items/Week</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <h3>Cycle Time</h3>
            <div className="metric-value">{analyticsData.teamMetrics.cycleTime.toFixed(1)}</div>
            <div className="metric-label">Days Average</div>
          </div>
        </div>
      </div>

      {/* Chart Tabs */}
      <div className="analytics-tabs">
        <button 
          className={`tab ${activeTab === 'velocity' ? 'active' : ''}`}
          onClick={() => setActiveTab('velocity')}
        >
          ⚡ Velocity Tracking
        </button>
        <button 
          className={`tab ${activeTab === 'burndown' ? 'active' : ''}`}
          onClick={() => setActiveTab('burndown')}
        >
          🔥 Burndown Chart
        </button>
        <button 
          className={`tab ${activeTab === 'flow' ? 'active' : ''}`}
          onClick={() => setActiveTab('flow')}
        >
          🌊 Cumulative Flow
        </button>
        <button 
          className={`tab ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          👥 Team Performance
        </button>
      </div>

      {/* Chart Content */}
      <div className="analytics-content">
        {activeTab === 'velocity' && velocityChartData && (
          <div className="chart-container">
            <div className="chart-header">
              <h3>Velocity Tracking</h3>
              <p>Track planned vs completed story points across sprints</p>
            </div>
            <div className="chart-wrapper">
              <Line 
                data={velocityChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Story Points'
                      }
                    }
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        afterLabel: (context) => {
                          const dataPoint = analyticsData.velocityHistory[context.dataIndex]
                          if (context.datasetIndex === 0) {
                            const accuracy = ((dataPoint.completedPoints / dataPoint.plannedPoints) * 100).toFixed(1)
                            return `Accuracy: ${accuracy}%`
                          }
                          return ''
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'burndown' && burndownChartData && (
          <div className="chart-container">
            <div className="chart-header">
              <h3>Sprint Burndown</h3>
              <p>Track remaining work vs ideal burndown line</p>
            </div>
            <div className="chart-wrapper">
              <Line 
                data={burndownChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Remaining Work (Hours)'
                      }
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Sprint Days'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'flow' && cumulativeFlowData && (
          <div className="chart-container">
            <div className="chart-header">
              <h3>Cumulative Flow Diagram</h3>
              <p>Visualize work flow and identify bottlenecks</p>
            </div>
            <div className="chart-wrapper">
              <Line 
                data={cumulativeFlowData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      stacked: true,
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Number of Items'
                      }
                    }
                  },
                  elements: {
                    line: {
                      tension: 0.4
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="team-performance-container">
            <div className="performance-chart">
              <h3>Team Performance Overview</h3>
              {teamPerformanceData && (
                <div className="chart-wrapper doughnut">
                  <Doughnut 
                    data={teamPerformanceData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const label = context.label || ''
                              const value = context.parsed
                              return `${label}: ${value.toFixed(1)}%`
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>

            <div className="performance-details">
              <h3>Detailed Metrics</h3>
              <div className="metrics-grid">
                <div className="metric-detail">
                  <div className="metric-label">Lead Time</div>
                  <div className="metric-value">{analyticsData.teamMetrics.leadTime.toFixed(1)} days</div>
                  <div className="metric-description">Time from idea to delivery</div>
                </div>

                <div className="metric-detail">
                  <div className="metric-label">Cycle Time</div>
                  <div className="metric-value">{analyticsData.teamMetrics.cycleTime.toFixed(1)} days</div>
                  <div className="metric-description">Time from start to completion</div>
                </div>

                <div className="metric-detail">
                  <div className="metric-label">Defect Rate</div>
                  <div className="metric-value">{analyticsData.teamMetrics.defectRate.toFixed(2)}%</div>
                  <div className="metric-description">Percentage of work requiring rework</div>
                </div>

                <div className="metric-detail">
                  <div className="metric-label">Throughput</div>
                  <div className="metric-value">{analyticsData.teamMetrics.throughput} items/week</div>
                  <div className="metric-description">Average completion rate</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Epic Progress */}
      {analyticsData.epics && analyticsData.epics.length > 0 && (
        <div className="epic-progress-section">
          <h3>🚀 Epic Progress</h3>
          <div className="epic-progress-grid">
            {analyticsData.epics.map(epic => (
              <div key={epic.id} className="epic-progress-card">
                <div className="epic-header">
                  <h4>{epic.name}</h4>
                  <span className="epic-percentage">{epic.progress}%</span>
                </div>
                <div className="epic-progress-bar">
                  <div 
                    className="epic-progress-fill"
                    style={{ width: `${epic.progress}%` }}
                  ></div>
                </div>
                <div className="epic-stats">
                  <span>{epic.completedStoryPoints} / {epic.totalStoryPoints} points</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 