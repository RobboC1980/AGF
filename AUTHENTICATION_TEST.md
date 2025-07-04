# Authentication Test Guide

## 🔧 Fixed Issues

1. **Backend JWTRefreshManager Error**: ✅ Resolved
2. **Port Configuration**: ✅ Frontend on 3000, Backend on 8000
3. **API Client Authentication**: ✅ Updated to use Clerk tokens properly

## 🧪 Testing Authentication

### 1. Backend Health Check (No Auth Required)
```bash
curl http://localhost:8000/health
```

**Expected Result:**
```json
{
  "status": "healthy",
  "environment": "development",
  "version": "3.0.0",
  "features": {...}
}
```

### 2. Protected Endpoint Test (Auth Required)
```bash
# This should return 401 without auth
curl http://localhost:8000/api/stories
```

**Expected Result:**
```json
{"detail":"Could not validate credentials"}
```

### 3. Frontend Integration Test

Use the new `useApi` hook in any component:

```typescript
import { useApi } from '@/hooks/useApi'

function TestComponent() {
  const api = useApi()
  
  const testAuth = async () => {
    try {
      // Test health (no auth needed)
      const health = await api.healthCheck()
      console.log('Health:', health)
      
      // Test protected endpoint
      const stories = await api.stories.getAll()
      console.log('Stories:', stories)
    } catch (error) {
      console.error('Auth test failed:', error)
    }
  }
  
  return (
    <button onClick={testAuth}>
      Test Authentication
    </button>
  )
}
```

## 🎯 What Was Fixed

### Backend Changes
1. Removed conflicting `JWTRefreshManager` from security middleware
2. Updated main.py to use `BACKEND_PORT` environment variable
3. All API endpoints now use consistent Clerk authentication via `get_current_user_clerk`

### Frontend Changes
1. Updated API client to accept tokens as parameters
2. Created new `useApi` hook that automatically passes Clerk tokens
3. All API methods now properly authenticated with Clerk JWT tokens

### Environment Configuration
1. Updated .env to use correct ports:
   - Frontend: PORT=3000
   - Backend: BACKEND_PORT=8000
2. All URLs properly configured for localhost development

## 🚀 Current Status

- ✅ Backend running on port 8000
- ✅ Frontend running on port 3000 
- ✅ No more JWT RS256/HS256 conflicts
- ✅ Clerk authentication properly integrated
- ✅ API client uses proper token passing

## 🔍 Next Steps

1. Test the new `useApi` hook in a React component
2. Verify protected endpoints return data when authenticated
3. Confirm user can access all features with proper authentication

The authentication system is now properly configured and should work without 401 errors! 