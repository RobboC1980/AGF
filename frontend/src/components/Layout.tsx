import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/useAuth'
import { Entity } from '../hooks/useEntity'
import { applyTheme, initTheme, Theme } from '../utils/theme'

const navigation: { name: string; href: string; icon: string; entity: Entity }[] = [
  { name: 'Dashboard', href: '/', icon: '📊', entity: 'projects' },
  { name: 'Projects', href: '/projects', icon: '🎯', entity: 'projects' },
  { name: 'Epics', href: '/epics', icon: '🚀', entity: 'epics' },
  { name: 'Stories', href: '/stories', icon: '📖', entity: 'stories' },
  { name: 'Tasks', href: '/tasks', icon: '✅', entity: 'tasks' },
  { name: 'Sprints', href: '/sprints', icon: '⚡', entity: 'sprints' },
  { name: 'Initiatives', href: '/initiatives', icon: '🎪', entity: 'initiatives' },
  { name: 'Risks', href: '/risks', icon: '⚠️', entity: 'risks' },
  { name: 'OKRs', href: '/okrs', icon: '🎯', entity: 'okrs' }
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [theme, setTheme] = useState<Theme>(() => initTheme())

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    applyTheme(next)
    localStorage.setItem('theme', next)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNavigation = navigation.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-content">
          {/* Logo */}
          <div className="sidebar-header">
            <div className="logo-icon">
              <span>AF</span>
            </div>
            <h1 className="logo-text">AgileForge</h1>
          </div>

          {/* Search */}
          <div className="search-container">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search navigation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                aria-label="Search navigation items"
                id="nav-search"
              />
              <div className="search-icon">
                <span>🔍</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="navigation">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User Menu */}
          <div className="user-menu">
            <div className="user-info">
              <div className="user-avatar">
                <span>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="user-details">
                <p className="user-name">
                  {user?.name || 'User'}
                </p>
                <p className="user-email">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="logout-btn"
              aria-label="Sign out of your account"
            >
              <span>🚪</span>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close navigation menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSidebarOpen(false)
            }
          }}
        />
      )}

      {/* Main content */}
      <div className="main-content">
        {/* Top header */}
        <header className="top-header">
          <div className="header-content">
            <div className="header-left">
              <button
                onClick={() => setSidebarOpen(true)}
                className="mobile-menu-btn"
                aria-label="Open navigation menu"
                title="Open navigation menu"
              >
                <span className="sr-only">Open sidebar</span>
                <span>☰</span>
              </button>
              <div className="welcome-section">
                <span className="welcome-icon">👋</span>
                <div>
                  <h2 className="welcome-title">
                    Welcome back, {user?.name?.split(' ')[0] || 'there'}!
                  </h2>
                  <p className="welcome-subtitle">
                    Manage your agile workflow efficiently
                  </p>
                </div>
              </div>
            </div>

            <div className="header-right">
              {/* Quick Actions */}
              <div className="quick-actions">
                <button 
                  className="btn btn-secondary btn-sm"
                  aria-label="View reports"
                  title="View reports"
                >
                  <span>📈</span>
                  Reports
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  aria-label="Open settings"
                  title="Open settings"
                >
                  <span>⚙️</span>
                  Settings
                </button>
              </div>

              {/* Notifications */}
              <button
                className="notification-btn"
                aria-label="View notifications"
                title="View notifications"
              >
                <span>🔔</span>
                <span className="notification-badge"></span>
              </button>

              {/* Theme toggle */}
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          <div className="container">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
