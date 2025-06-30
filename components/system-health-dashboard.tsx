'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Database,
  Brain,
  Server,
  Globe,
  Zap,
  Clock,
  BarChart3
} from 'lucide-react'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'checking'
  message?: string
  responseTime?: number
  lastCheck?: Date
  details?: Record<string, any>
}

interface SystemMetrics {
  uptime: number
  requestCount: number
  errorRate: number
  avgResponseTime: number
  activeUsers: number
  memoryUsage: number
  cpuUsage: number
}

export function SystemHealthDashboard() {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  const checkServices = async () => {
    setIsRefreshing(true)
    
    try {
      // Check API Health
      const apiStart = Date.now()
      const healthResponse = await fetch('/api/health')
      const apiResponseTime = Date.now() - apiStart
      const healthData = await healthResponse.json()
      
      const newServices: ServiceStatus[] = []
      
      // API Service
      newServices.push({
        name: 'API Server',
        status: healthResponse.ok ? 'healthy' : 'down',
        message: healthData.version ? `v${healthData.version}` : 'Unknown version',
        responseTime: apiResponseTime,
        lastCheck: new Date(),
        details: healthData
      })
      
      // Database
      newServices.push({
        name: 'Database (Supabase)',
        status: healthData.services?.database === 'healthy' ? 'healthy' : 'down',
        message: healthData.services?.database || 'Unknown',
        lastCheck: new Date()
      })
      
      // AI Services
      const aiResponse = await fetch('/api/ai/status')
      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        
        newServices.push({
          name: 'AI Service (OpenAI)',
          status: aiData.openai_client ? 'healthy' : 'degraded',
          message: aiData.openai_client ? 'Connected' : 'Quota exceeded - Using fallback',
          lastCheck: new Date()
        })
        
        newServices.push({
          name: 'AI Service (Claude)',
          status: aiData.anthropic_client ? 'healthy' : 'down',
          message: aiData.anthropic_client ? 'Connected' : 'Not available',
          lastCheck: new Date()
        })
      }
      
      // Redis Cache
      newServices.push({
        name: 'Redis Cache',
        status: healthData.services?.redis === 'configured' ? 'healthy' : 'degraded',
        message: healthData.services?.redis || 'Not configured',
        lastCheck: new Date()
      })
      
      // Authentication Service
      const authCheck = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      }).catch(() => null)
      
      newServices.push({
        name: 'Authentication',
        status: authCheck?.ok ? 'healthy' : 'degraded',
        message: authCheck?.ok ? 'Working' : 'Check token',
        lastCheck: new Date()
      })
      
      setServices(newServices)
      
      // Get system metrics
      const metricsResponse = await fetch('/api/metrics')
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData)
      }
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Health check failed:', error)
      setServices([{
        name: 'API Server',
        status: 'down',
        message: 'Cannot connect to backend',
        lastCheck: new Date()
      }])
    } finally {
      setIsRefreshing(false)
    }
  }
  
  useEffect(() => {
    checkServices()
    
    if (autoRefresh) {
      const interval = setInterval(checkServices, 30000) // Check every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])
  
  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
    }
  }
  
  const getStatusBadge = (status: ServiceStatus['status']) => {
    const variants = {
      healthy: 'default',
      degraded: 'secondary',
      down: 'destructive',
      checking: 'outline'
    } as const
    
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>
  }
  
  const getOverallStatus = () => {
    if (services.length === 0) return 'checking'
    const hasDown = services.some(s => s.status === 'down')
    const hasDegraded = services.some(s => s.status === 'degraded')
    
    if (hasDown) return 'down'
    if (hasDegraded) return 'degraded'
    return 'healthy'
  }
  
  const overallStatus = getOverallStatus()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Health</h2>
          <p className="text-muted-foreground">
            Monitor the status of all AgileForge services
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="auto-refresh" className="text-sm">Auto-refresh</label>
          </div>
          <Button
            onClick={checkServices}
            disabled={isRefreshing}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Overall Status Alert */}
      <Alert className={
        overallStatus === 'healthy' ? 'border-green-500' :
        overallStatus === 'degraded' ? 'border-yellow-500' :
        overallStatus === 'down' ? 'border-red-500' : ''
      }>
        <Activity className="h-4 w-4" />
        <AlertTitle>
          System Status: {overallStatus === 'healthy' ? 'All Systems Operational' :
                          overallStatus === 'degraded' ? 'Partial Service Disruption' :
                          overallStatus === 'down' ? 'Major Service Outage' : 'Checking...'}
        </AlertTitle>
        <AlertDescription>
          Last checked: {lastUpdate.toLocaleTimeString()}
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="services" className="space-y-4">
          {/* Service Status Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {service.name === 'API Server' && <Server className="h-4 w-4" />}
                      {service.name.includes('Database') && <Database className="h-4 w-4" />}
                      {service.name.includes('AI') && <Brain className="h-4 w-4" />}
                      {service.name === 'Redis Cache' && <Zap className="h-4 w-4" />}
                      {service.name === 'Authentication' && <Globe className="h-4 w-4" />}
                      {service.name}
                    </CardTitle>
                    {getStatusIcon(service.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      {getStatusBadge(service.status)}
                    </div>
                    {service.message && (
                      <div className="text-sm text-muted-foreground">
                        {service.message}
                      </div>
                    )}
                    {service.responseTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Response Time</span>
                        <span className="text-sm font-medium">{service.responseTime}ms</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="metrics" className="space-y-4">
          {metrics ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(metrics.uptime / 3600).toFixed(1)}h</div>
                  <Progress value={Math.min(metrics.uptime / 864, 100)} className="mt-2" />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Request Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.requestCount.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total API calls</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.errorRate.toFixed(2)}%</div>
                  <Progress 
                    value={metrics.errorRate} 
                    className={`mt-2 ${metrics.errorRate > 5 ? '[&>div]:bg-red-500' : ''}`} 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.avgResponseTime}ms</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.avgResponseTime < 200 ? 'Excellent' : 
                     metrics.avgResponseTime < 500 ? 'Good' : 'Needs attention'}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Metrics Unavailable</AlertTitle>
              <AlertDescription>
                System metrics are not available at this time.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Current environment and configuration details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.find(s => s.name === 'API Server')?.details && (
                  <div>
                    <h4 className="font-medium mb-2">API Server Details</h4>
                    <pre className="text-xs bg-muted p-3 rounded">
                      {JSON.stringify(services.find(s => s.name === 'API Server')?.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 