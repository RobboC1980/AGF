import axios from 'axios'

export const api = axios.create({ baseURL: 'http://localhost:4000' })

export function setAuthToken(token: string | null) {
  console.log('Setting auth token:', token ? 'token present' : 'token cleared')
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed:', error.response.data)
      // Clear invalid token
      setAuthToken(null)
      localStorage.removeItem('token')
      localStorage.removeItem('auth-storage')
      // Optionally redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
