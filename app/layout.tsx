import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
