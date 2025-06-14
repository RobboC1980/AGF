-- Fix Database Schema for AgileForge
-- Add missing columns and tables for authentication and AI features

-- 1. Add missing hashed_password column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{"developer"}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID;

-- 2. Create story_embeddings table for vector search
CREATE TABLE IF NOT EXISTS story_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    embedding vector(1536), -- OpenAI embedding dimension
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS story_embeddings_vector_idx ON story_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for story_id lookup
CREATE INDEX IF NOT EXISTS story_embeddings_story_id_idx ON story_embeddings(story_id);

-- 3. Create project_insights table for AI-generated project insights
CREATE TABLE IF NOT EXISTS project_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- 'velocity', 'quality', 'resource', 'risk'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    actionable_items TEXT[],
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for project_insights
CREATE INDEX IF NOT EXISTS project_insights_project_id_idx ON project_insights(project_id);
CREATE INDEX IF NOT EXISTS project_insights_type_idx ON project_insights(insight_type);
CREATE INDEX IF NOT EXISTS project_insights_priority_idx ON project_insights(priority);
CREATE INDEX IF NOT EXISTS project_insights_created_at_idx ON project_insights(created_at);

-- 4. Create sprint_analyses table for AI sprint analysis
CREATE TABLE IF NOT EXISTS sprint_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sprint_id UUID NOT NULL, -- References sprints table (may not exist yet)
    sprint_name TEXT NOT NULL,
    total_stories INTEGER DEFAULT 0,
    completed_stories INTEGER DEFAULT 0,
    in_progress_stories INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2),
    ai_insights JSONB DEFAULT '{}',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for sprint_analyses
CREATE INDEX IF NOT EXISTS sprint_analyses_sprint_id_idx ON sprint_analyses(sprint_id);
CREATE INDEX IF NOT EXISTS sprint_analyses_project_id_idx ON sprint_analyses(project_id);
CREATE INDEX IF NOT EXISTS sprint_analyses_generated_at_idx ON sprint_analyses(generated_at);

-- 5. Create story_suggestions table for AI story suggestions
CREATE TABLE IF NOT EXISTS story_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    epic_id UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    suggested_name TEXT NOT NULL,
    suggested_description TEXT,
    suggested_acceptance_criteria TEXT,
    ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id)
);

-- Create indexes for story_suggestions
CREATE INDEX IF NOT EXISTS story_suggestions_epic_id_idx ON story_suggestions(epic_id);
CREATE INDEX IF NOT EXISTS story_suggestions_status_idx ON story_suggestions(status);
CREATE INDEX IF NOT EXISTS story_suggestions_created_at_idx ON story_suggestions(created_at);

-- 6. Enable pgvector extension (if not already enabled)
-- Note: This might require superuser privileges
-- CREATE EXTENSION IF NOT EXISTS vector;

-- 7. Create RPC function to check if vector extension exists
CREATE OR REPLACE FUNCTION check_vector_extension()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
    );
END;
$$ LANGUAGE plpgsql;

-- 8. Create RPC function to get epics needing stories (for cron jobs)
CREATE OR REPLACE FUNCTION get_epics_needing_stories()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    project_id UUID,
    story_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.description,
        e.project_id,
        COUNT(s.id) as story_count
    FROM epics e
    LEFT JOIN stories s ON e.id = s.epic_id
    WHERE e.status = 'active'
    GROUP BY e.id, e.name, e.description, e.project_id
    HAVING COUNT(s.id) < 5; -- Epics with fewer than 5 stories
END;
$$ LANGUAGE plpgsql;

-- 9. Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Add updated_at triggers for relevant tables
CREATE TRIGGER update_story_embeddings_updated_at 
    BEFORE UPDATE ON story_embeddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Insert default admin user (if not exists)
INSERT INTO users (id, email, name, hashed_password, roles, permissions, is_active, is_verified, created_at)
VALUES (
    gen_random_uuid(),
    'admin@agileforge.com',
    'System Administrator',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeOZxEaLRhX01mNBE', -- 'admin123' hashed
    '{"admin"}',
    '{"create_project","delete_project","edit_project","view_project","create_epic","delete_epic","edit_epic","view_epic","create_story","delete_story","edit_story","view_story","assign_story","manage_team","invite_users","remove_users","view_analytics","export_data","use_ai_features","configure_ai","manage_system","view_audit_logs"}',
    true,
    true,
    now()
) ON CONFLICT (email) DO NOTHING;

-- 12. Update existing users to have default roles if they don't have them
UPDATE users 
SET roles = '{"developer"}'
WHERE roles IS NULL OR roles = '{}';

UPDATE users 
SET permissions = '{"view_project","view_epic","create_story","edit_story","view_story","use_ai_features"}'
WHERE permissions IS NULL OR permissions = '{}';

-- 13. Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres; 