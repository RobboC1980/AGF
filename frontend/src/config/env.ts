// Environment Configuration
// This file centralizes access to all environment variables

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
} as const;

// App Configuration
export const APP_CONFIG = {
  NAME: import.meta.env.VITE_APP_NAME || 'AgileForge',
  VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  ENVIRONMENT: import.meta.env.VITE_APP_ENVIRONMENT || 'production',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG === 'true',
} as const;

// Helper function to check if we're in development
export const isDevelopment = () => APP_CONFIG.ENVIRONMENT === 'development';

// Helper function to check if we're in production
export const isProduction = () => APP_CONFIG.ENVIRONMENT === 'production';

// Debug logger that only logs in development
export const debugLog = (...args: any[]) => {
  if (FEATURE_FLAGS.ENABLE_DEBUG && isDevelopment()) {
    console.log('[DEBUG]', ...args);
  }
};

// Environment validation (optional - helps catch missing env vars early)
export const validateEnvironment = () => {
  const requiredVars = [
    'VITE_API_URL',
  ];
  
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    console.warn('Missing environment variables:', missing);
  }
  
  return missing.length === 0;
}; 