import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

interface Portfolio {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  budget: number;
  spentBudget: number;
  startDate: string;
  endDate: string;
  programs: Program[];
  strategicObjectives: StrategicObjective[];
}

interface Program {
  id: string;
  name: string;
  description: string;
  portfolioId: string;
  status: 'planning' | 'active' | 'completed' | 'at_risk';
  progress: number;
  budget: number;
  projects: Project[];
  risks: Risk[];
  milestones: Milestone[];
}

interface Project {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'completed' | 'at_risk' | 'blocked';
  progress: number;
  health: 'green' | 'yellow' | 'red';
  velocity: number;
  teamSize: number;
  sprint: {
    current: number;
    total: number;
  };
}

interface StrategicObjective {
  id: string;
  title: string;
  description: string;
  progress: number;
  kpis: KPI[];
  linkedPrograms: string[];
}

interface KPI {
  id: string;
  name: string;
  target: number;
  actual: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'overdue';
  programId: string;
  dependencies: string[];
}

interface Risk {
  id: string;
  title: string;
  description: string;
  probability: number;
  impact: number;
  riskScore: number;
  mitigation: string;
  owner: string;
  status: 'open' | 'mitigated' | 'closed';
}

interface PortfolioManagementProps {
  organizationId: string;
}

const PortfolioManagement: React.FC<PortfolioManagementProps> = ({ organizationId }) => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'programs' | 'projects' | 'strategy' | 'risks' | 'capacity'>('overview');
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'quarter' | 'year' | 'all'>('quarter');

  useEffect(() => {
    fetchPortfolioData();
  }, [organizationId]);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      // Mock data - in real implementation, this would come from API
      const mockPortfolios: Portfolio[] = [
        {
          id: '1',
          name: 'Digital Transformation',
          description: 'Company-wide digital transformation initiative',
          status: 'active',
          budget: 5000000,
          spentBudget: 2100000,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          programs: [
            {
              id: 'p1',
              name: 'Customer Experience Platform',
              description: 'Modernize customer-facing applications',
              portfolioId: '1',
              status: 'active',
              progress: 65,
              budget: 2000000,
              projects: [
                {
                  id: 'proj1',
                  name: 'Mobile App Redesign',
                  status: 'active',
                  progress: 78,
                  health: 'green',
                  velocity: 42,
                  teamSize: 8,
                  sprint: { current: 12, total: 16 }
                },
                {
                  id: 'proj2',
                  name: 'Web Portal Modernization',
                  status: 'at_risk',
                  progress: 45,
                  health: 'yellow',
                  velocity: 28,
                  teamSize: 6,
                  sprint: { current: 8, total: 14 }
                }
              ],
              risks: [
                {
                  id: 'r1',
                  title: 'Integration Complexity',
                  description: 'Legacy system integration more complex than anticipated',
                  probability: 0.7,
                  impact: 4,
                  riskScore: 2.8,
                  mitigation: 'Additional architecture review and expert consultation',
                  owner: 'John Smith',
                  status: 'open'
                }
              ],
              milestones: [
                {
                  id: 'm1',
                  name: 'Beta Release',
                  dueDate: '2024-07-15',
                  status: 'completed',
                  programId: 'p1',
                  dependencies: []
                },
                {
                  id: 'm2',
                  name: 'Production Launch',
                  dueDate: '2024-09-30',
                  status: 'in_progress',
                  programId: 'p1',
                  dependencies: ['m1']
                }
              ]
            },
            {
              id: 'p2',
              name: 'Data & Analytics Platform',
              description: 'Build comprehensive data analytics capabilities',
              portfolioId: '1',
              status: 'planning',
              progress: 25,
              budget: 1500000,
              projects: [
                {
                  id: 'proj3',
                  name: 'Data Lake Implementation',
                  status: 'planning',
                  progress: 15,
                  health: 'green',
                  velocity: 0,
                  teamSize: 4,
                  sprint: { current: 2, total: 20 }
                }
              ],
              risks: [],
              milestones: []
            }
          ],
          strategicObjectives: [
            {
              id: 'so1',
              title: 'Improve Customer Satisfaction',
              description: 'Increase customer satisfaction scores by 25%',
              progress: 68,
              kpis: [
                {
                  id: 'kpi1',
                  name: 'NPS Score',
                  target: 70,
                  actual: 58,
                  unit: 'points',
                  trend: 'up'
                },
                {
                  id: 'kpi2',
                  name: 'Customer Retention',
                  target: 95,
                  actual: 92,
                  unit: '%',
                  trend: 'stable'
                }
              ],
              linkedPrograms: ['p1']
            },
            {
              id: 'so2',
              title: 'Data-Driven Decision Making',
              description: 'Enable real-time data insights across all departments',
              progress: 30,
              kpis: [
                {
                  id: 'kpi3',
                  name: 'Dashboard Usage',
                  target: 80,
                  actual: 25,
                  unit: '%',
                  trend: 'up'
                }
              ],
              linkedPrograms: ['p2']
            }
          ]
        }
      ];

      setPortfolios(mockPortfolios);
      setSelectedPortfolio(mockPortfolios[0]);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'active': return '#3b82f6';
      case 'planning': return '#f59e0b';
      case 'at_risk': return '#ef4444';
      case 'on_hold': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'green': return '#10b981';
      case 'yellow': return '#f59e0b';
      case 'red': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const calculatePortfolioHealth = (portfolio: Portfolio) => {
    if (!portfolio.programs.length) return 'green';
    
    const atRiskPrograms = portfolio.programs.filter(p => p.status === 'at_risk').length;
    const totalPrograms = portfolio.programs.length;
    
    if (atRiskPrograms === 0) return 'green';
    if (atRiskPrograms / totalPrograms <= 0.3) return 'yellow';
    return 'red';
  };

  const generatePortfolioChartData = () => {
    if (!selectedPortfolio) return null;

    const programProgress = {
      labels: selectedPortfolio.programs.map(p => p.name),
      datasets: [
        {
          label: 'Progress %',
          data: selectedPortfolio.programs.map(p => p.progress),
          backgroundColor: selectedPortfolio.programs.map(p => getStatusColor(p.status)),
          borderColor: selectedPortfolio.programs.map(p => getStatusColor(p.status)),
          borderWidth: 2
        }
      ]
    };

    return programProgress;
  };

  const generateBudgetChartData = () => {
    if (!selectedPortfolio) return null;

    return {
      labels: ['Budget Spent', 'Budget Remaining'],
      datasets: [
        {
          data: [
            selectedPortfolio.spentBudget,
            selectedPortfolio.budget - selectedPortfolio.spentBudget
          ],
          backgroundColor: ['#ef4444', '#10b981'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="portfolio-management loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-management">
      <div className="portfolio-header">
        <div className="header-content">
          <h1>📊 Portfolio Management</h1>
          <p>Strategic oversight and program coordination across the organization</p>
        </div>
        
        <div className="portfolio-selector">
          <select 
            value={selectedPortfolio?.id || ''} 
            onChange={(e) => setSelectedPortfolio(portfolios.find(p => p.id === e.target.value) || null)}
          >
            {portfolios.map(portfolio => (
              <option key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPortfolio && (
        <>
          {/* Portfolio Summary */}
          <div className="portfolio-summary">
            <div className="summary-cards">
              <div className="summary-card">
                <div className="card-icon">💼</div>
                <div className="card-content">
                  <h3>Portfolio Status</h3>
                  <div className={`status-badge ${selectedPortfolio.status}`}>
                    {selectedPortfolio.status.toUpperCase()}
                  </div>
                  <div className={`health-indicator ${calculatePortfolioHealth(selectedPortfolio)}`}>
                    Health: {calculatePortfolioHealth(selectedPortfolio).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon">🎯</div>
                <div className="card-content">
                  <h3>Programs</h3>
                  <div className="metric-value">{selectedPortfolio.programs.length}</div>
                  <div className="metric-detail">
                    {selectedPortfolio.programs.filter(p => p.status === 'active').length} Active
                  </div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon">🚀</div>
                <div className="card-content">
                  <h3>Projects</h3>
                  <div className="metric-value">
                    {selectedPortfolio.programs.reduce((acc, p) => acc + p.projects.length, 0)}
                  </div>
                  <div className="metric-detail">Across all programs</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon">💰</div>
                <div className="card-content">
                  <h3>Budget Utilization</h3>
                  <div className="metric-value">
                    {Math.round((selectedPortfolio.spentBudget / selectedPortfolio.budget) * 100)}%
                  </div>
                  <div className="metric-detail">
                    ${(selectedPortfolio.spentBudget / 1000000).toFixed(1)}M / ${(selectedPortfolio.budget / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="portfolio-nav">
            {[
              { key: 'overview', label: '📈 Overview', icon: '📈' },
              { key: 'programs', label: '🎯 Programs', icon: '🎯' },
              { key: 'projects', label: '🚀 Projects', icon: '🚀' },
              { key: 'strategy', label: '🎨 Strategy', icon: '🎨' },
              { key: 'risks', label: '⚠️ Risks', icon: '⚠️' },
              { key: 'capacity', label: '👥 Capacity', icon: '👥' }
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
          <div className="portfolio-content">
            {activeView === 'overview' && (
              <div className="overview-view">
                <div className="charts-grid">
                  <div className="chart-container">
                    <h3>Program Progress</h3>
                    <Bar 
                      data={generatePortfolioChartData() || { labels: [], datasets: [] }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { display: false }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            title: { display: true, text: 'Progress %' }
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="chart-container">
                    <h3>Budget Allocation</h3>
                    <Doughnut 
                      data={generateBudgetChartData() || { labels: [], datasets: [] }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: 'bottom' }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="strategic-objectives">
                  <h3>Strategic Objectives</h3>
                  <div className="objectives-grid">
                    {selectedPortfolio.strategicObjectives.map(objective => (
                      <div key={objective.id} className="objective-card">
                        <div className="objective-header">
                          <h4>{objective.title}</h4>
                          <div className="progress-circle">
                            <div 
                              className="progress-fill"
                              style={{ 
                                background: `conic-gradient(#3b82f6 ${objective.progress * 3.6}deg, #e5e7eb 0deg)`
                              }}
                            >
                              <span className="progress-text">{objective.progress}%</span>
                            </div>
                          </div>
                        </div>
                        <p>{objective.description}</p>
                        <div className="kpis">
                          {objective.kpis.map(kpi => (
                            <div key={kpi.id} className="kpi-item">
                              <span className="kpi-name">{kpi.name}:</span>
                              <span className="kpi-value">{kpi.actual} / {kpi.target} {kpi.unit}</span>
                              <span className={`kpi-trend ${kpi.trend}`}>
                                {kpi.trend === 'up' ? '↗️' : kpi.trend === 'down' ? '↘️' : '➡️'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'programs' && (
              <div className="programs-view">
                <div className="programs-grid">
                  {selectedPortfolio.programs.map(program => (
                    <div key={program.id} className="program-card">
                      <div className="program-header">
                        <div className="program-info">
                          <h3>{program.name}</h3>
                          <p>{program.description}</p>
                        </div>
                        <div className="program-status">
                          <div className={`status-badge ${program.status}`}>
                            {program.status.replace('_', ' ').toUpperCase()}
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${program.progress}%` }}
                            />
                            <span className="progress-text">{program.progress}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="program-metrics">
                        <div className="metric">
                          <span className="metric-label">Budget:</span>
                          <span className="metric-value">${(program.budget / 1000000).toFixed(1)}M</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Projects:</span>
                          <span className="metric-value">{program.projects.length}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Risks:</span>
                          <span className="metric-value">{program.risks.length}</span>
                        </div>
                      </div>

                      <div className="program-projects">
                        <h4>Projects</h4>
                        {program.projects.map(project => (
                          <div key={project.id} className="mini-project-card">
                            <div className="project-info">
                              <span className="project-name">{project.name}</span>
                              <div className={`health-dot ${project.health}`}></div>
                            </div>
                            <div className="project-progress">
                              <span>{project.progress}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'projects' && (
              <div className="projects-view">
                <div className="projects-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Program</th>
                        <th>Status</th>
                        <th>Health</th>
                        <th>Progress</th>
                        <th>Velocity</th>
                        <th>Team Size</th>
                        <th>Sprint</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPortfolio.programs.flatMap(program =>
                        program.projects.map(project => (
                          <tr key={project.id}>
                            <td className="project-name">{project.name}</td>
                            <td className="program-name">{program.name}</td>
                            <td>
                              <span className={`status-badge ${project.status}`}>
                                {project.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td>
                              <div className={`health-indicator ${project.health}`}>
                                <div className="health-dot"></div>
                                {project.health.toUpperCase()}
                              </div>
                            </td>
                            <td>
                              <div className="progress-bar small">
                                <div 
                                  className="progress-fill"
                                  style={{ width: `${project.progress}%` }}
                                />
                                <span>{project.progress}%</span>
                              </div>
                            </td>
                            <td className="velocity">{project.velocity} pts</td>
                            <td className="team-size">{project.teamSize}</td>
                            <td className="sprint-info">
                              {project.sprint.current} / {project.sprint.total}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeView === 'risks' && (
              <div className="risks-view">
                <div className="risks-grid">
                  {selectedPortfolio.programs.flatMap(program =>
                    program.risks.map(risk => (
                      <div key={risk.id} className="risk-card">
                        <div className="risk-header">
                          <h4>{risk.title}</h4>
                          <div className={`risk-score ${risk.riskScore >= 3 ? 'high' : risk.riskScore >= 2 ? 'medium' : 'low'}`}>
                            {risk.riskScore.toFixed(1)}
                          </div>
                        </div>
                        <p>{risk.description}</p>
                        <div className="risk-details">
                          <div className="risk-metric">
                            <span>Probability:</span>
                            <span>{Math.round(risk.probability * 100)}%</span>
                          </div>
                          <div className="risk-metric">
                            <span>Impact:</span>
                            <span>{risk.impact}/5</span>
                          </div>
                          <div className="risk-metric">
                            <span>Owner:</span>
                            <span>{risk.owner}</span>
                          </div>
                        </div>
                        <div className="risk-mitigation">
                          <strong>Mitigation:</strong> {risk.mitigation}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PortfolioManagement;