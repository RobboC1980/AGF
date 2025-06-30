# Interactive Elements Components

This module provides interactive clickable components for user stories, epic labels, and tags in your AgileForge project management system.

## Components

### 🔖 InteractiveStoryTitle

Makes story titles clickable to open detailed views or modals.

**Features:**
- ✅ Hover effects (blue text, underline)
- ✅ Click to open story details modal (default) or custom handler
- ✅ Keyboard accessible (Enter/Space)
- ✅ ARIA labels for screen readers
- ✅ Focus indicators

**Usage:**
```tsx
import { InteractiveStoryTitle } from '@/components/shared/InteractiveElements'

<InteractiveStoryTitle
  story={story}
  onStoryView={handleStoryView} // Optional custom handler
  className="custom-styles" // Optional additional classes
/>
```

**Props:**
- `story`: Story object with id, name, description, status, priority, etc.
- `onStoryView?`: Optional custom click handler `(story: Story) => void`
- `className?`: Optional additional CSS classes

### 🚀 InteractiveEpicLabel

Makes epic labels clickable to filter stories or open epic details.

**Features:**
- ✅ Hover effects (blue text, underline)
- ✅ Epic color indicator dot
- ✅ Click to filter stories by epic or open epic modal
- ✅ Keyboard accessible (Enter/Space)
- ✅ ARIA labels for screen readers

**Usage:**
```tsx
import { InteractiveEpicLabel } from '@/components/shared/InteractiveElements'

<InteractiveEpicLabel
  epic={story.epic}
  onEpicFilter={handleEpicFilter} // Optional: filter by epic
  onEpicView={handleEpicView} // Optional: view epic details
  className="custom-styles"
/>
```

**Props:**
- `epic`: Epic object with id, name, color
- `onEpicFilter?`: Optional filter handler `(epicId: string) => void`
- `onEpicView?`: Optional view handler `(epicId: string) => void`
- `className?`: Optional additional CSS classes

### 🏷️ InteractiveTag

Makes tags clickable to filter stories by tag.

**Features:**
- ✅ Hover effects (blue background, shadow)
- ✅ Click to filter stories by tag
- ✅ Keyboard accessible (Enter/Space)
- ✅ ARIA labels for screen readers

**Usage:**
```tsx
import { InteractiveTag } from '@/components/shared/InteractiveElements'

<InteractiveTag
  tag="frontend"
  onTagFilter={handleTagFilter}
  className="custom-styles"
/>
```

**Props:**
- `tag`: String tag name
- `onTagFilter?`: Optional filter handler `(tag: string) => void`
- `className?`: Optional additional CSS classes

## Implementation Examples

### User Stories Page
```tsx
// Replace static story title
<h3>{story.name}</h3>

// With interactive story title
<InteractiveStoryTitle
  story={story}
  onStoryView={(story) => {
    // Custom handler or let default modal handle it
    console.log("Viewing story:", story)
  }}
/>
```

### Epic Labels
```tsx
// Replace static epic label
<span>{story.epic.name}</span>

// With interactive epic label
<InteractiveEpicLabel
  epic={story.epic}
  onEpicFilter={(epicId) => {
    setEpicFilter(epicId) // Filter stories by epic
  }}
/>
```

### Tags
```tsx
// Replace static tags
{story.tags.map(tag => (
  <Badge key={tag}>{tag}</Badge>
))}

// With interactive tags
{story.tags.map(tag => (
  <InteractiveTag
    key={tag}
    tag={tag}
    onTagFilter={(tag) => {
      setSearchQuery(tag) // Filter by tag
    }}
  />
))}
```

## Handler Functions

### Story View Handler
```tsx
const handleStoryView = (story: Story) => {
  // Option 1: Navigate to story detail page
  router.push(`/stories/${story.id}`)
  
  // Option 2: Open custom modal
  setSelectedStory(story)
  setShowStoryModal(true)
  
  // Option 3: Let default modal handle it (no handler needed)
}
```

### Epic Filter Handler
```tsx
const handleEpicFilter = (epicId: string) => {
  // Update filter state to show only stories from this epic
  setEpicFilter(epicId)
  
  // Or navigate to epic view
  router.push(`/epics/${epicId}`)
}
```

### Tag Filter Handler
```tsx
const handleTagFilter = (tag: string) => {
  // Add tag to search query
  setSearchQuery(tag)
  
  // Or set specific tag filter
  setTagFilter(tag)
  
  // Or navigate to tag view
  router.push(`/stories?tag=${tag}`)
}
```

## Accessibility Features

All components include comprehensive accessibility support:

- **Keyboard Navigation**: Tab to focus, Enter/Space to activate
- **ARIA Labels**: Descriptive labels for screen readers
- **Focus Indicators**: Clear focus rings for keyboard users
- **Semantic HTML**: Proper button roles and attributes
- **Color Contrast**: High contrast hover states

## Styling

Components use Tailwind CSS and can be customized:

```tsx
<InteractiveStoryTitle
  story={story}
  className="text-lg font-bold text-purple-600" // Custom styling
/>
```

Default hover styles:
- Story titles: Blue text + underline
- Epic labels: Blue text + underline
- Tags: Blue background + shadow

## Default Behavior

If no custom handlers are provided:

- **Story titles**: Open built-in story details modal
- **Epic labels**: Open built-in epic info modal with filter option
- **Tags**: Log click action (no default UI behavior)

## Integration with Existing Components

The interactive elements are already integrated into:

- ✅ `components/user-stories-page.tsx`
- ✅ `stories-page.tsx`
- ✅ `components/kanban-board.tsx`

## Demo

See `components/demo/InteractiveDemo.tsx` for a live demonstration of all interactive elements.

## Browser Support

- Modern browsers with ES2018+ support
- Mobile browsers with touch support
- Screen readers and assistive technologies 