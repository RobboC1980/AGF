"use client"

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import SprintBoardPage from '@/components/sprint-board-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Target, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/services/api'
import { toast } from 'sonner'

const SprintBoard = () => {
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get('projectId')
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdFromUrl || '')
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await api.projects.getAll()
        
        if (response.success && response.data) {
          setProjects(response.data)
          
          // If no project is selected but we have projects, select the first one
          if (!selectedProjectId && response.data.length > 0) {
            setSelectedProjectId(response.data[0].id)
          }
        } else {
          throw new Error('Failed to load projects')
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err)
        setError(err instanceof Error ? err.message : 'Failed to load projects')
        toast.error('Failed to load projects')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [selectedProjectId])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Loader2 size={24} className="text-white animate-spin" />
            </div>
            <CardTitle>Loading Sprint Board</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-600">
              Loading your projects and sprint data...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-white" />
            </div>
            <CardTitle>Error Loading Sprint Board</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-600 mb-4">
              {error}
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/projects'}
                className="w-full"
              >
                Go to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show project selection if no projects exist
  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Target size={24} className="text-white" />
            </div>
            <CardTitle>No Projects Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-600 mb-4">
              You need to create a project before you can manage sprints.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = '/projects'}
                className="w-full"
              >
                Create Your First Project
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show project selection if no project is selected
  if (!selectedProjectId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Target size={24} className="text-white" />
            </div>
            <CardTitle>Select a Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600 text-center">
              Choose a project to access its sprint board
            </p>
            
            <div className="space-y-3">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span>{project.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={() => selectedProjectId && setSelectedProjectId(selectedProjectId)}
                  disabled={!selectedProjectId}
                  className="flex-1"
                >
                  Open Sprint Board
                  <ArrowRight size={16} className="ml-2" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/projects'}
                >
                  Manage Projects
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 text-center">
              You can also access this page directly with ?projectId=your-project-id
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Find the selected project for display
  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div>
      {/* Project context header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Target size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                {selectedProject?.name || 'Project'}
              </h2>
              <p className="text-sm text-slate-600">Sprint Board</p>
            </div>
          </div>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>{project.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <SprintBoardPage projectId={selectedProjectId} />
    </div>
  )
}

export default SprintBoard 