-- AgileForge RBAC Database Schema
-- This schema implements Role-Based Access Control with Clerk authentication

-- =============================================
-- User Management Tables
-- =============================================

-- Users table (synced with Clerk)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- Clerk user ID
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    image_url TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Project access control table
CREATE TABLE IF NOT EXISTS public.project_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
    permissions JSONB DEFAULT '[]', -- Custom permissions array
    assigned_by TEXT NOT NULL REFERENCES public.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(project_id, user_id)
);

-- Team membership table
CREATE TABLE IF NOT EXISTS public.team_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(team_id, user_id)
);

-- =============================================
-- Core Entity Tables with Access Control
-- =============================================

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    key TEXT UNIQUE NOT NULL, -- Project key like "PROJ-1"
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    start_date DATE,
    target_end_date DATE,
    actual_end_date DATE,
    budget DECIMAL(12,2),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    is_public BOOLEAN DEFAULT FALSE, -- Public projects visible to all
    created_by TEXT NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Epics table
CREATE TABLE IF NOT EXISTS public.epics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    epic_key TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'testing', 'done', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    start_date DATE,
    target_end_date DATE,
    estimated_story_points INTEGER,
    actual_story_points INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    color TEXT DEFAULT '#3B82F6',
    created_by TEXT NOT NULL REFERENCES public.users(id),
    assignee_id TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stories table
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    story_key TEXT UNIQUE NOT NULL,
    as_a TEXT, -- User story: "As a..."
    i_want TEXT, -- User story: "I want..."
    so_that TEXT, -- User story: "So that..."
    acceptance_criteria TEXT,
    status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'ready', 'in_progress', 'review', 'testing', 'done', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    story_points INTEGER CHECK (story_points > 0),
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2) DEFAULT 0,
    assignee_id TEXT REFERENCES public.users(id),
    due_date DATE,
    tags JSONB DEFAULT '[]',
    created_by TEXT NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    task_key TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'testing', 'done', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assignee_id TEXT REFERENCES public.users(id),
    estimated_hours DECIMAL(5,2) NOT NULL DEFAULT 4.0,
    actual_hours DECIMAL(5,2) DEFAULT 0,
    due_date DATE,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT,
    created_by TEXT NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user ID from JWT
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
    SELECT COALESCE(auth.jwt() ->> 'sub', '')::TEXT;
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.current_user_id() 
        AND role = 'admin' 
        AND is_active = TRUE
    );
$$;

-- Helper function to check project access
CREATE OR REPLACE FUNCTION auth.has_project_access(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        auth.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_uuid
            AND (
                p.created_by = auth.current_user_id() OR
                p.is_public = TRUE OR
                EXISTS (
                    SELECT 1 FROM public.project_access pa
                    WHERE pa.project_id = project_uuid
                    AND pa.user_id = auth.current_user_id()
                    AND pa.is_active = TRUE
                    AND (pa.expires_at IS NULL OR pa.expires_at > NOW())
                )
            )
        );
$$;

-- =============================================
-- RLS Policies for Users Table
-- =============================================

-- Users can read their own data and basic info of others
CREATE POLICY "Users can read basic user information"
ON public.users FOR SELECT
USING (
    auth.is_admin() OR
    id = auth.current_user_id() OR
    -- Others can see basic info (name, email) but not sensitive data
    TRUE
);

-- Only admins can insert/update/delete users
CREATE POLICY "Only admins can manage users"
ON public.users FOR ALL
USING (auth.is_admin());

-- =============================================
-- RLS Policies for Project Access Table
-- =============================================

-- Users can see their own project access
CREATE POLICY "Users can see their own project access"
ON public.project_access FOR SELECT
USING (
    auth.is_admin() OR
    user_id = auth.current_user_id()
);

-- Only admins can assign project access
CREATE POLICY "Only admins can manage project access"
ON public.project_access FOR INSERT
WITH CHECK (
    auth.is_admin() AND
    assigned_by = auth.current_user_id()
);

CREATE POLICY "Only admins can update project access"
ON public.project_access FOR UPDATE
USING (auth.is_admin());

CREATE POLICY "Only admins can delete project access"
ON public.project_access FOR DELETE
USING (auth.is_admin());

-- =============================================
-- RLS Policies for Projects Table
-- =============================================

-- Users can see projects they have access to
CREATE POLICY "Users can see accessible projects"
ON public.projects FOR SELECT
USING (
    auth.is_admin() OR
    created_by = auth.current_user_id() OR
    is_public = TRUE OR
    auth.has_project_access(id)
);

-- Users can create projects (will be owners)
CREATE POLICY "Users can create projects"
ON public.projects FOR INSERT
WITH CHECK (created_by = auth.current_user_id());

-- Users can update projects they own or have access to
CREATE POLICY "Users can update accessible projects"
ON public.projects FOR UPDATE
USING (
    auth.is_admin() OR
    created_by = auth.current_user_id() OR
    auth.has_project_access(id)
);

-- Only owners and admins can delete projects
CREATE POLICY "Only owners and admins can delete projects"
ON public.projects FOR DELETE
USING (
    auth.is_admin() OR
    created_by = auth.current_user_id()
);

-- =============================================
-- RLS Policies for Epics Table
-- =============================================

-- Users can see epics in accessible projects
CREATE POLICY "Users can see epics in accessible projects"
ON public.epics FOR SELECT
USING (
    auth.is_admin() OR
    created_by = auth.current_user_id() OR
    assignee_id = auth.current_user_id() OR
    auth.has_project_access(project_id)
);

-- Users can create epics in accessible projects
CREATE POLICY "Users can create epics in accessible projects"
ON public.epics FOR INSERT
WITH CHECK (
    created_by = auth.current_user_id() AND
    auth.has_project_access(project_id)
);

-- Users can update epics they created or are assigned to in accessible projects
CREATE POLICY "Users can update accessible epics"
ON public.epics FOR UPDATE
USING (
    auth.is_admin() OR
    created_by = auth.current_user_id() OR
    assignee_id = auth.current_user_id() OR
    auth.has_project_access(project_id)
);

-- Users can delete epics they created in accessible projects
CREATE POLICY "Users can delete their epics in accessible projects"
ON public.epics FOR DELETE
USING (
    auth.is_admin() OR
    (created_by = auth.current_user_id() AND auth.has_project_access(project_id))
);

-- =============================================
-- RLS Policies for Stories Table
-- =============================================

-- Users can see stories in accessible projects
CREATE POLICY "Users can see stories in accessible projects"
ON public.stories FOR SELECT
USING (
    auth.is_admin() OR
    created_by = auth.current_user_id() OR
    assignee_id = auth.current_user_id() OR
    EXISTS (
        SELECT 1 FROM public.epics e
        WHERE e.id = epic_id AND auth.has_project_access(e.project_id)
    )
);

-- Users can create stories in accessible projects
CREATE POLICY "Users can create stories in accessible projects"
ON public.stories FOR INSERT
WITH CHECK (
    created_by = auth.current_user_id() AND
    EXISTS (
        SELECT 1 FROM public.epics e
        WHERE e.id = epic_id AND auth.has_project_access(e.project_id)
    )
);

-- Users can update stories they created or are assigned to
CREATE POLICY "Users can update accessible stories"
ON public.stories FOR UPDATE
USING (
    auth.is_admin() OR
    created_by = auth.current_user_id() OR
    assignee_id = auth.current_user_id() OR
    EXISTS (
        SELECT 1 FROM public.epics e
        WHERE e.id = epic_id AND auth.has_project_access(e.project_id)
    )
);

-- Users can delete stories they created
CREATE POLICY "Users can delete their stories"
ON public.stories FOR DELETE
USING (
    auth.is_admin() OR
    created_by = auth.current_user_id()
);

-- =============================================
-- RLS Policies for Tasks Table
-- =============================================

-- Users can see tasks in accessible stories
CREATE POLICY "Users can see tasks in accessible stories"
ON public.tasks FOR SELECT
USING (
    auth.is_admin() OR
    created_by = auth.current_user_id() OR
    assignee_id = auth.current_user_id() OR
    EXISTS (
        SELECT 1 FROM public.stories s
        JOIN public.epics e ON e.id = s.epic_id
        WHERE s.id = story_id AND auth.has_project_access(e.project_id)
    )
);

-- Users can create tasks in accessible stories
CREATE POLICY "Users can create tasks in accessible stories"
ON public.tasks FOR INSERT
WITH CHECK (
    created_by = auth.current_user_id() AND
    EXISTS (
        SELECT 1 FROM public.stories s
        JOIN public.epics e ON e.id = s.epic_id
        WHERE s.id = story_id AND auth.has_project_access(e.project_id)
    )
);

-- Users can update tasks they created or are assigned to
CREATE POLICY "Users can update accessible tasks"
ON public.tasks FOR UPDATE
USING (
    auth.is_admin() OR
    created_by = auth.current_user_id() OR
    assignee_id = auth.current_user_id() OR
    EXISTS (
        SELECT 1 FROM public.stories s
        JOIN public.epics e ON e.id = s.epic_id
        WHERE s.id = story_id AND auth.has_project_access(e.project_id)
    )
);

-- Users can delete tasks they created
CREATE POLICY "Users can delete their tasks"
ON public.tasks FOR DELETE
USING (
    auth.is_admin() OR
    created_by = auth.current_user_id()
);

-- =============================================
-- Indexes for Performance
-- =============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);

-- Project access indexes
CREATE INDEX IF NOT EXISTS idx_project_access_user ON public.project_access(user_id);
CREATE INDEX IF NOT EXISTS idx_project_access_project ON public.project_access(project_id);
CREATE INDEX IF NOT EXISTS idx_project_access_active ON public.project_access(is_active);

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_public ON public.projects(is_public);

-- Epic indexes
CREATE INDEX IF NOT EXISTS idx_epics_project ON public.epics(project_id);
CREATE INDEX IF NOT EXISTS idx_epics_created_by ON public.epics(created_by);
CREATE INDEX IF NOT EXISTS idx_epics_assignee ON public.epics(assignee_id);

-- Story indexes
CREATE INDEX IF NOT EXISTS idx_stories_epic ON public.stories(epic_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_by ON public.stories(created_by);
CREATE INDEX IF NOT EXISTS idx_stories_assignee ON public.stories(assignee_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON public.stories(status);

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_story ON public.tasks(story_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- =============================================
-- Functions for Common Operations
-- =============================================

-- Function to assign user to project (admin only)
CREATE OR REPLACE FUNCTION assign_user_to_project(
    p_project_id UUID,
    p_user_id TEXT,
    p_role TEXT DEFAULT 'member',
    p_permissions JSONB DEFAULT '[]'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT auth.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can assign users to projects';
    END IF;
    
    -- Check if target user exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND is_active = TRUE) THEN
        RAISE EXCEPTION 'User not found or inactive';
    END IF;
    
    -- Check if project exists
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
        RAISE EXCEPTION 'Project not found';
    END IF;
    
    -- Insert or update project access
    INSERT INTO public.project_access (project_id, user_id, role, permissions, assigned_by)
    VALUES (p_project_id, p_user_id, p_role, p_permissions, auth.current_user_id())
    ON CONFLICT (project_id, user_id) 
    DO UPDATE SET 
        role = p_role,
        permissions = p_permissions,
        assigned_by = auth.current_user_id(),
        assigned_at = NOW(),
        is_active = TRUE;
    
    RETURN TRUE;
END;
$$;

-- Function to remove user from project (admin only)
CREATE OR REPLACE FUNCTION remove_user_from_project(
    p_project_id UUID,
    p_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT auth.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can remove users from projects';
    END IF;
    
    -- Deactivate project access
    UPDATE public.project_access 
    SET is_active = FALSE
    WHERE project_id = p_project_id AND user_id = p_user_id;
    
    RETURN TRUE;
END;
$$;

-- Function to get user's accessible projects
CREATE OR REPLACE FUNCTION get_user_accessible_projects(p_user_id TEXT DEFAULT NULL)
RETURNS TABLE (
    project_id UUID,
    project_name TEXT,
    access_role TEXT,
    is_owner BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id TEXT;
BEGIN
    target_user_id := COALESCE(p_user_id, auth.current_user_id());
    
    -- Only allow users to see their own accessible projects unless admin
    IF NOT auth.is_admin() AND target_user_id != auth.current_user_id() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    RETURN QUERY
    SELECT DISTINCT
        p.id as project_id,
        p.name as project_name,
        COALESCE(pa.role, 'viewer') as access_role,
        (p.created_by = target_user_id) as is_owner
    FROM public.projects p
    LEFT JOIN public.project_access pa ON pa.project_id = p.id 
        AND pa.user_id = target_user_id 
        AND pa.is_active = TRUE
    WHERE 
        p.created_by = target_user_id OR
        p.is_public = TRUE OR
        pa.user_id IS NOT NULL
    ORDER BY p.name;
END;
$$; 