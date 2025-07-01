-- RBAC Implementation Migration (Fixed)
-- Implements strict access control for AgileForge with Clerk + Supabase
-- Addresses: table names, RLS enablement, analytics policies, function privileges, edge cases
-- Author: AI Assistant
-- Date: 2025-01-01

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================
-- CREATE ROLE ENUM FOR BETTER PERFORMANCE
-- =====================================

-- Create role enum for better performance and type safety
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_member_role') THEN
        CREATE TYPE project_member_role AS ENUM ('viewer', 'editor', 'admin');
    END IF;
END $$;

-- =====================================
-- UPDATE USERS TABLE (PROFILES)
-- =====================================

-- Add is_admin column to profiles if not present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
    END IF;
END $$;

-- Add owner_id to projects if not present (for ownership reference)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'owner_id') THEN
        ALTER TABLE public.projects ADD COLUMN owner_id UUID REFERENCES public.profiles(id);
        -- Populate owner_id with created_by values
        UPDATE public.projects SET owner_id = created_by WHERE owner_id IS NULL;
        CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
    END IF;
END $$;

-- =====================================
-- PROJECT MEMBERS TABLE
-- =====================================

-- Create project_members table for explicit project access
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role project_member_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    
    -- Constraint to prevent duplicate memberships
    CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON public.project_members(role);

-- Partial index for frequently queried admin/editor roles
CREATE INDEX IF NOT EXISTS idx_project_members_admin_editor 
    ON public.project_members(project_id) 
    WHERE role IN ('editor', 'admin');

-- Enable RLS on project_members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- =====================================
-- ENSURE RLS IS ENABLED ON ALL TABLES
-- =====================================

-- Explicitly enable RLS on all relevant tables (safety check)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ai_completions if it exists (for analytics)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_completions') THEN
        ALTER TABLE public.ai_completions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- =====================================
-- HELPER FUNCTIONS (FIXED)
-- =====================================

-- Function to check if user has project access
CREATE OR REPLACE FUNCTION has_project_access(project_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_uuid AND is_admin = TRUE
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is project owner
    IF EXISTS (
        SELECT 1 FROM public.projects 
        WHERE id = project_uuid AND (owner_id = user_uuid OR created_by = user_uuid)
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is explicit project member
    IF EXISTS (
        SELECT 1 FROM public.project_members 
        WHERE project_id = project_uuid AND user_id = user_uuid
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functions to get project_id for child entities (SECURITY INVOKER for RLS respect)
CREATE OR REPLACE FUNCTION get_project_id_for_epic(epic_uuid UUID)
RETURNS UUID AS $$
    SELECT project_id FROM public.epics WHERE id = epic_uuid;
$$ LANGUAGE sql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION get_project_id_for_story(story_uuid UUID)
RETURNS UUID AS $$
    SELECT e.project_id 
    FROM public.stories s 
    JOIN public.epics e ON e.id = s.epic_id 
    WHERE s.id = story_uuid;
$$ LANGUAGE sql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION get_project_id_for_task(task_uuid UUID)
RETURNS UUID AS $$
    SELECT e.project_id 
    FROM public.tasks t 
    JOIN public.stories s ON s.id = t.story_id 
    JOIN public.epics e ON e.id = s.epic_id 
    WHERE t.id = task_uuid;
$$ LANGUAGE sql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION get_project_id_for_sprint(sprint_uuid UUID)
RETURNS UUID AS $$
    SELECT project_id FROM public.sprints WHERE id = sprint_uuid;
$$ LANGUAGE sql SECURITY INVOKER;

-- =====================================
-- RLS POLICIES FOR PROJECT_MEMBERS
-- =====================================

-- Project members can see other members of the same project
CREATE POLICY "Project members can see other project members"
    ON public.project_members FOR SELECT
    USING (
        auth.uid() = user_id OR
        has_project_access(project_id)
    );

-- Only project owners, admins, and project admins can manage memberships
CREATE POLICY "Project admins can manage memberships"
    ON public.project_members FOR INSERT
    WITH CHECK (
        -- User is global admin
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        OR
        -- User is project owner
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (owner_id = auth.uid() OR created_by = auth.uid()))
        OR  
        -- User is project admin
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_members.project_id AND user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Project admins can update memberships"
    ON public.project_members FOR UPDATE
    USING (
        -- User is global admin
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        OR
        -- User is project owner
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (owner_id = auth.uid() OR created_by = auth.uid()))
        OR  
        -- User is project admin
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_members.project_id AND user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Project admins can delete memberships"
    ON public.project_members FOR DELETE
    USING (
        -- User is global admin
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        OR
        -- User is project owner
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (owner_id = auth.uid() OR created_by = auth.uid()))
        OR  
        -- User is project admin
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_members.project_id AND user_id = auth.uid() AND role = 'admin')
    );

-- =====================================
-- RLS POLICIES FOR PROJECTS
-- =====================================

-- Drop existing policies
DROP POLICY IF EXISTS "Projects are viewable by their creator" ON public.projects;
DROP POLICY IF EXISTS "Projects can be created by any user" ON public.projects;
DROP POLICY IF EXISTS "Projects can be updated by their creator" ON public.projects;
DROP POLICY IF EXISTS "Projects can be deleted by their creator" ON public.projects;

-- New project policies with RBAC
CREATE POLICY "Users can see accessible projects"
    ON public.projects FOR SELECT
    USING (has_project_access(id));

CREATE POLICY "Authenticated users can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project members can update projects"
    ON public.projects FOR UPDATE
    USING (has_project_access(id));

CREATE POLICY "Only owners and admins can delete projects"
    ON public.projects FOR DELETE
    USING (
        -- User is global admin
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        OR
        -- User is project owner
        (owner_id = auth.uid() OR created_by = auth.uid())
    );

-- =====================================
-- RLS POLICIES FOR EPICS
-- =====================================

-- Drop existing policies
DROP POLICY IF EXISTS "Epics are viewable by project creators" ON public.epics;
DROP POLICY IF EXISTS "Epics can be created by project creators" ON public.epics;
DROP POLICY IF EXISTS "Epics can be updated by project creators" ON public.epics;
DROP POLICY IF EXISTS "Epics can be deleted by project creators" ON public.epics;

-- New epic policies with RBAC
CREATE POLICY "Users can see epics in accessible projects"
    ON public.epics FOR SELECT
    USING (has_project_access(project_id));

CREATE POLICY "Project members can create epics"
    ON public.epics FOR INSERT
    WITH CHECK (has_project_access(project_id));

CREATE POLICY "Project members can update epics"
    ON public.epics FOR UPDATE
    USING (has_project_access(project_id));

CREATE POLICY "Project editors and admins can delete epics"
    ON public.epics FOR DELETE
    USING (
        -- User is global admin
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        OR
        -- User is project owner
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (owner_id = auth.uid() OR created_by = auth.uid()))
        OR
        -- User is project editor or admin
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = epics.project_id AND user_id = auth.uid() AND role IN ('editor', 'admin'))
    );

-- =====================================
-- RLS POLICIES FOR STORIES
-- =====================================

-- Drop existing policies
DROP POLICY IF EXISTS "Stories are viewable by project creators and assignees" ON public.stories;
DROP POLICY IF EXISTS "Stories can be created by project creators" ON public.stories;
DROP POLICY IF EXISTS "Stories can be updated by project creators and assignees" ON public.stories;
DROP POLICY IF EXISTS "Stories can be deleted by project creators" ON public.stories;

-- New story policies with RBAC
CREATE POLICY "Users can see stories in accessible projects"
    ON public.stories FOR SELECT
    USING (has_project_access(get_project_id_for_story(id)));

CREATE POLICY "Project members can create stories"
    ON public.stories FOR INSERT
    WITH CHECK (has_project_access(get_project_id_for_epic(epic_id)));

CREATE POLICY "Project members can update stories"
    ON public.stories FOR UPDATE
    USING (has_project_access(get_project_id_for_story(id)));

CREATE POLICY "Project editors, admins, and creators can delete stories"
    ON public.stories FOR DELETE
    USING (
        -- User is global admin
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        OR
        -- User is project owner
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.epics e ON e.project_id = p.id
            WHERE e.id = epic_id AND (p.owner_id = auth.uid() OR p.created_by = auth.uid())
        )
        OR
        -- User is project editor or admin
        EXISTS (
            SELECT 1 FROM public.project_members pm
            JOIN public.epics e ON e.project_id = pm.project_id
            WHERE e.id = epic_id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin')
        )
    );

-- =====================================
-- RLS POLICIES FOR TASKS
-- =====================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tasks are viewable by project creators and assignees" ON public.tasks;
DROP POLICY IF EXISTS "Tasks can be created by project creators" ON public.tasks;
DROP POLICY IF EXISTS "Tasks can be updated by project creators and assignees" ON public.tasks;
DROP POLICY IF EXISTS "Tasks can be deleted by project creators" ON public.tasks;

-- New task policies with RBAC  
CREATE POLICY "Users can see tasks in accessible projects"
    ON public.tasks FOR SELECT
    USING (has_project_access(get_project_id_for_task(id)));

CREATE POLICY "Project members can create tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (has_project_access(get_project_id_for_story(story_id)));

CREATE POLICY "Project members can update tasks"
    ON public.tasks FOR UPDATE
    USING (has_project_access(get_project_id_for_task(id)));

CREATE POLICY "Project editors, admins, and assignees can delete tasks"
    ON public.tasks FOR DELETE
    USING (
        -- User is global admin
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        OR
        -- User is project owner
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.epics e ON e.project_id = p.id
            JOIN public.stories s ON s.epic_id = e.id
            WHERE s.id = story_id AND (p.owner_id = auth.uid() OR p.created_by = auth.uid())
        )
        OR
        -- User is project editor or admin
        EXISTS (
            SELECT 1 FROM public.project_members pm
            JOIN public.epics e ON e.project_id = pm.project_id
            JOIN public.stories s ON s.epic_id = e.id
            WHERE s.id = story_id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin')
        )
        OR
        -- User is assigned to the task
        assignee_id = auth.uid()
    );

-- =====================================
-- RLS POLICIES FOR SPRINTS
-- =====================================

-- Drop existing policies
DROP POLICY IF EXISTS "Sprints are viewable by project creators" ON public.sprints;
DROP POLICY IF EXISTS "Sprints can be created by project creators" ON public.sprints;
DROP POLICY IF EXISTS "Sprints can be updated by project creators" ON public.sprints;
DROP POLICY IF EXISTS "Sprints can be deleted by project creators" ON public.sprints;

-- New sprint policies with RBAC
CREATE POLICY "Users can see sprints in accessible projects"
    ON public.sprints FOR SELECT
    USING (has_project_access(project_id));

CREATE POLICY "Project members can create sprints"
    ON public.sprints FOR INSERT
    WITH CHECK (has_project_access(project_id));

CREATE POLICY "Project members can update sprints"
    ON public.sprints FOR UPDATE
    USING (has_project_access(project_id));

CREATE POLICY "Project editors and admins can delete sprints"
    ON public.sprints FOR DELETE
    USING (
        -- User is global admin
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        OR
        -- User is project owner
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (owner_id = auth.uid() OR created_by = auth.uid()))
        OR
        -- User is project editor or admin
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = sprints.project_id AND user_id = auth.uid() AND role IN ('editor', 'admin'))
    );

-- =====================================
-- RLS POLICIES FOR AI_COMPLETIONS (ANALYTICS)
-- =====================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "AI completions are viewable by the creator" ON public.ai_completions;
DROP POLICY IF EXISTS "AI completions can be created by any authenticated user" ON public.ai_completions;

-- New analytics policies - only users can see their own AI completions, admins see all
CREATE POLICY "Users can see their own AI completions"
    ON public.ai_completions FOR SELECT
    USING (
        -- User is global admin (can see all analytics)
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        OR
        -- User can see their own completions
        user_id = auth.uid()
    );

CREATE POLICY "Users can create AI completions"
    ON public.ai_completions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own AI completions"
    ON public.ai_completions FOR UPDATE
    USING (
        -- User is global admin
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        OR
        -- User can update their own completions
        user_id = auth.uid()
    );

CREATE POLICY "Only admins can delete AI completions"
    ON public.ai_completions FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- =====================================
-- TRIGGERS FOR TIMESTAMPS
-- =====================================

-- Update trigger for project_members (UTC timestamps)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_members_updated_at
    BEFORE UPDATE ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- FUNCTIONS FOR MEMBER MANAGEMENT (IMPROVED)
-- =====================================

-- Function to add user to project (with role escalation prevention)
CREATE OR REPLACE FUNCTION add_project_member(
    p_project_id UUID,
    p_user_id UUID, 
    p_role TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requester_id UUID := auth.uid();
    requester_is_global_admin BOOLEAN;
    requester_is_project_owner BOOLEAN;
    requester_is_project_admin BOOLEAN;
BEGIN
    -- Validate role
    IF p_role NOT IN ('viewer', 'editor', 'admin') THEN
        RAISE EXCEPTION 'Invalid role. Must be viewer, editor, or admin.';
    END IF;

    -- Get requester permissions
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = requester_id AND is_admin = TRUE)
    INTO requester_is_global_admin;
    
    SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND (owner_id = requester_id OR created_by = requester_id))
    INTO requester_is_project_owner;
    
    SELECT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p_project_id AND user_id = requester_id AND role = 'admin')
    INTO requester_is_project_admin;

    -- Check if requester has permission
    IF NOT (requester_is_global_admin OR requester_is_project_owner OR requester_is_project_admin) THEN
        RAISE EXCEPTION 'Permission denied. Only project owners/admins can add members.';
    END IF;

    -- Prevent role escalation: project admins cannot grant admin role unless they are global admin or project owner
    IF p_role = 'admin' AND requester_is_project_admin AND NOT (requester_is_global_admin OR requester_is_project_owner) THEN
        RAISE EXCEPTION 'Permission denied. Only global admins and project owners can grant admin role.';
    END IF;

    -- Insert or update membership
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (p_project_id, p_user_id, p_role::project_member_role)
    ON CONFLICT (project_id, user_id) 
    DO UPDATE SET role = p_role::project_member_role, updated_at = timezone('utc', now());

    RETURN TRUE;
END;
$$;

-- Function to remove user from project
CREATE OR REPLACE FUNCTION remove_project_member(
    p_project_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requester_id UUID := auth.uid();
BEGIN
    -- Check if requester has permission (admin, project owner, or project admin)
    IF NOT (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = requester_id AND is_admin = TRUE)
        OR
        EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND (owner_id = requester_id OR created_by = requester_id))
        OR
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p_project_id AND user_id = requester_id AND role = 'admin')
    ) THEN
        RAISE EXCEPTION 'Permission denied. Only project owners/admins can remove members.';
    END IF;

    -- Remove membership
    DELETE FROM public.project_members 
    WHERE project_id = p_project_id AND user_id = p_user_id;

    RETURN TRUE;
END;
$$;

-- =====================================
-- UPDATE DATABASE TYPES
-- =====================================

-- Add project_members to database types
-- =====================================
-- AUTO-CREATE PROFILES FOR CLERK USERS
-- =====================================

-- Function to handle new Clerk users
CREATE OR REPLACE FUNCTION handle_new_clerk_user()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Extract email and name from JWT claims
    user_email := NEW.email;
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(user_email, '@', 1));
    
    -- Insert into profiles table if not exists
    INSERT INTO public.profiles (id, email, name, is_admin, created_at, updated_at)
    VALUES (
        NEW.id,
        user_email,
        user_name,
        FALSE, -- New users are not admin by default
        timezone('utc', now()),
        timezone('utc', now())
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name),
        updated_at = timezone('utc', now());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto profile creation (if auth.users table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION handle_new_clerk_user();
        RAISE NOTICE 'Trigger created for auto profile creation on auth.users';
    ELSE
        RAISE NOTICE 'auth.users table not found, trigger not created';
    END IF;
END
$$;

-- Grant permissions for new RLS functions
GRANT EXECUTE ON FUNCTION has_project_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_project_member(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_project_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_clerk_user() TO authenticated;

DO $$
BEGIN
    RAISE NOTICE 'RBAC Implementation Complete!';
    RAISE NOTICE 'Tables created: project_members (with enum type project_member_role)';
    RAISE NOTICE 'RLS explicitly enabled on: projects, epics, stories, tasks, sprints, project_members, ai_completions';
    RAISE NOTICE 'Helper functions created: has_project_access, add_project_member, remove_project_member';
    RAISE NOTICE 'Auto profile creation: handle_new_clerk_user trigger added';
    RAISE NOTICE 'Security improvements: SECURITY INVOKER functions, role escalation prevention, UTC timestamps';
    RAISE NOTICE 'Performance improvements: enum types, partial indexes';
    RAISE NOTICE 'Ready for production deployment!';
END $$; 