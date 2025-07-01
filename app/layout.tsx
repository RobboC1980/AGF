import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"
import { QueryProvider } from "@/providers/query-provider"
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from "next-themes"

export const metadata: Metadata = {
  title: 'SynqForge - AI-Powered Project Management',
  description: 'Comprehensive Agile project management platform with AI assistance',
  keywords: 'agile, project management, scrum, kanban, AI, collaboration, synqforge',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
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
                {children}
              </QueryProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}
