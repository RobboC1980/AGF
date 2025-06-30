import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  InteractiveStoryTitle, 
  InteractiveEpicLabel, 
  InteractiveTag 
} from '@/components/shared/InteractiveElements'
import { RefreshCw } from 'lucide-react'

const InteractiveDemo = () => {
  const [lastAction, setLastAction] = useState<string>('')

  // Sample data
  const sampleStory = {
    id: '1',
    name: 'As a registered user, I want to view my profile information',
    description: 'Users should be able to view and edit their profile information including name, email, and preferences.',
    status: 'in-progress' as const,
    priority: 'high' as const,
    story_points: 5,
    created_at: '2024-01-15T10:00:00Z',
    epic: {
      id: 'epic-1',
      name: 'User Authentication Epic',
      color: '#8B5CF6'
    },
    assignee: {
      id: 'user-1',
      name: 'John Doe',
      avatar: ''
    },
    tags: ['security', 'user-authen', 'account-ma']
  }

  const sampleEpic = {
    id: 'epic-2',
    name: 'Payment Processing Epic',
    color: '#10B981'
  }

  const sampleTags = ['frontend', 'backend', 'api', 'database', 'ui/ux']

  const handleStoryView = (story: any) => {
    setLastAction(`Clicked story: "${story.name}"`)
  }

  const handleEpicFilter = (epicId: string) => {
    setLastAction(`Filtering by epic ID: ${epicId}`)
  }

  const handleTagFilter = (tag: string) => {
    setLastAction(`Filtering by tag: "${tag}"`)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="border-2 border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🎯 Interactive Elements Demo</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-4">
            Click on the story titles, epic labels, and tags below to see the interactive functionality in action.
            Elements will show hover effects (underline, color change) and open modals or trigger filtering.
          </p>
          
          {lastAction && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
              <p className="text-green-800 font-medium">Last Action: {lastAction}</p>
            </div>
          )}

          <Button 
            onClick={() => setLastAction('')} 
            variant="outline" 
            size="sm"
            className="mb-6"
          >
            <RefreshCw size={16} className="mr-2" />
            Clear Last Action
          </Button>
        </CardContent>
      </Card>

      {/* Story Title Demo */}
      <Card>
        <CardHeader>
          <CardTitle>📖 Interactive Story Title</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
            <InteractiveStoryTitle
              story={sampleStory}
              onStoryView={handleStoryView}
              className="text-lg"
            />
            <p className="text-sm text-slate-600 mt-2">
              ✨ Hover to see underline effect, click to open story details modal
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Epic Label Demo */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Interactive Epic Labels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
            <p className="text-sm text-slate-600 mb-3">Epic from the story above:</p>
            <InteractiveEpicLabel
              epic={sampleStory.epic}
              onEpicFilter={handleEpicFilter}
            />
          </div>
          
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
            <p className="text-sm text-slate-600 mb-3">Another epic example:</p>
            <InteractiveEpicLabel
              epic={sampleEpic}
              onEpicFilter={handleEpicFilter}
            />
          </div>
          
          <p className="text-sm text-slate-600">
            ✨ Hover to see underline effect, click to filter stories by epic or open epic details
          </p>
        </CardContent>
      </Card>

      {/* Tags Demo */}
      <Card>
        <CardHeader>
          <CardTitle>🏷️ Interactive Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
            <p className="text-sm text-slate-600 mb-3">Tags from the story above:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {sampleStory.tags.map((tag) => (
                <InteractiveTag
                  key={tag}
                  tag={tag}
                  onTagFilter={handleTagFilter}
                />
              ))}
            </div>
            
            <p className="text-sm text-slate-600 mb-3">More example tags:</p>
            <div className="flex flex-wrap gap-2">
              {sampleTags.map((tag) => (
                <InteractiveTag
                  key={tag}
                  tag={tag}
                  onTagFilter={handleTagFilter}
                />
              ))}
            </div>
          </div>
          
          <p className="text-sm text-slate-600 mt-4">
            ✨ Hover to see highlight effect, click to filter stories by tag
          </p>
        </CardContent>
      </Card>

      {/* Accessibility Features */}
      <Card>
        <CardHeader>
          <CardTitle>♿ Accessibility Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-600">
            <p>✅ <strong>Keyboard Navigation:</strong> All interactive elements support Tab navigation</p>
            <p>✅ <strong>Keyboard Activation:</strong> Press Enter or Space to activate elements</p>
            <p>✅ <strong>ARIA Labels:</strong> Screen readers announce element purposes</p>
            <p>✅ <strong>Focus Indicators:</strong> Clear focus rings for keyboard users</p>
            <p>✅ <strong>Semantic HTML:</strong> Proper button roles and accessibility attributes</p>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Notes */}
      <Card>
        <CardHeader>
          <CardTitle>🛠️ Implementation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-600">
            <p><strong>Story Titles:</strong> Click to open detailed modal or custom view handler</p>
            <p><strong>Epic Labels:</strong> Click to filter stories or open epic details modal</p>
            <p><strong>Tags:</strong> Click to filter stories containing that tag</p>
            <p><strong>Custom Handlers:</strong> Pass your own functions to override default behavior</p>
            <p><strong>Styling:</strong> Fully customizable with Tailwind CSS classes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default InteractiveDemo 