import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"
import { QueryProvider } from "@/providers/query-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "next-themes"

export const metadata: Metadata = {
  title: 'AgileForge - AI-Powered Project Management',
  description: 'Comprehensive Agile project management platform with AI assistance for modern teams',
  keywords: 'agile, project management, scrum, kanban, AI, collaboration, sprint planning, user stories',
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233B82F6" /><stop offset="50%" stop-color="%236366F1" /><stop offset="100%" stop-color="%238B5CF6" /></linearGradient></defs><circle cx="24" cy="24" r="20" fill="url(%23grad)"/><path d="M24 8 L32 28 L28 28 L26.5 24 L21.5 24 L20 28 L16 28 L24 8 Z M23 18 L25 18 L24 15 L23 18 Z" fill="white"/><path d="M32 30 L36 34 L34 36 L30 32 L32 30 Z" fill="white"/><circle cx="12" cy="36" r="2" fill="white" opacity="0.8"/><circle cx="16" cy="38" r="1.5" fill="white" opacity="0.6"/><circle cx="20" cy="40" r="1" fill="white" opacity="0.4"/></svg>',
        sizes: '48x48',
        type: 'image/svg+xml',
      },
    ],
    shortcut: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233B82F6" /><stop offset="50%" stop-color="%236366F1" /><stop offset="100%" stop-color="%238B5CF6" /></linearGradient></defs><circle cx="24" cy="24" r="20" fill="url(%23grad)"/><path d="M24 8 L32 28 L28 28 L26.5 24 L21.5 24 L20 28 L16 28 L24 8 Z M23 18 L25 18 L24 15 L23 18 Z" fill="white"/><path d="M32 30 L36 34 L34 36 L30 32 L32 30 Z" fill="white"/><circle cx="12" cy="36" r="2" fill="white" opacity="0.8"/><circle cx="16" cy="38" r="1.5" fill="white" opacity="0.6"/><circle cx="20" cy="40" r="1" fill="white" opacity="0.4"/></svg>',
    apple: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233B82F6" /><stop offset="50%" stop-color="%236366F1" /><stop offset="100%" stop-color="%238B5CF6" /></linearGradient></defs><circle cx="24" cy="24" r="20" fill="url(%23grad)"/><path d="M24 8 L32 28 L28 28 L26.5 24 L21.5 24 L20 28 L16 28 L24 8 Z M23 18 L25 18 L24 15 L23 18 Z" fill="white"/><path d="M32 30 L36 34 L34 36 L30 32 L32 30 Z" fill="white"/><circle cx="12" cy="36" r="2" fill="white" opacity="0.8"/><circle cx="16" cy="38" r="1.5" fill="white" opacity="0.6"/><circle cx="20" cy="40" r="1" fill="white" opacity="0.4"/></svg>',
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
