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

// Wrapper for forms that might be affected by browser extensions
interface ClientOnlyFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
}

export function ClientOnlyForm({ children, ...props }: ClientOnlyFormProps) {
  return (
    <ClientOnly fallback={<div className="space-y-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>}>
      <form {...props} suppressHydrationWarning>
        {children}
      </form>
    </ClientOnly>
  )
} 