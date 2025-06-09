// WebSocket service for real-time updates
interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
}

interface WebSocketEventHandlers {
  onStoryUpdate?: (story: any) => void
  onEpicUpdate?: (epic: any) => void
  onTaskUpdate?: (task: any) => void
  onUserUpdate?: (user: any) => void
  onProjectUpdate?: (project: any) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

class WebSocketService {
  private ws: WebSocket | null = null
  private handlers: WebSocketEventHandlers = {}
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false

  constructor() {
    // Use environment variable or default to localhost
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws'
    this.url = wsUrl
  }

  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.isConnecting) {
        return
      }

      this.isConnecting = true

      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.handlers.onConnect?.()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = () => {
          console.log('WebSocket disconnected')
          this.isConnecting = false
          this.handlers.onDisconnect?.()
          this.attemptReconnect()
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.isConnecting = false
          this.handlers.onError?.(error)
          reject(error)
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnection
  }

  // Send message to server
  send(type: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
      }
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected. Message not sent:', { type, data })
    }
  }

  // Set event handlers
  setHandlers(handlers: WebSocketEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers }
  }

  // Handle incoming messages
  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'story_update':
        this.handlers.onStoryUpdate?.(message.data)
        break
      case 'epic_update':
        this.handlers.onEpicUpdate?.(message.data)
        break
      case 'task_update':
        this.handlers.onTaskUpdate?.(message.data)
        break
      case 'user_update':
        this.handlers.onUserUpdate?.(message.data)
        break
      case 'project_update':
        this.handlers.onProjectUpdate?.(message.data)
        break
      default:
        console.log('Unknown message type:', message.type, message.data)
    }
  }

  // Attempt to reconnect
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error)
      })
    }, delay)
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // Subscribe to entity updates
  subscribeToEntity(entityType: string, entityId: string): void {
    this.send('subscribe', { entityType, entityId })
  }

  // Unsubscribe from entity updates
  unsubscribeFromEntity(entityType: string, entityId: string): void {
    this.send('unsubscribe', { entityType, entityId })
  }

  // Broadcast presence (for collaboration features)
  updatePresence(presence: { userId: string; location: string; activity: string }): void {
    this.send('presence_update', presence)
  }
}

// Create singleton instance
const websocketService = new WebSocketService()

// React hook for using WebSocket in components
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/useApi'

export function useWebSocket(handlers?: WebSocketEventHandlers) {
  const queryClient = useQueryClient()
  const handlersRef = useRef(handlers)
  
  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    // Set up default handlers for cache invalidation
    const defaultHandlers: WebSocketEventHandlers = {
      onStoryUpdate: (story) => {
        // Update specific story in cache
        queryClient.setQueryData(queryKeys.story(story.id), story)
        // Invalidate stories list to trigger refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.stories })
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
        // Call custom handler if provided
        handlersRef.current?.onStoryUpdate?.(story)
      },
      onEpicUpdate: (epic) => {
        queryClient.setQueryData(queryKeys.epic(epic.id), epic)
        queryClient.invalidateQueries({ queryKey: queryKeys.epics })
        queryClient.invalidateQueries({ queryKey: queryKeys.projects })
        handlersRef.current?.onEpicUpdate?.(epic)
      },
      onTaskUpdate: (task) => {
        queryClient.setQueryData(queryKeys.task(task.id), task)
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
        queryClient.invalidateQueries({ queryKey: queryKeys.stories })
        handlersRef.current?.onTaskUpdate?.(task)
      },
      onUserUpdate: (user) => {
        queryClient.setQueryData(queryKeys.user(user.id), user)
        queryClient.invalidateQueries({ queryKey: queryKeys.users })
        handlersRef.current?.onUserUpdate?.(user)
      },
      onProjectUpdate: (project) => {
        queryClient.setQueryData(queryKeys.project(project.id), project)
        queryClient.invalidateQueries({ queryKey: queryKeys.projects })
        handlersRef.current?.onProjectUpdate?.(project)
      },
      onConnect: () => {
        console.log('Real-time connection established')
        handlersRef.current?.onConnect?.(  )
      },
      onDisconnect: () => {
        console.log('Real-time connection lost')
        handlersRef.current?.onDisconnect?.()
      },
      onError: (error) => {
        console.error('Real-time connection error:', error)
        handlersRef.current?.onError?.(error)
      },
    }

    websocketService.setHandlers(defaultHandlers)

    // Connect on mount
    websocketService.connect().catch((error) => {
      console.error('Failed to connect to WebSocket:', error)
    })

    // Cleanup on unmount
    return () => {
      websocketService.disconnect()
    }
  }, [queryClient])

  return {
    isConnected: websocketService.isConnected(),
    send: websocketService.send.bind(websocketService),
    subscribeToEntity: websocketService.subscribeToEntity.bind(websocketService),
    unsubscribeFromEntity: websocketService.unsubscribeFromEntity.bind(websocketService),
    updatePresence: websocketService.updatePresence.bind(websocketService),
  }
}

// Export the service for direct use
export { websocketService }
export type { WebSocketMessage, WebSocketEventHandlers } 