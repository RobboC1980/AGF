export type Theme = 'light' | 'dark'

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark-theme')
    root.classList.remove('light-theme')
  } else {
    root.classList.add('light-theme')
    root.classList.remove('dark-theme')
  }
}

export function initTheme(): Theme {
  const stored = (typeof window !== 'undefined') ? (localStorage.getItem('theme') as Theme | null) : null
  if (stored === 'light' || stored === 'dark') {
    applyTheme(stored)
    return stored
  }
  const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme: Theme = prefersDark ? 'dark' : 'light'
  applyTheme(theme)
  return theme
}
