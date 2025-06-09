"use client"

import { useState } from "react"
import { QueryProvider } from "../providers/query-provider"
import { ToastProvider } from "../providers/toast-provider"
import EpicsPage from "./EpicsPage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, AlertTriangle, Plus, Edit2, Trash2 } from "lucide-react"

export default function EpicsDemo() {
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setHasError(false)
    }, 1500)
  }

  const handleToggleError = () => {
    setHasError(!hasError)
  }

  const handleCreateNew = () => {
    alert("Create Epic dialog would open here!")
  }

  const handleEdit = (epic: any) => {
    alert(`Edit Epic: ${epic.name}`)
  }

  const handleDelete = (epic: any) => {
    if (confirm(`Are you sure you want to delete "${epic.name}"?`)) {
      alert(`Epic "${epic.name}" deleted!`)
    }
  }

  return (
    <QueryProvider>
      <ToastProvider />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Demo Controls */}
        <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Enhanced Epics Demo Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
                    <RefreshCw size={16} className={`mr-2 ${isLoading ? "animate-spin" : ""}`} />
                    {isLoading ? "Loading..." : "Simulate Refresh"}
                  </Button>
                  <Button onClick={handleToggleError} variant="outline">
                    <AlertTriangle size={16} className="mr-2" />
                    {hasError ? "Clear Error" : "Simulate Error"}
                  </Button>
                  <Button onClick={handleCreateNew} variant="outline">
                    <Plus size={16} className="mr-2" />
                    Test Create Epic
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Epics Component */}
        <EpicsPage
          isLoading={isLoading}
          error={hasError ? new Error("Failed to load epics data. Please try again.") : null}
          onRefresh={handleRefresh}
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </QueryProvider>
  )
} 