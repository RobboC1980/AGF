# AgileForge - Supabase Migration Guide

This guide provides step-by-step instructions for migrating the AgileForge backend from Render to Supabase.

## 1. Supabase Project Setup

1. **Create a Supabase Project**
   - Sign up at https://supabase.com if you haven't already
   - Create a new project
   - Note your project URL and anon key

2. **Set Up Environment Variables**
   - Copy `.env.local.supabase` to `.env.local`
   - Update the following values:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY` (reuse existing key)
     - `ANTHROPIC_API_KEY` (if needed)

## 2. Database Schema Migration

1. **Run the Schema Migration Script**
   - Navigate to the SQL editor in your Supabase dashboard
   - Copy the contents of `supabase_migration/schema.sql`
   - Run the SQL script to create all tables and policies

2. **Set Up Row Level Security**
   - The schema script already includes RLS policies
   - Verify that all tables have RLS enabled in the Supabase dashboard

## 3. Setup Authentication

1. **Configure Auth Providers**
   - In the Supabase dashboard, go to Authentication > Providers
   - Enable Email/Password authentication
   - Configure social providers (Google, GitHub) if needed
   - Set redirect URLs to your frontend domain

2. **Update Auth UI Integration**
   - Install required packages:
   ```
   npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-ui-react @supabase/auth-ui-shared
   ```
   - Copy the `components/auth/SignInForm.tsx` file to your project

## 4. API Routes Migration

1. **Update or Create API Routes**
   - Copy the `app/api/projects/route.ts` file to your project
   - Create similar route handlers for other API endpoints
   - Update imports and types as needed

2. **Deploy Edge Functions for AI**
   - Install Supabase CLI (if not already installed):
   ```
   npm install -g supabase
   ```
   - Login to Supabase CLI:
   ```
   supabase login
   ```
   - Initialize Supabase for your project:
   ```
   supabase init
   ```
   - Copy the AI function from `supabase_migration/ai_function.ts` to your `supabase/functions/ai/index.ts` file
   - Deploy the function:
   ```
   supabase functions deploy ai --no-verify-jwt
   ```
   - Set secret for the function:
   ```
   supabase secrets set OPENAI_API_KEY=your-openai-api-key
   ```

## 5. Frontend Integration

1. **Install Required Dependencies**
   ```
   npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-ui-react @supabase/auth-ui-shared
   ```

2. **Copy Type Definitions**
   - Copy `lib/database.types.ts` to your project
   - Copy `lib/supabase.ts` to your project

3. **Update Client Components**
   - Copy `components/projects/ProjectsList.tsx` as an example
   - Update other components to use Supabase client

4. **Set Up Authentication Components**
   - Copy auth components like `SignInForm.tsx`
   - Set up auth callbacks and protected routes

## 6. Real-Time Functionality

1. **Enable Real-Time in Supabase**
   - In the Supabase dashboard, go to Database > Replication
   - Enable replication for the tables you want real-time updates for
   - Set up publication with all tables added

2. **Implement Real-Time Subscriptions**
   - Use the `supabase.channel()` method as shown in `ProjectsList.tsx`
   - Handle insert, update, and delete events

## 7. Testing and Deployment

1. **Local Testing**
   - Run the Next.js app locally:
   ```
   npm run dev
   ```
   - Test user registration, login, and all CRUD operations
   - Test real-time updates across multiple browser windows

2. **Deploy to Vercel**
   - Push your changes to GitHub
   - Connect your repository to Vercel
   - Add all environment variables from `.env.local.supabase` to Vercel
   - Deploy the application

## 8. Data Migration

1. **Export Data from Render PostgreSQL**
   ```
   pg_dump -h your-render-postgres-host -U your-db-user -d your-db-name -F c > agileforge_backup.dump
   ```

2. **Import Data to Supabase**
   - Use the Supabase database connection details from the dashboard
   - Use pg_restore to import your data:
   ```
   pg_restore -h db.your-project-id.supabase.co -U postgres -d postgres -F c agileforge_backup.dump
   ```

## 9. Final Steps

1. **Update Links and Redirects**
   - Update any hardcoded API URLs in your frontend code
   - Set up proper redirect URLs for authentication

2. **Monitor Application**
   - Check Supabase dashboard for errors
   - Monitor edge function logs using `supabase functions logs ai`

3. **Delete Render Resources**
   - Once migration is confirmed working, delete the resources on Render to avoid billing

## Need Help?

If you encounter any issues during migration, refer to the Supabase documentation or contact support:

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase GitHub Repository](https://github.com/supabase/supabase)
- [Supabase Discord Community](https://discord.supabase.com) 