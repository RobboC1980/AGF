# Clerk + Supabase Integration Guide

## Overview

This guide will help you set up the complete Clerk authentication with Supabase integration for AgileForge. The system has been updated with a unified authentication approach that properly handles Clerk JWT tokens.

## 🚀 Quick Start

### 1. Environment Setup

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

### 2. Required Environment Variables

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here
```

## 📋 Step-by-Step Setup

### Step 1: Clerk Application Setup

1. **Create Clerk Application**
   - Go to [Clerk Dashboard](https://dashboard.clerk.com/)
   - Create a new application
   - Choose your authentication methods (email/password, social providers)
   - Note your domain (e.g., `shining-killdeer-54.clerk.accounts.dev`)

2. **Get API Keys**
   - Navigate to **Developers** → **API Keys**
   - Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

3. **Configure JWT Template**
   - Go to **Developers** → **JWT Templates**
   - Click **"+ New template"**
   - Name it: `supabase`
   - Use this configuration:

```json
{
  "aud": "authenticated",
  "exp": "{{claims.exp}}",
  "iat": "{{claims.iat}}",
  "iss": "https://your-clerk-domain.clerk.accounts.dev",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "phone": "{{user.primary_phone_number.phone_number}}",
  "app_metadata": {
    "provider": "clerk",
    "providers": ["clerk"]
  },
  "user_metadata": {
    "first_name": "{{user.first_name}}",
    "last_name": "{{user.last_name}}",
    "full_name": "{{user.full_name}}"
  },
  "role": "authenticated"
}
```

### Step 2: Supabase Configuration

1. **Create Supabase Project**
   - Go to [Supabase Dashboard](https://app.supabase.com/)
   - Create a new project
   - Note your project URL and keys

2. **Configure JWT Settings**
   - Navigate to **Authentication** → **Settings**
   - Under **JWT Settings**, set:
     - **JWT Secret**: Your Clerk's JWKS URL: `https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json`
   - Save the settings

3. **Set up Database Schema**

Run this SQL in your Supabase SQL editor:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table for Clerk users
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY, -- Clerk user ID
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can read their own profile" ON public.profiles
  FOR ALL USING (auth.jwt() ->> 'sub' = id);

-- Update existing tables to use Clerk user IDs
-- Add clerk_user_id columns to existing tables
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS clerk_assignee_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS clerk_assignee_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_clerk_user_id ON public.projects(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_stories_clerk_assignee_id ON public.stories(clerk_assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_clerk_assignee_id ON public.tasks(clerk_assignee_id);

-- Update RLS policies for projects
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
CREATE POLICY "Users can manage their own projects" ON public.projects
  FOR ALL USING (
    auth.jwt() ->> 'sub' = clerk_user_id OR
    auth.jwt() ->> 'sub' = created_by::text
  );

-- Update RLS policies for stories
DROP POLICY IF EXISTS "Users can access stories in their projects" ON public.stories;
CREATE POLICY "Users can access stories in their projects" ON public.stories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = stories.project_id 
      AND (projects.clerk_user_id = auth.jwt() ->> 'sub' OR projects.created_by::text = auth.jwt() ->> 'sub')
    )
  );
```

### Step 3: Frontend Configuration

The frontend is already configured with the unified authentication system. Just ensure your environment variables are set correctly.

**Key files already updated:**
- `hooks/use-clerk-auth.ts` - Clerk + Supabase integration
- `middleware.ts` - Route protection
- `app/layout.tsx` - ClerkProvider setup

### Step 4: Backend Configuration

The backend has been updated with a unified authentication system. Key improvements:

**Updated files:**
- `backend/auth/unified_auth.py` - Unified authentication system
- `backend/auth/clerk_auth.py` - Proper Clerk JWT verification
- `backend/api/auth.py` - Simplified auth endpoints
- `backend/api/analytics_endpoints.py` - Updated to use unified auth

**Features:**
- ✅ Proper JWKS validation for production
- ✅ Development mode with relaxed validation
- ✅ Fallback to Supabase tokens
- ✅ Consistent error handling
- ✅ Automatic user creation

### Step 5: Testing the Integration

1. **Start the backend:**
```bash
cd backend
python main.py
```

2. **Start the frontend:**
```bash
npm run dev
```

3. **Test the flow:**
   - Visit `http://localhost:3000`
   - Try to access a protected route (should redirect to sign-in)
   - Sign up/sign in with Clerk
   - Verify API calls work (check network tab)

## 🔧 Configuration Details

### Clerk Domain Configuration

Your Clerk domain is extracted from your publishable key. For example:
- Key: `pk_test_abc123def456`
- Domain: `abc123def456.clerk.accounts.dev`

### JWKS URL

The system automatically constructs the JWKS URL:
```
https://your-instance-id.clerk.accounts.dev/.well-known/jwks.json
```

### Development vs Production

**Development Mode:**
- Relaxed token validation
- Skips signature verification for testing
- Provides fallback user data

**Production Mode:**
- Full JWKS signature validation
- Strict token verification
- Proper error handling

## 🐛 Troubleshooting

### Common Issues

1. **401 Authentication Errors**
   - Check that Clerk keys are correctly set
   - Verify JWT template is configured in Clerk
   - Ensure Supabase JWKS URL is set correctly

2. **JWKS Fetch Errors**
   - Verify your Clerk domain is accessible
   - Check network connectivity
   - Ensure publishable key format is correct

3. **Token Verification Failures**
   - Check that token audience is "authenticated"
   - Verify issuer matches your Clerk domain
   - Ensure token hasn't expired

4. **Database Access Issues**
   - Verify RLS policies are updated for Clerk user IDs
   - Check that JWT token contains correct user ID in 'sub' claim
   - Ensure database permissions are set correctly

### Debug Mode

Set environment variable for detailed logging:
```env
ENVIRONMENT=development
```

This enables:
- Debug logging for token verification
- Relaxed validation for testing
- Detailed error messages

## 🔐 Security Considerations

### Production Checklist

- [ ] Use production Clerk keys (pk_live_/sk_live_)
- [ ] Set ENVIRONMENT=production
- [ ] Configure proper CORS origins
- [ ] Set up proper RLS policies
- [ ] Use HTTPS in production
- [ ] Rotate JWT secrets regularly

### Best Practices

1. **Environment Variables**
   - Never commit real keys to git
   - Use different keys for dev/staging/prod
   - Rotate keys regularly

2. **Token Management**
   - Tokens are handled automatically by Clerk
   - Backend verifies all tokens
   - Expired tokens are rejected

3. **Database Security**
   - RLS policies protect data access
   - Users can only access their own data
   - Service role key is used for admin operations

## 📚 API Usage

### Frontend API Calls

The system automatically handles authentication:

```typescript
import { useClerkAuth } from '@/hooks/use-clerk-auth'

function MyComponent() {
  const { user, supabase } = useClerkAuth()
  
  // API calls are automatically authenticated
  const fetchData = async () => {
    const response = await fetch('/api/projects')
    return response.json()
  }
}
```

### Backend Endpoints

All endpoints use unified authentication:

```python
from backend.auth.unified_auth import get_current_user, UnifiedUser

@router.get("/my-endpoint")
async def my_endpoint(current_user: UnifiedUser = Depends(get_current_user)):
    # User is automatically authenticated
    return {"user_id": current_user.id}
```

## 🚀 Next Steps

1. **Customize Authentication**
   - Add social providers in Clerk
   - Configure user profile fields
   - Set up webhooks for user sync

2. **Enhance Security**
   - Implement role-based access control
   - Add API rate limiting
   - Set up audit logging

3. **Scale the System**
   - Add Redis caching
   - Implement background jobs
   - Set up monitoring

## 📞 Support

If you encounter issues:

1. Check the [Clerk Documentation](https://clerk.com/docs)
2. Review [Supabase Documentation](https://supabase.com/docs)
3. Check the debug logs in development mode
4. Verify environment variables are set correctly

The authentication system is now fully integrated and should handle all authentication scenarios reliably! 