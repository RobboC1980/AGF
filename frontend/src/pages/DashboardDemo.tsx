"use client"

import { useState } from "react"
import { QueryProvider } from "../providers/query-provider"
import { ToastProvider } from "../providers/toast-provider"
import DashboardPage from "./DashboardPage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, AlertTriangle } from "lucide-react"

export default function DashboardDemo() {
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  const mockData = {
    message: "Your agile workspace is performing excellently",
    stats: {
      projects: 12,
      epics: 34,
      stories: 156,
      tasks: 423,
      sprints: 8,
      initiatives: 6,
      risks: 15,
      okrs: 24,
    },
    timestamp: new Date().toISOString(),
  }

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

  return (
    <QueryProvider>
      <ToastProvider />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Demo Controls */}
        <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Dashboard Demo Controls</CardTitle>
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dashboard Component */}
        <DashboardPage
          data={hasError ? undefined : mockData}
          isLoading={isLoading}
          error={hasError ? new Error("Failed to load dashboard data. Please try again.") : null}
          onRefresh={handleRefresh}
        />
      </div>
    </QueryProvider>
  )
} 