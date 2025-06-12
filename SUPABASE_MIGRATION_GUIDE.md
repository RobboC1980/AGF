# AgileForge - Supabase Migration Testing Guide

This guide helps you test the migration to Supabase and verify that everything is working correctly.

## Prerequisites

1. Supabase project created and configured
2. Environment variables set in `.env` file
3. Schema migration executed in Supabase dashboard
4. Required packages installed:
   ```
   pip install fastapi uvicorn httpx python-jose[cryptography] python-dotenv requests
   ```

## Step 1: Run the Migration Helper Script

The migration helper script will validate your Supabase connection and guide you through the migration process:

```bash
python migrate_to_supabase.py
```

Or to do a dry run without making changes:

```bash
python migrate_to_supabase.py --dry-run
```

## Step 2: Start the Supabase-Powered Backend Server

Start the new Supabase-powered backend:

```bash
python supabase_backend.py
```

The server should start at http://0.0.0.0:8000 by default.

## Step 3: Test the API Endpoints

Test the following API endpoints to ensure they're working correctly:

### Health Check
```bash
curl http://localhost:8000/health
```
Expected response:
```json
{"status":"healthy","environment":"development","version":"1.0.0","database":"supabase"}
```

### Get Projects
```bash
curl http://localhost:8000/api/projects
```
Expected response:
```json
{"projects":[...]}
```

### Get Stories
```bash
curl http://localhost:8000/api/stories
```
Expected response:
```json
{"stories":[...]}
```

### Create a Project
```bash
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"A test project for Supabase migration"}'
```

### Create a Story (if you have epics)
First, get available epics:
```bash
curl http://localhost:8000/api/epics
```

Then create a story using one of the epic IDs:
```bash
curl -X POST http://localhost:8000/api/stories \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Story","description":"A test story","epic_id":"YOUR_EPIC_ID_HERE"}'
```

## Step 4: Verify Data in Supabase Dashboard

1. Login to your Supabase dashboard
2. Go to the Table Editor
3. Verify that the data you created via the API appears in the tables
4. Check that the Row Level Security policies are working as expected

## Step 5: Update Frontend Code

Update your frontend code to use the Supabase client instead of direct API calls:

```bash
# Install required packages
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

Create a Supabase client in your frontend code:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Update your API calls to use the Supabase client:

```javascript
// Before (using fetch):
const getProjects = async () => {
  const response = await fetch('/api/projects')
  return await response.json()
}

// After (using Supabase):
const getProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
  
  if (error) throw error
  return data
}
```

## Step 6: Enable Real-Time Functionality

In your Supabase dashboard:
1. Go to Database > Replication
2. Enable replication for tables that need real-time updates
3. Add all relevant tables to the publication

In your frontend code:
```javascript
// Subscribe to changes in the projects table
const subscription = supabase
  .channel('public:projects')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
    console.log('Change received!', payload)
    // Update your UI based on the change
  })
  .subscribe()

// Clean up subscription when component unmounts
return () => {
  supabase.removeChannel(subscription)
}
```

## Step 7: Test Authentication

1. Test user registration:
   ```javascript
   const { user, error } = await supabase.auth.signUp({
     email: 'test@example.com',
     password: 'password123'
   })
   ```

2. Test login:
   ```javascript
   const { user, error } = await supabase.auth.signInWithPassword({
     email: 'test@example.com',
     password: 'password123'
   })
   ```

3. Test logout:
   ```javascript
   const { error } = await supabase.auth.signOut()
   ```

## Common Issues and Troubleshooting

1. **Authentication Issues**
   - Check that `SUPABASE_JWT_SECRET` is correctly set
   - Ensure auth providers are enabled in Supabase dashboard

2. **Database Connection Issues**
   - Verify that the Supabase URL and keys are correct
   - Check network connectivity to Supabase services

3. **Row Level Security Issues**
   - Review RLS policies in schema.sql
   - Test with the service role key to bypass RLS for debugging

4. **Real-Time Issues**
   - Ensure replication is enabled for the relevant tables
   - Check that client subscriptions are correctly set up

## Next Steps

Once you've verified that everything is working correctly, you can:

1. Update your production environment variables
2. Deploy the new backend to your hosting service
3. Update your frontend to point to the Supabase project
4. Monitor performance and adjust as needed

For more information, refer to the Supabase documentation:
- [Supabase Documentation](https://supabase.com/docs)
- [Authentication](https://supabase.com/docs/guides/auth)
- [Database](https://supabase.com/docs/guides/database)
- [Real-time](https://supabase.com/docs/guides/realtime) 