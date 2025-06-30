'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Report to error tracking service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      })
    }
    
    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    // Log to backend
    this.logErrorToBackend(error, errorInfo)
  }
  
  async logErrorToBackend(error: Error, errorInfo: ErrorInfo) {
    try {
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      })
    } catch (logError) {
      console.error('Failed to log error to backend:', logError)
    }
  }
  
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    })
  }
  
  handleReload = () => {
    window.location.reload()
  }
  
  handleGoHome = () => {
    window.location.href = '/'
  }
  
  handleCopyError = () => {
    const { error, errorInfo } = this.state
    const errorText = `
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
    `.trim()
    
    navigator.clipboard.writeText(errorText)
    
    // Show toast notification
    const event = new CustomEvent('show-toast', {
      detail: {
        title: 'Error copied',
        description: 'Error details copied to clipboard'
      }
    })
    window.dispatchEvent(event)
  }
  
  handleReportBug = () => {
    const { error } = this.state
    const subject = encodeURIComponent(`Bug Report: ${error?.message || 'Unknown Error'}`)
    const body = encodeURIComponent(`
I encountered an error in AgileForge:

Error Message: ${error?.message}
Page URL: ${window.location.href}
Time: ${new Date().toISOString()}

Steps to reproduce:
1. 
2. 
3. 

Expected behavior:


Additional context:

    `.trim())
    
    window.open(`mailto:support@agileforge.com?subject=${subject}&body=${body}`)
  }
  
  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state
      
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }
      
      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred. The development team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error details in development */}
              {process.env.NODE_ENV === 'development' && (
                <Alert>
                  <AlertTitle>Error Details (Development Only)</AlertTitle>
                  <AlertDescription className="mt-2">
                    <div className="space-y-2">
                      <div>
                        <strong>Message:</strong>
                        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                          {error?.message}
                        </pre>
                      </div>
                      {error?.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Error count warning */}
              {errorCount > 2 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Multiple Errors Detected</AlertTitle>
                  <AlertDescription>
                    This error has occurred {errorCount} times. Consider reloading the page.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="secondary">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} variant="secondary">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
                {process.env.NODE_ENV === 'development' && (
                  <Button onClick={this.handleCopyError} variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Error
                  </Button>
                )}
                <Button onClick={this.handleReportBug} variant="outline" size="sm">
                  <Bug className="h-4 w-4 mr-2" />
                  Report Bug
                </Button>
              </div>
              
              {/* Help text */}
              <div className="text-sm text-muted-foreground">
                <p>If this problem persists, please try:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Clearing your browser cache</li>
                  <li>Checking your internet connection</li>
                  <li>Using a different browser</li>
                  <li>Contacting support if the issue continues</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    return this.props.children
  }
}

// Hook for functional components
export function useErrorHandler() {
  const { toast } = useToast()
  
  const handleError = (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error handled:', error, errorInfo)
    
    toast({
      title: 'An error occurred',
      description: error.message || 'Something went wrong',
      variant: 'destructive'
    })
    
    // Log to backend
    if (typeof window !== 'undefined') {
      fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo?.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      }).catch(console.error)
    }
  }
  
  return { handleError }
}

// Sentry type declaration
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: any) => void
    }
  }
} 