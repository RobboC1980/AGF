"use client"

import React from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
    
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // You can integrate with services like Sentry, LogRocket, etc.
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      })
    }

    this.setState({
      errorInfo,
    })
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state
      
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={error!} retry={this.handleRetry} />
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              
              <h1 className="text-xl font-bold text-slate-900 mb-3">
                Something went wrong
              </h1>
              
              <p className="text-slate-600 mb-6">
                {error?.message?.includes('Cannot read properties') 
                  ? 'There was an issue loading the data. This might be a temporary problem.'
                  : error?.message || 'An unexpected error occurred. Please try again.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRetry}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={this.handleGoHome}
                >
                  <Home size={16} className="mr-2" />
                  Go Home
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
                    Technical Details (Development Only)
                  </summary>
                  <div className="mt-2 p-3 bg-slate-100 rounded text-xs font-mono text-slate-700 overflow-auto max-h-40">
                    <div className="font-semibold mb-2">Error:</div>
                    <div className="mb-2">{error.message}</div>
                    {error.stack && (
                      <>
                        <div className="font-semibold mb-2">Stack trace:</div>
                        <pre className="whitespace-pre-wrap">{error.stack}</pre>
                      </>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} ref={ref} />
    </ErrorBoundary>
  ))

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default ErrorBoundary 