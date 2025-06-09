"use client"

import React, { useEffect, useState } from 'react'

interface ClientOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Wrapper for input elements that might be affected by browser extensions
interface HydrationSafeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  children?: React.ReactNode
}

export function HydrationSafeInput({ children, ...props }: HydrationSafeInputProps) {
  return (
    <div suppressHydrationWarning>
      <input {...props} suppressHydrationWarning />
      {children}
    </div>
  )
}

// Wrapper for divs that might be affected by browser extensions
interface HydrationSafeDivProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function HydrationSafeDiv({ children, ...props }: HydrationSafeDivProps) {
  return (
    <div {...props} suppressHydrationWarning>
      {children}
    </div>
  )
} 