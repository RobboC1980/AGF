"use client"

import React, { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import SprintBoardPage from '@/components/sprint-board-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Target, ArrowRight } from 'lucide-react'

const SprintBoard = () => {
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get('projectId')
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdFromUrl || '')

  // If no project ID is provided, show project selection
  if (!selectedProjectId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Target size={24} className="text-white" />
            </div>
            <CardTitle>Sprint Board</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-600 mb-4">
              Select a project to access its sprint board
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = '/projects'}
                className="w-full"
              >
                Select Project
                <ArrowRight size={16} className="ml-2" />
              </Button>
              <p className="text-xs text-slate-500">
                You can also access this page directly with ?projectId=your-project-id
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <SprintBoardPage projectId={selectedProjectId} />
}

export default SprintBoard 