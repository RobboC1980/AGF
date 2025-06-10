import React from 'react'
import { ChevronRight, Home, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigation } from '@/contexts/navigation-context'

interface BreadcrumbNavigationProps {
  projectName?: string
  epicName?: string
  storyName?: string
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  projectName,
  epicName,
  storyName,
}) => {
  const { 
    currentPage, 
    filters, 
    setCurrentPage, 
    setFilters, 
    clearFilters,
    getBreadcrumbs 
  } = useNavigation()

  const breadcrumbs = getBreadcrumbs()

  if (breadcrumbs.length === 0) {
    return null
  }

  const handleBreadcrumbClick = (page: any, breadcrumbFilters?: any) => {
    setCurrentPage(page)
    setFilters(breadcrumbFilters || {})
  }

  const handleClearFilters = () => {
    clearFilters()
  }

  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCurrentPage("projects")}
        className="text-slate-600 hover:text-slate-900"
      >
        <Home size={14} className="mr-1" />
        All Projects
      </Button>

      {breadcrumbs.map((breadcrumb, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={14} className="text-slate-400" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBreadcrumbClick(breadcrumb.page, breadcrumb.filters)}
            className="text-slate-600 hover:text-slate-900"
          >
            {breadcrumb.label}
            {breadcrumb.filters?.projectId === filters.projectId && projectName && (
              <span className="ml-1 font-medium">{projectName}</span>
            )}
            {breadcrumb.filters?.epicId === filters.epicId && epicName && (
              <span className="ml-1 font-medium">{epicName}</span>
            )}
            {breadcrumb.filters?.storyId === filters.storyId && storyName && (
              <span className="ml-1 font-medium">{storyName}</span>
            )}
          </Button>
        </React.Fragment>
      ))}

      {/* Current page indicator */}
      <ChevronRight size={14} className="text-slate-400" />
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
      </Badge>

      {/* Clear filters button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClearFilters}
        className="ml-2 text-slate-500 hover:text-slate-700"
      >
        <X size={14} className="mr-1" />
        Clear Filters
      </Button>
    </div>
  )
} 