# Environment Variables Setup for Vite Frontend

This document explains how to use environment variables in the AgileForge frontend application.

## Overview

Vite uses a special prefix system for environment variables to ensure security. Only variables prefixed with `VITE_` are exposed to the client-side code.

## Files Created

1. **`.env`** - Contains environment variables
2. **`src/config/env.ts`** - Centralizes environment variable access
3. **`src/vite-env.d.ts`** - TypeScript definitions for environment variables
4. **`src/components/EnvironmentInfo.tsx`** - Example component using env vars
5. **`src/services/api.ts`** - API service using environment configuration

## Environment Variables

All variables in `.env` file:

```bash
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_API_TIMEOUT=10000

# App Configuration
VITE_APP_NAME=AgileForge
VITE_APP_VERSION=2.0.0
VITE_APP_ENVIRONMENT=development

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

## Usage Examples

### Direct Access
```typescript
// Direct access (not recommended)
const apiUrl = import.meta.env.VITE_API_URL;
```

### Using the Config Helper (Recommended)
```typescript
import { API_CONFIG, APP_CONFIG, FEATURE_FLAGS } from './config/env';

// Use the structured configuration
const apiUrl = API_CONFIG.BASE_URL;
const appName = APP_CONFIG.NAME;
const isDebugEnabled = FEATURE_FLAGS.ENABLE_DEBUG;
```

### In API Calls
```typescript
import { apiService } from './services/api';

// The API service automatically uses environment variables
const response = await apiService.getUserProfile('123');
```

### In Components
```typescript
import { APP_CONFIG, isDevelopment } from './config/env';

function MyComponent() {
  return (
    <div>
      <h1>{APP_CONFIG.NAME}</h1>
      {isDevelopment() && <p>Development Mode</p>}
    </div>
  );
}
```

## Environment Files

You can create different environment files for different environments:

- `.env` - Default environment variables
- `.env.local` - Local overrides (ignored by git)
- `.env.development` - Development-specific variables
- `.env.production` - Production-specific variables

## Security Notes

1. **Never commit sensitive data** like API keys to `.env` files
2. Use `.env.local` for sensitive local development variables
3. Only `VITE_` prefixed variables are accessible in the browser
4. Server-side variables should not use the `VITE_` prefix

## Adding New Environment Variables

1. Add the variable to `.env` with `VITE_` prefix
2. Add the type definition to `src/vite-env.d.ts`
3. Add the variable to the appropriate config object in `src/config/env.ts`
4. Use the config object in your components/services

Example:
```bash
# In .env
VITE_NEW_FEATURE_FLAG=true
```

```typescript
// In vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_NEW_FEATURE_FLAG: string;
  // ... other variables
}
```

```typescript
// In config/env.ts
export const FEATURE_FLAGS = {
  NEW_FEATURE: import.meta.env.VITE_NEW_FEATURE_FLAG === 'true',
  // ... other flags
} as const;
```

## Best Practices

1. Use the config helper instead of direct `import.meta.env` access
2. Provide default values for all environment variables
3. Validate required environment variables on app startup
4. Use TypeScript interfaces for better type safety
5. Document all environment variables and their purposes 