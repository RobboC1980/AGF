-- Create missing tables and ensure schema consistency for AgileForge
-- Run this in Supabase SQL Editor

-- First, let's create the users table if it doesn't exist (for backward compatibility)
-- Most endpoints expect 'users' table, not 'profiles'
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Enhanced auth columns
    roles TEXT[] DEFAULT ARRAY['developer'],
    permissions TEXT[] DEFAULT ARRAY['view_project','view_epic','create_story','edit_story','view_story','use_ai_features'],
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    team_id UUID
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can view all profiles"
    ON public.users
    FOR SELECT USING (true);
    
CREATE POLICY "Users can update their own profile"
    ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    key VARCHAR(10) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    priority VARCHAR(20) DEFAULT 'medium',
    start_date DATE,
    target_end_date DATE,
    progress INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(key)
);

-- Enable Row Level Security for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
DROP POLICY IF EXISTS "Projects are viewable by anyone" ON public.projects;
DROP POLICY IF EXISTS "Projects can be created by authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Projects can be updated by creator" ON public.projects;
DROP POLICY IF EXISTS "Projects can be deleted by creator" ON public.projects;

CREATE POLICY "Projects are viewable by anyone"
    ON public.projects
    FOR SELECT USING (true);
    
CREATE POLICY "Projects can be created by authenticated users"
    ON public.projects
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    
CREATE POLICY "Projects can be updated by creator"
    ON public.projects
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Projects can be deleted by creator"
    ON public.projects
    FOR DELETE USING (auth.uid() = created_by);

-- Create epics table
CREATE TABLE IF NOT EXISTS public.epics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    epic_key VARCHAR(20),
    status VARCHAR(50) DEFAULT 'active',
    priority VARCHAR(20) DEFAULT 'medium',
    start_date DATE,
    target_end_date DATE,
    estimated_story_points INTEGER,
    actual_story_points INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_by UUID REFERENCES public.users(id),
    assignee_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for epics
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;

-- RLS policies for epics
DROP POLICY IF EXISTS "Epics are viewable by anyone" ON public.epics;
CREATE POLICY "Epics are viewable by anyone"
    ON public.epics
    FOR SELECT USING (true);
    
CREATE POLICY "Epics can be created by authenticated users"
    ON public.epics
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    
CREATE POLICY "Epics can be updated by authenticated users"
    ON public.epics
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Epics can be deleted by authenticated users"
    ON public.epics
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    story_key VARCHAR(20),
    as_a TEXT,
    i_want TEXT,
    so_that TEXT,
    acceptance_criteria TEXT,
    status VARCHAR(50) DEFAULT 'backlog',
    priority VARCHAR(20) DEFAULT 'medium',
    story_points INTEGER,
    assignee_id UUID REFERENCES public.users(id),
    sprint_id UUID, -- We'll add FK constraint after creating sprints table
    due_date DATE,
    tags TEXT[],
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for stories
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- RLS policies for stories
DROP POLICY IF EXISTS "Stories are viewable by anyone" ON public.stories;
CREATE POLICY "Stories are viewable by anyone"
    ON public.stories
    FOR SELECT USING (true);
    
CREATE POLICY "Stories can be created by authenticated users"
    ON public.stories
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    
CREATE POLICY "Stories can be updated by authenticated users"
    ON public.stories
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Stories can be deleted by authenticated users"
    ON public.stories
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create sprints table
CREATE TABLE IF NOT EXISTS public.sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    description TEXT,
    sprint_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    status VARCHAR(50) DEFAULT 'planning',
    team_capacity INTEGER,
    planned_story_points INTEGER,
    completed_story_points INTEGER DEFAULT 0,
    velocity INTEGER,
    scope_changes INTEGER DEFAULT 0,
    what_went_well TEXT,
    what_to_improve TEXT,
    action_items JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, sprint_number)
);

-- Enable Row Level Security for sprints
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- RLS policies for sprints
DROP POLICY IF EXISTS "Sprints are viewable by anyone" ON public.sprints;
CREATE POLICY "Sprints are viewable by anyone"
    ON public.sprints
    FOR SELECT USING (true);
    
CREATE POLICY "Sprints can be created by authenticated users"
    ON public.sprints
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    
CREATE POLICY "Sprints can be updated by authenticated users"
    ON public.sprints
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sprints can be deleted by authenticated users"
    ON public.sprints
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Now add the foreign key constraint for stories.sprint_id
ALTER TABLE public.stories 
ADD CONSTRAINT fk_stories_sprint_id 
FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE SET NULL;

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_key VARCHAR(20),
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(20) DEFAULT 'medium',
    assignee_id UUID REFERENCES public.users(id),
    estimated_hours DECIMAL(5,2) DEFAULT 0,
    actual_hours DECIMAL(5,2) DEFAULT 0,
    due_date DATE,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
DROP POLICY IF EXISTS "Tasks are viewable by anyone" ON public.tasks;
CREATE POLICY "Tasks are viewable by anyone"
    ON public.tasks
    FOR SELECT USING (true);
    
CREATE POLICY "Tasks can be created by authenticated users"
    ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    
CREATE POLICY "Tasks can be updated by authenticated users"
    ON public.tasks
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Tasks can be deleted by authenticated users"
    ON public.tasks
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_private BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- RLS policies for teams
CREATE POLICY "Teams are viewable by anyone"
    ON public.teams
    FOR SELECT USING (true);
    
CREATE POLICY "Teams can be created by authenticated users"
    ON public.teams
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    
CREATE POLICY "Teams can be updated by creator"
    ON public.teams
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Teams can be deleted by creator"
    ON public.teams
    FOR DELETE USING (auth.uid() = created_by);

-- Create function to handle new user signup (creates profile in users table)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_epics_project_id ON public.epics(project_id);
CREATE INDEX IF NOT EXISTS idx_stories_epic_id ON public.stories(epic_id);
CREATE INDEX IF NOT EXISTS idx_stories_sprint_id ON public.stories(sprint_id);
CREATE INDEX IF NOT EXISTS idx_stories_assignee_id ON public.stories(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_story_id ON public.tasks(story_id);
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON public.sprints(project_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_epics_updated_at BEFORE UPDATE ON public.epics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON public.stories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON public.sprints FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role; 