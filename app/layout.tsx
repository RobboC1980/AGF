import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'AgileForge - AI-Powered Project Management',
  description: 'Comprehensive Agile project management platform with AI assistance',
  keywords: 'agile, project management, scrum, kanban, AI, collaboration, agileforge',
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
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
