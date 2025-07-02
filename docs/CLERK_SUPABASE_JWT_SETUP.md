# Clerk + Supabase JWT Template Setup

## Overview

To fully integrate Clerk authentication with Supabase, you need to configure a JWT template in Clerk that generates tokens compatible with Supabase's Row Level Security (RLS) system.

## Current Status

✅ **Fallback System Active**: The system currently works with regular Clerk tokens
⚠️ **Supabase Template Missing**: For full RLS support, configure the Supabase JWT template

## Quick Setup Guide

### 1. Access Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Navigate to **Developers** → **JWT Templates**

### 2. Create Supabase Template

1. Click **"+ New template"**
2. Name it: `supabase`
3. Use this configuration:

```json
{
  "aud": "authenticated",
  "exp": "{{claims.exp}}",
  "iat": "{{claims.iat}}",
  "iss": "https://dtbzqvaibastyrrpnpxm.supabase.co/auth/v1",
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

### 3. Configure Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to **Authentication** → **Settings**
3. Under **JWT Settings**:
   - Set **JWT Secret** to: `https://shining-killdeer-54.clerk.accounts.dev/.well-known/jwks.json`
   - Or use your Clerk domain's JWKS URL

### 4. Test the Integration

After setting up the template:

1. Sign out and sign back in to get a new token
2. The RBAC system should now work with full Supabase RLS support
3. Check browser console for any remaining auth warnings

## What This Enables

With the Supabase JWT template configured:

✅ **Row Level Security**: Database-level access control
✅ **Better Performance**: Direct Supabase queries without admin client
✅ **Enhanced Security**: Token-based user identification
✅ **Proper Permissions**: Fine-grained access control

## Troubleshooting

### Template Not Working?

1. **Check Template Name**: Must be exactly `supabase`
2. **Verify Claims**: Ensure all required claims are present
3. **Test Token**: Use Clerk's token inspector to verify format
4. **Clear Cache**: Sign out/in to get fresh tokens

### Still Getting 401 Errors?

1. **Check Issuer**: Verify the `iss` claim matches your Supabase project
2. **JWKS URL**: Ensure Supabase can access Clerk's JWKS endpoint
3. **Network**: Check for firewall/proxy issues

### Fallback Mode

If the template setup fails, the system will:
- Use regular Clerk tokens
- Fall back to admin client for database queries
- Still provide basic functionality
- Log warnings about missing Supabase template

## Environment Variables

Make sure these are set correctly:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dtbzqvaibastyrrpnpxm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Production Checklist

Before deploying to production:

- [ ] Supabase JWT template configured in Clerk
- [ ] Supabase JWT settings updated with Clerk JWKS URL
- [ ] Test authentication flow end-to-end
- [ ] Verify RLS policies work correctly
- [ ] Check all API endpoints return proper responses
- [ ] Test project creation and admin assignment

## Next Steps

1. **Set up the JWT template** following the guide above
2. **Test the authentication** by creating a new project
3. **Verify RBAC** by checking project access permissions
4. **Deploy to production** once everything works locally

This setup ensures secure, scalable authentication with proper role-based access control. 