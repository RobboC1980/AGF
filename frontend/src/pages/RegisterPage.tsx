import React from 'react'
import { Form, redirect, useActionData, useNavigation, Link } from 'react-router-dom'
import { useAuth } from '../store/useAuth'

export async function action({ request }: { request: Request }) {
  const form = await request.formData()
  const email = form.get('email') as string
  const password = form.get('password') as string
  const name = form.get('name') as string
  
  try {
    const { register } = useAuth.getState()
    await register(email, password, name)
    return redirect('/')
  } catch (error: any) {
    return { error: error.message || 'Registration failed' }
  }
}

export default function RegisterPage() {
  const navigation = useNavigation()
  const actionData = useActionData() as any
  const isSubmitting = navigation.state === 'submitting'
  
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
            Create Account
          </h1>
          <p style={{ 
            color: '#6b7280',
            margin: 0,
            fontSize: '0.875rem'
          }}>
            Join AgileForge to manage your projects
          </p>
        </div>

        {actionData?.error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {actionData.error}
          </div>
        )}

        <Form method="post">
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Full Name
            </label>
            <input 
              type="text" 
              name="name" 
              placeholder="Enter your full name"
              required 
              disabled={isSubmitting}
              style={{ 
                width: '100%', 
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.15s ease-in-out',
                backgroundColor: isSubmitting ? '#f9fafb' : 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

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
              name="email" 
              placeholder="Enter your email"
              required 
              disabled={isSubmitting}
              style={{ 
                width: '100%', 
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.15s ease-in-out',
                backgroundColor: isSubmitting ? '#f9fafb' : 'white'
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
              name="password" 
              placeholder="Create a password"
              required 
              disabled={isSubmitting}
              style={{ 
                width: '100%', 
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.15s ease-in-out',
                backgroundColor: isSubmitting ? '#f9fafb' : 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              width: '100%', 
              padding: '0.75rem',
              background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease-in-out',
              marginBottom: '1rem'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </Form>

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
            Already have an account?{' '}
            <Link 
              to="/login" 
              style={{ 
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
