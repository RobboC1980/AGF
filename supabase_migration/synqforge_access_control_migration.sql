-- SynqForge Access Control Migration
-- Implements the comprehensive access control model with team and project roles

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================
-- ENUMS FOR ACCESS CONTROL
-- =====================================

-- Team roles enum
CREATE TYPE team_role AS ENUM (
    'team_member',
    'team_admin'
);

-- Project roles enum  
CREATE TYPE project_role AS ENUM (
    'project_viewer',
    'project_contributor', 
    'project_admin'
);

-- Access scope enum
CREATE TYPE access_scope AS ENUM (
    'team',
    'project',
    'organization'
);

-- =====================================
-- UPDATE EXISTING TABLES
-- =====================================

-- Add team_id to projects table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'team_id') THEN
        ALTER TABLE public.projects ADD COLUMN team_id UUID REFERENCES public.teams(id);
        CREATE INDEX IF NOT EXISTS idx_projects_team_id ON public.projects(team_id);
    END IF;
END $$;

-- Create teams table if not exists
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_default BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- =====================================
-- NEW ACCESS CONTROL TABLES
-- =====================================

-- Enhanced team members table with new role system
DROP TABLE IF EXISTS public.team_members CASCADE;
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role team_role NOT NULL DEFAULT 'team_member',
    
    -- Status and metadata
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT NOW(),
    invited_by UUID REFERENCES public.profiles(id),
    invited_at TIMESTAMP DEFAULT NOW(),
    
    -- Audit trail
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_team_member UNIQUE (team_id, user_id)
);

-- Indexes for team_members
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_role ON public.team_members(role);
CREATE INDEX idx_team_members_active ON public.team_members(is_active);

-- Project members table for explicit project roles
CREATE TABLE public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role project_role NOT NULL DEFAULT 'project_viewer',
    
    -- Status and metadata
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    granted_at TIMESTAMP DEFAULT NOW(),
    granted_by UUID REFERENCES public.profiles(id),
    
    -- Audit trail
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

-- Indexes for project_members
CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX idx_project_members_role ON public.project_members(role);
CREATE INDEX idx_project_members_active ON public.project_members(is_active);

-- Role audit log table
CREATE TABLE public.role_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    target_user_id UUID NOT NULL REFERENCES public.profiles(id),
    action VARCHAR(50) NOT NULL, -- granted, revoked, promoted, demoted
    scope access_scope NOT NULL,
    scope_id UUID NOT NULL, -- team_id or project_id
    role VARCHAR(50),
    previous_role VARCHAR(50),
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for role_audit_log
CREATE INDEX idx_role_audit_user_id ON public.role_audit_log(user_id);
CREATE INDEX idx_role_audit_target_user_id ON public.role_audit_log(target_user_id);
CREATE INDEX idx_role_audit_scope ON public.role_audit_log(scope, scope_id);
CREATE INDEX idx_role_audit_created_at ON public.role_audit_log(created_at);

-- =====================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================

-- Teams RLS policies
CREATE POLICY "Teams are viewable by members"
    ON public.teams
    FOR SELECT USING (
        id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

CREATE POLICY "Team admins can update teams"
    ON public.teams
    FOR UPDATE USING (
        id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND role = 'team_admin' AND is_active = TRUE
        )
    );

CREATE POLICY "Team admins can delete teams"
    ON public.teams
    FOR DELETE USING (
        id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND role = 'team_admin' AND is_active = TRUE
        )
    );

CREATE POLICY "Authenticated users can create teams"
    ON public.teams
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Team members RLS policies
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members are viewable by team members"
    ON public.team_members
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

CREATE POLICY "Team admins can manage team members"
    ON public.team_members
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND role = 'team_admin' AND is_active = TRUE
        )
    );

-- Project members RLS policies
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members are viewable by project members and team members"
    ON public.project_members
    FOR SELECT USING (
        -- Direct project access
        project_id IN (
            SELECT project_id FROM public.project_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
        OR
        -- Team-based access
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.team_members tm ON p.team_id = tm.team_id
            WHERE tm.user_id = auth.uid() AND tm.is_active = TRUE
        )
    );

CREATE POLICY "Project admins and team admins can manage project members"
    ON public.project_members
    FOR ALL USING (
        -- Project admin access
        project_id IN (
            SELECT project_id FROM public.project_members 
            WHERE user_id = auth.uid() AND role = 'project_admin' AND is_active = TRUE
        )
        OR
        -- Team admin access
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.team_members tm ON p.team_id = tm.team_id
            WHERE tm.user_id = auth.uid() AND tm.role = 'team_admin' AND tm.is_active = TRUE
        )
    );

-- Role audit log RLS policies
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view role audit logs for their actions"
    ON public.role_audit_log
    FOR SELECT USING (
        user_id = auth.uid() OR target_user_id = auth.uid()
    );

CREATE POLICY "Authenticated users can create audit logs"
    ON public.role_audit_log
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================
-- UPDATED PROJECT RLS POLICIES
-- =====================================

-- Drop existing project policies
DROP POLICY IF EXISTS "Projects are viewable by their creator" ON public.projects;
DROP POLICY IF EXISTS "Projects can be created by any user" ON public.projects;
DROP POLICY IF EXISTS "Projects can be updated by their creator" ON public.projects;
DROP POLICY IF EXISTS "Projects can be deleted by their creator" ON public.projects;

-- New project policies based on SynqForge access control
CREATE POLICY "Projects are viewable by members and team members"
    ON public.projects
    FOR SELECT USING (
        -- Direct project access
        id IN (
            SELECT project_id FROM public.project_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
        OR
        -- Team-based access
        team_id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
        OR
        -- Creator access
        created_by = auth.uid()
    );

CREATE POLICY "Project admins and team admins can update projects"
    ON public.projects
    FOR UPDATE USING (
        -- Project admin access
        id IN (
            SELECT project_id FROM public.project_members 
            WHERE user_id = auth.uid() AND role = 'project_admin' AND is_active = TRUE
        )
        OR
        -- Team admin access
        team_id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND role = 'team_admin' AND is_active = TRUE
        )
        OR
        -- Creator access
        created_by = auth.uid()
    );

CREATE POLICY "Team admins can create projects"
    ON public.projects
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND role = 'team_admin' AND is_active = TRUE
        )
        OR
        auth.uid() = created_by
    );

CREATE POLICY "Project admins and team admins can delete projects"
    ON public.projects
    FOR DELETE USING (
        -- Project admin access
        id IN (
            SELECT project_id FROM public.project_members 
            WHERE user_id = auth.uid() AND role = 'project_admin' AND is_active = TRUE
        )
        OR
        -- Team admin access
        team_id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND role = 'team_admin' AND is_active = TRUE
        )
        OR
        -- Creator access
        created_by = auth.uid()
    );

-- =====================================
-- HELPER FUNCTIONS
-- =====================================

-- Function to get user's effective role on a project
CREATE OR REPLACE FUNCTION get_user_project_role(user_uuid UUID, project_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    explicit_role project_role;
    team_role_val team_role;
    project_team_id UUID;
BEGIN
    -- Check for explicit project role first
    SELECT role INTO explicit_role
    FROM public.project_members
    WHERE user_id = user_uuid AND project_id = project_uuid AND is_active = TRUE;
    
    IF explicit_role IS NOT NULL THEN
        RETURN explicit_role::TEXT;
    END IF;
    
    -- Check team inheritance
    SELECT team_id INTO project_team_id
    FROM public.projects
    WHERE id = project_uuid;
    
    IF project_team_id IS NOT NULL THEN
        SELECT role INTO team_role_val
        FROM public.team_members
        WHERE user_id = user_uuid AND team_id = project_team_id AND is_active = TRUE;
        
        -- Map team roles to project roles
        IF team_role_val = 'team_admin' THEN
            RETURN 'project_admin';
        ELSIF team_role_val = 'team_member' THEN
            RETURN 'project_viewer';
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can perform action on project
CREATE OR REPLACE FUNCTION can_user_access_project(user_uuid UUID, project_uuid UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    role_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    user_role := get_user_project_role(user_uuid, project_uuid);
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Role hierarchy: viewer=1, contributor=2, admin=3
    CASE user_role
        WHEN 'project_viewer' THEN role_hierarchy := 1;
        WHEN 'project_contributor' THEN role_hierarchy := 2;
        WHEN 'project_admin' THEN role_hierarchy := 3;
        ELSE role_hierarchy := 0;
    END CASE;
    
    CASE required_role
        WHEN 'project_viewer' THEN required_hierarchy := 1;
        WHEN 'project_contributor' THEN required_hierarchy := 2;
        WHEN 'project_admin' THEN required_hierarchy := 3;
        ELSE required_hierarchy := 999;
    END CASE;
    
    RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================
-- TRIGGERS FOR AUDIT LOGGING
-- =====================================

-- Function to log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.role_audit_log (
            user_id, target_user_id, action, scope, scope_id, role, created_at
        ) VALUES (
            COALESCE(NEW.granted_by, NEW.invited_by, auth.uid()),
            NEW.user_id,
            'granted',
            CASE TG_TABLE_NAME 
                WHEN 'team_members' THEN 'team'::access_scope
                WHEN 'project_members' THEN 'project'::access_scope
            END,
            CASE TG_TABLE_NAME
                WHEN 'team_members' THEN NEW.team_id
                WHEN 'project_members' THEN NEW.project_id
            END,
            CASE TG_TABLE_NAME
                WHEN 'team_members' THEN NEW.role::TEXT
                WHEN 'project_members' THEN NEW.role::TEXT
            END,
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log role changes
        IF OLD.role != NEW.role OR OLD.is_active != NEW.is_active THEN
            INSERT INTO public.role_audit_log (
                user_id, target_user_id, action, scope, scope_id, role, previous_role, created_at
            ) VALUES (
                auth.uid(),
                NEW.user_id,
                CASE 
                    WHEN NOT NEW.is_active THEN 'revoked'
                    WHEN OLD.role != NEW.role THEN 'updated'
                    ELSE 'updated'
                END,
                CASE TG_TABLE_NAME 
                    WHEN 'team_members' THEN 'team'::access_scope
                    WHEN 'project_members' THEN 'project'::access_scope
                END,
                CASE TG_TABLE_NAME
                    WHEN 'team_members' THEN NEW.team_id
                    WHEN 'project_members' THEN NEW.project_id
                END,
                CASE TG_TABLE_NAME
                    WHEN 'team_members' THEN NEW.role::TEXT
                    WHEN 'project_members' THEN NEW.role::TEXT
                END,
                CASE TG_TABLE_NAME
                    WHEN 'team_members' THEN OLD.role::TEXT
                    WHEN 'project_members' THEN OLD.role::TEXT
                END,
                NOW()
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging
CREATE TRIGGER team_members_audit_trigger
    AFTER INSERT OR UPDATE ON public.team_members
    FOR EACH ROW EXECUTE FUNCTION log_role_change();

CREATE TRIGGER project_members_audit_trigger
    AFTER INSERT OR UPDATE ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION log_role_change();

-- =====================================
-- UPDATE TRIGGERS FOR TIMESTAMPS
-- =====================================

CREATE TRIGGER update_teams_modtime
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_team_members_modtime
    BEFORE UPDATE ON public.team_members
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_project_members_modtime
    BEFORE UPDATE ON public.project_members
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =====================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================

-- This section can be uncommented for testing purposes
/*
-- Create a sample team
INSERT INTO public.teams (id, name, description, created_by) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'Development Team',
    'Main development team for SynqForge',
    (SELECT id FROM public.profiles LIMIT 1)
);

-- Add team admin
INSERT INTO public.team_members (team_id, user_id, role, invited_by)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM public.profiles LIMIT 1),
    'team_admin',
    (SELECT id FROM public.profiles LIMIT 1)
);
*/ 