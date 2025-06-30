'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Brain,
  Zap,
  CheckCircle,
  XCircle,
  Target,
  Calendar,
  BarChart3,
  Lightbulb
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'

interface AIFeature {
  id: string
  name: string
  description: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  icon: React.ReactNode
  monthlyTokens: number
  benefit: string
  status: 'active' | 'inactive' | 'loading'
  result?: any
}

interface AIFeatureLibraryProps {
  projectId?: string
  sprintId?: string
}

export function AIFeatureLibrary({ projectId, sprintId }: AIFeatureLibraryProps) {
  const { toast } = useToast()
  const [features, setFeatures] = useState<AIFeature[]>([
    {
      id: 'resource-prediction',
      name: 'Resource Prediction',
      description: 'Predict if you have enough team members for upcoming sprints',
      priority: 'HIGH',
      icon: <Users className="h-5 w-5" />,
      monthlyTokens: 600,
      benefit: 'Prevent 90% of resource shortages',
      status: 'inactive'
    },
    {
      id: 'story-estimation',
      name: 'Smart Story Estimation',
      description: 'AI-powered story point estimation based on similar stories',
      priority: 'HIGH',
      icon: <Target className="h-5 w-5" />,
      monthlyTokens: 3000,
      benefit: '30% better estimation accuracy',
      status: 'inactive'
    },
    {
      id: 'delay-detection',
      name: 'Delay Detection',
      description: 'Early warning system for potential sprint delays',
      priority: 'HIGH',
      icon: <AlertTriangle className="h-5 w-5" />,
      monthlyTokens: 2000,
      benefit: 'Catch delays 2-3 sprints early',
      status: 'inactive'
    },
    {
      id: 'sprint-optimizer',
      name: 'Sprint Optimizer',
      description: 'Optimize story selection for maximum sprint success',
      priority: 'MEDIUM',
      icon: <TrendingUp className="h-5 w-5" />,
      monthlyTokens: 1000,
      benefit: '20% higher success rate',
      status: 'inactive'
    },
    {
      id: 'team-analysis',
      name: 'Team Performance Analysis',
      description: 'Identify team bottlenecks and improvement opportunities',
      priority: 'MEDIUM',
      icon: <BarChart3 className="h-5 w-5" />,
      monthlyTokens: 500,
      benefit: 'Identify bottlenecks faster',
      status: 'inactive'
    }
  ])

  const runAIFeature = async (featureId: string) => {
    setFeatures(prev => prev.map(f => 
      f.id === featureId ? { ...f, status: 'loading' } : f
    ))

    try {
      const response = await fetch('/api/ai-analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          feature_id: featureId,
          project_id: projectId,
          sprint_id: sprintId,
          context: {}
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      setFeatures(prev => prev.map(f => 
        f.id === featureId ? { ...f, status: 'active', result: result.result } : f
      ))

      toast({
        title: 'AI Analysis Complete',
        description: `${features.find(f => f.id === featureId)?.name} analysis completed successfully.`
      })
    } catch (error) {
      console.error('AI analysis failed:', error)
      setFeatures(prev => prev.map(f => 
        f.id === featureId ? { ...f, status: 'inactive' } : f
      ))
      
      toast({
        title: 'Analysis Failed',
        description: 'Unable to complete AI analysis. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const runResourcePrediction = async () => {
    // Simulate AI analysis for resource prediction
    const prompt = `
    Analyze team resource allocation for upcoming sprints.
    
    Context:
    - Current team size and capacity
    - Historical velocity data
    - Upcoming story points
    - Team member availability
    
    Provide a resource prediction with:
    1. Resource adequacy score (0-100)
    2. Predicted shortfall dates
    3. Recommended actions
    `

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    return {
      adequacyScore: 85,
      status: 'warning',
      prediction: 'Team resources are adequate for next 2 sprints but may face shortfall in Sprint 3',
      shortfallDate: '2024-03-15',
      recommendations: [
        'Consider hiring 1 additional developer by March 1st',
        'Reduce scope of Epic 2 by 20%',
        'Cross-train team members on critical skills'
      ],
      confidence: 92
    }
  }

  const runStoryEstimation = async () => {
    const prompt = `
    Analyze story complexity and provide estimation recommendations.
    
    Context:
    - Story description and acceptance criteria
    - Similar completed stories and their actual effort
    - Team velocity and estimation patterns
    - Technical complexity factors
    
    Provide estimation with:
    1. Recommended story points
    2. Confidence level
    3. Risk factors
    4. Comparison with similar stories
    `

    await new Promise(resolve => setTimeout(resolve, 1500))

    return {
      recommendedPoints: 5,
      currentEstimate: 8,
      confidence: 87,
      adjustment: 'down',
      reasoning: 'Similar stories completed in 3-5 points. Current estimate seems high.',
      similarStories: [
        { title: 'User Authentication', points: 5, actual: 4 },
        { title: 'Password Reset', points: 3, actual: 3 },
        { title: 'Profile Update', points: 5, actual: 6 }
      ],
      riskFactors: ['New technology', 'External API dependency']
    }
  }

  const runDelayDetection = async () => {
    const prompt = `
    Analyze current sprint progress and predict potential delays.
    
    Context:
    - Current sprint burndown
    - Story completion rates
    - Team velocity trends
    - Blocking issues and dependencies
    
    Provide delay prediction with:
    1. Delay probability
    2. Expected delay duration
    3. Root causes
    4. Mitigation strategies
    `

    await new Promise(resolve => setTimeout(resolve, 2200))

    return {
      delayProbability: 73,
      expectedDelay: '3-5 days',
      riskLevel: 'high',
      causes: [
        'Story US-123 is blocked by API team',
        'Team velocity 20% below average',
        '2 team members on vacation next week'
      ],
      mitigations: [
        'Escalate API dependency to stakeholders',
        'Move low-priority stories to next sprint',
        'Bring in contractor for critical tasks'
      ],
      affectedStories: ['US-123', 'US-127', 'US-130']
    }
  }

  const runSprintOptimizer = async () => {
    const prompt = `
    Optimize story selection for maximum sprint success.
    
    Context:
    - Available stories and their estimates
    - Team capacity and skills
    - Business priorities and dependencies
    - Historical success patterns
    
    Provide optimization with:
    1. Recommended story combination
    2. Success probability
    3. Risk assessment
    4. Alternative options
    `

    await new Promise(resolve => setTimeout(resolve, 1800))

    return {
      recommendedStories: [
        { id: 'US-101', title: 'User Dashboard', points: 8, priority: 'high' },
        { id: 'US-102', title: 'Email Notifications', points: 5, priority: 'medium' },
        { id: 'US-103', title: 'Data Export', points: 3, priority: 'low' }
      ],
      totalPoints: 16,
      teamCapacity: 18,
      successProbability: 92,
      recommendations: [
        'Current selection has high success probability',
        'Consider adding US-104 (2 points) for buffer',
        'Watch for dependencies between US-101 and US-102'
      ],
      alternatives: [
        { combination: 'A', points: 20, success: 78 },
        { combination: 'B', points: 14, success: 95 }
      ]
    }
  }

  const runTeamAnalysis = async () => {
    const prompt = `
    Analyze team performance and identify improvement opportunities.
    
    Context:
    - Team velocity trends
    - Story completion patterns
    - Collaboration metrics
    - Individual performance data
    
    Provide analysis with:
    1. Performance score
    2. Bottleneck identification
    3. Improvement recommendations
    4. Team health indicators
    `

    await new Promise(resolve => setTimeout(resolve, 2500))

    return {
      performanceScore: 78,
      trend: 'improving',
      bottlenecks: [
        { area: 'Code Review', impact: 'high', delay: '2.3 days avg' },
        { area: 'Testing', impact: 'medium', delay: '1.1 days avg' }
      ],
      recommendations: [
        'Implement automated code review checklist',
        'Add 1 more senior developer to review queue',
        'Increase test automation coverage to 85%'
      ],
      healthIndicators: {
        collaboration: 85,
        workload: 72,
        satisfaction: 88,
        productivity: 79
      }
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const renderFeatureResult = (feature: AIFeature) => {
    if (!feature.result) return null

    switch (feature.id) {
      case 'resource-prediction':
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Resource Analysis</h4>
              <Badge variant={feature.result.status === 'warning' ? 'destructive' : 'default'}>
                {feature.result.adequacyScore}% Adequate
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-3">{feature.result.prediction}</p>
            <div className="space-y-2">
              <div className="text-sm font-medium">Recommendations:</div>
              {feature.result.recommendations.map((rec: string, idx: number) => (
                <div key={idx} className="text-sm text-gray-600 flex items-start">
                  <Lightbulb className="h-4 w-4 mr-2 mt-0.5 text-yellow-500" />
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )

      case 'story-estimation':
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Estimation Analysis</h4>
              <Badge variant="outline">{feature.result.confidence}% Confident</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-sm text-gray-500">Current Estimate</div>
                <div className="text-lg font-bold">{feature.result.currentEstimate} points</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">AI Recommendation</div>
                <div className="text-lg font-bold text-green-600">{feature.result.recommendedPoints} points</div>
              </div>
            </div>
            <p className="text-sm text-gray-600">{feature.result.reasoning}</p>
          </div>
        )

      case 'delay-detection':
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Delay Prediction</h4>
              <Badge variant="destructive">{feature.result.delayProbability}% Risk</Badge>
            </div>
            <Alert className="mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Expected delay: {feature.result.expectedDelay}
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <div className="text-sm font-medium">Mitigation Actions:</div>
              {feature.result.mitigations.map((action: string, idx: number) => (
                <div key={idx} className="text-sm text-gray-600 flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                  {action}
                </div>
              ))}
            </div>
          </div>
        )

      case 'sprint-optimizer':
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Sprint Optimization</h4>
              <Badge variant="outline">{feature.result.successProbability}% Success Rate</Badge>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Capacity Usage</span>
                <span>{feature.result.totalPoints}/{feature.result.teamCapacity} points</span>
              </div>
              <Progress value={(feature.result.totalPoints / feature.result.teamCapacity) * 100} />
            </div>
            <div className="space-y-1">
              {feature.result.recommendedStories.map((story: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{story.title}</span>
                  <Badge variant="outline" className="text-xs">{story.points}pt</Badge>
                </div>
              ))}
            </div>
          </div>
        )

      case 'team-analysis':
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Team Performance</h4>
              <Badge variant="outline">{feature.result.performanceScore}/100</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              {Object.entries(feature.result.healthIndicators).map(([key, value]) => (
                <div key={key}>
                  <div className="text-sm text-gray-500 capitalize">{key}</div>
                  <Progress value={value as number} className="h-2" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Key Bottlenecks:</div>
              {feature.result.bottlenecks.map((bottleneck: any, idx: number) => (
                <div key={idx} className="text-sm text-gray-600 flex items-center justify-between">
                  <span>{bottleneck.area}</span>
                  <Badge variant="outline" className="text-xs">{bottleneck.delay}</Badge>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Brain className="h-6 w-6 mr-2 text-purple-600" />
            AI Feature Library
          </h2>
          <p className="text-gray-600">Powerful AI insights for your agile projects</p>
        </div>
        <Badge variant="outline" className="text-sm">
          5 Features Available
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Card key={feature.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {feature.icon}
                  <CardTitle className="text-lg">{feature.name}</CardTitle>
                </div>
                <Badge className={getPriorityColor(feature.priority)}>
                  {feature.priority}
                </Badge>
              </div>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Monthly tokens:</span>
                  <span className="font-medium">{feature.monthlyTokens.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center text-sm text-green-600">
                  <Zap className="h-4 w-4 mr-1" />
                  {feature.benefit}
                </div>

                <Button 
                  onClick={() => runAIFeature(feature.id)}
                  disabled={feature.status === 'loading'}
                  className="w-full"
                  variant={feature.status === 'active' ? 'secondary' : 'default'}
                >
                  {feature.status === 'loading' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  )}
                  {feature.status === 'loading' ? 'Analyzing...' : 
                   feature.status === 'active' ? 'Re-run Analysis' : 'Run Analysis'}
                </Button>

                {renderFeatureResult(feature)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="font-semibold mb-2 flex items-center">
          <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
          Cost Optimization Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <strong>Run strategically:</strong> Use Resource Prediction weekly, Delay Detection daily during active sprints
          </div>
          <div>
            <strong>Batch analysis:</strong> Run multiple features together to optimize API usage
          </div>
          <div>
            <strong>Focus on high-impact:</strong> Prioritize HIGH priority features for maximum ROI
          </div>
          <div>
            <strong>Learn from results:</strong> Use AI insights to improve your planning process
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIFeatureLibrary 