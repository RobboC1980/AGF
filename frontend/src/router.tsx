import React from 'react'
import { createBrowserRouter, redirect } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage, { action as registerAction } from './pages/RegisterPage'
import EntityListPage from './pages/EntityListPage'
import AdvancedWorkflowPage from './pages/AdvancedWorkflowPage'
import { useAuth } from './store/useAuth'

const TOKEN_STORAGE_KEY = 'auth_token'

function requireAuth() {
  if (typeof window === 'undefined') {
    return null
  }

  const authState = useAuth.getState()
  const token = authState.token || localStorage.getItem(TOKEN_STORAGE_KEY)

  if (!token) {
    throw redirect('/login')
  }

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
