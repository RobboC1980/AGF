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
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%233b82f6;stop-opacity:1" /><stop offset="100%" style="stop-color:%231d4ed8;stop-opacity:1" /></linearGradient></defs><rect width="32" height="32" rx="6" fill="url(%23grad)"/><path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="20" r="2" fill="white"/></svg>',
        sizes: '32x32',
        type: 'image/svg+xml',
      },
    ],
    shortcut: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%233b82f6;stop-opacity:1" /><stop offset="100%" style="stop-color:%231d4ed8;stop-opacity:1" /></linearGradient></defs><rect width="32" height="32" rx="6" fill="url(%23grad)"/><path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="20" r="2" fill="white"/></svg>',
    apple: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%233b82f6;stop-opacity:1" /><stop offset="100%" style="stop-color:%231d4ed8;stop-opacity:1" /></linearGradient></defs><rect width="32" height="32" rx="6" fill="url(%23grad)"/><path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="20" r="2" fill="white"/></svg>',
  },
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
