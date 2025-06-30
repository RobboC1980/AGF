import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// Types for our interactive elements
interface Story {
  id: string
  name: string
  description?: string
  status: string
  priority: string
  story_points?: number
  epic?: {
    id: string
    name: string
    color: string
  }
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  tags?: string[]
  created_at: string
}

interface Epic {
  id: string
  name: string
  description?: string
  color: string
  status: string
}

// Interactive Story Title Component
interface InteractiveStoryTitleProps {
  story: Story
  className?: string
  onStoryView?: (story: Story) => void
}

export const InteractiveStoryTitle: React.FC<InteractiveStoryTitleProps> = ({
  story,
  className,
  onStoryView
}) => {
  const [showStoryModal, setShowStoryModal] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (onStoryView) {
      onStoryView(story)
    } else {
      setShowStoryModal(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(e as any)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "text-left cursor-pointer transition-all duration-200",
          "hover:text-blue-600 hover:underline hover:underline-offset-2",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:rounded",
          "font-semibold text-slate-900 group-hover:text-blue-600",
          className
        )}
        role="button"
        tabIndex={0}
        aria-label={`View details for story: ${story.name}`}
      >
        {story.name}
      </button>

      <Dialog open={showStoryModal} onOpenChange={setShowStoryModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {story.name}
            </DialogTitle>
            <DialogDescription>
              Story Details and Information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {story.description && (
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Description</h4>
                <p className="text-slate-600 leading-relaxed">{story.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Status</h4>
                <Badge variant="outline" className="capitalize">
                  {story.status.replace('-', ' ')}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Priority</h4>
                <Badge variant="outline" className="capitalize">
                  {story.priority}
                </Badge>
              </div>
            </div>

            {story.story_points && (
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Story Points</h4>
                <Badge variant="outline">{story.story_points} SP</Badge>
              </div>
            )}

            {story.epic && (
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Epic</h4>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: story.epic.color }}
                  />
                  <span className="text-slate-700">{story.epic.name}</span>
                </div>
              </div>
            )}

            {story.assignee && (
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Assignee</h4>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
                    {story.assignee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-slate-700">{story.assignee.name}</span>
                </div>
              </div>
            )}

            {story.tags && story.tags.length > 0 && (
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {story.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium text-slate-900 mb-2">Created</h4>
              <p className="text-slate-600">{new Date(story.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Interactive Epic Label Component
interface InteractiveEpicLabelProps {
  epic: {
    id: string
    name: string
    color: string
  }
  className?: string
  onEpicView?: (epicId: string) => void
  onEpicFilter?: (epicId: string) => void
}

export const InteractiveEpicLabel: React.FC<InteractiveEpicLabelProps> = ({
  epic,
  className,
  onEpicView,
  onEpicFilter
}) => {
  const [showEpicModal, setShowEpicModal] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (onEpicView) {
      onEpicView(epic.id)
    } else if (onEpicFilter) {
      onEpicFilter(epic.id)
    } else {
      setShowEpicModal(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(e as any)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center text-sm text-slate-600 min-w-0 cursor-pointer transition-all duration-200",
          "hover:text-blue-600 hover:underline hover:underline-offset-2",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:rounded",
          className
        )}
        role="button"
        tabIndex={0}
        aria-label={`View epic: ${epic.name}`}
      >
        <div 
          className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
          style={{ backgroundColor: epic.color || '#6B7280' }}
        />
        <span className="truncate break-words overflow-hidden text-ellipsis flex-1">
          {epic.name}
        </span>
      </button>

      <Dialog open={showEpicModal} onOpenChange={setShowEpicModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: epic.color }}
              />
              <span>{epic.name}</span>
            </DialogTitle>
            <DialogDescription>
              Epic Information and Related Stories
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-slate-600">
              This epic contains multiple user stories. You can view all related stories by filtering the story list.
            </p>
            
            <div className="mt-6 flex space-x-3">
              <Button onClick={() => {
                setShowEpicModal(false)
                onEpicFilter?.(epic.id)
              }}>
                View Stories in This Epic
              </Button>
              <Button variant="outline" onClick={() => setShowEpicModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Interactive Tag Component
interface InteractiveTagProps {
  tag: string
  className?: string
  onTagFilter?: (tag: string) => void
}

export const InteractiveTag: React.FC<InteractiveTagProps> = ({
  tag,
  className,
  onTagFilter
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (onTagFilter) {
      onTagFilter(tag)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(e as any)
    }
  }

  return (
    <Badge
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      variant="secondary"
      className={cn(
        "cursor-pointer transition-all duration-200",
        "hover:bg-blue-100 hover:text-blue-700 hover:shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
        "text-xs truncate max-w-[80px] break-words",
        className
      )}
      role="button"
      tabIndex={0}
      aria-label={`Filter by tag: ${tag}`}
    >
      {tag}
    </Badge>
  )
} 