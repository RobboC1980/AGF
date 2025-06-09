"use client"

import { ReactNode } from "react"

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  return <>{children}</>
} 