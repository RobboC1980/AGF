-- AgileForge Enhanced Authentication System Database Schema Update
-- This script adds the necessary tables and columns for the enhanced RBAC system

-- Update users table to support enhanced authentication
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['developer'],
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT ARRAY[],
ADD COLUMN IF NOT EXISTS hashed_password TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS team_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create notifications table for real-time notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Create job_executions table for cron job logging
CREATE TABLE IF NOT EXISTS job_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    execution_time TIMESTAMP WITH TIME ZONE NOT NULL,
    success BOOLEAN NOT NULL,
    duration_seconds NUMERIC(10,3),
    result JSONB,
    error TEXT,
    manual_trigger BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for job execution queries
CREATE INDEX IF NOT EXISTS idx_job_executions_job_name ON job_executions(job_name);
CREATE INDEX IF NOT EXISTS idx_job_executions_execution_time ON job_executions(execution_time);

-- Create sprint_analyses table for AI sprint analysis
CREATE TABLE IF NOT EXISTS sprint_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id UUID NOT NULL,
    sprint_name TEXT,
    total_stories INTEGER,
    completed_stories INTEGER,
    in_progress_stories INTEGER,
    completion_rate NUMERIC(5,2),
    ai_insights JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create story_suggestions table for AI story suggestions
CREATE TABLE IF NOT EXISTS story_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    suggested_name TEXT NOT NULL,
    suggested_description TEXT,
    suggested_acceptance_criteria TEXT,
    ai_confidence NUMERIC(3,2) DEFAULT 0.8,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create burndown_data table for sprint burndown charts
CREATE TABLE IF NOT EXISTS burndown_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id UUID NOT NULL,
    date DATE NOT NULL,
    remaining_points INTEGER DEFAULT 0,
    completed_points INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sprint_id, date)
);

-- Create productivity_analyses table for team productivity tracking
CREATE TABLE IF NOT EXISTS productivity_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_date DATE NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    productivity_data JSONB,
    ai_insights JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create epic_predictions table for AI epic completion predictions
CREATE TABLE IF NOT EXISTS epic_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    predicted_completion_date DATE,
    confidence_score NUMERIC(3,2),
    factors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workload_analyses table for team workload balancing
CREATE TABLE IF NOT EXISTS workload_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_date DATE NOT NULL,
    workload_data JSONB,
    suggestions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teams table for team management
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sprints table if it doesn't exist
CREATE TABLE IF NOT EXISTS sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'planning', -- planning, active, completed, cancelled
    goal TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add sprint_id to stories table if it doesn't exist
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES sprints(id),
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add created_by and timestamps to projects and epics if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE epics 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_epics_updated_at ON epics;
CREATE TRIGGER update_epics_updated_at 
    BEFORE UPDATE ON epics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stories_updated_at ON stories;
CREATE TRIGGER update_stories_updated_at 
    BEFORE UPDATE ON stories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sprints_updated_at ON sprints;
CREATE TRIGGER update_sprints_updated_at 
    BEFORE UPDATE ON sprints 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_story_suggestions_updated_at ON story_suggestions;
CREATE TRIGGER update_story_suggestions_updated_at 
    BEFORE UPDATE ON story_suggestions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies for enhanced security

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile and admins can view all
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id OR 'admin' = ANY(
        (SELECT roles FROM users WHERE id = auth.uid())
    ));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Only admins can insert/delete users
CREATE POLICY "Only admins can manage users" ON users
    FOR ALL USING ('admin' = ANY(
        (SELECT roles FROM users WHERE id = auth.uid())
    ));

-- Project access based on permissions
CREATE POLICY "Project access based on permissions" ON projects
    FOR SELECT USING (
        'view_project' = ANY(
            (SELECT permissions FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Project creation based on permissions" ON projects
    FOR INSERT WITH CHECK (
        'create_project' = ANY(
            (SELECT permissions FROM users WHERE id = auth.uid())
        )
    );

-- Epic access based on permissions
CREATE POLICY "Epic access based on permissions" ON epics
    FOR SELECT USING (
        'view_epic' = ANY(
            (SELECT permissions FROM users WHERE id = auth.uid())
        )
    );

-- Story access based on permissions
CREATE POLICY "Story access based on permissions" ON stories
    FOR SELECT USING (
        'view_story' = ANY(
            (SELECT permissions FROM users WHERE id = auth.uid())
        )
    );

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Create helper functions for the application

-- Function to get project team members
CREATE OR REPLACE FUNCTION get_project_team_members(project_id UUID)
RETURNS TABLE(id UUID, name TEXT, email TEXT, roles TEXT[]) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT u.id, u.name, u.email, u.roles
    FROM users u
    JOIN stories s ON u.id = s.assignee_id
    JOIN epics e ON s.epic_id = e.id
    WHERE e.project_id = get_project_team_members.project_id
    AND u.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get epics that need more stories
CREATE OR REPLACE FUNCTION get_epics_needing_stories()
RETURNS TABLE(id UUID, name TEXT, description TEXT, project_id UUID, story_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.name, e.description, e.project_id, COUNT(s.id) as story_count
    FROM epics e
    LEFT JOIN stories s ON e.id = s.epic_id
    WHERE e.status = 'active'
    GROUP BY e.id, e.name, e.description, e.project_id
    HAVING COUNT(s.id) < 3; -- Epics with fewer than 3 stories
END;
$$ LANGUAGE plpgsql;

-- Insert default admin user if not exists
INSERT INTO users (id, email, name, roles, permissions, hashed_password, is_active, is_verified, created_at)
VALUES (
    gen_random_uuid(),
    'admin@agileforge.com',
    'System Administrator',
    ARRAY['admin'],
    ARRAY[
        'create_project', 'delete_project', 'edit_project', 'view_project',
        'create_epic', 'delete_epic', 'edit_epic', 'view_epic',
        'create_story', 'delete_story', 'edit_story', 'view_story', 'assign_story',
        'manage_team', 'invite_users', 'remove_users',
        'view_analytics', 'export_data',
        'use_ai_features', 'configure_ai',
        'manage_system', 'view_audit_logs'
    ],
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', -- password: admin123
    true,
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN(permissions);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_stories_assignee_id ON stories(assignee_id);
CREATE INDEX IF NOT EXISTS idx_stories_sprint_id ON stories(sprint_id);
CREATE INDEX IF NOT EXISTS idx_stories_epic_id ON stories(epic_id);
CREATE INDEX IF NOT EXISTS idx_epics_project_id ON epics(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE users IS 'Enhanced user table with RBAC support';
COMMENT ON TABLE notifications IS 'Real-time notifications for users';
COMMENT ON TABLE job_executions IS 'Log of cron job executions';
COMMENT ON TABLE sprint_analyses IS 'AI-generated sprint analysis reports';
COMMENT ON TABLE story_suggestions IS 'AI-generated story suggestions';
COMMENT ON TABLE burndown_data IS 'Sprint burndown chart data';
COMMENT ON TABLE productivity_analyses IS 'Team productivity analysis data';
COMMENT ON TABLE epic_predictions IS 'AI predictions for epic completion';
COMMENT ON TABLE workload_analyses IS 'Team workload balancing analysis';
COMMENT ON TABLE teams IS 'Team management';
COMMENT ON TABLE sprints IS 'Sprint management';

COMMENT ON COLUMN users.roles IS 'Array of user roles (admin, project_manager, team_lead, developer, viewer)';
COMMENT ON COLUMN users.permissions IS 'Array of specific permissions for fine-grained access control';
COMMENT ON COLUMN users.hashed_password IS 'Bcrypt hashed password for authentication';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN users.is_verified IS 'Whether the user email is verified';
COMMENT ON COLUMN users.team_id IS 'Reference to the team the user belongs to';

-- Enable pg_cron extension for scheduled jobs (requires superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Note: The following cron jobs would be set up by the application
-- They are commented out here as they require the application to be running

/*
-- Example cron job setup (would be done by the application)
SELECT cron.schedule(
    'ai_sprint_analysis',
    '0 9 * * 1', -- Every Monday at 9 AM
    $$
    SELECT net.http_post(
        url := 'http://localhost:8000/cron/execute/ai_sprint_analysis',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_API_KEY"}',
        body := '{"job_name": "ai_sprint_analysis"}'
    );
    $$
);
*/

-- Enhanced Database Schema Update for AgileForge
-- Adds support for Supabase Storage, Real-time features, and Advanced Analytics

-- FILES TABLE for Supabase Storage integration
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    bucket VARCHAR(100) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    public_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security for files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for files
CREATE POLICY "Users can view their own files and public files"
    ON public.files
    FOR SELECT USING (
        uploaded_by = auth.uid() OR 
        public_url IS NOT NULL
    );

CREATE POLICY "Users can upload files"
    ON public.files
    FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can update their own files"
    ON public.files
    FOR UPDATE USING (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own files"
    ON public.files
    FOR DELETE USING (uploaded_by = auth.uid());

-- COMMENTS TABLE for real-time collaboration
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    epic_id UUID REFERENCES public.epics(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    mentions JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security for comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "Comments are viewable by project members"
    ON public.comments
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM public.projects p 
            WHERE p.created_by = auth.uid()
        ) OR
        story_id IN (
            SELECT s.id FROM public.stories s
            JOIN public.epics e ON s.epic_id = e.id
            JOIN public.projects p ON e.project_id = p.id
            WHERE p.created_by = auth.uid() OR s.assignee_id = auth.uid()
        )
    );

CREATE POLICY "Users can create comments"
    ON public.comments
    FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update their own comments"
    ON public.comments
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
    ON public.comments
    FOR DELETE USING (author_id = auth.uid());

-- STORY_UPDATES TABLE for audit trail and real-time updates
CREATE TABLE IF NOT EXISTS public.story_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    field VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security for story_updates
ALTER TABLE public.story_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story_updates
CREATE POLICY "Story updates are viewable by project members"
    ON public.story_updates
    FOR SELECT USING (
        story_id IN (
            SELECT s.id FROM public.stories s
            JOIN public.epics e ON s.epic_id = e.id
            JOIN public.projects p ON e.project_id = p.id
            WHERE p.created_by = auth.uid() OR s.assignee_id = auth.uid()
        )
    );

CREATE POLICY "Users can create story updates"
    ON public.story_updates
    FOR INSERT WITH CHECK (updated_by = auth.uid());

-- PROJECT_ATTACHMENTS TABLE for linking files to projects
CREATE TABLE IF NOT EXISTS public.project_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
    description TEXT,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security for project_attachments
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_attachments
CREATE POLICY "Project attachments are viewable by project creators"
    ON public.project_attachments
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM public.projects p 
            WHERE p.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can add project attachments"
    ON public.project_attachments
    FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- STORY_ATTACHMENTS TABLE for linking files to stories
CREATE TABLE IF NOT EXISTS public.story_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
    description TEXT,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security for story_attachments
ALTER TABLE public.story_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story_attachments
CREATE POLICY "Story attachments are viewable by project members"
    ON public.story_attachments
    FOR SELECT USING (
        story_id IN (
            SELECT s.id FROM public.stories s
            JOIN public.epics e ON s.epic_id = e.id
            JOIN public.projects p ON e.project_id = p.id
            WHERE p.created_by = auth.uid() OR s.assignee_id = auth.uid()
        )
    );

CREATE POLICY "Users can add story attachments"
    ON public.story_attachments
    FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- ANALYTICS_CACHE TABLE for caching analytics data
CREATE TABLE IF NOT EXISTS public.analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    cache_key VARCHAR(255) NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security for analytics_cache
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_cache
CREATE POLICY "Analytics cache is viewable by project creators"
    ON public.analytics_cache
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM public.projects p 
            WHERE p.created_by = auth.uid()
        )
    );

-- PRESENCE TABLE for real-time user presence
CREATE TABLE IF NOT EXISTS public.presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    room_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'online',
    cursor_position JSONB,
    last_seen TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Enable Row Level Security for presence
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for presence
CREATE POLICY "Presence is viewable by all authenticated users"
    ON public.presence
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own presence"
    ON public.presence
    FOR ALL USING (user_id = auth.uid());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON public.files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_bucket ON public.files(bucket);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at);

CREATE INDEX IF NOT EXISTS idx_comments_story_id ON public.comments(story_id);
CREATE INDEX IF NOT EXISTS idx_comments_epic_id ON public.comments(epic_id);
CREATE INDEX IF NOT EXISTS idx_comments_project_id ON public.comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at);

CREATE INDEX IF NOT EXISTS idx_story_updates_story_id ON public.story_updates(story_id);
CREATE INDEX IF NOT EXISTS idx_story_updates_updated_by ON public.story_updates(updated_by);
CREATE INDEX IF NOT EXISTS idx_story_updates_updated_at ON public.story_updates(updated_at);

CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id ON public.project_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments_file_id ON public.project_attachments(file_id);

CREATE INDEX IF NOT EXISTS idx_story_attachments_story_id ON public.story_attachments(story_id);
CREATE INDEX IF NOT EXISTS idx_story_attachments_file_id ON public.story_attachments(file_id);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_project_id ON public.analytics_cache(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON public.analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires_at ON public.analytics_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_presence_user_id ON public.presence(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_room_id ON public.presence(room_id);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON public.presence(last_seen);

-- Add triggers for updated_at timestamps on new tables
CREATE TRIGGER update_files_modtime
BEFORE UPDATE ON public.files
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_comments_modtime
BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Add new columns to existing tables for enhanced features
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS attachments_count INTEGER DEFAULT 0;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS attachments_count INTEGER DEFAULT 0;
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS attachments_count INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_id UUID;

-- Functions for updating counters
CREATE OR REPLACE FUNCTION update_story_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update attachments count
        IF TG_TABLE_NAME = 'story_attachments' THEN
            UPDATE public.stories 
            SET attachments_count = attachments_count + 1 
            WHERE id = NEW.story_id;
        END IF;
        
        -- Update comments count
        IF TG_TABLE_NAME = 'comments' AND NEW.story_id IS NOT NULL THEN
            UPDATE public.stories 
            SET comments_count = comments_count + 1 
            WHERE id = NEW.story_id;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update attachments count
        IF TG_TABLE_NAME = 'story_attachments' THEN
            UPDATE public.stories 
            SET attachments_count = GREATEST(0, attachments_count - 1) 
            WHERE id = OLD.story_id;
        END IF;
        
        -- Update comments count
        IF TG_TABLE_NAME = 'comments' AND OLD.story_id IS NOT NULL THEN
            UPDATE public.stories 
            SET comments_count = GREATEST(0, comments_count - 1) 
            WHERE id = OLD.story_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for counter updates
CREATE TRIGGER story_attachments_counter
    AFTER INSERT OR DELETE ON public.story_attachments
    FOR EACH ROW EXECUTE FUNCTION update_story_counters();

CREATE TRIGGER story_comments_counter
    AFTER INSERT OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_story_counters();

-- Function to automatically set story timestamps
CREATE OR REPLACE FUNCTION update_story_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Set started_at when status changes to 'in_progress'
    IF OLD.status != 'in_progress' AND NEW.status = 'in_progress' AND NEW.started_at IS NULL THEN
        NEW.started_at = NOW();
    END IF;
    
    -- Set completed_at when status changes to 'done'
    IF OLD.status != 'done' AND NEW.status = 'done' AND NEW.completed_at IS NULL THEN
        NEW.completed_at = NOW();
    END IF;
    
    -- Clear completed_at if status changes from 'done' to something else
    IF OLD.status = 'done' AND NEW.status != 'done' THEN
        NEW.completed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for story timestamp updates
CREATE TRIGGER story_timestamps_trigger
    BEFORE UPDATE ON public.stories
    FOR EACH ROW EXECUTE FUNCTION update_story_timestamps();

-- Function to clean up expired analytics cache
CREATE OR REPLACE FUNCTION cleanup_expired_analytics_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM public.analytics_cache 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old presence records
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
    DELETE FROM public.presence 
    WHERE last_seen < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a view for project analytics summary
CREATE OR REPLACE VIEW public.project_analytics_summary AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status as project_status,
    COUNT(DISTINCT e.id) as total_epics,
    COUNT(DISTINCT s.id) as total_stories,
    COUNT(DISTINCT CASE WHEN s.status = 'done' THEN s.id END) as completed_stories,
    COALESCE(SUM(s.story_points), 0) as total_points,
    COALESCE(SUM(CASE WHEN s.status = 'done' THEN s.story_points ELSE 0 END), 0) as completed_points,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT s.id) > 0 
            THEN COUNT(DISTINCT CASE WHEN s.status = 'done' THEN s.id END) * 100.0 / COUNT(DISTINCT s.id)
            ELSE 0 
        END, 2
    ) as completion_percentage,
    COUNT(DISTINCT s.assignee_id) as team_members,
    p.created_at,
    p.updated_at
FROM public.projects p
LEFT JOIN public.epics e ON p.id = e.project_id
LEFT JOIN public.stories s ON e.id = s.epic_id
GROUP BY p.id, p.name, p.status, p.created_at, p.updated_at;

-- Grant permissions for the view
GRANT SELECT ON public.project_analytics_summary TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Project analytics summary is viewable by project creators"
    ON public.project_analytics_summary
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM public.projects p 
            WHERE p.created_by = auth.uid()
        )
    );

-- Enable RLS on the view
ALTER VIEW public.project_analytics_summary SET (security_invoker = true);

-- Insert sample data for testing (optional)
-- This can be removed in production

-- Sample file record
INSERT INTO public.files (id, original_name, file_path, bucket, content_type, file_size, uploaded_by, public_url)
VALUES (
    uuid_generate_v4(),
    'sample_document.pdf',
    'documents/sample_document.pdf',
    'project-documents',
    'application/pdf',
    1024000,
    (SELECT id FROM public.users LIMIT 1),
    NULL
) ON CONFLICT DO NOTHING;

-- Sample comment
INSERT INTO public.comments (id, content, author_id, project_id)
VALUES (
    uuid_generate_v4(),
    'This is a sample comment for testing real-time features.',
    (SELECT id FROM public.users LIMIT 1),
    (SELECT id FROM public.projects LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Enhanced Database Schema for AgileForge
-- Includes vector support, AI features, and notification system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector search function for stories
CREATE OR REPLACE FUNCTION search_similar_stories(
    query_embedding vector(1536),
    project_id uuid,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    story_id uuid,
    content text,
    similarity float,
    metadata jsonb
)
LANGUAGE sql
AS $$
    SELECT 
        se.story_id,
        se.content,
        1 - (se.embedding <=> query_embedding) as similarity,
        se.metadata
    FROM story_embeddings se
    JOIN stories s ON s.id = se.story_id
    JOIN epics e ON e.id = s.epic_id
    WHERE e.project_id = search_similar_stories.project_id
    AND 1 - (se.embedding <=> query_embedding) > match_threshold
    ORDER BY se.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Create function to execute SQL (for dynamic schema updates)
CREATE OR REPLACE FUNCTION execute_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql;
END;
$$;

-- Create function to enable vector extension
CREATE OR REPLACE FUNCTION create_vector_extension()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
END;
$$;

-- Story embeddings table for semantic search
CREATE TABLE IF NOT EXISTS story_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vector index for similarity search
CREATE INDEX IF NOT EXISTS story_embeddings_vector_idx 
ON story_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Project insights table for AI analysis
CREATE TABLE IF NOT EXISTS project_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence FLOAT NOT NULL,
    actionable_items JSONB,
    priority TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    channels JSONB NOT NULL DEFAULT '[]',
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    channels JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification campaigns
CREATE TABLE IF NOT EXISTS notification_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    target_criteria JSONB NOT NULL,
    template_id TEXT REFERENCES email_templates(template_id),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'draft',
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- AI model configurations
CREATE TABLE IF NOT EXISTS ai_model_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    model_type TEXT NOT NULL, -- 'embedding', 'chat', 'completion'
    provider TEXT NOT NULL, -- 'openai', 'anthropic', etc.
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI usage tracking
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_estimate DECIMAL(10,6),
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_project_insights_project_id ON project_insights(project_id);
CREATE INDEX IF NOT EXISTS idx_project_insights_type ON project_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_project_insights_active ON project_insights(is_active);
CREATE INDEX IF NOT EXISTS idx_story_embeddings_story_id ON story_embeddings(story_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at); 