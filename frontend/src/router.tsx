import React from 'react'
import { createBrowserRouter, redirect } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage, { action as registerAction } from './pages/RegisterPage'
import EntityListPage from './pages/EntityListPage'
import AdvancedWorkflowPage from './pages/AdvancedWorkflowPage'
import { useAuth } from './store/useAuth'

function requireAuth() {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    console.log('requireAuth: Not in browser, returning null')
    return null
  }
  
  // Check the auth store first, then fall back to localStorage
  const authState = useAuth.getState()
  const token = authState.token || localStorage.getItem('token')
  
  console.log('requireAuth: token from auth store:', authState.token ? 'exists' : 'null')
  console.log('requireAuth: token from localStorage:', localStorage.getItem('token') ? 'exists' : 'null')
  console.log('requireAuth: using token:', token ? 'exists' : 'null')
  
  if (!token) {
    console.log('requireAuth: No token, redirecting to login')
    throw redirect('/login')
  }
  
  console.log('requireAuth: Token exists, allowing access')
  return null
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/register',
    element: <RegisterPage />,
    action: registerAction
  },
  {
    path: '/',
    element: <Layout />,
    loader: requireAuth,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'workflow/:projectId',
        element: <AdvancedWorkflowPage />
      },
      {
        path: ':entity',
        element: <EntityListPage />
      }
    ]
  }
])
