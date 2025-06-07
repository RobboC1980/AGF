import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

interface PredictiveAnalyticsProps {
  projectId: string;
}

interface PredictionData {
  sprintSuccessProbability: number;
  predictedVelocity: number;
  riskFactors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    probability: number;
    recommendation: string;
  }>;
  capacityPrediction: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  burndownPrediction: Array<{
    day: string;
    predicted: number;
    confidence: number;
  }>;
  teamMoodTrend: {
    current: number;
    trend: 'up' | 'down' | 'stable';
    factors: string[];
  };
}

const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({ projectId }) => {
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<'velocity' | 'burndown' | 'risks'>('velocity');

  useEffect(() => {
    fetchPredictions();
  }, [projectId]);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      // Simulate AI prediction API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock data - in real implementation, this would come from ML models
      const mockPredictions: PredictionData = {
        sprintSuccessProbability: 0.82,
        predictedVelocity: 34,
        riskFactors: [
          {
            factor: 'Team Member Availability',
            impact: 'high',
            probability: 0.65,
            recommendation: 'Consider redistributing work or adding buffer time'
          },
          {
            factor: 'Technical Debt',
            impact: 'medium',
            probability: 0.45,
            recommendation: 'Schedule debt reduction tasks in upcoming sprints'
          },
          {
            factor: 'External Dependencies',
            impact: 'high',
            probability: 0.30,
            recommendation: 'Follow up with external teams this week'
          }
        ],
        capacityPrediction: {
          optimistic: 45,
          realistic: 34,
          pessimistic: 28
        },
        burndownPrediction: [
          { day: 'Day 1', predicted: 100, confidence: 0.95 },
          { day: 'Day 2', predicted: 90, confidence: 0.92 },
          { day: 'Day 3', predicted: 78, confidence: 0.89 },
          { day: 'Day 4', predicted: 65, confidence: 0.85 },
          { day: 'Day 5', predicted: 52, confidence: 0.82 },
          { day: 'Day 6', predicted: 38, confidence: 0.78 },
          { day: 'Day 7', predicted: 25, confidence: 0.75 },
          { day: 'Day 8', predicted: 12, confidence: 0.72 },
          { day: 'Day 9', predicted: 5, confidence: 0.70 },
          { day: 'Day 10', predicted: 0, confidence: 0.68 }
        ],
        teamMoodTrend: {
          current: 7.5,
          trend: 'up',
          factors: ['Recent wins', 'Clear requirements', 'Good team collaboration']
        }
      };
      
      setPredictions(mockPredictions);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSuccessColor = (probability: number) => {
    if (probability >= 0.8) return '#10b981';
    if (probability >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getRiskColor = (impact: string) => {
    switch (impact) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const burndownChartData = {
    labels: predictions?.burndownPrediction.map(p => p.day) || [],
    datasets: [
      {
        label: 'Predicted Burndown',
        data: predictions?.burndownPrediction.map(p => p.predicted) || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Confidence Band',
        data: predictions?.burndownPrediction.map(p => p.confidence * 100) || [],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        borderDash: [5, 5],
      }
    ]
  };

  const velocityPredictionData = {
    labels: ['Pessimistic', 'Realistic', 'Optimistic'],
    datasets: [
      {
        data: predictions ? [
          predictions.capacityPrediction.pessimistic,
          predictions.capacityPrediction.realistic,
          predictions.capacityPrediction.optimistic
        ] : [],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderWidth: 2,
        borderColor: '#ffffff',
      }
    ]
  };

  if (loading) {
    return (
      <div className="predictive-analytics loading">
        <div className="ai-loading">
          <div className="ai-brain">🧠</div>
          <div className="loading-text">
            <h3>AI Analysis in Progress...</h3>
            <p>Analyzing historical data and generating predictions</p>
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!predictions) {
    return <div className="predictive-analytics error">Failed to load predictions</div>;
  }

  return (
    <div className="predictive-analytics">
      <div className="analytics-header">
        <div className="header-content">
          <h2>🤖 AI-Powered Predictive Analytics</h2>
          <p>Intelligent insights powered by machine learning</p>
        </div>
        <div className="model-selector">
          <button 
            className={selectedModel === 'velocity' ? 'active' : ''}
            onClick={() => setSelectedModel('velocity')}
          >
            Velocity Prediction
          </button>
          <button 
            className={selectedModel === 'burndown' ? 'active' : ''}
            onClick={() => setSelectedModel('burndown')}
          >
            Burndown Forecast
          </button>
          <button 
            className={selectedModel === 'risks' ? 'active' : ''}
            onClick={() => setSelectedModel('risks')}
          >
            Risk Analysis
          </button>
        </div>
      </div>

      <div className="predictions-grid">
        {/* Sprint Success Indicator */}
        <div className="prediction-card success-card">
          <div className="card-header">
            <h3>Sprint Success Probability</h3>
            <div className="ai-badge">AI</div>
          </div>
          <div className="success-indicator">
            <div 
              className="success-circle"
              style={{ 
                background: `conic-gradient(${getSuccessColor(predictions.sprintSuccessProbability)} ${predictions.sprintSuccessProbability * 360}deg, #e5e7eb 0deg)`
              }}
            >
              <div className="success-value">
                {Math.round(predictions.sprintSuccessProbability * 100)}%
              </div>
            </div>
          </div>
          <div className="success-factors">
            <p>Based on team velocity, capacity, and historical performance</p>
          </div>
        </div>

        {/* Velocity Prediction */}
        {selectedModel === 'velocity' && (
          <div className="prediction-card velocity-card">
            <div className="card-header">
              <h3>Velocity Prediction</h3>
              <div className="ai-badge">ML</div>
            </div>
            <div className="velocity-chart">
              <Doughnut 
                data={velocityPredictionData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.label}: ${context.parsed} story points`
                      }
                    }
                  }
                }}
              />
            </div>
            <div className="velocity-details">
              <div className="velocity-item">
                <span className="label">Most Likely:</span>
                <span className="value">{predictions.capacityPrediction.realistic} SP</span>
              </div>
            </div>
          </div>
        )}

        {/* Burndown Forecast */}
        {selectedModel === 'burndown' && (
          <div className="prediction-card burndown-card">
            <div className="card-header">
              <h3>Burndown Forecast</h3>
              <div className="ai-badge">ML</div>
            </div>
            <div className="burndown-chart">
              <Line 
                data={burndownChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Remaining Story Points'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Risk Analysis */}
        {selectedModel === 'risks' && (
          <div className="prediction-card risks-card">
            <div className="card-header">
              <h3>Risk Analysis</h3>
              <div className="ai-badge">AI</div>
            </div>
            <div className="risks-list">
              {predictions.riskFactors.map((risk, index) => (
                <div key={index} className="risk-item">
                  <div className="risk-header">
                    <div className="risk-info">
                      <h4>{risk.factor}</h4>
                      <div className="risk-probability">
                        {Math.round(risk.probability * 100)}% probability
                      </div>
                    </div>
                    <div 
                      className="risk-impact"
                      style={{ backgroundColor: getRiskColor(risk.impact) }}
                    >
                      {risk.impact}
                    </div>
                  </div>
                  <div className="risk-recommendation">
                    💡 {risk.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Mood Trend */}
        <div className="prediction-card mood-card">
          <div className="card-header">
            <h3>Team Sentiment Analysis</h3>
            <div className="ai-badge">NLP</div>
          </div>
          <div className="mood-indicator">
            <div className="mood-score">
              <span className="score">{predictions.teamMoodTrend.current}/10</span>
              <span className={`trend ${predictions.teamMoodTrend.trend}`}>
                {predictions.teamMoodTrend.trend === 'up' ? '↗️' : 
                 predictions.teamMoodTrend.trend === 'down' ? '↘️' : '➡️'}
              </span>
            </div>
            <div className="mood-factors">
              <h4>Contributing Factors:</h4>
              <ul>
                {predictions.teamMoodTrend.factors.map((factor, index) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="prediction-card recommendations-card">
          <div className="card-header">
            <h3>AI Recommendations</h3>
            <div className="ai-badge">GPT</div>
          </div>
          <div className="recommendations-list">
            <div className="recommendation-item priority-high">
              <div className="rec-icon">🎯</div>
              <div className="rec-content">
                <h4>Focus on High-Impact Stories</h4>
                <p>Based on velocity analysis, prioritize stories with 3-5 story points for optimal throughput</p>
              </div>
            </div>
            <div className="recommendation-item priority-medium">
              <div className="rec-icon">⚡</div>
              <div className="rec-content">
                <h4>Technical Debt Window</h4>
                <p>Schedule 20% of next sprint capacity for technical debt to improve future velocity</p>
              </div>
            </div>
            <div className="recommendation-item priority-low">
              <div className="rec-icon">👥</div>
              <div className="rec-content">
                <h4>Team Collaboration</h4>
                <p>Pair programming sessions show 15% higher story completion rates</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveAnalytics; 