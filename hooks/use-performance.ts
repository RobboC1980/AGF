import { useEffect, useRef, useState, useCallback } from 'react'

interface PerformanceMetrics {
  navigationTiming: {
    loadTime: number
    domContentLoaded: number
    firstPaint: number
    firstContentfulPaint: number
    largestContentfulPaint: number
  }
  resourceTiming: {
    count: number
    totalSize: number
    totalDuration: number
    slowestResource: string
  }
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
  fps: number
  renderTime: number
}

interface PerformanceThresholds {
  loadTime?: number
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  fps?: number
  memoryUsage?: number
}

export function usePerformanceMonitor(
  thresholds?: PerformanceThresholds,
  onThresholdExceeded?: (metric: string, value: number, threshold: number) => void
) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(true)
  const fpsFrames = useRef<number[]>([])
  const animationFrameId = useRef<number>()
  const lastTime = useRef<number>(performance.now())

  // FPS monitoring
  const measureFPS = useCallback(() => {
    const currentTime = performance.now()
    const delta = currentTime - lastTime.current
    lastTime.current = currentTime

    if (delta > 0) {
      const fps = 1000 / delta
      fpsFrames.current.push(fps)
      
      // Keep only last 60 frames
      if (fpsFrames.current.length > 60) {
        fpsFrames.current.shift()
      }
    }

    if (isMonitoring) {
      animationFrameId.current = requestAnimationFrame(measureFPS)
    }
  }, [isMonitoring])

  // Get navigation timing metrics
  const getNavigationMetrics = useCallback(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    if (navigation) {
      const paintEntries = performance.getEntriesByType('paint')
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      
      // Get LCP
      let largestContentfulPaint = 0
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        largestContentfulPaint = lastEntry.renderTime || lastEntry.loadTime
      })
      
      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (e) {
        // LCP not supported
      }
      
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint: firstPaint?.startTime || 0,
        firstContentfulPaint: firstContentfulPaint?.startTime || 0,
        largestContentfulPaint
      }
    }
    
    return null
  }, [])

  // Get resource timing metrics
  const getResourceMetrics = useCallback(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    
    if (resources.length > 0) {
      const totalSize = resources.reduce((sum, resource) => {
        return sum + (resource.transferSize || 0)
      }, 0)
      
      const totalDuration = resources.reduce((sum, resource) => {
        return sum + resource.duration
      }, 0)
      
      const slowestResource = resources.reduce((slowest, resource) => {
        return resource.duration > (slowest?.duration || 0) ? resource : slowest
      })
      
      return {
        count: resources.length,
        totalSize,
        totalDuration,
        slowestResource: slowestResource?.name || ''
      }
    }
    
    return null
  }, [])

  // Get memory metrics (Chrome only)
  const getMemoryMetrics = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }
    return undefined
  }, [])

  // Calculate average FPS
  const getAverageFPS = useCallback(() => {
    if (fpsFrames.current.length === 0) return 60
    
    const sum = fpsFrames.current.reduce((a, b) => a + b, 0)
    return Math.round(sum / fpsFrames.current.length)
  }, [])

  // Measure render time
  const measureRenderTime = useCallback(() => {
    const startTime = performance.now()
    
    // Force a re-render by updating state
    requestAnimationFrame(() => {
      const renderTime = performance.now() - startTime
      
      setMetrics(prev => ({
        ...prev!,
        renderTime
      }))
    })
  }, [])

  // Collect all metrics
  const collectMetrics = useCallback(() => {
    const navigationTiming = getNavigationMetrics()
    const resourceTiming = getResourceMetrics()
    const memory = getMemoryMetrics()
    const fps = getAverageFPS()
    
    if (navigationTiming) {
      const newMetrics: PerformanceMetrics = {
        navigationTiming,
        resourceTiming: resourceTiming || {
          count: 0,
          totalSize: 0,
          totalDuration: 0,
          slowestResource: ''
        },
        memory,
        fps,
        renderTime: 0
      }
      
      setMetrics(newMetrics)
      
      // Check thresholds
      if (thresholds && onThresholdExceeded) {
        if (thresholds.loadTime && navigationTiming.loadTime > thresholds.loadTime) {
          onThresholdExceeded('loadTime', navigationTiming.loadTime, thresholds.loadTime)
        }
        
        if (thresholds.firstContentfulPaint && navigationTiming.firstContentfulPaint > thresholds.firstContentfulPaint) {
          onThresholdExceeded('firstContentfulPaint', navigationTiming.firstContentfulPaint, thresholds.firstContentfulPaint)
        }
        
        if (thresholds.largestContentfulPaint && navigationTiming.largestContentfulPaint > thresholds.largestContentfulPaint) {
          onThresholdExceeded('largestContentfulPaint', navigationTiming.largestContentfulPaint, thresholds.largestContentfulPaint)
        }
        
        if (thresholds.fps && fps < thresholds.fps) {
          onThresholdExceeded('fps', fps, thresholds.fps)
        }
        
        if (thresholds.memoryUsage && memory) {
          const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
          if (memoryUsagePercent > thresholds.memoryUsage) {
            onThresholdExceeded('memoryUsage', memoryUsagePercent, thresholds.memoryUsage)
          }
        }
      }
    }
  }, [getNavigationMetrics, getResourceMetrics, getMemoryMetrics, getAverageFPS, thresholds, onThresholdExceeded])

  // Start monitoring
  useEffect(() => {
    if (isMonitoring) {
      // Start FPS monitoring
      measureFPS()
      
      // Collect metrics after page load
      if (document.readyState === 'complete') {
        collectMetrics()
      } else {
        window.addEventListener('load', collectMetrics)
      }
      
      // Periodically collect metrics
      const interval = setInterval(collectMetrics, 5000)
      
      return () => {
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current)
        }
        clearInterval(interval)
        window.removeEventListener('load', collectMetrics)
      }
    }
  }, [isMonitoring, measureFPS, collectMetrics])

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)
  }, [])

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
    }
  }, [])

  const reset = useCallback(() => {
    fpsFrames.current = []
    setMetrics(null)
  }, [])

  const logMetrics = useCallback(() => {
    if (metrics) {
      console.group('Performance Metrics')
      console.log('Navigation Timing:', metrics.navigationTiming)
      console.log('Resource Timing:', metrics.resourceTiming)
      console.log('Memory:', metrics.memory)
      console.log('FPS:', metrics.fps)
      console.log('Render Time:', metrics.renderTime, 'ms')
      console.groupEnd()
    }
  }, [metrics])

  const sendMetricsToBackend = useCallback(async () => {
    if (metrics) {
      try {
        await fetch('/api/metrics/performance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
          },
          body: JSON.stringify({
            ...metrics,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          })
        })
      } catch (error) {
        console.error('Failed to send metrics:', error)
      }
    }
  }, [metrics])

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    reset,
    measureRenderTime,
    logMetrics,
    sendMetricsToBackend
  }
}

// Performance optimization hooks
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastUpdated = useRef<number>(0)

  useEffect(() => {
    const now = Date.now()
    
    if (now - lastUpdated.current >= interval) {
      setThrottledValue(value)
      lastUpdated.current = now
    } else {
      const timeoutId = setTimeout(() => {
        setThrottledValue(value)
        lastUpdated.current = Date.now()
      }, interval - (now - lastUpdated.current))
      
      return () => clearTimeout(timeoutId)
    }
  }, [value, interval])

  return throttledValue
}

export function useLazyLoad<T>(
  loader: () => Promise<T>,
  dependencies: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await loader()
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, dependencies)

  return { data, isLoading, error, load }
} 