import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, isLoading, user, token } = useAuth()
  const navigate = useNavigate()

  // Debug logging
  console.log('LoginPage render - user:', user, 'token:', token, 'isLoading:', isLoading)

  // Redirect if already logged in
  useEffect(() => {
    console.log('LoginPage useEffect - user:', user, 'token:', token)
    if (user && token) {
      console.log('User is logged in, redirecting to dashboard...')
      navigate('/', { replace: true })
    }
  }, [user, token, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    console.log('Login form submitted with:', email)
    
    try {
      console.log('Calling login function...')
      await login(email, password)
      console.log('Login successful, navigating to dashboard...')
      // Redirect after successful login
      navigate('/', { replace: true })
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || 'Login failed')
    }
  }
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#1f2937',
            margin: '0 0 0.5rem 0'
          }}>
            Welcome Back
          </h1>
          <p style={{ 
            color: '#6b7280',
            margin: 0,
            fontSize: '0.875rem'
          }}>
            Sign in to your AgileForge account
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Email Address
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required 
              disabled={isLoading}
              style={{ 
                width: '100%', 
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.15s ease-in-out',
                backgroundColor: isLoading ? '#f9fafb' : 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Password
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required 
              disabled={isLoading}
              style={{ 
                width: '100%', 
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.15s ease-in-out',
                backgroundColor: isLoading ? '#f9fafb' : 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              width: '100%', 
              padding: '0.75rem',
              background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease-in-out',
              marginBottom: '1rem'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
          
          {/* Temporary debug button */}
          <button 
            type="button"
            onClick={() => {
              console.log('Test navigation button clicked')
              navigate('/', { replace: true })
            }}
            style={{ 
              width: '100%', 
              padding: '0.5rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            🧪 Test Navigation (Debug)
          </button>
        </form>

        <div style={{ 
          textAlign: 'center',
          paddingTop: '1rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{ 
            color: '#6b7280',
            fontSize: '0.875rem',
            margin: 0
          }}>
            Don't have an account?{' '}
            <Link 
              to="/register" 
              style={{ 
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
