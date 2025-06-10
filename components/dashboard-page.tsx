"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Rocket,
  BookOpen,
  CheckSquare,
  Zap,
  AlertTriangle,
  Trophy,
  ArrowRight,
  Activity,
  Clock,
  Sparkles,
  RefreshCw,
  Settings,
  Bell,
  Search,
  Download,
  PieChart,
  LineChart,
  MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useStories, useEpics, useUsers, useAnalytics } from "@/hooks/useApi"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { IntegrationStatus } from '@/components/integration-status'

// Enhanced entity configurations
interface EntityConfig {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  gradient: string
}

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  projects: {
    icon: Target,
    title: "Projects",
    description: "Active project portfolio",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    gradient: "from-blue-500 to-blue-600",
  },
  epics: {
    icon: Rocket,
    title: "Epics",
    description: "Large feature initiatives",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    gradient: "from-purple-500 to-purple-600",
  },
  stories: {
    icon: BookOpen,
    title: "Stories",
    description: "User requirements",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    gradient: "from-emerald-500 to-emerald-600",
  },
  tasks: {
    icon: CheckSquare,
    title: "Tasks",
    description: "Work items",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    gradient: "from-orange-500 to-orange-600",
  },
  sprints: {
    icon: Zap,
    title: "Sprints",
    description: "Active iterations",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    gradient: "from-indigo-500 to-indigo-600",
  },
  initiatives: {
    icon: TrendingUp,
    title: "Initiatives",
    description: "Strategic goals",
    color: "text-pink-700",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    gradient: "from-pink-500 to-pink-600",
  },
  risks: {
    icon: AlertTriangle,
    title: "Risks",
    description: "Project risks",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    gradient: "from-red-500 to-red-600",
  },
  okrs: {
    icon: Trophy,
    title: "OKRs",
    description: "Objectives & Key Results",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    gradient: "from-amber-500 to-amber-600",
  },
}

// Mock data interfaces
interface DashboardStats {
  projects: number
  epics: number
  stories: number
  tasks: number
  sprints: number
  initiatives: number
  risks: number
  okrs: number
}

interface RecentActivity {
  id: string
  type: "created" | "updated" | "completed"
  entity: string
  title: string
  user: {
    name: string
    avatar?: string
  }
  timestamp: string
}

interface TeamMember {
  id: string
  name: string
  avatar?: string
  role: string
  tasksCompleted: number
  activeProjects: number
}

interface DashboardPageProps {
  onRefresh?: () => void
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onRefresh }) => {
  // Use real API data instead of props
  const { data: stories = [], isLoading: storiesLoading, error: storiesError, refetch: refetchStories } = useStories()
  const { data: epics = [], isLoading: epicsLoading, error: epicsError } = useEpics()
  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers()
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useAnalytics()

  const isLoading = storiesLoading || epicsLoading || usersLoading || analyticsLoading
  const error = storiesError || epicsError || usersError || analyticsError

  const refetch = () => {
    refetchStories()
    onRefresh?.()
  }
  const [activeTab, setActiveTab] = useState("overview")
  const [timeRange, setTimeRange] = useState("7d")

  // Create dashboard stats from real data
  const stats: DashboardStats = {
    projects: epics.length, // Using epics as project-level entities
    epics: epics.length,
    stories: stories.length,
    tasks: stories.reduce((sum, story) => sum + (story.stats?.totalTasks || 0), 0),
    sprints: 8, // This would come from a sprints API
    initiatives: 6, // This would come from an initiatives API
    risks: 15, // This would come from a risks API
    okrs: 24, // This would come from an OKRs API
  }

  const mockRecentActivity: RecentActivity[] = stories.slice(0, 3).map((story, index) => ({
    id: story.id,
    type: story.status === 'done' ? 'completed' as const : 'updated' as const,
    entity: 'story',
    title: story.name,
    user: { 
      name: story.assignee?.name || 'Unassigned', 
      avatar: story.assignee?.avatar || "/placeholder.svg?height=32&width=32" 
    },
    timestamp: new Date(story.updatedAt).toLocaleDateString(),
  }))

  const mockTeamMembers: TeamMember[] = users.map(user => ({
    id: user.id,
    name: user.name,
    avatar: user.avatar || "/placeholder.svg?height=40&width=40",
    role: "Team Member", // This would come from user roles API
    tasksCompleted: stories.filter(s => s.assignee?.id === user.id && s.status === 'done').length,
    activeProjects: [...new Set(stories.filter(s => s.assignee?.id === user.id).map(s => s.epic?.project?.id))].length,
  }))

  // Calculate derived metrics
  const totalItems = useMemo(() => {
    return Object.values(stats).reduce((sum, count) => sum + count, 0)
  }, [stats])

  const completionRate = useMemo(() => {
    // Mock calculation - in real app, this would come from API
    return Math.round(((stats.tasks * 0.7) / stats.tasks) * 100) || 0
  }, [stats.tasks])

  const activeWorkload = useMemo(() => {
    return stats.tasks + stats.stories + stats.epics
  }, [stats])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Dashboard</h3>
          <p className="text-slate-600">Getting your workspace ready...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-2xl mx-auto shadow-lg">
            <CardContent className="p-8 text-center">
              <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Dashboard Temporarily Unavailable</h3>
              <p className="text-slate-600 mb-6">
                {error.message || "We're having trouble loading your dashboard data."}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={refetch} className="bg-blue-600 hover:bg-blue-700">
                  <RefreshCw size={16} className="mr-2" />
                  Try Again
                </Button>
                <Button variant="outline">
                  <Settings size={16} className="mr-2" />
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Enhanced Header */}
        <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 size={20} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Sparkles size={10} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
                  <p className="text-sm text-slate-600">Welcome to your agile workspace</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm">
                  <Search size={16} className="mr-2" />
                  Search
                </Button>
                <Button variant="outline" size="sm">
                  <Bell size={16} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Download size={16} className="mr-2" />
                      Export Report
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings size={16} className="mr-2" />
                      Dashboard Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={refetch}>
                      <RefreshCw size={16} className="mr-2" />
                      Refresh Data
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl border-0">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">Welcome back to AgileForge! 🚀</h2>
                    <p className="text-blue-100 mb-4">
                      You have {activeWorkload} active work items across {stats.projects} projects
                    </p>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                        <span className="text-sm text-blue-100">{completionRate}% completion rate</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                        <span className="text-sm text-blue-100">{stats.sprints} active sprints</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
                      <Rocket size={40} className="text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Integration Status - New Feature */}
          <IntegrationStatus />

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none lg:flex">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <BarChart3 size={16} />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <PieChart size={16} />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center space-x-2">
                <Users size={16} />
                <span>Team</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center space-x-2">
                <Activity size={16} />
                <span>Activity</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="shadow-sm border-slate-200/60">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600">Total Items</p>
                          <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
                          <p className="text-xs text-emerald-600 flex items-center mt-1">
                            <TrendingUp size={12} className="mr-1" />
                            +12% from last week
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                          <BarChart3 size={24} className="text-blue-600" />
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
                          <p className="text-2xl font-bold text-slate-900">{completionRate}%</p>
                          <p className="text-xs text-emerald-600 flex items-center mt-1">
                            <TrendingUp size={12} className="mr-1" />
                            +5% from last week
                          </p>
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
                          <p className="text-sm font-medium text-slate-600">Active Projects</p>
                          <p className="text-2xl font-bold text-slate-900">{stats.projects}</p>
                          <p className="text-xs text-amber-600 flex items-center mt-1">
                            <Clock size={12} className="mr-1" />2 due this week
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                          <Target size={24} className="text-purple-600" />
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
                          <p className="text-sm font-medium text-slate-600">Team Velocity</p>
                          <p className="text-2xl font-bold text-slate-900">42</p>
                          <p className="text-xs text-emerald-600 flex items-center mt-1">
                            <TrendingUp size={12} className="mr-1" />
                            +8% from last sprint
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                          <Zap size={24} className="text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Entity Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {Object.entries(stats).map(([key, value], index) => {
                  const config = ENTITY_CONFIGS[key]
                  if (!config) return null

                  const IconComponent = config.icon

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-slate-200/60">
                        <CardContent className="p-4 text-center">
                          <div
                            className={`w-12 h-12 ${config.bgColor} rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}
                          >
                            <IconComponent size={24} className={config.color} />
                          </div>
                          <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
                          <div className="text-sm font-medium text-slate-700 mb-1">{config.title}</div>
                          <div className="text-xs text-slate-500">{config.description}</div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>

              {/* Quick Actions */}
              <Card className="shadow-sm border-slate-200/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap size={20} className="text-blue-600" />
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-blue-50 hover:border-blue-200"
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <Target size={20} className="text-blue-600" />
                        <span className="font-medium">New Project</span>
                        <ArrowRight size={16} className="text-slate-400 ml-auto" />
                      </div>
                      <p className="text-sm text-slate-600 text-left">Start a new project and organize your work</p>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-emerald-50 hover:border-emerald-200"
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <BookOpen size={20} className="text-emerald-600" />
                        <span className="font-medium">Create Story</span>
                        <ArrowRight size={16} className="text-slate-400 ml-auto" />
                      </div>
                      <p className="text-sm text-slate-600 text-left">Add user stories with AI assistance</p>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-purple-50 hover:border-purple-200"
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <Zap size={20} className="text-purple-600" />
                        <span className="font-medium">Plan Sprint</span>
                        <ArrowRight size={16} className="text-slate-400 ml-auto" />
                      </div>
                      <p className="text-sm text-slate-600 text-left">Organize work into time-boxed sprints</p>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm border-slate-200/60">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <PieChart size={20} className="text-blue-600" />
                      <span>Work Distribution</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(stats)
                        .slice(0, 4)
                        .map(([key, value]) => {
                          const config = ENTITY_CONFIGS[key]
                          const percentage = Math.round((value / totalItems) * 100)
                          return (
                            <div key={key} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">{config.title}</span>
                                <span className="text-sm text-slate-600">{percentage}%</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          )
                        })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200/60">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <LineChart size={20} className="text-emerald-600" />
                      <span>Sprint Progress</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Current Sprint</span>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          Day 8 of 14
                        </Badge>
                      </div>
                      <Progress value={57} className="h-3" />
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-slate-900">24</div>
                          <div className="text-xs text-slate-600">Completed</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-slate-900">18</div>
                          <div className="text-xs text-slate-600">In Progress</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-slate-900">6</div>
                          <div className="text-xs text-slate-600">Remaining</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-6">
              <Card className="shadow-sm border-slate-200/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users size={20} className="text-blue-600" />
                    <span>Team Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockTeamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.avatar || "/placeholder.svg"} />
                            <AvatarFallback>
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-slate-900">{member.name}</div>
                            <div className="text-sm text-slate-600">{member.role}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-900">
                            {member.tasksCompleted} tasks completed
                          </div>
                          <div className="text-sm text-slate-600">{member.activeProjects} active projects</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card className="shadow-sm border-slate-200/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity size={20} className="text-blue-600" />
                    <span>Recent Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockRecentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={activity.user.avatar || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs">
                            {activity.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="font-medium text-slate-900">{activity.user.name}</span>
                            <span className="text-slate-600"> {activity.type} </span>
                            <span className="font-medium text-slate-900">{activity.title}</span>
                          </div>
                          <div className="text-xs text-slate-500">{activity.timestamp}</div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            activity.type === "completed"
                              ? "bg-emerald-50 text-emerald-700"
                              : activity.type === "created"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                          }
                        >
                          {activity.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              📅 Last updated: {new Date(data?.timestamp || Date.now()).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default DashboardPage
