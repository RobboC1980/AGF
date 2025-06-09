"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Clock,
  Zap,
  Calendar,
  PieChartIcon as RechartsPieChart,
  LineChartIcon as RechartsLineChart,
  Activity,
  Award,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Filter,
  MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  Line,
} from "recharts"

interface AnalyticsData {
  overview: {
    totalProjects: number
    activeProjects: number
    completedProjects: number
    totalTeamMembers: number
    totalStoryPoints: number
    completedStoryPoints: number
    averageVelocity: number
    onTimeDelivery: number
  }
  trends: {
    velocity: Array<{ month: string; velocity: number; target: number }>
    burndown: Array<{ day: string; remaining: number; ideal: number }>
    completion: Array<{ week: string; completed: number; planned: number }>
  }
  distribution: {
    projectStatus: Array<{ name: string; value: number; color: string }>
    priorityBreakdown: Array<{ name: string; value: number; color: string }>
    teamWorkload: Array<{ name: string; assigned: number; completed: number }>
  }
  performance: {
    topPerformers: Array<{
      id: string
      name: string
      avatar?: string
      completedTasks: number
      storyPoints: number
      efficiency: number
    }>
    projectHealth: Array<{
      id: string
      name: string
      health: "excellent" | "good" | "warning" | "critical"
      progress: number
      daysRemaining: number
      riskFactors: string[]
    }>
  }
}

interface AnalyticsDashboardProps {
  data?: AnalyticsData
  timeRange?: "7d" | "30d" | "90d" | "1y"
  onTimeRangeChange?: (range: string) => void
  onExport?: () => void
  onRefresh?: () => void
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  data,
  timeRange = "30d",
  onTimeRangeChange,
  onExport,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState("overview")

  // Mock data for demonstration
  const mockData: AnalyticsData = {
    overview: {
      totalProjects: 24,
      activeProjects: 18,
      completedProjects: 6,
      totalTeamMembers: 32,
      totalStoryPoints: 1247,
      completedStoryPoints: 856,
      averageVelocity: 42,
      onTimeDelivery: 87,
    },
    trends: {
      velocity: [
        { month: "Jan", velocity: 38, target: 40 },
        { month: "Feb", velocity: 42, target: 40 },
        { month: "Mar", velocity: 45, target: 40 },
        { month: "Apr", velocity: 41, target: 40 },
        { month: "May", velocity: 48, target: 40 },
        { month: "Jun", velocity: 44, target: 40 },
      ],
      burndown: [
        { day: "Day 1", remaining: 100, ideal: 100 },
        { day: "Day 3", remaining: 85, ideal: 80 },
        { day: "Day 5", remaining: 70, ideal: 60 },
        { day: "Day 7", remaining: 45, ideal: 40 },
        { day: "Day 9", remaining: 25, ideal: 20 },
        { day: "Day 11", remaining: 10, ideal: 0 },
      ],
      completion: [
        { week: "Week 1", completed: 23, planned: 25 },
        { week: "Week 2", completed: 28, planned: 25 },
        { week: "Week 3", completed: 22, planned: 25 },
        { week: "Week 4", completed: 31, planned: 25 },
      ],
    },
    distribution: {
      projectStatus: [
        { name: "Active", value: 18, color: "#3b82f6" },
        { name: "Completed", value: 6, color: "#10b981" },
        { name: "On Hold", value: 2, color: "#f59e0b" },
        { name: "Planning", value: 4, color: "#6b7280" },
      ],
      priorityBreakdown: [
        { name: "Critical", value: 8, color: "#ef4444" },
        { name: "High", value: 15, color: "#f97316" },
        { name: "Medium", value: 32, color: "#eab308" },
        { name: "Low", value: 12, color: "#22c55e" },
      ],
      teamWorkload: [
        { name: "Sarah Chen", assigned: 12, completed: 8 },
        { name: "Alex Rodriguez", assigned: 15, completed: 12 },
        { name: "Emily Johnson", assigned: 10, completed: 9 },
        { name: "Michael Brown", assigned: 8, completed: 6 },
        { name: "Lisa Garcia", assigned: 11, completed: 7 },
      ],
    },
    performance: {
      topPerformers: [
        {
          id: "1",
          name: "Sarah Chen",
          avatar: "/placeholder.svg?height=32&width=32",
          completedTasks: 23,
          storyPoints: 89,
          efficiency: 94,
        },
        {
          id: "2",
          name: "Alex Rodriguez",
          avatar: "/placeholder.svg?height=32&width=32",
          completedTasks: 31,
          storyPoints: 76,
          efficiency: 91,
        },
        {
          id: "3",
          name: "Emily Johnson",
          avatar: "/placeholder.svg?height=32&width=32",
          completedTasks: 18,
          storyPoints: 67,
          efficiency: 88,
        },
      ],
      projectHealth: [
        {
          id: "1",
          name: "AgileForge Platform",
          health: "good",
          progress: 68,
          daysRemaining: 45,
          riskFactors: ["Resource allocation"],
        },
        {
          id: "2",
          name: "Mobile Application",
          health: "warning",
          progress: 35,
          daysRemaining: 30,
          riskFactors: ["Timeline pressure", "Technical debt"],
        },
        {
          id: "3",
          name: "Analytics Dashboard",
          health: "excellent",
          progress: 92,
          daysRemaining: 8,
          riskFactors: [],
        },
      ],
    },
  }

  const analyticsData = data || mockData

  const healthConfig = {
    excellent: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
    good: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    warning: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    critical: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  }

  const calculateChange = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change),
      isPositive: change > 0,
      isNegative: change < 0,
    }
  }

  // Mock previous period data for comparison
  const previousData = {
    velocity: 38,
    completion: 82,
    onTime: 84,
    efficiency: 89,
  }

  const velocityChange = calculateChange(analyticsData.overview.averageVelocity, previousData.velocity)
  const completionChange = calculateChange(
    (analyticsData.overview.completedStoryPoints / analyticsData.overview.totalStoryPoints) * 100,
    previousData.completion,
  )

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h2>
            <p className="text-slate-600">Comprehensive insights into your team's performance</p>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={timeRange} onValueChange={onTimeRangeChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download size={16} className="mr-2" />
              Export
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Filter size={16} className="mr-2" />
                  Advanced Filters
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Calendar size={16} className="mr-2" />
                  Custom Date Range
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Target size={16} className="mr-2" />
                  Set Goals
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-sm border-slate-200/60">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Team Velocity</p>
                    <p className="text-2xl font-bold text-slate-900">{analyticsData.overview.averageVelocity}</p>
                    <div className="flex items-center mt-1">
                      {velocityChange.isPositive ? (
                        <ArrowUpRight size={12} className="text-emerald-600 mr-1" />
                      ) : (
                        <ArrowDownRight size={12} className="text-red-600 mr-1" />
                      )}
                      <span className={`text-xs ${velocityChange.isPositive ? "text-emerald-600" : "text-red-600"}`}>
                        {velocityChange.value.toFixed(1)}% vs last period
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Zap size={24} className="text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="shadow-sm border-slate-200/60">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {Math.round(
                        (analyticsData.overview.completedStoryPoints / analyticsData.overview.totalStoryPoints) * 100,
                      )}
                      %
                    </p>
                    <div className="flex items-center mt-1">
                      {completionChange.isPositive ? (
                        <ArrowUpRight size={12} className="text-emerald-600 mr-1" />
                      ) : (
                        <ArrowDownRight size={12} className="text-red-600 mr-1" />
                      )}
                      <span className={`text-xs ${completionChange.isPositive ? "text-emerald-600" : "text-red-600"}`}>
                        {completionChange.value.toFixed(1)}% vs last period
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <Target size={24} className="text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="shadow-sm border-slate-200/60">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">On-Time Delivery</p>
                    <p className="text-2xl font-bold text-slate-900">{analyticsData.overview.onTimeDelivery}%</p>
                    <div className="flex items-center mt-1">
                      <ArrowUpRight size={12} className="text-emerald-600 mr-1" />
                      <span className="text-xs text-emerald-600">+3.2% vs last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Clock size={24} className="text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="shadow-sm border-slate-200/60">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Active Projects</p>
                    <p className="text-2xl font-bold text-slate-900">{analyticsData.overview.activeProjects}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-slate-600">
                        {analyticsData.overview.totalTeamMembers} team members
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                    <Users size={24} className="text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Detailed Analytics */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="health">Project Health</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Status Distribution */}
              <Card className="shadow-sm border-slate-200/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RechartsPieChart size={20} className="text-blue-600" />
                    <span>Project Status Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <RechartsPieChart.Pie
                          data={analyticsData.distribution.projectStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {analyticsData.distribution.projectStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </RechartsPieChart.Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {analyticsData.distribution.projectStatus.map((item) => (
                      <div key={item.name} className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm text-slate-600">
                          {item.name}: {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Team Workload */}
              <Card className="shadow-sm border-slate-200/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 size={20} className="text-emerald-600" />
                    <span>Team Workload</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.distribution.teamWorkload}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="assigned" fill="#3b82f6" name="Assigned" />
                        <Bar dataKey="completed" fill="#10b981" name="Completed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Velocity Trend */}
              <Card className="shadow-sm border-slate-200/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp size={20} className="text-blue-600" />
                    <span>Velocity Trend</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData.trends.velocity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="velocity" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Line type="monotone" dataKey="target" stroke="#ef4444" strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Sprint Burndown */}
              <Card className="shadow-sm border-slate-200/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RechartsLineChart size={20} className="text-purple-600" />
                    <span>Sprint Burndown</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={analyticsData.trends.burndown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="remaining" stroke="#8b5cf6" strokeWidth={2} />
                        <Line type="monotone" dataKey="ideal" stroke="#6b7280" strokeDasharray="5 5" />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <Card className="shadow-sm border-slate-200/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award size={20} className="text-amber-600" />
                    <span>Top Performers</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.performance.topPerformers.map((performer, index) => (
                      <div key={performer.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="secondary"
                              className="w-6 h-6 rounded-full p-0 flex items-center justify-center"
                            >
                              {index + 1}
                            </Badge>
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={performer.avatar || "/placeholder.svg"} />
                              <AvatarFallback>
                                {performer.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{performer.name}</div>
                            <div className="text-sm text-slate-600">
                              {performer.completedTasks} tasks • {performer.storyPoints} SP
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-slate-900">{performer.efficiency}%</div>
                          <div className="text-sm text-slate-600">efficiency</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Priority Breakdown */}
              <Card className="shadow-sm border-slate-200/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle size={20} className="text-orange-600" />
                    <span>Priority Breakdown</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.distribution.priorityBreakdown.map((priority) => (
                      <div key={priority.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: priority.color }}></div>
                            <span className="font-medium text-slate-900">{priority.name}</span>
                          </div>
                          <span className="text-sm text-slate-600">{priority.value} items</span>
                        </div>
                        <Progress
                          value={
                            (priority.value /
                              analyticsData.distribution.priorityBreakdown.reduce((sum, p) => sum + p.value, 0)) *
                            100
                          }
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <Card className="shadow-sm border-slate-200/60">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity size={20} className="text-emerald-600" />
                  <span>Project Health Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.performance.projectHealth.map((project) => (
                    <div key={project.id} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-slate-900">{project.name}</h3>
                          <Badge
                            variant="secondary"
                            className={`${healthConfig[project.health].bg} ${healthConfig[project.health].color} ${healthConfig[project.health].border} border`}
                          >
                            {project.health}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-600">{project.daysRemaining} days remaining</div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Progress</span>
                          <span className="font-medium text-slate-900">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>

                      {project.riskFactors.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <AlertTriangle size={16} className="text-amber-600" />
                          <span className="text-sm text-slate-600">Risk factors:</span>
                          <div className="flex flex-wrap gap-1">
                            {project.riskFactors.map((risk, index) => (
                              <Badge key={index} variant="outline" className="text-xs bg-amber-50 text-amber-700">
                                {risk}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {project.riskFactors.length === 0 && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <span className="text-sm text-emerald-600">No identified risks</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}

export default AnalyticsDashboard
