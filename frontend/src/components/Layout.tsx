import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, 
  BarChart3, 
  Target, 
  Rocket, 
  BookOpen, 
  CheckSquare, 
  Zap, 
  Tent, 
  Shield, 
  AlertTriangle,
  Search,
  ChevronRight,
  User,
  Settings,
  TrendingUp,
  LogOut,
  Menu,
  Bell,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react'
import { useAuth } from '../store/useAuth'
import { Entity } from '../hooks/useEntity'
import { applyTheme, initTheme, Theme } from '../utils/theme'

interface NavigationGroup {
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: { 
    name: string; 
    href: string; 
    icon: React.ComponentType<{ size?: number; className?: string }>; 
    entity: Entity; 
    badge?: string 
  }[];
}

const navigationGroups: NavigationGroup[] = [
  {
    name: 'Overview',
    icon: BarChart3,
    items: [
      { name: 'Dashboard', href: '/', icon: Home, entity: 'projects' },
    ]
  },
  {
    name: 'Planning',
    icon: Target,
    items: [
      { name: 'Projects', href: '/projects', icon: Target, entity: 'projects' },
      { name: 'Epics', href: '/epics', icon: Rocket, entity: 'epics' },
      { name: 'Stories', href: '/stories', icon: BookOpen, entity: 'stories', badge: 'AI' },
      { name: 'Tasks', href: '/tasks', icon: CheckSquare, entity: 'tasks' },
    ]
  },
  {
    name: 'Execution',
    icon: Zap,
    items: [
      { name: 'Sprints', href: '/sprints', icon: Zap, entity: 'sprints' },
      { name: 'Initiatives', href: '/initiatives', icon: Tent, entity: 'initiatives' },
    ]
  },
  {
    name: 'Governance',
    icon: Shield,
    items: [
      { name: 'Risks', href: '/risks', icon: AlertTriangle, entity: 'risks' },
      { name: 'OKRs', href: '/okrs', icon: Target, entity: 'okrs' },
    ]
  }
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Overview', 'Planning'])
  const [searchQuery, setSearchQuery] = useState('')
  const [theme, setTheme] = useState<Theme>(() => initTheme())
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Auto-expand group containing current page
  useEffect(() => {
    const currentPath = location.pathname
    navigationGroups.forEach(group => {
      const hasActivePage = group.items.some(item => 
        currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href))
      )
      if (hasActivePage && !expandedGroups.includes(group.name)) {
        setExpandedGroups(prev => [...prev, group.name])
      }
    })
  }, [location.pathname])

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

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(name => name !== groupName)
        : [...prev, groupName]
    )
  }

  const filteredGroups = navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0)

  const isActivePage = (href: string) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: sidebarCollapsed ? '80px' : '280px' }}
        className={`relative bg-white border-r border-gray-200 shadow-sm flex flex-col ${
          sidebarOpen ? 'block' : 'hidden'
        } lg:block`}
      >
        {/* Logo & Collapse Button */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <AnimatePresence mode="wait">
            {!sidebarCollapsed ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center space-x-3"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg">AF</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AgileForge</h1>
                  <p className="text-xs text-gray-500">AI-Powered PM</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm mx-auto"
              >
                <span className="text-white font-bold text-lg">AF</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          )}
          
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
              title="Expand sidebar"
            >
              <ChevronRight size={12} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Search */}
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4"
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search navigation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </motion.div>
        )}

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <nav className="space-y-2">
            {filteredGroups.map((group, groupIndex) => (
              <div key={group.name} className="space-y-1">
                {!sidebarCollapsed ? (
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: groupIndex * 0.1 }}
                    onClick={() => toggleGroup(group.name)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <group.icon size={16} className="text-gray-500" />
                      <span>{group.name}</span>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedGroups.includes(group.name) ? 90 : 0 }}
                    >
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600" />
                    </motion.div>
                  </motion.button>
                ) : (
                  <div 
                    className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-gray-50 mx-auto"
                    title={group.name}
                  >
                    <group.icon size={20} className="text-gray-500" />
                  </div>
                )}

                <AnimatePresence>
                  {(expandedGroups.includes(group.name) || sidebarCollapsed) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={sidebarCollapsed ? 'space-y-1' : 'space-y-0.5 ml-6'}>
                        {group.items.map((item, itemIndex) => (
                          <motion.div
                            key={item.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (groupIndex * 0.1) + (itemIndex * 0.05) }}
                          >
                            <NavLink
                              to={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={({ isActive }) =>
                                `group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                                  isActive || isActivePage(item.href)
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                } ${sidebarCollapsed ? 'justify-center' : ''}`
                              }
                              title={sidebarCollapsed ? item.name : undefined}
                            >
                              <item.icon size={18} />
                              {!sidebarCollapsed && (
                                <>
                                  <span className="ml-3 flex-1">{item.name}</span>
                                  {item.badge && (
                                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                      {item.badge}
                                    </span>
                                  )}
                                </>
                              )}
                            </NavLink>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>
        </div>

        {/* User Menu */}
        <div className="border-t border-gray-100 p-4">
          <div className="relative">
            <motion.button
              onClick={() => setShowUserMenu(!showUserMenu)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
            >
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
                <User size={18} className="text-white" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              )}
            </motion.button>

            <AnimatePresence>
              {showUserMenu && !sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2"
                >
                  <button
                    onClick={toggleTheme}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                  >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                  >
                    <TrendingUp size={16} />
                    <span>Reports</span>
                  </button>
                  <hr className="my-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
              >
                <Menu size={20} className="text-gray-600" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Welcome back, {user?.name?.split(' ')[0] || 'there'}!
                  </h2>
                  <p className="text-sm text-gray-500">
                    Ready to build something amazing today?
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Activity Indicator */}
              <div className="hidden md:flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">All systems operational</span>
              </div>

              {/* Notifications */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Bell size={20} className="text-gray-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </motion.button>

              {/* Quick Action */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/stories')}
                className="hidden sm:flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
              >
                <Sparkles size={16} />
                <span>Create Story</span>
              </motion.button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
