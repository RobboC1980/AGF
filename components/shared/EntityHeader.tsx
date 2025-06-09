import React from 'react'
import { Button } from "@/components/ui/button"
import { Plus, Sparkles } from "lucide-react"

interface EntityConfig {
  icon: React.ComponentType<any>
  title: string
  description: string
  color: string
  bgColor: string
  borderColor: string
}

interface EntityStats {
  total: number
  completed: number
  inProgress: number
  overdue: number
}

interface EntityHeaderProps {
  config: EntityConfig
  stats: EntityStats
  onCreateNew?: () => void
  entityType: string
}

export const EntityHeader: React.FC<EntityHeaderProps> = ({
  config,
  stats,
  onCreateNew,
  entityType,
}) => {
  const IconComponent = config.icon

  return (
    <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div
                className={`w-10 h-10 ${config.bgColor} rounded-xl flex items-center justify-center shadow-lg border ${config.borderColor}`}
              >
                <IconComponent size={20} className={config.color} />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                <Sparkles size={10} className="text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{config.title}</h1>
              <p className="text-sm text-slate-600">{config.description}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-4 bg-slate-50 px-4 py-2 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-slate-900">{stats.total}</div>
                <div className="text-xs text-slate-600">Total</div>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">{stats.completed}</div>
                <div className="text-xs text-slate-600">Done</div>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{stats.inProgress}</div>
                <div className="text-xs text-slate-600">Active</div>
              </div>
              {stats.overdue > 0 && (
                <>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{stats.overdue}</div>
                    <div className="text-xs text-slate-600">Overdue</div>
                  </div>
                </>
              )}
            </div>

            <Button
              onClick={onCreateNew}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus size={16} className="mr-2" />
              Create {entityType.slice(0, -1)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 