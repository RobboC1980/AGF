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

  // These functions are no longer needed as we're calling the backend API directly

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