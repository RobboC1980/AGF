"use client"

import React from 'react'
import { useApiHealth } from '@/hooks/useApi'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react'

export function ApiStatus() {
  const { data, loading, error } = useApiHealth()

  const getStatusDisplay = () => {
    if (loading) {
      return {
        icon: Clock,
        label: 'Checking...',
        variant: 'secondary' as const,
        color: 'text-yellow-600'
      }
    }

    if (error) {
      return {
        icon: AlertCircle,
        label: 'Disconnected',
        variant: 'destructive' as const,
        color: 'text-red-600'
      }
    }

    if (data?.status === 'healthy') {
      return {
        icon: CheckCircle2,
        label: 'Connected',
        variant: 'default' as const,
        color: 'text-green-600'
      }
    }

    return {
      icon: AlertCircle,
      label: 'Unknown',
      variant: 'secondary' as const,
      color: 'text-gray-600'
    }
  }

  const status = getStatusDisplay()
  const StatusIcon = status.icon

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">API Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <StatusIcon size={16} className={status.color} />
          <Badge variant={status.variant}>
            {status.label}
          </Badge>
        </div>
        
        {error && (
          <p className="text-xs text-muted-foreground mt-2">
            Error: {error}
          </p>
        )}
        
        {data && (
          <div className="text-xs text-muted-foreground mt-2">
            <p>Backend: {process.env.NEXT_PUBLIC_API_URL || 'localhost:4000'}</p>
            <p>Environment: {data.environment || 'unknown'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for header/navbar
export function ApiStatusBadge() {
  const { data, loading, error } = useApiHealth()

  if (loading) {
    return (
      <Badge variant="secondary" className="text-xs">
        <Clock size={12} className="mr-1" />
        API...
      </Badge>
    )
  }

  if (error) {
    return (
      <Badge variant="destructive" className="text-xs">
        <AlertCircle size={12} className="mr-1" />
        API Error
      </Badge>
    )
  }

  if (data?.status === 'healthy') {
    return (
      <Badge variant="default" className="text-xs bg-green-600">
        <CheckCircle2 size={12} className="mr-1" />
        API Connected
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="text-xs">
      <AlertCircle size={12} className="mr-1" />
      API Unknown
    </Badge>
  )
} 