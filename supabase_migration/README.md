# AgileForge - Supabase Migration Package

This package contains all the necessary files and instructions to migrate your AgileForge application from Render to Supabase.

## Why Supabase?

- **Reliable PostgreSQL Database** - Built on top of PostgreSQL, which you're already using
- **Zero Backend Maintenance** - No more failed Python/FastAPI deployments
- **Built-in Authentication** - Secure authentication with social login options
- **Real-time Capabilities** - Built-in real-time subscriptions for collaborative features
- **Edge Functions** - Serverless functions for your AI features
- **Row Level Security** - Database-level security policies
- **Open Source** - No vendor lock-in, can be self-hosted if needed

## What's Included in This Package

- `schema.sql` - Complete database schema with Row Level Security policies
- `ai_function.ts` - Edge Function implementation for your AI features
- `setup.js` - Setup instructions for quick reference
- `IMPLEMENTATION_GUIDE.md` - Step-by-step implementation instructions

## Quick Start

1. **Create a Supabase Project**:
   - Sign up at https://supabase.com
   - Create a new project

2. **Set Up the Schema**:
   - Go to the SQL Editor in your Supabase dashboard
   - Paste and run the contents of `schema.sql`

3. **Configure Authentication**:
   - Enable Email/Password authentication
   - Set up social providers if needed

4. **Deploy Edge Functions**:
   - Use Supabase CLI to deploy the AI function

5. **Update Frontend**:
   - Install Supabase client libraries
   - Update components to use Supabase

For detailed instructions, see [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md).

## Dependencies to Install

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-ui-react @supabase/auth-ui-shared
```

## Estimated Migration Time

- **Database Setup**: 1 hour
- **Authentication**: 1-2 hours
- **Frontend Integration**: 4-6 hours
- **Testing & Deployment**: 2-3 hours

Total estimated time: 1-2 days

## Support and Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase GitHub Repository](https://github.com/supabase/supabase)
- [Supabase Discord Community](https://discord.supabase.com) 