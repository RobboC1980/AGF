-- Clerk + Supabase RLS Policies Migration
-- This script updates Row Level Security policies to work with Clerk user IDs

-- Enable Row Level Security on auth.users if not already enabled
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table for Clerk users if it doesn't exist
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

-- Create policy for profiles
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile" ON public.profiles
  FOR ALL USING (auth.jwt() ->> 'sub' = id);

-- Add clerk_user_id columns to existing tables if they don't exist
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS clerk_assignee_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS clerk_assignee_id TEXT;
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;
ALTER TABLE public.sprints ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_clerk_user_id ON public.projects(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_stories_clerk_assignee_id ON public.stories(clerk_assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_clerk_assignee_id ON public.tasks(clerk_assignee_id);
CREATE INDEX IF NOT EXISTS idx_epics_clerk_user_id ON public.epics(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_sprints_clerk_user_id ON public.sprints(clerk_user_id);

-- Update RLS policies for projects
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
CREATE POLICY "Users can manage their own projects" ON public.projects
  FOR ALL USING (
    auth.jwt() ->> 'sub' = clerk_user_id OR
    auth.jwt() ->> 'sub' = created_by::text OR
    auth.jwt() ->> 'sub' = owner_id::text
  );

-- Update RLS policies for stories
DROP POLICY IF EXISTS "Users can access stories in their projects" ON public.stories;
CREATE POLICY "Users can access stories in their projects" ON public.stories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = stories.project_id 
      AND (
        projects.clerk_user_id = auth.jwt() ->> 'sub' OR 
        projects.created_by::text = auth.jwt() ->> 'sub' OR
        projects.owner_id::text = auth.jwt() ->> 'sub'
      )
    ) OR
    stories.clerk_assignee_id = auth.jwt() ->> 'sub' OR
    stories.assignee_id::text = auth.jwt() ->> 'sub'
  );

-- Update RLS policies for tasks
DROP POLICY IF EXISTS "Users can access tasks in their projects" ON public.tasks;
CREATE POLICY "Users can access tasks in their projects" ON public.tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = tasks.project_id 
      AND (
        projects.clerk_user_id = auth.jwt() ->> 'sub' OR 
        projects.created_by::text = auth.jwt() ->> 'sub' OR
        projects.owner_id::text = auth.jwt() ->> 'sub'
      )
    ) OR
    tasks.clerk_assignee_id = auth.jwt() ->> 'sub' OR
    tasks.assignee_id::text = auth.jwt() ->> 'sub'
  );

-- Update RLS policies for epics
DROP POLICY IF EXISTS "Users can access epics in their projects" ON public.epics;
CREATE POLICY "Users can access epics in their projects" ON public.epics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = epics.project_id 
      AND (
        projects.clerk_user_id = auth.jwt() ->> 'sub' OR 
        projects.created_by::text = auth.jwt() ->> 'sub' OR
        projects.owner_id::text = auth.jwt() ->> 'sub'
      )
    ) OR
    epics.clerk_user_id = auth.jwt() ->> 'sub' OR
    epics.created_by::text = auth.jwt() ->> 'sub'
  );

-- Update RLS policies for sprints
DROP POLICY IF EXISTS "Users can access sprints in their projects" ON public.sprints;
CREATE POLICY "Users can access sprints in their projects" ON public.sprints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = sprints.project_id 
      AND (
        projects.clerk_user_id = auth.jwt() ->> 'sub' OR 
        projects.created_by::text = auth.jwt() ->> 'sub' OR
        projects.owner_id::text = auth.jwt() ->> 'sub'
      )
    ) OR
    sprints.clerk_user_id = auth.jwt() ->> 'sub' OR
    sprints.created_by::text = auth.jwt() ->> 'sub'
  );

-- Create a function to sync Clerk users to profiles table
CREATE OR REPLACE FUNCTION public.handle_clerk_user_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be called by a webhook to sync Clerk users
  -- For now, it's just a placeholder
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get current user from JWT
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt() ->> 'sub';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user has access to project
CREATE OR REPLACE FUNCTION public.user_has_project_access(project_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id TEXT;
BEGIN
  current_user_id := auth.jwt() ->> 'sub';
  
  RETURN EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_uuid 
    AND (
      clerk_user_id = current_user_id OR 
      created_by::text = current_user_id OR
      owner_id::text = current_user_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_project_access(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.profiles IS 'User profiles synced from Clerk authentication';
COMMENT ON FUNCTION public.get_current_user_id() IS 'Returns the current user ID from JWT token';
COMMENT ON FUNCTION public.user_has_project_access(UUID) IS 'Checks if current user has access to a project'; 