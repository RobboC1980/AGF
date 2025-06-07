import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement);

interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  triggers: Trigger[];
  conditions: Condition[];
  actions: Action[];
  createdAt: string;
  lastExecuted?: string;
  executionCount: number;
  successRate: number;
  category: 'sprint' | 'task' | 'project' | 'quality' | 'notification';
}

interface Trigger {
  id: string;
  type: 'task_status_change' | 'sprint_complete' | 'story_complete' | 'time_based' | 'manual' | 'webhook' | 'api_call';
  configuration: Record<string, any>;
  description: string;
}

interface Condition {
  id: string;
  type: 'field_equals' | 'field_contains' | 'date_range' | 'user_role' | 'project_type' | 'custom_function';
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface Action {
  id: string;
  type: 'send_notification' | 'update_field' | 'assign_task' | 'create_task' | 'send_email' | 'webhook_call' | 'move_to_sprint' | 'create_subtask';
  configuration: Record<string, any>;
  description: string;
  order: number;
}

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  template: Partial<WorkflowRule>;
}

interface ExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  status: 'success' | 'failure' | 'partial';
  executedAt: string;
  duration: number;
  triggeredBy: string;
  actionsExecuted: number;
  errorMessage?: string;
  details: LogDetail[];
}

interface LogDetail {
  action: string;
  status: 'success' | 'failure';
  duration: number;
  result?: any;
  error?: string;
}

interface AutomationEngineProps {
  projectId?: string;
}

const AutomationEngine: React.FC<AutomationEngineProps> = ({ projectId }) => {
  const [workflowRules, setWorkflowRules] = useState<WorkflowRule[]>([]);
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'rules' | 'builder' | 'templates' | 'logs' | 'analytics'>('overview');
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<WorkflowRule | null>(null);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);

  useEffect(() => {
    fetchAutomationData();
  }, [projectId]);

  const fetchAutomationData = async () => {
    try {
      setLoading(true);
      
      // Mock data - in real implementation, this would come from API
      const mockRules: WorkflowRule[] = [
        {
          id: '1',
          name: 'Auto-assign Critical Bugs',
          description: 'Automatically assign critical bugs to the team lead',
          status: 'active',
          category: 'task',
          triggers: [
            {
              id: 't1',
              type: 'task_status_change',
              configuration: { from: 'any', to: 'created', taskType: 'bug', priority: 'critical' },
              description: 'When a critical bug is created'
            }
          ],
          conditions: [
            {
              id: 'c1',
              type: 'field_equals',
              field: 'priority',
              operator: 'equals',
              value: 'critical'
            },
            {
              id: 'c2',
              type: 'field_equals',
              field: 'type',
              operator: 'equals',
              value: 'bug',
              logicalOperator: 'AND'
            }
          ],
          actions: [
            {
              id: 'a1',
              type: 'assign_task',
              configuration: { assignee: 'team_lead', notifyAssignee: true },
              description: 'Assign to team lead',
              order: 1
            },
            {
              id: 'a2',
              type: 'send_notification',
              configuration: { channel: 'slack', message: 'Critical bug assigned: {{task.name}}' },
              description: 'Send Slack notification',
              order: 2
            }
          ],
          createdAt: '2024-01-01T00:00:00Z',
          lastExecuted: '2024-01-15T14:30:00Z',
          executionCount: 23,
          successRate: 95.7
        },
        {
          id: '2',
          name: 'Sprint Completion Workflow',
          description: 'Execute post-sprint activities automatically',
          status: 'active',
          category: 'sprint',
          triggers: [
            {
              id: 't2',
              type: 'sprint_complete',
              configuration: {},
              description: 'When a sprint is marked as complete'
            }
          ],
          conditions: [],
          actions: [
            {
              id: 'a3',
              type: 'create_task',
              configuration: { 
                title: 'Sprint {{sprint.name}} Retrospective',
                description: 'Conduct retrospective meeting for completed sprint',
                assignee: 'scrum_master',
                dueDate: '+3d'
              },
              description: 'Create retrospective task',
              order: 1
            },
            {
              id: 'a4',
              type: 'send_email',
              configuration: {
                to: 'team@company.com',
                subject: 'Sprint {{sprint.name}} Completed',
                template: 'sprint_completion'
              },
              description: 'Send completion email',
              order: 2
            },
            {
              id: 'a5',
              type: 'update_field',
              configuration: {
                entity: 'project',
                field: 'lastSprintCompletedAt',
                value: '{{now}}'
              },
              description: 'Update project metadata',
              order: 3
            }
          ],
          createdAt: '2024-01-05T00:00:00Z',
          lastExecuted: '2024-01-14T18:00:00Z',
          executionCount: 8,
          successRate: 100
        },
        {
          id: '3',
          name: 'Code Review Reminder',
          description: 'Remind developers about pending code reviews',
          status: 'active',
          category: 'quality',
          triggers: [
            {
              id: 't3',
              type: 'time_based',
              configuration: { schedule: '0 9 * * 1-5', timezone: 'UTC' },
              description: 'Every weekday at 9 AM'
            }
          ],
          conditions: [
            {
              id: 'c3',
              type: 'custom_function',
              field: 'pending_reviews',
              operator: 'greater_than',
              value: 0
            }
          ],
          actions: [
            {
              id: 'a6',
              type: 'send_notification',
              configuration: {
                channel: 'slack',
                message: 'You have {{pending_reviews.count}} pending code reviews',
                targetUsers: '{{pending_reviews.reviewers}}'
              },
              description: 'Send reminder to reviewers',
              order: 1
            }
          ],
          createdAt: '2024-01-10T00:00:00Z',
          lastExecuted: '2024-01-15T09:00:00Z',
          executionCount: 35,
          successRate: 97.1
        },
        {
          id: '4',
          name: 'Story Points Auto-calculation',
          description: 'Automatically calculate story points based on task complexity',
          status: 'draft',
          category: 'project',
          triggers: [
            {
              id: 't4',
              type: 'task_status_change',
              configuration: { to: 'estimated' },
              description: 'When a task is estimated'
            }
          ],
          conditions: [],
          actions: [
            {
              id: 'a7',
              type: 'update_field',
              configuration: {
                entity: 'story',
                field: 'storyPoints',
                value: '{{calculateStoryPoints(tasks)}}'
              },
              description: 'Calculate and update story points',
              order: 1
            }
          ],
          createdAt: '2024-01-12T00:00:00Z',
          executionCount: 0,
          successRate: 0
        }
      ];

      const mockTemplates: AutomationTemplate[] = [
        {
          id: 'tpl1',
          name: 'Bug Triage Automation',
          description: 'Automatically categorize and assign bugs based on severity and component',
          category: 'Quality Assurance',
          icon: '🐛',
          tags: ['bugs', 'triage', 'assignment'],
          complexity: 'intermediate',
          template: {
            triggers: [
              {
                id: 'tpl_t1',
                type: 'task_status_change',
                configuration: { to: 'created', taskType: 'bug' },
                description: 'When a bug is created'
              }
            ],
            actions: [
              {
                id: 'tpl_a1',
                type: 'assign_task',
                configuration: { assignmentRule: 'round_robin', team: 'qa_team' },
                description: 'Assign to QA team member',
                order: 1
              }
            ]
          }
        },
        {
          id: 'tpl2',
          name: 'Sprint Planning Helper',
          description: 'Automate sprint planning activities and notifications',
          category: 'Sprint Management',
          icon: '📋',
          tags: ['sprint', 'planning', 'notifications'],
          complexity: 'beginner',
          template: {
            triggers: [
              {
                id: 'tpl_t2',
                type: 'sprint_complete',
                configuration: {},
                description: 'When sprint ends'
              }
            ],
            actions: [
              {
                id: 'tpl_a2',
                type: 'create_task',
                configuration: { title: 'Plan next sprint', assignee: 'product_owner' },
                description: 'Create sprint planning task',
                order: 1
              }
            ]
          }
        },
        {
          id: 'tpl3',
          name: 'Release Deployment Pipeline',
          description: 'Orchestrate deployment activities and notifications',
          category: 'DevOps',
          icon: '🚀',
          tags: ['deployment', 'release', 'devops'],
          complexity: 'advanced',
          template: {
            triggers: [
              {
                id: 'tpl_t3',
                type: 'manual',
                configuration: { button: 'Deploy to Production' },
                description: 'Manual deployment trigger'
              }
            ],
            actions: [
              {
                id: 'tpl_a3',
                type: 'webhook_call',
                configuration: { url: '{{deployment.webhook}}', method: 'POST' },
                description: 'Trigger deployment pipeline',
                order: 1
              }
            ]
          }
        }
      ];

      const mockLogs: ExecutionLog[] = [
        {
          id: 'log1',
          ruleId: '1',
          ruleName: 'Auto-assign Critical Bugs',
          status: 'success',
          executedAt: '2024-01-15T14:30:00Z',
          duration: 245,
          triggeredBy: 'task_created',
          actionsExecuted: 2,
          details: [
            {
              action: 'assign_task',
              status: 'success',
              duration: 120,
              result: { assignedTo: 'john.doe', taskId: 'TASK-123' }
            },
            {
              action: 'send_notification',
              status: 'success',
              duration: 125,
              result: { channel: 'slack', messageId: 'msg_456' }
            }
          ]
        },
        {
          id: 'log2',
          ruleId: '2',
          ruleName: 'Sprint Completion Workflow',
          status: 'success',
          executedAt: '2024-01-14T18:00:00Z',
          duration: 890,
          triggeredBy: 'sprint_complete',
          actionsExecuted: 3,
          details: [
            {
              action: 'create_task',
              status: 'success',
              duration: 340,
              result: { taskId: 'TASK-124', title: 'Sprint Alpha Retrospective' }
            },
            {
              action: 'send_email',
              status: 'success',
              duration: 450,
              result: { emailId: 'email_789', recipients: 8 }
            },
            {
              action: 'update_field',
              status: 'success',
              duration: 100,
              result: { updated: true, field: 'lastSprintCompletedAt' }
            }
          ]
        },
        {
          id: 'log3',
          ruleId: '3',
          ruleName: 'Code Review Reminder',
          status: 'failure',
          executedAt: '2024-01-15T09:00:00Z',
          duration: 156,
          triggeredBy: 'time_based',
          actionsExecuted: 0,
          errorMessage: 'Slack API rate limit exceeded',
          details: [
            {
              action: 'send_notification',
              status: 'failure',
              duration: 156,
              error: 'Rate limit exceeded. Retry after 60 seconds.'
            }
          ]
        }
      ];

      setWorkflowRules(mockRules);
      setTemplates(mockTemplates);
      setExecutionLogs(mockLogs);
    } catch (error) {
      console.error('Error fetching automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#6b7280';
      case 'draft': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sprint': return '📋';
      case 'task': return '✅';
      case 'project': return '🚀';
      case 'quality': return '🔍';
      case 'notification': return '🔔';
      default: return '⚙️';
    }
  };

  const generateExecutionChartData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }).reverse();

    // Mock execution data
    const successData = [12, 15, 8, 22, 18, 25, 20];
    const failureData = [1, 2, 0, 3, 1, 2, 1];

    return {
      labels: last7Days,
      datasets: [
        {
          label: 'Successful Executions',
          data: successData,
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          borderWidth: 1
        },
        {
          label: 'Failed Executions',
          data: failureData,
          backgroundColor: '#ef4444',
          borderColor: '#ef4444',
          borderWidth: 1
        }
      ]
    };
  };

  const generateRulePerformanceData = () => {
    const ruleNames = workflowRules.slice(0, 5).map(rule => rule.name);
    const executionCounts = workflowRules.slice(0, 5).map(rule => rule.executionCount);

    return {
      labels: ruleNames,
      datasets: [
        {
          label: 'Executions',
          data: executionCounts,
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          borderWidth: 1
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="automation-engine loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading automation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="automation-engine">
      <div className="automation-header">
        <div className="header-content">
          <h1>🏭 Automation Engine</h1>
          <p>Create powerful workflows to automate your agile processes</p>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowRuleBuilder(true)}>
            ➕ Create Rule
          </button>
          <button className="btn btn-secondary">
            📊 Analytics
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="automation-nav">
        {[
          { key: 'overview', label: '📈 Overview', icon: '📈' },
          { key: 'rules', label: '⚙️ Rules', icon: '⚙️' },
          { key: 'builder', label: '🔧 Builder', icon: '🔧' },
          { key: 'templates', label: '📋 Templates', icon: '📋' },
          { key: 'logs', label: '📝 Execution Logs', icon: '📝' },
          { key: 'analytics', label: '📊 Analytics', icon: '📊' }
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
      <div className="automation-content">
        {activeView === 'overview' && (
          <div className="overview-view">
            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">⚙️</div>
                <div className="stat-content">
                  <h3>Active Rules</h3>
                  <div className="stat-value">
                    {workflowRules.filter(r => r.status === 'active').length}
                  </div>
                  <div className="stat-detail">
                    {workflowRules.length} total rules
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🚀</div>
                <div className="stat-content">
                  <h3>Executions Today</h3>
                  <div className="stat-value">
                    {workflowRules.reduce((acc, r) => acc + r.executionCount, 0)}
                  </div>
                  <div className="stat-detail">
                    {((workflowRules.reduce((acc, r) => acc + (r.successRate * r.executionCount), 0) / workflowRules.reduce((acc, r) => acc + r.executionCount, 1)) || 0).toFixed(1)}% success rate
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-content">
                  <h3>Templates</h3>
                  <div className="stat-value">{templates.length}</div>
                  <div className="stat-detail">
                    Ready to use
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-content">
                  <h3>Time Saved</h3>
                  <div className="stat-value">24.3h</div>
                  <div className="stat-detail">
                    This week
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
              <div className="chart-container">
                <h3>Execution Trends (7 days)</h3>
                <Bar 
                  data={generateExecutionChartData()}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Executions' }
                      }
                    }
                  }}
                />
              </div>

              <div className="chart-container">
                <h3>Rule Performance</h3>
                <Bar 
                  data={generateRulePerformanceData()}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Executions' }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Recent Executions */}
            <div className="recent-executions">
              <h3>Recent Executions</h3>
              <div className="execution-list">
                {executionLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="execution-item">
                    <div className={`execution-status ${log.status}`}>
                      <div className="status-dot"></div>
                    </div>
                    <div className="execution-content">
                      <div className="execution-title">{log.ruleName}</div>
                      <div className="execution-detail">
                        Executed {log.actionsExecuted} actions • {new Date(log.executedAt).toLocaleString()} • {log.duration}ms
                        {log.errorMessage && <span className="error-message"> • {log.errorMessage}</span>}
                      </div>
                    </div>
                    <div className="execution-trigger">
                      <span className="trigger-badge">{log.triggeredBy.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'rules' && (
          <div className="rules-view">
            <div className="rules-grid">
              {workflowRules.map(rule => (
                <div key={rule.id} className="rule-card">
                  <div className="rule-header">
                    <div className="rule-info">
                      <div className="rule-icon">{getCategoryIcon(rule.category)}</div>
                      <div>
                        <h3>{rule.name}</h3>
                        <p>{rule.description}</p>
                        <span className="rule-category">{rule.category}</span>
                      </div>
                    </div>
                    <div className="rule-status">
                      <div className={`status-indicator ${rule.status}`}>
                        <div className="status-dot"></div>
                        {rule.status.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="rule-metrics">
                    <div className="metric">
                      <span className="metric-label">Executions</span>
                      <span className="metric-value">{rule.executionCount}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Success Rate</span>
                      <span className="metric-value">{rule.successRate}%</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Triggers</span>
                      <span className="metric-value">{rule.triggers.length}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Actions</span>
                      <span className="metric-value">{rule.actions.length}</span>
                    </div>
                  </div>

                  <div className="rule-summary">
                    <div className="rule-triggers">
                      <strong>Triggers:</strong>
                      {rule.triggers.map(trigger => (
                        <span key={trigger.id} className="trigger-tag">
                          {trigger.type.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                    <div className="rule-actions-summary">
                      <strong>Actions:</strong>
                      {rule.actions.map(action => (
                        <span key={action.id} className="action-tag">
                          {action.type.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rule-actions">
                    <button className="btn btn-sm btn-secondary">
                      ✏️ Edit
                    </button>
                    <button className="btn btn-sm btn-secondary">
                      📊 Analytics
                    </button>
                    <button className="btn btn-sm btn-secondary">
                      🚀 Run Now
                    </button>
                    <button className={`btn btn-sm ${rule.status === 'active' ? 'btn-warning' : 'btn-success'}`}>
                      {rule.status === 'active' ? '⏸️ Pause' : '▶️ Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'templates' && (
          <div className="templates-view">
            <div className="templates-grid">
              {templates.map(template => (
                <div key={template.id} className="template-card">
                  <div className="template-header">
                    <div className="template-icon">{template.icon}</div>
                    <div className="template-info">
                      <h3>{template.name}</h3>
                      <p>{template.description}</p>
                      <span className="template-category">{template.category}</span>
                    </div>
                    <div className={`complexity-badge ${template.complexity}`}>
                      {template.complexity}
                    </div>
                  </div>

                  <div className="template-tags">
                    {template.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>

                  <div className="template-actions">
                    <button className="btn btn-primary">
                      🚀 Use Template
                    </button>
                    <button className="btn btn-secondary">
                      👁️ Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'logs' && (
          <div className="logs-view">
            <div className="logs-table">
              <table>
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Status</th>
                    <th>Executed</th>
                    <th>Duration</th>
                    <th>Triggered By</th>
                    <th>Actions</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {executionLogs.map(log => (
                    <tr key={log.id}>
                      <td className="log-rule">{log.ruleName}</td>
                      <td>
                        <span className={`status-badge ${log.status}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="log-executed">{new Date(log.executedAt).toLocaleString()}</td>
                      <td className="log-duration">{log.duration}ms</td>
                      <td className="log-trigger">
                        <span className="trigger-badge">{log.triggeredBy.replace('_', ' ')}</span>
                      </td>
                      <td className="log-actions">{log.actionsExecuted}</td>
                      <td className="log-details">
                        <button className="btn btn-sm btn-secondary">View</button>
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

export default AutomationEngine;