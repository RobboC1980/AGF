// Jest polyfills for missing browser APIs

// TextEncoder/TextDecoder polyfill
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Fetch API polyfill
require('whatwg-fetch')

// URLSearchParams polyfill
if (!global.URLSearchParams) {
  global.URLSearchParams = require('url').URLSearchParams
}

// ResizeObserver polyfill
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// IntersectionObserver polyfill
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// matchMedia polyfill
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// localStorage polyfill
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// sessionStorage polyfill
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Performance API polyfill
global.performance = {
  ...global.performance,
  mark: jest.fn(),
  measure: jest.fn(),
  now: jest.fn(() => Date.now()),
}

// Crypto API polyfill
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => '12345678-1234-1234-1234-123456789abc'),
    getRandomValues: jest.fn(),
    subtle: {
      digest: jest.fn(),
      generateKey: jest.fn(),
      importKey: jest.fn(),
      exportKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    },
  },
})

// Location polyfill
delete window.location
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
}

// Navigator polyfill
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'node.js',
    language: 'en',
    languages: ['en'],
    clipboard: {
      writeText: jest.fn(),
      readText: jest.fn(),
    },
  },
})

// File API polyfill
global.File = class File {
  constructor(parts, name, options = {}) {
    this.parts = parts
    this.name = name
    this.size = parts.reduce((total, part) => total + part.length, 0)
    this.type = options.type || ''
    this.lastModified = options.lastModified || Date.now()
  }
}

global.FileReader = class FileReader {
  constructor() {
    this.readyState = 0
    this.result = null
    this.error = null
    this.onload = null
    this.onerror = null
    this.onabort = null
  }
  
  readAsText() {
    this.readyState = 2
    this.result = 'file content'
    if (this.onload) this.onload()
  }
  
  readAsDataURL() {
    this.readyState = 2
    this.result = 'data:text/plain;base64,ZmlsZSBjb250ZW50'
    if (this.onload) this.onload()
  }
}

// WebSocket polyfill for testing
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 1 // OPEN
    this.onopen = null
    this.onclose = null
    this.onmessage = null
    this.onerror = null
  }
  
  send(data) {
    console.log('Mock WebSocket send:', data)
  }
  
  close() {
    this.readyState = 3 // CLOSED
    if (this.onclose) this.onclose()
  }
}

// Suppress console warnings in tests
global.console = {
  ...console,
  // Keep error and warn for debugging
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
} 