import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"
import { QueryProvider } from "@/providers/query-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "next-themes"

export const metadata: Metadata = {
  title: 'AgileForge - AI-Powered Project Management',
  description: 'Comprehensive Agile project management platform with AI assistance',
  keywords: 'agile, project management, scrum, kanban, AI, collaboration',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
