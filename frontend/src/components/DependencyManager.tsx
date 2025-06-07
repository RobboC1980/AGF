import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface Dependency {
  id: string;
  title: string;
  description: string;
  type: 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'resolved' | 'at_risk' | 'overdue';
  sourceProject: string;
  targetProject: string;
  sourceStory: string;
  targetStory: string;
  expectedResolution: string;
  impact: number; // 1-5 scale
  effort: number; // hours
  assignee?: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

interface DependencyVisualization {
  nodes: Array<{
    id: string;
    label: string;
    type: 'project' | 'story' | 'task';
    status: string;
    dependencies: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: string;
    status: string;
  }>;
}

interface DependencyManagerProps {
  projectId: string;
}

const DependencyManager: React.FC<DependencyManagerProps> = ({ projectId }) => {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [visualization, setVisualization] = useState<DependencyVisualization | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDependency, setSelectedDependency] = useState<Dependency | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'network' | 'matrix'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchDependencies();
    fetchVisualization();
  }, [projectId]);

  const fetchDependencies = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockDependencies: Dependency[] = [
        {
          id: '1',
          title: 'Authentication Service Integration',
          description: 'User management system needs to integrate with the new authentication service',
          type: 'blocks',
          priority: 'critical',
          status: 'active',
          sourceProject: 'User Management',
          targetProject: 'Authentication Service',
          sourceStory: 'User Login Revamp',
          targetStory: 'OAuth 2.0 Implementation',
          expectedResolution: '2024-12-15',
          impact: 5,
          effort: 40,
          assignee: 'John Doe',
          notes: ['Waiting for API documentation', 'Security review required'],
          createdAt: '2024-12-01',
          updatedAt: '2024-12-10'
        },
        {
          id: '2',
          title: 'Database Schema Update',
          description: 'Product catalog requires updated database schema',
          type: 'blocked_by',
          priority: 'high',
          status: 'at_risk',
          sourceProject: 'Product Catalog',
          targetProject: 'Database Team',
          sourceStory: 'Advanced Product Search',
          targetStory: 'Schema Migration v2.1',
          expectedResolution: '2024-12-20',
          impact: 4,
          effort: 24,
          assignee: 'Jane Smith',
          notes: ['Migration script in progress', 'Testing environment ready'],
          createdAt: '2024-11-25',
          updatedAt: '2024-12-08'
        },
        {
          id: '3',
          title: 'API Rate Limiting',
          description: 'Payment processing depends on API rate limiting implementation',
          type: 'relates_to',
          priority: 'medium',
          status: 'resolved',
          sourceProject: 'Payment Processing',
          targetProject: 'API Gateway',
          sourceStory: 'Payment Flow Optimization',
          targetStory: 'Rate Limiting Service',
          expectedResolution: '2024-12-05',
          impact: 3,
          effort: 16,
          assignee: 'Mike Johnson',
          notes: ['Implementation completed', 'Documentation updated'],
          createdAt: '2024-11-15',
          updatedAt: '2024-12-05'
        }
      ];
      
      setDependencies(mockDependencies);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVisualization = async () => {
    // Mock visualization data
    const mockVisualization: DependencyVisualization = {
      nodes: [
        { id: 'proj1', label: 'User Management', type: 'project', status: 'active', dependencies: 2 },
        { id: 'proj2', label: 'Authentication Service', type: 'project', status: 'active', dependencies: 1 },
        { id: 'proj3', label: 'Product Catalog', type: 'project', status: 'at_risk', dependencies: 1 },
        { id: 'story1', label: 'User Login Revamp', type: 'story', status: 'active', dependencies: 1 },
        { id: 'story2', label: 'OAuth 2.0 Implementation', type: 'story', status: 'active', dependencies: 0 },
      ],
      edges: [
        { from: 'proj1', to: 'proj2', type: 'blocks', status: 'active' },
        { from: 'story1', to: 'story2', type: 'blocks', status: 'active' },
      ]
    };
    
    setVisualization(mockVisualization);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newStatus = result.destination.droppableId as Dependency['status'];
    const dependencyId = result.draggableId;

    setDependencies(prev => 
      prev.map(dep => 
        dep.id === dependencyId 
          ? { ...dep, status: newStatus, updatedAt: new Date().toISOString() }
          : dep
      )
    );
  };

  const filteredDependencies = dependencies.filter(dep => {
    if (filterStatus !== 'all' && dep.status !== filterStatus) return false;
    if (filterType !== 'all' && dep.type !== filterType) return false;
    return true;
  });

  const getStatusColor = (status: Dependency['status']) => {
    switch (status) {
      case 'active': return '#3b82f6';
      case 'resolved': return '#10b981';
      case 'at_risk': return '#f59e0b';
      case 'overdue': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: Dependency['priority']) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getDependencyTypeIcon = (type: Dependency['type']) => {
    switch (type) {
      case 'blocks': return '🚫';
      case 'blocked_by': return '⏳';
      case 'relates_to': return '🔗';
      case 'duplicates': return '📋';
      default: return '❓';
    }
  };

  const getImpactLevel = (impact: number) => {
    if (impact >= 4) return 'High';
    if (impact >= 3) return 'Medium';
    return 'Low';
  };

  const calculateRiskScore = (dependency: Dependency) => {
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    const statusWeight = { overdue: 4, at_risk: 3, active: 2, resolved: 1 };
    
    return (priorityWeight[dependency.priority] + statusWeight[dependency.status] + dependency.impact) / 3;
  };

  if (loading) {
    return (
      <div className="dependency-manager loading">
        <div className="loading-spinner">Loading dependency data...</div>
      </div>
    );
  }

  return (
    <div className="dependency-manager">
      <div className="manager-header">
        <div className="header-content">
          <h2>🔗 Advanced Dependency Management</h2>
          <p>Visualize and manage cross-project dependencies</p>
        </div>
        
        <div className="header-actions">
          <div className="view-selector">
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              📋 List
            </button>
            <button 
              className={viewMode === 'board' ? 'active' : ''}
              onClick={() => setViewMode('board')}
            >
              📊 Board
            </button>
            <button 
              className={viewMode === 'network' ? 'active' : ''}
              onClick={() => setViewMode('network')}
            >
              🕸️ Network
            </button>
            <button 
              className={viewMode === 'matrix' ? 'active' : ''}
              onClick={() => setViewMode('matrix')}
            >
              📈 Matrix
            </button>
          </div>
          
          <button 
            className="create-dependency-btn"
            onClick={() => setShowCreateModal(true)}
          >
            ➕ Add Dependency
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="at_risk">At Risk</option>
            <option value="overdue">Overdue</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="blocks">Blocks</option>
            <option value="blocked_by">Blocked By</option>
            <option value="relates_to">Relates To</option>
            <option value="duplicates">Duplicates</option>
          </select>
        </div>
      </div>

      {/* Risk Dashboard */}
      <div className="risk-dashboard">
        <div className="risk-metrics">
          <div className="risk-metric">
            <div className="metric-value">{dependencies.filter(d => d.status === 'overdue').length}</div>
            <div className="metric-label">Overdue</div>
          </div>
          <div className="risk-metric">
            <div className="metric-value">{dependencies.filter(d => d.status === 'at_risk').length}</div>
            <div className="metric-label">At Risk</div>
          </div>
          <div className="risk-metric">
            <div className="metric-value">{dependencies.filter(d => d.priority === 'critical').length}</div>
            <div className="metric-label">Critical</div>
          </div>
          <div className="risk-metric">
            <div className="metric-value">{Math.round(dependencies.reduce((acc, d) => acc + calculateRiskScore(d), 0) / dependencies.length * 10) / 10}</div>
            <div className="metric-label">Avg Risk Score</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dependency-content">
        {viewMode === 'list' && (
          <div className="dependencies-list">
            {filteredDependencies.map(dependency => (
              <div 
                key={dependency.id} 
                className={`dependency-item ${dependency.status}`}
                onClick={() => setSelectedDependency(dependency)}
              >
                <div className="dependency-header">
                  <div className="dependency-info">
                    <div className="dependency-title">
                      <span className="type-icon">{getDependencyTypeIcon(dependency.type)}</span>
                      <h3>{dependency.title}</h3>
                      <div 
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(dependency.priority) }}
                      >
                        {dependency.priority}
                      </div>
                    </div>
                    <div className="dependency-projects">
                      <span className="source">{dependency.sourceProject}</span>
                      <span className="arrow">→</span>
                      <span className="target">{dependency.targetProject}</span>
                    </div>
                  </div>
                  
                  <div className="dependency-meta">
                    <div 
                      className="status-indicator"
                      style={{ backgroundColor: getStatusColor(dependency.status) }}
                    >
                      {dependency.status.replace('_', ' ')}
                    </div>
                    <div className="impact-level">
                      Impact: {getImpactLevel(dependency.impact)}
                    </div>
                    <div className="risk-score">
                      Risk: {Math.round(calculateRiskScore(dependency) * 10) / 10}/5
                    </div>
                  </div>
                </div>
                
                <div className="dependency-details">
                  <p>{dependency.description}</p>
                  <div className="dependency-timeline">
                    <span>Expected: {dependency.expectedResolution}</span>
                    <span>Effort: {dependency.effort}h</span>
                    {dependency.assignee && <span>Assignee: {dependency.assignee}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'board' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="dependencies-board">
              {['active', 'at_risk', 'overdue', 'resolved'].map(status => (
                <div key={status} className="status-column">
                  <div className="column-header">
                    <h3>{status.replace('_', ' ').toUpperCase()}</h3>
                    <span className="count">
                      {filteredDependencies.filter(d => d.status === status).length}
                    </span>
                  </div>
                  
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`column-content ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                      >
                        {filteredDependencies
                          .filter(d => d.status === status)
                          .map((dependency, index) => (
                            <Draggable 
                              key={dependency.id} 
                              draggableId={dependency.id} 
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`dependency-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                  onClick={() => setSelectedDependency(dependency)}
                                >
                                  <div className="card-header">
                                    <span className="type-icon">{getDependencyTypeIcon(dependency.type)}</span>
                                    <div 
                                      className="priority-dot"
                                      style={{ backgroundColor: getPriorityColor(dependency.priority) }}
                                    />
                                  </div>
                                  <h4>{dependency.title}</h4>
                                  <div className="card-projects">
                                    {dependency.sourceProject} → {dependency.targetProject}
                                  </div>
                                  <div className="card-meta">
                                    <span>Impact: {getImpactLevel(dependency.impact)}</span>
                                    <span>{dependency.effort}h</span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}

        {viewMode === 'network' && visualization && (
          <div className="network-view">
            <div className="network-canvas">
              {/* Simplified network visualization */}
              <div className="network-nodes">
                {visualization.nodes.map(node => (
                  <div 
                    key={node.id}
                    className={`network-node ${node.type}`}
                    style={{
                      left: `${Math.random() * 80 + 10}%`,
                      top: `${Math.random() * 80 + 10}%`
                    }}
                  >
                    <div className="node-content">
                      <div className="node-label">{node.label}</div>
                      <div className="node-deps">{node.dependencies} deps</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="network-legend">
                <div className="legend-item">
                  <div className="legend-color project"></div>
                  <span>Projects</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color story"></div>
                  <span>Stories</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color task"></div>
                  <span>Tasks</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'matrix' && (
          <div className="dependency-matrix">
            <div className="matrix-header">
              <h3>🎯 Impact vs Priority Matrix</h3>
            </div>
            <div className="matrix-grid">
              <div className="matrix-quadrant high-impact high-priority">
                <h4>High Impact, High Priority</h4>
                {filteredDependencies
                  .filter(d => d.impact >= 4 && (d.priority === 'critical' || d.priority === 'high'))
                  .map(dep => (
                    <div key={dep.id} className="matrix-item critical">
                      {dep.title}
                    </div>
                  ))}
              </div>
              <div className="matrix-quadrant low-impact high-priority">
                <h4>Low Impact, High Priority</h4>
                {filteredDependencies
                  .filter(d => d.impact < 4 && (d.priority === 'critical' || d.priority === 'high'))
                  .map(dep => (
                    <div key={dep.id} className="matrix-item high">
                      {dep.title}
                    </div>
                  ))}
              </div>
              <div className="matrix-quadrant high-impact low-priority">
                <h4>High Impact, Low Priority</h4>
                {filteredDependencies
                  .filter(d => d.impact >= 4 && (d.priority === 'medium' || d.priority === 'low'))
                  .map(dep => (
                    <div key={dep.id} className="matrix-item medium">
                      {dep.title}
                    </div>
                  ))}
              </div>
              <div className="matrix-quadrant low-impact low-priority">
                <h4>Low Impact, Low Priority</h4>
                {filteredDependencies
                  .filter(d => d.impact < 4 && (d.priority === 'medium' || d.priority === 'low'))
                  .map(dep => (
                    <div key={dep.id} className="matrix-item low">
                      {dep.title}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dependency Detail Modal */}
      {selectedDependency && (
        <div className="dependency-modal" onClick={() => setSelectedDependency(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedDependency.title}</h2>
              <button onClick={() => setSelectedDependency(null)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="dependency-overview">
                <div className="overview-item">
                  <strong>Type:</strong> {getDependencyTypeIcon(selectedDependency.type)} {selectedDependency.type}
                </div>
                <div className="overview-item">
                  <strong>Priority:</strong> 
                  <span 
                    className="priority-tag"
                    style={{ backgroundColor: getPriorityColor(selectedDependency.priority) }}
                  >
                    {selectedDependency.priority}
                  </span>
                </div>
                <div className="overview-item">
                  <strong>Status:</strong>
                  <span 
                    className="status-tag"
                    style={{ backgroundColor: getStatusColor(selectedDependency.status) }}
                  >
                    {selectedDependency.status}
                  </span>
                </div>
                <div className="overview-item">
                  <strong>Risk Score:</strong> {Math.round(calculateRiskScore(selectedDependency) * 10) / 10}/5
                </div>
              </div>
              
              <div className="dependency-description">
                <h4>Description</h4>
                <p>{selectedDependency.description}</p>
              </div>
              
              <div className="dependency-projects">
                <h4>Project Dependencies</h4>
                <div className="project-flow">
                  <div className="project-box">{selectedDependency.sourceProject}</div>
                  <div className="arrow">→</div>
                  <div className="project-box">{selectedDependency.targetProject}</div>
                </div>
                <div className="story-flow">
                  <small>{selectedDependency.sourceStory} → {selectedDependency.targetStory}</small>
                </div>
              </div>
              
              <div className="dependency-metrics">
                <div className="metric">
                  <strong>Impact Level:</strong> {getImpactLevel(selectedDependency.impact)}
                </div>
                <div className="metric">
                  <strong>Estimated Effort:</strong> {selectedDependency.effort} hours
                </div>
                <div className="metric">
                  <strong>Expected Resolution:</strong> {selectedDependency.expectedResolution}
                </div>
                {selectedDependency.assignee && (
                  <div className="metric">
                    <strong>Assignee:</strong> {selectedDependency.assignee}
                  </div>
                )}
              </div>
              
              {selectedDependency.notes.length > 0 && (
                <div className="dependency-notes">
                  <h4>Notes</h4>
                  <ul>
                    {selectedDependency.notes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button className="btn-secondary">Edit</button>
              <button className="btn-primary">Update Status</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DependencyManager;