import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiClient } from '../services/api'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      request: vi.fn(),
      defaults: {
        headers: {
          common: {}
        }
      },
      interceptors: {
        response: {
          use: vi.fn()
        }
      }
    }))
  }
}))

describe('API Client', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Token Management', () => {
    it('should set token correctly', () => {
      const testToken = 'test-token-123'
      apiClient.setToken(testToken)
      
      expect(localStorage.getItem('auth_token')).toBe(testToken)
    })

    it('should clear token correctly', () => {
      const testToken = 'test-token-123'
      localStorage.setItem('auth_token', testToken)
      
      apiClient.clearToken()
      
      expect(localStorage.getItem('auth_token')).toBeNull()
    })
  })

  describe('API Methods', () => {
    it('should have login method', () => {
      expect(typeof apiClient.login).toBe('function')
    })

    it('should have register method', () => {
      expect(typeof apiClient.register).toBe('function')
    })

    it('should have getCurrentUser method', () => {
      expect(typeof apiClient.getCurrentUser).toBe('function')
    })

    it('should have CRUD methods for projects', () => {
      expect(typeof apiClient.getProjects).toBe('function')
      expect(typeof apiClient.createProject).toBe('function')
      expect(typeof apiClient.updateProject).toBe('function')
      expect(typeof apiClient.deleteProject).toBe('function')
    })
  })
}) 