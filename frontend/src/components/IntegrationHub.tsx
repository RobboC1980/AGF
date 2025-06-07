import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

interface Integration {
  id: string;
  name: string;
  type: 'webhook' | 'api' | 'oauth' | 'database' | 'messaging';
  status: 'active' | 'inactive' | 'error' | 'pending';
  provider: string;
  icon: string;
  description: string;
  configuration: IntegrationConfig;
  metrics: IntegrationMetrics;
}

interface IntegrationConfig {
  endpoint?: string;
  authentication: 'api_key' | 'oauth' | 'basic' | 'bearer';
  settings: Record<string, any>;
  syncFrequency?: number;
  dataMapping?: DataMapping[];
}

interface DataMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
}

interface IntegrationMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  errorCount: number;
  lastSync?: string;
  dataVolume: number;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  secret: string;
  createdAt: string;
  lastTriggered?: string;
  totalTriggers: number;
  retryCount: number;
}

interface APIEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  rateLimitUsage: number;
  lastAccessed: string;
}

interface IntegrationHubProps {
  projectId?: string;
}

const IntegrationHub: React.FC<IntegrationHubProps> = ({ projectId }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [apiEndpoints, setApiEndpoints] = useState<APIEndpoint[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'integrations' | 'webhooks' | 'api' | 'marketplace' | 'logs'>('overview');
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    fetchIntegrationData();
  }, [projectId]);

  const fetchIntegrationData = async () => {
    try {
      setLoading(true);
      
      // Mock data - in real implementation, this would come from API
      const mockIntegrations: Integration[] = [
        {
          id: '1',
          name: 'Jira Integration',
          type: 'api',
          status: 'active',
          provider: 'Atlassian',
          icon: '🎯',
          description: 'Sync issues and project data with Jira',
          configuration: {
            endpoint: 'https://company.atlassian.net/rest/api/3',
            authentication: 'oauth',
            settings: {
              projectKey: 'PROJ',
              issueTypes: ['Story', 'Bug', 'Task'],
              syncAssignees: true
            },
            syncFrequency: 300,
            dataMapping: [
              { sourceField: 'summary', targetField: 'title' },
              { sourceField: 'description', targetField: 'description' },
              { sourceField: 'assignee.displayName', targetField: 'assignedTo' }
            ]
          },
          metrics: {
            totalRequests: 15420,
            successRate: 98.5,
            averageResponseTime: 245,
            errorCount: 23,
            lastSync: '2024-01-15T14:30:00Z',
            dataVolume: 2.4
          }
        },
        {
          id: '2',
          name: 'GitHub Actions',
          type: 'webhook',
          status: 'active',
          provider: 'GitHub',
          icon: '🚀',
          description: 'Receive deployment and CI/CD notifications',
          configuration: {
            authentication: 'bearer',
            settings: {
              repository: 'company/agileforge',
              events: ['push', 'pull_request', 'deployment'],
              branches: ['main', 'develop']
            }
          },
          metrics: {
            totalRequests: 892,
            successRate: 99.8,
            averageResponseTime: 120,
            errorCount: 2,
            lastSync: '2024-01-15T15:45:00Z',
            dataVolume: 0.3
          }
        },
        {
          id: '3',
          name: 'Slack Notifications',
          type: 'messaging',
          status: 'active',
          provider: 'Slack',
          icon: '💬',
          description: 'Send notifications to Slack channels',
          configuration: {
            authentication: 'oauth',
            settings: {
              channels: ['#development', '#alerts'],
              notificationTypes: ['sprint-complete', 'deployment', 'critical-bug']
            }
          },
          metrics: {
            totalRequests: 3456,
            successRate: 97.2,
            averageResponseTime: 180,
            errorCount: 97,
            dataVolume: 0.8
          }
        },
        {
          id: '4',
          name: 'Azure DevOps',
          type: 'api',
          status: 'error',
          provider: 'Microsoft',
          icon: '🔷',
          description: 'Sync work items and build pipelines',
          configuration: {
            endpoint: 'https://dev.azure.com/company',
            authentication: 'api_key',
            settings: {
              project: 'AgileForge',
              workItemTypes: ['User Story', 'Bug', 'Task']
            }
          },
          metrics: {
            totalRequests: 456,
            successRate: 85.2,
            averageResponseTime: 890,
            errorCount: 67,
            dataVolume: 0.2
          }
        }
      ];

      const mockWebhooks: Webhook[] = [
        {
          id: 'wh1',
          name: 'Sprint Complete Notification',
          url: 'https://api.agileforge.com/webhooks/sprint-complete',
          events: ['sprint.completed', 'sprint.started'],
          status: 'active',
          secret: 'wh_secret_123',
          createdAt: '2024-01-01T00:00:00Z',
          lastTriggered: '2024-01-15T10:30:00Z',
          totalTriggers: 45,
          retryCount: 3
        },
        {
          id: 'wh2',
          name: 'Issue Status Change',
          url: 'https://external-system.com/hooks/issue-update',
          events: ['task.status_changed', 'story.completed'],
          status: 'active',
          secret: 'wh_secret_456',
          createdAt: '2024-01-05T00:00:00Z',
          lastTriggered: '2024-01-15T14:20:00Z',
          totalTriggers: 234,
          retryCount: 5
        }
      ];

      const mockApiEndpoints: APIEndpoint[] = [
        {
          id: 'api1',
          path: '/api/projects',
          method: 'GET',
          description: 'List all projects',
          requestCount: 12450,
          averageResponseTime: 156,
          errorRate: 0.8,
          rateLimitUsage: 65,
          lastAccessed: '2024-01-15T15:45:00Z'
        },
        {
          id: 'api2',
          path: '/api/tasks',
          method: 'POST',
          description: 'Create new task',
          requestCount: 3456,
          averageResponseTime: 245,
          errorRate: 2.1,
          rateLimitUsage: 32,
          lastAccessed: '2024-01-15T15:44:00Z'
        },
        {
          id: 'api3',
          path: '/api/analytics/velocity',
          method: 'GET',
          description: 'Get team velocity data',
          requestCount: 892,
          averageResponseTime: 567,
          errorRate: 0.3,
          rateLimitUsage: 12,
          lastAccessed: '2024-01-15T15:30:00Z'
        }
      ];

      setIntegrations(mockIntegrations);
      setWebhooks(mockWebhooks);
      setApiEndpoints(mockApiEndpoints);
    } catch (error) {
      console.error('Error fetching integration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#6b7280';
      case 'error': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const generateIntegrationChartData = () => {
    const statusCounts = integrations.reduce((acc, integration) => {
      acc[integration.status] = (acc[integration.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      labels: Object.keys(statusCounts).map(status => status.charAt(0).toUpperCase() + status.slice(1)),
      datasets: [
        {
          data: Object.values(statusCounts),
          backgroundColor: Object.keys(statusCounts).map(status => getStatusColor(status)),
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    };
  };

  const generateApiUsageChartData = () => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [1200, 1900, 3000, 5000, 2000, 3000, 2500];

    return {
      labels,
      datasets: [
        {
          label: 'API Requests',
          data,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="integration-hub loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading integration data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="integration-hub">
      <div className="integration-header">
        <div className="header-content">
          <h1>🔗 Integration Hub</h1>
          <p>Manage all your integrations, APIs, and webhooks in one place</p>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowConfigModal(true)}>
            ➕ Add Integration
          </button>
          <button className="btn btn-secondary">
            📊 View Analytics
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="integration-nav">
        {[
          { key: 'overview', label: '📈 Overview', icon: '📈' },
          { key: 'integrations', label: '🔗 Integrations', icon: '🔗' },
          { key: 'webhooks', label: '🔔 Webhooks', icon: '🔔' },
          { key: 'api', label: '🌐 API Management', icon: '🌐' },
          { key: 'marketplace', label: '🏪 Marketplace', icon: '🏪' },
          { key: 'logs', label: '📝 Logs', icon: '📝' }
        ].map(tab => (
          <button
            key={tab.key}
            className={`nav-tab ${activeView === tab.key ? 'active' : ''}`}
            onClick={() => setActiveView(tab.key as any)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="integration-content">
        {activeView === 'overview' && (
          <div className="overview-view">
            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🔗</div>
                <div className="stat-content">
                  <h3>Active Integrations</h3>
                  <div className="stat-value">
                    {integrations.filter(i => i.status === 'active').length}
                  </div>
                  <div className="stat-detail">
                    {integrations.length} total
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <h3>API Requests Today</h3>
                  <div className="stat-value">
                    {integrations.reduce((acc, i) => acc + i.metrics.totalRequests, 0).toLocaleString()}
                  </div>
                  <div className="stat-detail">
                    {((integrations.reduce((acc, i) => acc + (i.metrics.successRate * i.metrics.totalRequests), 0) / integrations.reduce((acc, i) => acc + i.metrics.totalRequests, 0)) || 0).toFixed(1)}% success rate
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🔔</div>
                <div className="stat-content">
                  <h3>Webhooks</h3>
                  <div className="stat-value">{webhooks.length}</div>
                  <div className="stat-detail">
                    {webhooks.reduce((acc, w) => acc + w.totalTriggers, 0)} total triggers
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⚠️</div>
                <div className="stat-content">
                  <h3>Errors Today</h3>
                  <div className="stat-value">
                    {integrations.reduce((acc, i) => acc + i.metrics.errorCount, 0)}
                  </div>
                  <div className="stat-detail">
                    {integrations.filter(i => i.status === 'error').length} failing integrations
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
              <div className="chart-container">
                <h3>Integration Status</h3>
                <Doughnut 
                  data={generateIntegrationChartData()}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </div>

              <div className="chart-container">
                <h3>API Usage (7 days)</h3>
                <Line 
                  data={generateApiUsageChartData()}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Requests' }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-icon success">✅</div>
                  <div className="activity-content">
                    <div className="activity-title">Jira sync completed successfully</div>
                    <div className="activity-detail">Synced 23 issues • 2 minutes ago</div>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon info">🔔</div>
                  <div className="activity-content">
                    <div className="activity-title">Webhook triggered: Sprint Complete</div>
                    <div className="activity-detail">Sent to 3 endpoints • 15 minutes ago</div>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon error">❌</div>
                  <div className="activity-content">
                    <div className="activity-title">Azure DevOps sync failed</div>
                    <div className="activity-detail">Authentication error • 1 hour ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'integrations' && (
          <div className="integrations-view">
            <div className="integrations-grid">
              {integrations.map(integration => (
                <div key={integration.id} className="integration-card">
                  <div className="integration-header">
                    <div className="integration-info">
                      <div className="integration-icon">{integration.icon}</div>
                      <div>
                        <h3>{integration.name}</h3>
                        <p>{integration.description}</p>
                        <span className="provider">by {integration.provider}</span>
                      </div>
                    </div>
                    <div className="integration-status">
                      <div className={`status-indicator ${integration.status}`}>
                        <div className="status-dot"></div>
                        {integration.status.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="integration-metrics">
                    <div className="metric">
                      <span className="metric-label">Success Rate</span>
                      <span className="metric-value">{integration.metrics.successRate}%</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Requests</span>
                      <span className="metric-value">{integration.metrics.totalRequests.toLocaleString()}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Avg Response</span>
                      <span className="metric-value">{integration.metrics.averageResponseTime}ms</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Data Volume</span>
                      <span className="metric-value">{integration.metrics.dataVolume}GB</span>
                    </div>
                  </div>

                  <div className="integration-actions">
                    <button className="btn btn-sm btn-secondary">
                      ⚙️ Configure
                    </button>
                    <button className="btn btn-sm btn-secondary">
                      📊 Analytics
                    </button>
                    <button className="btn btn-sm btn-secondary">
                      🔄 Sync Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'webhooks' && (
          <div className="webhooks-view">
            <div className="webhooks-header">
              <h3>Webhook Management</h3>
              <button className="btn btn-primary">
                ➕ Create Webhook
              </button>
            </div>

            <div className="webhooks-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>URL</th>
                    <th>Events</th>
                    <th>Status</th>
                    <th>Triggers</th>
                    <th>Last Triggered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map(webhook => (
                    <tr key={webhook.id}>
                      <td className="webhook-name">{webhook.name}</td>
                      <td className="webhook-url">
                        <code>{webhook.url}</code>
                      </td>
                      <td className="webhook-events">
                        {webhook.events.map(event => (
                          <span key={event} className="event-tag">{event}</span>
                        ))}
                      </td>
                      <td>
                        <span className={`status-badge ${webhook.status}`}>
                          {webhook.status}
                        </span>
                      </td>
                      <td className="webhook-triggers">{webhook.totalTriggers}</td>
                      <td className="webhook-last-triggered">
                        {webhook.lastTriggered ? new Date(webhook.lastTriggered).toLocaleString() : 'Never'}
                      </td>
                      <td className="webhook-actions">
                        <button className="btn btn-sm btn-secondary">Edit</button>
                        <button className="btn btn-sm btn-secondary">Test</button>
                        <button className="btn btn-sm btn-danger">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeView === 'api' && (
          <div className="api-view">
            <div className="api-header">
              <h3>API Endpoint Management</h3>
              <div className="api-controls">
                <button className="btn btn-secondary">📋 Documentation</button>
                <button className="btn btn-secondary">🔑 API Keys</button>
              </div>
            </div>

            <div className="api-table">
              <table>
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Method</th>
                    <th>Description</th>
                    <th>Requests</th>
                    <th>Avg Response</th>
                    <th>Error Rate</th>
                    <th>Rate Limit</th>
                    <th>Last Accessed</th>
                  </tr>
                </thead>
                <tbody>
                  {apiEndpoints.map(endpoint => (
                    <tr key={endpoint.id}>
                      <td className="endpoint-path">
                        <code>{endpoint.path}</code>
                      </td>
                      <td>
                        <span className={`method-badge ${endpoint.method.toLowerCase()}`}>
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="endpoint-description">{endpoint.description}</td>
                      <td className="endpoint-requests">{endpoint.requestCount.toLocaleString()}</td>
                      <td className="endpoint-response-time">{endpoint.averageResponseTime}ms</td>
                      <td className="endpoint-error-rate">
                        <span className={endpoint.errorRate > 5 ? 'high-error' : endpoint.errorRate > 1 ? 'medium-error' : 'low-error'}>
                          {endpoint.errorRate}%
                        </span>
                      </td>
                      <td className="endpoint-rate-limit">
                        <div className="rate-limit-bar">
                          <div 
                            className="rate-limit-fill"
                            style={{ width: `${endpoint.rateLimitUsage}%` }}
                          />
                          <span>{endpoint.rateLimitUsage}%</span>
                        </div>
                      </td>
                      <td className="endpoint-last-accessed">
                        {new Date(endpoint.lastAccessed).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationHub;