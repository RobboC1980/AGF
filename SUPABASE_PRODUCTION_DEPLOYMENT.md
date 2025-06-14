# AgileForge Production Deployment Guide (Supabase + Vercel)

This guide walks you through deploying AgileForge to production using:
- **Supabase** for database, authentication, and backend services
- **Vercel** for the Next.js frontend
- **Backend API** deployed to Railway/Render/Fly.io (optional)

## Prerequisites

1. Supabase account and project
2. Vercel account
3. Domain name (optional)
4. All API keys configured

## 1. Supabase Setup

### Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Save these values:
   - Project URL (e.g., `https://dtbzqvaibastyrrpnpxm.supabase.co`)
   - Anon/Public Key
   - Service Role Key (keep this secret!)
   - Database connection string

### Run Database Migrations

Execute the schema from `database_schema_update.sql` in the Supabase SQL Editor:

```sql
-- Run the entire schema file to create all tables
```

### Configure Row Level Security (RLS)

Enable RLS on all tables and set up appropriate policies:

```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Example policy for authenticated users
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = created_by);
```

## 2. Backend Deployment (Optional)

If you need custom backend logic beyond Supabase Edge Functions:

### Option A: Railway

1. Create Railway account
2. Create new project from GitHub
3. Add environment variables:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_KEY=your-service-key
   OPENAI_API_KEY=your-openai-key
   ANTHROPIC_API_KEY=your-anthropic-key
   PORT=8000
   ```
4. Deploy with:
   ```bash
   railway up
   ```

### Option B: Direct Supabase (Recommended)

Use Supabase Edge Functions for serverless backend:

```typescript
// supabase/functions/ai-generate-story/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { epicDescription } = await req.json()
  
  // Your AI logic here
  
  return new Response(
    JSON.stringify({ story: generatedStory }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

Deploy with:
```bash
supabase functions deploy ai-generate-story
```

## 3. Frontend Deployment to Vercel

### Prepare Environment Variables

Create `.env.production` in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://dtbzqvaibastyrrpnpxm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Custom Backend URL (if not using Supabase Functions)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-key

# Other public configs
NEXT_PUBLIC_APP_NAME=AgileForge
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
```

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Or connect GitHub repository in Vercel Dashboard for automatic deployments

### Configure Vercel Environment Variables

In Vercel Dashboard > Settings > Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://dtbzqvaibastyrrpnpxm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-backend-url (if applicable)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-key
```

## 4. Update Frontend Code for Production

### Update API Configuration

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Update Auth Context

```typescript
// contexts/auth-context.tsx
import { supabase } from '@/lib/supabase'

const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}
```

## 5. Production Checklist

### Security
- [ ] All environment variables set correctly
- [ ] RLS policies configured on all tables
- [ ] API keys are kept secret (never commit to git)
- [ ] CORS configured for production domains only

### Performance
- [ ] Database indexes created for frequently queried columns
- [ ] Image optimization enabled
- [ ] API rate limiting configured

### Monitoring
- [ ] Error tracking (Sentry) configured
- [ ] Analytics (Vercel Analytics) enabled
- [ ] Database monitoring in Supabase Dashboard

### Testing
- [ ] All features tested in staging environment
- [ ] Authentication flow verified
- [ ] Payment integration tested with test cards

## 6. DNS Configuration (Optional)

If using custom domain:

1. Add domain in Vercel Dashboard
2. Update DNS records:
   ```
   A     @     76.76.21.21
   CNAME www   cname.vercel-dns.com
   ```

## 7. Post-Deployment

1. Test all critical flows:
   - User registration/login
   - Creating projects/stories
   - AI features
   - Payment processing

2. Monitor for errors in:
   - Vercel Functions logs
   - Supabase logs
   - Browser console

3. Set up alerts for:
   - High error rates
   - Slow API responses
   - Database connection issues

## Common Issues & Solutions

### CORS Errors
Add your production domain to allowed origins:
```typescript
// In backend CORS config
allowed_origins: ['https://agileforge.vercel.app', 'https://www.agileforge.com']
```

### Environment Variable Not Found
Ensure variables are set in Vercel Dashboard and redeploy

### Database Connection Issues
Check Supabase connection pooler settings for high traffic

### Authentication Not Working
Verify Supabase Auth settings and redirect URLs

## Support

- Supabase Discord: https://discord.supabase.com
- Vercel Support: https://vercel.com/support
- Project Issues: https://github.com/yourusername/agileforge/issues 