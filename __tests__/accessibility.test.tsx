/**
 * Accessibility Tests
 * Tests that all interactive elements have proper accessibility attributes
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import TasksPage from '../components/tasks-page'
import AnalyticsDashboard from '../components/analytics-dashboard'
import CollaborationPanel from '../components/collaboration-panel'
import ProjectsPage from '../components/projects-page'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock data for components
const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar_url: '/avatar1.jpg',
    roles: ['Developer']
  }
]

const mockProjects = [
  {
    id: '1',
    name: 'Test Project',
    description: 'A test project',
    status: 'in-progress',
    priority: 'high',
    progress: 50,
    stats: {
      totalEpics: 5,
      completedEpics: 2,
      totalStories: 10,
      completedStories: 4,
      totalTasks: 20,
      completedTasks: 8
    },
    team: {
      members: mockUsers
    },
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    tags: ['frontend', 'react']
  }
]

const mockComments = [
  {
    id: '1',
    content: 'Test comment',
    author: {
      id: '1',
      name: 'John Doe',
      avatar: '/avatar1.jpg',
      role: 'Developer'
    },
    createdAt: '2023-01-01T00:00:00Z',
    reactions: [],
    replies: []
  }
]

// Mock hooks and dependencies
jest.mock('../hooks/use-supabase-data', () => ({
  useSupabaseData: () => ({
    data: mockProjects,
    isLoading: false,
    error: null,
    refetch: jest.fn()
  })
}))

jest.mock('../hooks/use-analytics', () => ({
  useAnalytics: () => ({
    data: {
      overview: {
        totalProjects: 5,
        activeProjects: 3,
        completedProjects: 2,
        totalTeamMembers: 10,
        totalStoryPoints: 100,
        completedStoryPoints: 60,
        averageVelocity: 45,
        onTimeDelivery: 85
      },
      trends: {
        velocity: [],
        burndown: [],
        completion: []
      },
      distribution: {
        projectStatus: [],
        priorityBreakdown: [],
        teamWorkload: []
      },
      performance: {
        topPerformers: [],
        projectHealth: []
      }
    },
    isLoading: false,
    error: null,
    refetch: jest.fn()
  })
}))

jest.mock('../hooks/use-projects', () => ({
  useProjects: () => ({
    projects: mockProjects,
    isLoading: false,
    error: null,
    refetch: jest.fn()
  })
}))

describe('Button Accessibility', () => {
  describe('TasksPage', () => {
    it('should have aria-labels on icon-only buttons', () => {
      render(<TasksPage />)
      
      // View mode toggle buttons should have aria-labels
      expect(screen.getByLabelText('Grid view')).toBeInTheDocument()
      expect(screen.getByLabelText('List view')).toBeInTheDocument()
      expect(screen.getByLabelText('Table view')).toBeInTheDocument()
      
      // More options buttons should have aria-labels
      const moreOptionsButtons = screen.getAllByLabelText('More options')
      expect(moreOptionsButtons.length).toBeGreaterThan(0)
    })

    it('should have no accessibility violations', async () => {
      const { container } = render(<TasksPage />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('AnalyticsDashboard', () => {
    it('should have aria-labels on icon-only buttons', () => {
      render(<AnalyticsDashboard />)
      
      // More options button should have aria-label
      expect(screen.getByLabelText('More options')).toBeInTheDocument()
    })

    it('should have no accessibility violations', async () => {
      const { container } = render(<AnalyticsDashboard />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('CollaborationPanel', () => {
    it('should have aria-labels on icon-only buttons', () => {
      render(
        <CollaborationPanel
          entityId="test"
          entityType="project"
          comments={mockComments}
          activities={[]}
        />
      )
      
      // Header buttons should have aria-labels
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
      expect(screen.getByLabelText('Close collaboration panel')).toBeInTheDocument()
      
      // Comment input buttons should have aria-labels
      expect(screen.getByLabelText('Attach file')).toBeInTheDocument()
      expect(screen.getByLabelText('Add emoji')).toBeInTheDocument()
    })

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <CollaborationPanel
          entityId="test"
          entityType="project"
          comments={mockComments}
          activities={[]}
        />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('ProjectsPage', () => {
    it('should have aria-labels on icon-only buttons', () => {
      render(<ProjectsPage />)
      
      // Project options buttons should have aria-labels
      const projectOptionsButtons = screen.getAllByLabelText('Project options')
      expect(projectOptionsButtons.length).toBeGreaterThan(0)
    })

    it('should have no accessibility violations', async () => {
      const { container } = render(<ProjectsPage />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})

describe('Comprehensive Accessibility Tests', () => {
  it('should verify all interactive elements have accessible names', () => {
    // This test checks for common accessibility issues
    render(<TasksPage />)
    
    // Get all button elements
    const buttons = screen.getAllByRole('button')
    
    buttons.forEach(button => {
      // Each button should have either:
      // 1. Accessible text content
      // 2. An aria-label
      // 3. An aria-labelledby reference
      // 4. A title attribute (not recommended but acceptable)
      
      const hasTextContent = button.textContent && button.textContent.trim().length > 0
      const hasAriaLabel = button.getAttribute('aria-label')
      const hasAriaLabelledBy = button.getAttribute('aria-labelledby')
      const hasTitle = button.getAttribute('title')
      
      const hasAccessibleName = hasTextContent || hasAriaLabel || hasAriaLabelledBy || hasTitle
      
      if (!hasAccessibleName) {
        console.error('Button without accessible name:', button.outerHTML)
      }
      
      expect(hasAccessibleName).toBe(true)
    })
  })

  it('should verify form controls have proper labels', () => {
    render(<TasksPage />)
    
    // Get all input elements
    const inputs = screen.getAllByRole('textbox')
    const selects = screen.getAllByRole('combobox')
    const checkboxes = screen.getAllByRole('checkbox')
    
    const allFormControls = [...inputs, ...selects, ...checkboxes]
    
    allFormControls.forEach(control => {
      // Each form control should have:
      // 1. An associated label
      // 2. An aria-label
      // 3. An aria-labelledby reference
      // 4. A placeholder (for inputs only, not ideal but acceptable)
      
      const hasLabel = control.getAttribute('aria-label') ||
                      control.getAttribute('aria-labelledby') ||
                      document.querySelector(`label[for="${control.id}"]`) ||
                      control.closest('label') ||
                      (control.tagName === 'INPUT' && control.getAttribute('placeholder'))
      
      if (!hasLabel) {
        console.error('Form control without label:', control.outerHTML)
      }
      
      expect(hasLabel).toBeTruthy()
    })
  })

  it('should verify images have alt text', () => {
    render(<ProjectsPage />)
    
    // Get all img elements
    const images = screen.getAllByRole('img', { hidden: true })
    
    images.forEach(img => {
      const hasAltText = img.getAttribute('alt') !== null
      
      if (!hasAltText) {
        console.error('Image without alt text:', img.outerHTML)
      }
      
      expect(hasAltText).toBe(true)
    })
  })
})

describe('Screen Reader Support', () => {
  it('should have proper heading hierarchy', () => {
    render(<TasksPage />)
    
    const headings = screen.getAllByRole('heading')
    
    // Check that heading levels follow proper hierarchy (h1, h2, h3, etc.)
    let previousLevel = 0
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1))
      
      // Heading level should not skip more than one level
      if (previousLevel > 0) {
        expect(level - previousLevel).toBeLessThanOrEqual(1)
      }
      
      previousLevel = level
    })
  })

  it('should have proper landmark regions', () => {
    render(<TasksPage />)
    
    // Check for essential landmark regions
    const navigation = screen.queryAllByRole('navigation')
    const main = screen.queryAllByRole('main')
    const complementary = screen.queryAllByRole('complementary')
    
    // At least one of these landmark regions should exist
    const hasLandmarks = navigation.length > 0 || main.length > 0 || complementary.length > 0
    expect(hasLandmarks).toBe(true)
  })

  it('should have proper focus management', () => {
    render(<TasksPage />)
    
    // Get all focusable elements
    const focusableElements = screen.getAllByRole('button')
      .concat(screen.getAllByRole('textbox'))
      .concat(screen.getAllByRole('combobox'))
      .concat(screen.getAllByRole('checkbox'))
    
    focusableElements.forEach(element => {
      // Elements should not have negative tabindex unless they're intentionally excluded
      const tabIndex = element.getAttribute('tabindex')
      if (tabIndex && parseInt(tabIndex) < -1) {
        console.error('Element with invalid tabindex:', element.outerHTML)
        expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(-1)
      }
    })
  })
})

describe('Color and Contrast', () => {
  it('should not rely solely on color for information', () => {
    render(<TasksPage />)
    
    // This is a basic check - in a real app you'd want to verify
    // that status indicators, priority levels, etc. have text or icons
    // in addition to color coding
    
    const badges = document.querySelectorAll('[class*="badge"]')
    badges.forEach(badge => {
      // Badges should have text content, not just color
      expect(badge.textContent?.trim()).toBeTruthy()
    })
  })
})

describe('Error Handling', () => {
  it('should provide accessible error messages', () => {
    // Mock an error state
    const mockError = { message: 'Test error message' }
    
    render(<TasksPage />)
    
    // Error messages should be associated with form fields
    // and announced to screen readers
    const alerts = screen.queryAllByRole('alert')
    
    // If there are error states, they should be properly announced
    alerts.forEach(alert => {
      expect(alert.textContent?.trim()).toBeTruthy()
    })
  })
}) 