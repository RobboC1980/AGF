-- AgileForge - Supabase Schema Migration
-- This file creates all necessary tables with Row Level Security policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "vector"; -- For AI features

-- Set up storage
-- This part is handled by Supabase UI for bucket creation

-- Set up authentication schema
-- This is handled by Supabase Auth, we only need to create profiles table

-- USERS TABLE (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles
    FOR SELECT USING (true);
    
CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- PROJECTS TABLE
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Projects are viewable by their creator"
    ON public.projects
    FOR SELECT USING (auth.uid() = created_by);
    
CREATE POLICY "Projects can be created by any user"
    ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = created_by);
    
CREATE POLICY "Projects can be updated by their creator"
    ON public.projects
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Projects can be deleted by their creator"
    ON public.projects
    FOR DELETE USING (auth.uid() = created_by);

-- EPICS TABLE
CREATE TABLE public.epics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    color VARCHAR(7) DEFAULT '#3B82F6',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for epics
CREATE POLICY "Epics are viewable by project creators"
    ON public.epics
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE created_by = auth.uid()
        )
    );
    
CREATE POLICY "Epics can be created by project creators"
    ON public.epics
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE created_by = auth.uid()
        )
    );
    
CREATE POLICY "Epics can be updated by project creators"
    ON public.epics
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE created_by = auth.uid()
        )
    );
    
CREATE POLICY "Epics can be deleted by project creators"
    ON public.epics
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE created_by = auth.uid()
        )
    );

-- STORIES TABLE
CREATE TABLE public.stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    acceptance_criteria TEXT,
    story_points INTEGER,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'backlog',
    epic_id UUID REFERENCES public.epics(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES public.profiles(id),
    tags TEXT[],
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stories
CREATE POLICY "Stories are viewable by project creators and assignees"
    ON public.stories
    FOR SELECT USING (
        epic_id IN (
            SELECT e.id FROM public.epics e
            JOIN public.projects p ON e.project_id = p.id
            WHERE p.created_by = auth.uid()
        ) OR assignee_id = auth.uid()
    );
    
CREATE POLICY "Stories can be created by project creators"
    ON public.stories
    FOR INSERT WITH CHECK (
        epic_id IN (
            SELECT e.id FROM public.epics e
            JOIN public.projects p ON e.project_id = p.id
            WHERE p.created_by = auth.uid()
        )
    );
    
CREATE POLICY "Stories can be updated by project creators and assignees"
    ON public.stories
    FOR UPDATE USING (
        epic_id IN (
            SELECT e.id FROM public.epics e
            JOIN public.projects p ON e.project_id = p.id
            WHERE p.created_by = auth.uid()
        ) OR assignee_id = auth.uid()
    );
    
CREATE POLICY "Stories can be deleted by project creators"
    ON public.stories
    FOR DELETE USING (
        epic_id IN (
            SELECT e.id FROM public.epics e
            JOIN public.projects p ON e.project_id = p.id
            WHERE p.created_by = auth.uid()
        )
    );

-- SPRINTS TABLE
CREATE TABLE public.sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    goal TEXT,
    status VARCHAR(50) DEFAULT 'planning',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sprints
CREATE POLICY "Sprints are viewable by project creators"
    ON public.sprints
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE created_by = auth.uid()
        )
    );
    
CREATE POLICY "Sprints can be created by project creators"
    ON public.sprints
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE created_by = auth.uid()
        )
    );
    
CREATE POLICY "Sprints can be updated by project creators"
    ON public.sprints
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE created_by = auth.uid()
        )
    );
    
CREATE POLICY "Sprints can be deleted by project creators"
    ON public.sprints
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE created_by = auth.uid()
        )
    );

-- TASKS TABLE
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES public.profiles(id),
    status VARCHAR(50) DEFAULT 'todo',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Tasks are viewable by project creators and assignees"
    ON public.tasks
    FOR SELECT USING (
        story_id IN (
            SELECT s.id FROM public.stories s
            JOIN public.epics e ON s.epic_id = e.id
            JOIN public.projects p ON e.project_id = p.id
            WHERE p.created_by = auth.uid()
        ) OR assignee_id = auth.uid()
    );
    
CREATE POLICY "Tasks can be created by project creators"
    ON public.tasks
    FOR INSERT WITH CHECK (
        story_id IN (
            SELECT s.id FROM public.stories s
            JOIN public.epics e ON s.epic_id = e.id
            JOIN public.projects p ON e.project_id = p.id
            WHERE p.created_by = auth.uid()
        )
    );
    
CREATE POLICY "Tasks can be updated by project creators and assignees"
    ON public.tasks
    FOR UPDATE USING (
        story_id IN (
            SELECT s.id FROM public.stories s
            JOIN public.epics e ON s.epic_id = e.id
            JOIN public.projects p ON e.project_id = p.id
            WHERE p.created_by = auth.uid()
        ) OR assignee_id = auth.uid()
    );
    
CREATE POLICY "Tasks can be deleted by project creators"
    ON public.tasks
    FOR DELETE USING (
        story_id IN (
            SELECT s.id FROM public.stories s
            JOIN public.epics e ON s.epic_id = e.id
            JOIN public.projects p ON e.project_id = p.id
            WHERE p.created_by = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_stories_epic_id ON stories(epic_id);
CREATE INDEX idx_stories_assignee_id ON stories(assignee_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_tasks_story_id ON tasks(story_id);
CREATE INDEX idx_epics_project_id ON epics(project_id);

-- AI features storage table
CREATE TABLE IF NOT EXISTS public.ai_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    prompt TEXT NOT NULL,
    completion TEXT NOT NULL,
    model VARCHAR(100) NOT NULL,
    tokens_used INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.ai_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AI completions
CREATE POLICY "AI completions are viewable by the creator"
    ON public.ai_completions
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "AI completions can be created by any authenticated user"
    ON public.ai_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_projects_modtime
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_epics_modtime
BEFORE UPDATE ON public.epics
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_stories_modtime
BEFORE UPDATE ON public.stories
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_sprints_modtime
BEFORE UPDATE ON public.sprints
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_tasks_modtime
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Create a new user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user(); 