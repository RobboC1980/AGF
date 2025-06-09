"use client"

import { useState } from "react"
import { QueryProvider } from "../providers/query-provider"
import { ToastProvider } from "../providers/toast-provider"
import EntityListPage from "../components/EntityListPage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type EntityType = "projects" | "epics" | "stories" | "tasks" | "sprints" | "initiatives" | "risks" | "okrs"

export default function EntityDemo() {
  const [currentEntity, setCurrentEntity] = useState<EntityType>("stories")
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateNew = () => {
    console.log(`Creating new ${currentEntity.slice(0, -1)}`)
  }

  const handleEdit = (item: any) => {
    console.log("Editing item:", item)
  }

  const handleDelete = (item: any) => {
    console.log("Deleting item:", item)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 1000)
  }

  const entityTypes: { value: EntityType; label: string; count: number }[] = [
    { value: "projects", label: "Projects", count: 12 },
    { value: "epics", label: "Epics", count: 34 },
    { value: "stories", label: "Stories", count: 156 },
    { value: "tasks", label: "Tasks", count: 423 },
    { value: "sprints", label: "Sprints", count: 8 },
    { value: "initiatives", label: "Initiatives", count: 6 },
    { value: "risks", label: "Risks", count: 15 },
    { value: "okrs", label: "OKRs", count: 24 },
  ]

  return (
    <QueryProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
          {/* Entity Selector */}
          <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Entity Management Demo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    {entityTypes.map((entity) => (
                      <Button
                        key={entity.value}
                        variant={currentEntity === entity.value ? "default" : "outline"}
                        onClick={() => setCurrentEntity(entity.value)}
                        className="flex flex-col h-auto p-3 space-y-1"
                      >
                        <span className="font-medium">{entity.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {entity.count}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Entity List Page */}
          <EntityListPage
            entityType={currentEntity}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </ToastProvider>
    </QueryProvider>
  )
} 