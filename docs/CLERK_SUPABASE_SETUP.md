# Clerk + Supabase Integration Setup Guide

This guide will help you set up Clerk authentication with Supabase in your AgileForge project.

## Overview

Your AgileForge project is now configured to use:
- **Clerk** for user authentication and management
- **Supabase** for database operations with Clerk's JWT tokens
- **Next.js middleware** for route protection

## 1. Clerk Setup

### Create a Clerk Application

1. Go to [Clerk Dashboard](https://clerk.com/)
2. Create a new application
3. Choose your preferred authentication methods (email/password, social providers, etc.)
4. Note down your domain: `https://shining-killdeer-54.clerk.accounts.dev`

### Get Your Clerk Keys

From your Clerk dashboard:
1. Go to **Developers** → **API Keys**
2. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

## 2. Supabase Setup

### Configure JWT Template in Clerk

1. In your Clerk dashboard, go to **Developers** → **JWT Templates**
2. Create a new template named "supabase"
3. Use this configuration:

```json
{
  "aud": "authenticated",
  "exp": "{{claims.exp}}",
  "iat": "{{claims.iat}}",
  "iss": "https://your-project.supabase.co/auth/v1",
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

### Configure Supabase for Clerk

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Under **JWT Settings**, add your Clerk JWKS URL:
   ```
   https://shining-killdeer-54.clerk.accounts.dev/.well-known/jwks.json
   ```
3. Set the JWT Secret to your Clerk's JWKS endpoint
4. Enable **Custom access token hook** (optional, for custom claims)

## 3. Environment Variables

Create a `.env.local` file in your project root with these variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Clerk URLs (optional - defaults provided)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Other existing variables...
```

## 4. Database Schema Updates

Since you're switching from custom auth to Clerk, you may need to update your database schema:

### Option 1: Sync Clerk Users to Supabase

Create a webhook in Clerk to sync user data to your Supabase database:

```sql
-- Create a users table that syncs with Clerk
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY, -- Clerk user ID
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can read their own data" ON public.users
  FOR ALL USING (auth.jwt() ->> 'sub' = id);
```

### Option 2: Use Clerk's User ID in Existing Tables

Update your existing tables to reference Clerk user IDs:

```sql
-- Update existing user references to use Clerk IDs
-- This is a destructive operation - backup your data first!
ALTER TABLE projects ADD COLUMN clerk_user_id TEXT;
ALTER TABLE stories ADD COLUMN clerk_assignee_id TEXT;
-- ... update other tables as needed
```

## 5. Backend API Updates

Your backend API needs to be updated to work with Clerk tokens:

### Update FastAPI Authentication

In your `backend/auth/enhanced_auth.py`, add Clerk token verification:

```python
import jwt
from jwt import PyJWKClient
import os

CLERK_JWKS_URL = f"https://{os.getenv('CLERK_DOMAIN', 'your-domain.clerk.accounts.dev')}/.well-known/jwks.json"

def verify_clerk_token(token: str):
    try:
        jwks_client = PyJWKClient(CLERK_JWKS_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        decoded_token = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience="authenticated"
        )
        
        return decoded_token
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None
```

## 6. Frontend Usage

### Using the Clerk Auth Hook

The project now includes a custom hook that integrates Clerk with Supabase:

```typescript
import { useClerkAuth } from '@/hooks/use-clerk-auth'

function MyComponent() {
  const { 
    isLoaded, 
    isAuthenticated, 
    user, 
    supabase, 
    supabaseToken 
  } = useClerkAuth()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <div>Please sign in</div>
  }

  // Use the supabase client with Clerk authentication
  const fetchData = async () => {
    const { data, error } = await supabase
      .from('your_table')
      .select('*')
    
    return data
  }

  return <div>Welcome, {user?.fullName}!</div>
}
```

## 7. Testing the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/sign-in` to test authentication

3. After signing in, check that:
   - User data is available in your components
   - Supabase queries work with the Clerk token
   - Protected routes redirect unauthenticated users

## 8. Deployment Considerations

### Environment Variables
Ensure all environment variables are set in your production environment:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- Other platforms: Follow their specific documentation

### Domain Configuration
Update your Clerk application settings to include your production domain:
1. Go to Clerk Dashboard → Domains
2. Add your production domain
3. Update CORS settings if needed

## 9. Migration from Custom Auth

If you're migrating from the existing custom authentication:

1. **Backup your data** - Export all user data and relationships
2. **Create a migration script** to map existing users to Clerk users
3. **Update all user references** in your database
4. **Test thoroughly** before going live

## 10. Common Issues and Solutions

### JWT Token Issues
- Ensure your JWKS URL is correctly configured in Supabase
- Check that the JWT template in Clerk matches Supabase expectations
- Verify that the token audience claim is set to "authenticated"

### CORS Issues
- Add your domains to Clerk's allowed origins
- Ensure Supabase CORS settings include your domain

### Database Access Issues
- Check that Row Level Security policies are updated for Clerk user IDs
- Verify that the JWT token contains the correct user ID in the `sub` claim

## Need Help?

- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Clerk + Supabase Integration Guide](https://clerk.com/docs/integrations/databases/supabase)

## Next Steps

After setting up the integration:
1. Customize your sign-in/sign-up pages with Clerk components
2. Set up user profile management
3. Configure social authentication providers
4. Implement role-based access control
5. Set up webhooks for user sync (if needed) 