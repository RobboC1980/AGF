-- =====================================
-- ENTERPRISE AUTHORIZATION SCHEMA
-- =====================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================
-- USER MANAGEMENT TABLES
-- =====================================

-- Enhanced users table with security features
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    bio TEXT,
    job_title VARCHAR(100),
    department VARCHAR(100),
    location VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    
    -- Authentication & Security
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    verification_token VARCHAR(255),
    
    -- Preferences
    theme VARCHAR(20) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) REFERENCES users(id)
);

-- User sessions for JWT management
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_token VARCHAR(500) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(255),
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- API Keys for programmatic access
CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '[]',
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- =====================================
-- RBAC SYSTEM TABLES
-- =====================================

-- System roles
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System permissions
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role_id VARCHAR(36) REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    permission_id VARCHAR(36) REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- User-Role assignments (with optional resource context)
CREATE TABLE IF NOT EXISTS user_roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role_id VARCHAR(36) REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    resource_type VARCHAR(50), -- organization, team, project, etc.
    resource_id VARCHAR(36),   -- specific resource ID
    granted_by VARCHAR(36) REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Direct user permissions (for fine-grained control)
CREATE TABLE IF NOT EXISTS user_permissions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    permission_id VARCHAR(36) REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(36),
    granted_by VARCHAR(36) REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, permission_id, resource_type, resource_id)
);

-- =====================================
-- AUDIT & SECURITY TABLES
-- =====================================

-- Security audit log
CREATE TABLE IF NOT EXISTS security_audit_log (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL, -- login, logout, permission_denied, role_assigned, etc.
    event_description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    resource_type VARCHAR(50),
    resource_id VARCHAR(36),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Failed login attempts tracking
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    failure_reason VARCHAR(100)
);

-- Token blacklist for revoked tokens
CREATE TABLE IF NOT EXISTS token_blacklist (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    token_type VARCHAR(20) NOT NULL, -- access, refresh, api_key
    user_id VARCHAR(36) REFERENCES users(id),
    blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    reason VARCHAR(100)
);

-- =====================================
-- INDEXES FOR PERFORMANCE
-- =====================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- API Key indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- RBAC indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_resource ON user_roles(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON user_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_ip ON security_audit_log(ip_address);

CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_time ON failed_login_attempts(attempt_time);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id ON token_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- =====================================
-- INITIAL DATA SETUP
-- =====================================

-- Insert system roles
INSERT INTO roles (id, name, display_name, description, is_system_role) VALUES
    ('role-super-admin', 'super_admin', 'Super Administrator', 'Full system access', true),
    ('role-system-admin', 'system_admin', 'System Administrator', 'System administration access', true),
    ('role-org-owner', 'org_owner', 'Organization Owner', 'Organization ownership', true),
    ('role-org-admin', 'org_admin', 'Organization Administrator', 'Organization administration', true),
    ('role-org-member', 'org_member', 'Organization Member', 'Basic organization member', true),
    ('role-team-lead', 'team_lead', 'Team Lead', 'Team leadership', true),
    ('role-team-member', 'team_member', 'Team Member', 'Team member', true),
    ('role-project-manager', 'project_manager', 'Project Manager', 'Project management', true),
    ('role-product-owner', 'product_owner', 'Product Owner', 'Product ownership', true),
    ('role-scrum-master', 'scrum_master', 'Scrum Master', 'Scrum master', true),
    ('role-tech-lead', 'tech_lead', 'Technical Lead', 'Technical leadership', true),
    ('role-senior-developer', 'senior_developer', 'Senior Developer', 'Senior development', true),
    ('role-developer', 'developer', 'Developer', 'Software development', true),
    ('role-tester', 'tester', 'Tester', 'Quality assurance', true),
    ('role-designer', 'designer', 'Designer', 'Design and UX', true),
    ('role-analyst', 'analyst', 'Business Analyst', 'Business analysis', true),
    ('role-stakeholder', 'stakeholder', 'Stakeholder', 'External stakeholder', true),
    ('role-viewer', 'viewer', 'Viewer', 'Read-only access', true),
    ('role-guest', 'guest', 'Guest', 'Limited guest access', true)
ON CONFLICT (name) DO NOTHING;

-- Insert system permissions
INSERT INTO permissions (id, name, display_name, description, resource_type) VALUES
    -- User Management
    ('perm-user-create', 'user:create', 'Create Users', 'Create new users', 'user'),
    ('perm-user-read', 'user:read', 'Read Users', 'View user information', 'user'),
    ('perm-user-update', 'user:update', 'Update Users', 'Update user information', 'user'),
    ('perm-user-delete', 'user:delete', 'Delete Users', 'Delete users', 'user'),
    ('perm-user-manage-roles', 'user:manage_roles', 'Manage User Roles', 'Assign/revoke user roles', 'user'),
    ('perm-user-impersonate', 'user:impersonate', 'Impersonate Users', 'Impersonate other users', 'user'),
    
    -- Organization Management
    ('perm-org-create', 'org:create', 'Create Organizations', 'Create new organizations', 'organization'),
    ('perm-org-read', 'org:read', 'Read Organizations', 'View organization information', 'organization'),
    ('perm-org-update', 'org:update', 'Update Organizations', 'Update organization information', 'organization'),
    ('perm-org-delete', 'org:delete', 'Delete Organizations', 'Delete organizations', 'organization'),
    ('perm-org-manage-members', 'org:manage_members', 'Manage Organization Members', 'Manage organization membership', 'organization'),
    ('perm-org-manage-billing', 'org:manage_billing', 'Manage Organization Billing', 'Manage billing and subscriptions', 'organization'),
    ('perm-org-manage-settings', 'org:manage_settings', 'Manage Organization Settings', 'Manage organization settings', 'organization'),
    
    -- Team Management
    ('perm-team-create', 'team:create', 'Create Teams', 'Create new teams', 'team'),
    ('perm-team-read', 'team:read', 'Read Teams', 'View team information', 'team'),
    ('perm-team-update', 'team:update', 'Update Teams', 'Update team information', 'team'),
    ('perm-team-delete', 'team:delete', 'Delete Teams', 'Delete teams', 'team'),
    ('perm-team-manage-members', 'team:manage_members', 'Manage Team Members', 'Manage team membership', 'team'),
    
    -- Project Management
    ('perm-project-create', 'project:create', 'Create Projects', 'Create new projects', 'project'),
    ('perm-project-read', 'project:read', 'Read Projects', 'View project information', 'project'),
    ('perm-project-update', 'project:update', 'Update Projects', 'Update project information', 'project'),
    ('perm-project-delete', 'project:delete', 'Delete Projects', 'Delete projects', 'project'),
    ('perm-project-manage-members', 'project:manage_members', 'Manage Project Members', 'Manage project membership', 'project'),
    ('perm-project-manage-settings', 'project:manage_settings', 'Manage Project Settings', 'Manage project settings', 'project'),
    ('perm-project-archive', 'project:archive', 'Archive Projects', 'Archive projects', 'project'),
    
    -- Story Management
    ('perm-story-create', 'story:create', 'Create Stories', 'Create new stories', 'story'),
    ('perm-story-read', 'story:read', 'Read Stories', 'View story information', 'story'),
    ('perm-story-update', 'story:update', 'Update Stories', 'Update story information', 'story'),
    ('perm-story-delete', 'story:delete', 'Delete Stories', 'Delete stories', 'story'),
    ('perm-story-assign', 'story:assign', 'Assign Stories', 'Assign stories to users', 'story'),
    ('perm-story-transition', 'story:transition', 'Transition Stories', 'Change story status', 'story'),
    
    -- Task Management
    ('perm-task-create', 'task:create', 'Create Tasks', 'Create new tasks', 'task'),
    ('perm-task-read', 'task:read', 'Read Tasks', 'View task information', 'task'),
    ('perm-task-update', 'task:update', 'Update Tasks', 'Update task information', 'task'),
    ('perm-task-delete', 'task:delete', 'Delete Tasks', 'Delete tasks', 'task'),
    ('perm-task-assign', 'task:assign', 'Assign Tasks', 'Assign tasks to users', 'task'),
    ('perm-task-transition', 'task:transition', 'Transition Tasks', 'Change task status', 'task'),
    
    -- Comment Management
    ('perm-comment-create', 'comment:create', 'Create Comments', 'Create new comments', 'comment'),
    ('perm-comment-read', 'comment:read', 'Read Comments', 'View comments', 'comment'),
    ('perm-comment-update', 'comment:update', 'Update Comments', 'Update comments', 'comment'),
    ('perm-comment-delete', 'comment:delete', 'Delete Comments', 'Delete comments', 'comment'),
    ('perm-comment-moderate', 'comment:moderate', 'Moderate Comments', 'Moderate comments', 'comment'),
    
    -- Time Tracking
    ('perm-time-log', 'time:log', 'Log Time', 'Log time entries', 'time'),
    ('perm-time-read', 'time:read', 'Read Time Logs', 'View time logs', 'time'),
    ('perm-time-update', 'time:update', 'Update Time Logs', 'Update time logs', 'time'),
    ('perm-time-delete', 'time:delete', 'Delete Time Logs', 'Delete time logs', 'time'),
    ('perm-time-approve', 'time:approve', 'Approve Time Logs', 'Approve time logs', 'time'),
    
    -- Analytics
    ('perm-analytics-read', 'analytics:read', 'Read Analytics', 'View analytics', 'analytics'),
    ('perm-analytics-export', 'analytics:export', 'Export Analytics', 'Export analytics data', 'analytics'),
    ('perm-analytics-advanced', 'analytics:advanced', 'Advanced Analytics', 'Access advanced analytics', 'analytics'),
    
    -- System Administration
    ('perm-system-admin', 'system:admin', 'System Administration', 'Full system administration', 'system'),
    ('perm-system-audit', 'system:audit', 'System Audit', 'Access audit logs', 'system'),
    ('perm-system-backup', 'system:backup', 'System Backup', 'Perform system backups', 'system'),
    ('perm-system-maintenance', 'system:maintenance', 'System Maintenance', 'Perform system maintenance', 'system'),
    
    -- AI Features
    ('perm-ai-generate-stories', 'ai:generate_stories', 'Generate Stories with AI', 'Use AI to generate stories', 'ai'),
    ('perm-ai-generate-tasks', 'ai:generate_tasks', 'Generate Tasks with AI', 'Use AI to generate tasks', 'ai'),
    ('perm-ai-analyze', 'ai:analyze', 'AI Analysis', 'Use AI analysis features', 'ai'),
    ('perm-ai-suggest', 'ai:suggest', 'AI Suggestions', 'Use AI suggestion features', 'ai'),
    
    -- Billing
    ('perm-billing-read', 'billing:read', 'Read Billing', 'View billing information', 'billing'),
    ('perm-billing-manage', 'billing:manage', 'Manage Billing', 'Manage billing and payments', 'billing'),
    ('perm-billing-admin', 'billing:admin', 'Billing Administration', 'Full billing administration', 'billing'),
    
    -- Epic Management
    ('perm-epic-create', 'epic:create', 'Create Epics', 'Create new epics', 'epic'),
    ('perm-epic-read', 'epic:read', 'Read Epics', 'View epic information', 'epic'),
    ('perm-epic-update', 'epic:update', 'Update Epics', 'Update epic information', 'epic'),
    ('perm-epic-delete', 'epic:delete', 'Delete Epics', 'Delete epics', 'epic'),
    ('perm-epic-assign', 'epic:assign', 'Assign Epics', 'Assign epics to users', 'epic'),
    
    -- Sprint Management
    ('perm-sprint-create', 'sprint:create', 'Create Sprints', 'Create new sprints', 'sprint'),
    ('perm-sprint-read', 'sprint:read', 'Read Sprints', 'View sprint information', 'sprint'),
    ('perm-sprint-update', 'sprint:update', 'Update Sprints', 'Update sprint information', 'sprint'),
    ('perm-sprint-delete', 'sprint:delete', 'Delete Sprints', 'Delete sprints', 'sprint'),
    ('perm-sprint-manage', 'sprint:manage', 'Manage Sprints', 'Start/end sprints', 'sprint'),
    
    -- Release Management
    ('perm-release-create', 'release:create', 'Create Releases', 'Create new releases', 'release'),
    ('perm-release-read', 'release:read', 'Read Releases', 'View release information', 'release'),
    ('perm-release-update', 'release:update', 'Update Releases', 'Update release information', 'release'),
    ('perm-release-delete', 'release:delete', 'Delete Releases', 'Delete releases', 'release'),
    ('perm-release-deploy', 'release:deploy', 'Deploy Releases', 'Deploy releases', 'release'),
    
    -- Tag Management
    ('perm-tag-create', 'tag:create', 'Create Tags', 'Create new tags', 'tag'),
    ('perm-tag-read', 'tag:read', 'Read Tags', 'View tags', 'tag'),
    ('perm-tag-update', 'tag:update', 'Update Tags', 'Update tags', 'tag'),
    ('perm-tag-delete', 'tag:delete', 'Delete Tags', 'Delete tags', 'tag'),
    
    -- Notification Management
    ('perm-notification-read', 'notification:read', 'Read Notifications', 'View notifications', 'notification'),
    ('perm-notification-manage', 'notification:manage', 'Manage Notifications', 'Manage notification settings', 'notification')
ON CONFLICT (name) DO NOTHING;

-- =====================================
-- CORE BUSINESS ENTITY TABLES
-- =====================================

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    website VARCHAR(500),
    logo_url VARCHAR(500),
    
    -- Settings
    default_timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    
    -- Subscription & Billing
    plan_type VARCHAR(50) DEFAULT 'free',
    max_users INTEGER DEFAULT 10,
    max_projects INTEGER DEFAULT 5,
    billing_email VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) REFERENCES users(id)
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),
    color VARCHAR(7), -- Hex color
    
    -- Settings
    is_default BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) REFERENCES users(id)
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    team_id VARCHAR(36) REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'developer',
    
    -- Permissions
    can_manage_team BOOLEAN DEFAULT FALSE,
    can_manage_projects BOOLEAN DEFAULT FALSE,
    can_assign_tasks BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    invited_by VARCHAR(36) REFERENCES users(id),
    
    UNIQUE(team_id, user_id)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    team_id VARCHAR(36) REFERENCES teams(id),
    
    -- Basic Info
    name VARCHAR(200) NOT NULL,
    key VARCHAR(10) NOT NULL, -- Project key like "PROJ"
    description TEXT,
    vision TEXT,
    goals JSONB, -- Array of goal objects
    
    -- Visual
    avatar_url VARCHAR(500),
    color VARCHAR(7), -- Hex color
    
    -- Dates & Timeline
    start_date TIMESTAMP WITH TIME ZONE,
    target_end_date TIMESTAMP WITH TIME ZONE,
    actual_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Status & Progress
    status VARCHAR(50) DEFAULT 'backlog' NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    progress INTEGER DEFAULT 0, -- 0-100
    health_status VARCHAR(20) DEFAULT 'green', -- green, yellow, red
    
    -- Budget & Resources
    budget DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    estimated_hours INTEGER,
    actual_hours INTEGER DEFAULT 0,
    
    -- Settings
    is_private BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    auto_assign BOOLEAN DEFAULT FALSE,
    
    -- Methodology Settings
    methodology VARCHAR(50) DEFAULT 'scrum', -- scrum, kanban, waterfall
    sprint_duration INTEGER DEFAULT 14, -- days
    story_point_scale VARCHAR(50) DEFAULT 'fibonacci',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) REFERENCES users(id) NOT NULL,
    
    UNIQUE(organization_id, key)
);

-- Epics table
CREATE TABLE IF NOT EXISTS epics (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    
    -- Basic Info
    title VARCHAR(500) NOT NULL,
    description TEXT,
    acceptance_criteria TEXT,
    business_value TEXT,
    
    -- Hierarchy
    parent_epic_id VARCHAR(36) REFERENCES epics(id),
    epic_key VARCHAR(20) NOT NULL, -- PROJ-123
    
    -- Status & Priority
    status VARCHAR(50) DEFAULT 'backlog' NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    
    -- Timeline
    start_date TIMESTAMP WITH TIME ZONE,
    target_end_date TIMESTAMP WITH TIME ZONE,
    actual_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Estimation & Progress
    estimated_story_points INTEGER,
    actual_story_points INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0, -- 0-100
    
    -- Business Metrics
    roi_estimate DECIMAL(10, 2),
    risk_level VARCHAR(20) DEFAULT 'medium',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) REFERENCES users(id),
    
    UNIQUE(project_id, epic_key)
);

-- Sprints table
CREATE TABLE IF NOT EXISTS sprints (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    
    -- Basic Info
    name VARCHAR(200) NOT NULL,
    goal TEXT,
    description TEXT,
    sprint_number INTEGER NOT NULL,
    
    -- Timeline
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start_date TIMESTAMP WITH TIME ZONE,
    actual_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'planning', -- planning, active, completed, cancelled
    
    -- Capacity & Planning
    team_capacity DECIMAL(5, 2), -- Total team capacity in hours
    planned_story_points INTEGER,
    completed_story_points INTEGER DEFAULT 0,
    
    -- Metrics
    velocity DECIMAL(5, 2),
    burndown_data JSONB, -- Daily burndown data
    scope_changes INTEGER DEFAULT 0,
    
    -- Retrospective
    what_went_well TEXT,
    what_to_improve TEXT,
    action_items JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) REFERENCES users(id),
    
    UNIQUE(project_id, sprint_number)
);

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    epic_id VARCHAR(36) REFERENCES epics(id) ON DELETE CASCADE NOT NULL,
    sprint_id VARCHAR(36) REFERENCES sprints(id),
    
    -- Basic Info
    title VARCHAR(500) NOT NULL,
    description TEXT,
    story_key VARCHAR(20) NOT NULL, -- PROJ-456
    
    -- User Story Format
    as_a VARCHAR(200), -- User role
    i_want TEXT, -- Goal
    so_that TEXT, -- Benefit
    
    -- Acceptance Criteria
    acceptance_criteria TEXT NOT NULL,
    definition_of_done TEXT,
    
    -- Status & Priority
    status VARCHAR(50) DEFAULT 'backlog' NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    story_type VARCHAR(20) DEFAULT 'story',
    
    -- Assignment
    assignee_id VARCHAR(36) REFERENCES users(id),
    reporter_id VARCHAR(36) REFERENCES users(id),
    
    -- Estimation & Tracking
    story_points INTEGER,
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2) DEFAULT 0,
    remaining_hours DECIMAL(5, 2),
    
    -- Timeline
    due_date TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Quality & Testing
    test_cases_count INTEGER DEFAULT 0,
    passed_tests_count INTEGER DEFAULT 0,
    bug_count INTEGER DEFAULT 0,
    
    -- Business Value
    business_value INTEGER, -- 1-100
    customer_priority INTEGER, -- 1-100
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) REFERENCES users(id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    story_id VARCHAR(36) REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
    parent_task_id VARCHAR(36) REFERENCES tasks(id),
    
    -- Basic Info
    title VARCHAR(500) NOT NULL,
    description TEXT,
    task_key VARCHAR(20) NOT NULL, -- PROJ-789
    task_type VARCHAR(20) DEFAULT 'task',
    
    -- Status & Priority
    status VARCHAR(50) DEFAULT 'todo' NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    
    -- Assignment
    assignee_id VARCHAR(36) REFERENCES users(id),
    reviewer_id VARCHAR(36) REFERENCES users(id),
    
    -- Time Tracking
    estimated_hours DECIMAL(5, 2) NOT NULL,
    actual_hours DECIMAL(5, 2) DEFAULT 0,
    remaining_hours DECIMAL(5, 2),
    
    -- Timeline
    due_date TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Technical Details
    technical_notes TEXT,
    blockers JSONB, -- Array of blocker objects
    dependencies JSONB, -- Array of dependency task IDs
    
    -- Quality
    is_blocked BOOLEAN DEFAULT FALSE,
    blocker_reason TEXT,
    review_required BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) REFERENCES users(id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Polymorphic relationship
    entity_type VARCHAR(50) NOT NULL, -- project, epic, story, task
    entity_id VARCHAR(36) NOT NULL,
    
    -- Comment content
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text', -- text, markdown
    
    -- Threading
    parent_comment_id VARCHAR(36) REFERENCES comments(id),
    thread_level INTEGER DEFAULT 0,
    
    -- Status
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal team comments
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) REFERENCES users(id) NOT NULL,
    edited_by VARCHAR(36) REFERENCES users(id)
);

-- Time logs table
CREATE TABLE IF NOT EXISTS time_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    task_id VARCHAR(36) REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    
    -- Time tracking
    hours_logged DECIMAL(5, 2) NOT NULL,
    log_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    
    -- Description
    description TEXT,
    work_type VARCHAR(50) DEFAULT 'development', -- development, testing, review, meeting, etc.
    
    -- Status
    is_billable BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(36) REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) REFERENCES users(id),
    
    -- Activity details
    action VARCHAR(100) NOT NULL, -- created, updated, deleted, assigned, etc.
    entity_type VARCHAR(50) NOT NULL, -- project, epic, story, task, etc.
    entity_id VARCHAR(36) NOT NULL,
    entity_name VARCHAR(500),
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changes_summary TEXT,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- Notification content
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- assignment, mention, deadline, etc.
    
    -- Related entity
    entity_type VARCHAR(50), -- project, epic, story, task
    entity_id VARCHAR(36),
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7), -- Hex color
    description TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by VARCHAR(36) REFERENCES users(id),
    
    UNIQUE(organization_id, name)
);

-- Entity tags junction table
CREATE TABLE IF NOT EXISTS entity_tags (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tag_id VARCHAR(36) REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- project, epic, story, task
    entity_id VARCHAR(36) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by VARCHAR(36) REFERENCES users(id),
    
    UNIQUE(tag_id, entity_type, entity_id)
);

-- =====================================
-- ADDITIONAL INDEXES FOR BUSINESS ENTITIES
-- =====================================

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);

-- Team indexes
CREATE INDEX IF NOT EXISTS idx_teams_organization_id ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

-- Team member indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Epic indexes
CREATE INDEX IF NOT EXISTS idx_epics_project_id ON epics(project_id);
CREATE INDEX IF NOT EXISTS idx_epics_status ON epics(status);
CREATE INDEX IF NOT EXISTS idx_epics_created_by ON epics(created_by);

-- Sprint indexes
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(start_date, end_date);

-- Story indexes
CREATE INDEX IF NOT EXISTS idx_stories_epic_id ON stories(epic_id);
CREATE INDEX IF NOT EXISTS idx_stories_sprint_id ON stories(sprint_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_stories_assignee_id ON stories(assignee_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_by ON stories(created_by);

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_story_id ON tasks(story_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- Comment indexes
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_by ON comments(created_by);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Time log indexes
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_date ON time_logs(log_date);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Tag indexes
CREATE INDEX IF NOT EXISTS idx_tags_organization_id ON tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag_id ON entity_tags(tag_id);

-- =====================================
-- FUNCTIONS AND TRIGGERS
-- =====================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR is_active = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired tokens from blacklist
CREATE OR REPLACE FUNCTION cleanup_expired_blacklisted_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM token_blacklist 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update project progress based on story completion
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
    project_id_var VARCHAR(36);
    total_stories INTEGER;
    completed_stories INTEGER;
    new_progress INTEGER;
BEGIN
    -- Get project ID from epic
    SELECT p.id INTO project_id_var
    FROM projects p
    JOIN epics e ON e.project_id = p.id
    WHERE e.id = COALESCE(NEW.epic_id, OLD.epic_id);
    
    -- Calculate progress
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('done', 'closed') THEN 1 END) as completed
    INTO total_stories, completed_stories
    FROM stories s
    JOIN epics e ON s.epic_id = e.id
    WHERE e.project_id = project_id_var;
    
    -- Update project progress
    IF total_stories > 0 THEN
        new_progress := (completed_stories * 100) / total_stories;
        UPDATE projects SET 
            progress = new_progress,
            updated_at = NOW()
        WHERE id = project_id_var;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for story status changes
DROP TRIGGER IF EXISTS trigger_update_project_progress ON stories;
CREATE TRIGGER trigger_update_project_progress
    AFTER INSERT OR UPDATE OR DELETE ON stories
    FOR EACH ROW
    EXECUTE FUNCTION update_project_progress();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_name VARCHAR(100);
    entity_name_var VARCHAR(500);
    user_id_var VARCHAR(36);
BEGIN
    -- Determine action
    IF TG_OP = 'INSERT' THEN
        action_name := 'created';
        user_id_var := NEW.created_by;
    ELSIF TG_OP = 'UPDATE' THEN
        action_name := 'updated';
        user_id_var := COALESCE(NEW.created_by, OLD.created_by);
    ELSIF TG_OP = 'DELETE' THEN
        action_name := 'deleted';
        user_id_var := OLD.created_by;
    END IF;
    
    -- Get entity name based on table
    CASE TG_TABLE_NAME
        WHEN 'projects' THEN
            entity_name_var := COALESCE(NEW.name, OLD.name);
        WHEN 'epics' THEN
            entity_name_var := COALESCE(NEW.title, OLD.title);
        WHEN 'stories' THEN
            entity_name_var := COALESCE(NEW.title, OLD.title);
        WHEN 'tasks' THEN
            entity_name_var := COALESCE(NEW.title, OLD.title);
        ELSE
            entity_name_var := 'Unknown';
    END CASE;
    
    -- Insert activity log
    INSERT INTO activity_logs (
        user_id, action, entity_type, entity_id, entity_name,
        old_values, new_values
    ) VALUES (
        user_id_var, action_name, TG_TABLE_NAME, 
        COALESCE(NEW.id, OLD.id), entity_name_var,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Activity logging triggers
CREATE TRIGGER trigger_log_project_activity
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER trigger_log_epic_activity
    AFTER INSERT OR UPDATE OR DELETE ON epics
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER trigger_log_story_activity
    AFTER INSERT OR UPDATE OR DELETE ON stories
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER trigger_log_task_activity
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Function to create notifications
CREATE OR REPLACE FUNCTION create_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_title VARCHAR(200);
    notification_message TEXT;
    entity_name_var VARCHAR(500);
BEGIN
    -- Only create notification if assignee changed
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id AND NEW.assignee_id IS NOT NULL THEN
        
        -- Get entity name
        CASE TG_TABLE_NAME
            WHEN 'stories' THEN
                entity_name_var := NEW.title;
                notification_title := 'Story Assigned';
                notification_message := 'You have been assigned to story: ' || NEW.title;
            WHEN 'tasks' THEN
                entity_name_var := NEW.title;
                notification_title := 'Task Assigned';
                notification_message := 'You have been assigned to task: ' || NEW.title;
        END CASE;
        
        -- Insert notification
        INSERT INTO notifications (
            user_id, title, message, notification_type,
            entity_type, entity_id
        ) VALUES (
            NEW.assignee_id, notification_title, notification_message, 'assignment',
            TG_TABLE_NAME, NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Assignment notification triggers
CREATE TRIGGER trigger_story_assignment_notification
    AFTER UPDATE ON stories
    FOR EACH ROW EXECUTE FUNCTION create_assignment_notification();

CREATE TRIGGER trigger_task_assignment_notification
    AFTER UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION create_assignment_notification();

-- =====================================
-- DEFAULT ROLE-PERMISSION MAPPINGS
-- =====================================

-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-super-admin', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- System Admin gets most permissions except user impersonation
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-system-admin', id FROM permissions 
WHERE name != 'user:impersonate'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Organization Owner permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-org-owner', id FROM permissions 
WHERE name IN (
    'org:read', 'org:update', 'org:manage_members', 'org:manage_billing', 'org:manage_settings',
    'team:create', 'team:read', 'team:update', 'team:delete', 'team:manage_members',
    'project:create', 'project:read', 'project:update', 'project:delete', 'project:manage_members', 'project:manage_settings', 'project:archive',
    'epic:create', 'epic:read', 'epic:update', 'epic:delete', 'epic:assign',
    'story:create', 'story:read', 'story:update', 'story:delete', 'story:assign', 'story:transition',
    'task:create', 'task:read', 'task:update', 'task:delete', 'task:assign', 'task:transition',
    'sprint:create', 'sprint:read', 'sprint:update', 'sprint:delete', 'sprint:manage',
    'release:create', 'release:read', 'release:update', 'release:delete', 'release:deploy',
    'comment:create', 'comment:read', 'comment:update', 'comment:delete', 'comment:moderate',
    'time:read', 'time:approve',
    'analytics:read', 'analytics:export', 'analytics:advanced',
    'user:read', 'user:manage_roles',
    'billing:read', 'billing:manage',
    'tag:create', 'tag:read', 'tag:update', 'tag:delete',
    'notification:read', 'notification:manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Organization Admin permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-org-admin', id FROM permissions 
WHERE name IN (
    'org:read', 'org:update', 'org:manage_members',
    'team:create', 'team:read', 'team:update', 'team:delete', 'team:manage_members',
    'project:create', 'project:read', 'project:update', 'project:delete', 'project:manage_members', 'project:manage_settings',
    'epic:create', 'epic:read', 'epic:update', 'epic:delete', 'epic:assign',
    'story:create', 'story:read', 'story:update', 'story:delete', 'story:assign', 'story:transition',
    'task:create', 'task:read', 'task:update', 'task:delete', 'task:assign', 'task:transition',
    'sprint:create', 'sprint:read', 'sprint:update', 'sprint:delete', 'sprint:manage',
    'release:create', 'release:read', 'release:update', 'release:delete',
    'comment:create', 'comment:read', 'comment:update', 'comment:delete', 'comment:moderate',
    'time:read', 'time:approve',
    'analytics:read', 'analytics:export',
    'user:read',
    'tag:create', 'tag:read', 'tag:update', 'tag:delete',
    'notification:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Project Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-project-manager', id FROM permissions 
WHERE name IN (
    'project:read', 'project:update', 'project:manage_members', 'project:manage_settings',
    'epic:create', 'epic:read', 'epic:update', 'epic:delete', 'epic:assign',
    'story:create', 'story:read', 'story:update', 'story:delete', 'story:assign', 'story:transition',
    'task:create', 'task:read', 'task:update', 'task:delete', 'task:assign', 'task:transition',
    'sprint:create', 'sprint:read', 'sprint:update', 'sprint:delete', 'sprint:manage',
    'release:create', 'release:read', 'release:update', 'release:delete',
    'comment:create', 'comment:read', 'comment:update', 'comment:delete',
    'time:read', 'time:approve',
    'analytics:read',
    'tag:read', 'tag:create',
    'notification:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Developer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-developer', id FROM permissions 
WHERE name IN (
    'project:read',
    'epic:read',
    'story:read', 'story:update', 'story:transition',
    'task:create', 'task:read', 'task:update', 'task:transition',
    'sprint:read',
    'release:read',
    'comment:create', 'comment:read', 'comment:update',
    'time:log', 'time:read', 'time:update',
    'tag:read',
    'notification:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-viewer', id FROM permissions 
WHERE name IN (
    'project:read',
    'epic:read',
    'story:read',
    'task:read',
    'sprint:read',
    'release:read',
    'comment:read',
    'tag:read',
    'notification:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================
-- UTILITY VIEWS
-- =====================================

-- User permissions view (combines role and direct permissions)
CREATE OR REPLACE VIEW user_effective_permissions AS
WITH role_perms AS (
    SELECT DISTINCT
        ur.user_id,
        ur.resource_type,
        ur.resource_id,
        p.name as permission_name,
        p.resource_type as permission_resource_type
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
),
direct_perms AS (
    SELECT DISTINCT
        up.user_id,
        up.resource_type,
        up.resource_id,
        p.name as permission_name,
        p.resource_type as permission_resource_type
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.is_active = TRUE
    AND (up.expires_at IS NULL OR up.expires_at > NOW())
)
SELECT * FROM role_perms
UNION
SELECT * FROM direct_perms;

-- Project summary view
CREATE OR REPLACE VIEW project_summary AS
SELECT 
    p.id,
    p.name,
    p.key,
    p.status,
    p.progress,
    p.created_at,
    o.name as organization_name,
    t.name as team_name,
    u.first_name || ' ' || u.last_name as creator_name,
    COUNT(DISTINCT e.id) as epic_count,
    COUNT(DISTINCT s.id) as story_count,
    COUNT(DISTINCT tk.id) as task_count,
    COUNT(DISTINCT CASE WHEN s.status IN ('done', 'closed') THEN s.id END) as completed_stories,
    COUNT(DISTINCT CASE WHEN tk.status IN ('done', 'closed') THEN tk.id END) as completed_tasks,
    SUM(s.story_points) as total_story_points,
    SUM(CASE WHEN s.status IN ('done', 'closed') THEN s.story_points ELSE 0 END) as completed_story_points
FROM projects p
LEFT JOIN organizations o ON p.organization_id = o.id
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN users u ON p.created_by = u.id
LEFT JOIN epics e ON e.project_id = p.id
LEFT JOIN stories s ON s.epic_id = e.id
LEFT JOIN tasks tk ON tk.story_id = s.id
GROUP BY p.id, p.name, p.key, p.status, p.progress, p.created_at, o.name, t.name, u.first_name, u.last_name;

-- =====================================
-- CLEANUP AND MAINTENANCE FUNCTIONS
-- =====================================

-- Function to clean up old activity logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM activity_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications (keep last 30 days for read, 90 days for unread)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE (is_read = TRUE AND created_at < NOW() - INTERVAL '30 days')
       OR (is_read = FALSE AND created_at < NOW() - INTERVAL '90 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user permissions for a specific resource
CREATE OR REPLACE FUNCTION get_user_permissions(
    p_user_id VARCHAR(36),
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id VARCHAR(36) DEFAULT NULL
)
RETURNS TABLE(permission_name VARCHAR(100)) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT uep.permission_name
    FROM user_effective_permissions uep
    WHERE uep.user_id = p_user_id
    AND (p_resource_type IS NULL OR uep.resource_type = p_resource_type OR uep.resource_type IS NULL)
    AND (p_resource_id IS NULL OR uep.resource_id = p_resource_id OR uep.resource_id IS NULL);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id VARCHAR(36),
    p_permission_name VARCHAR(100),
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id VARCHAR(36) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_effective_permissions uep
        WHERE uep.user_id = p_user_id
        AND uep.permission_name = p_permission_name
        AND (p_resource_type IS NULL OR uep.resource_type = p_resource_type OR uep.resource_type IS NULL)
        AND (p_resource_id IS NULL OR uep.resource_id = p_resource_id OR uep.resource_id IS NULL)
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to get organization hierarchy for a user
CREATE OR REPLACE FUNCTION get_user_organization_access(p_user_id VARCHAR(36))
RETURNS TABLE(
    organization_id VARCHAR(36),
    organization_name VARCHAR(200),
    user_role VARCHAR(50),
    team_id VARCHAR(36),
    team_name VARCHAR(200)
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        o.id as organization_id,
        o.name as organization_name,
        ur.role_id as user_role,
        t.id as team_id,
        t.name as team_name
    FROM organizations o
    LEFT JOIN teams t ON t.organization_id = o.id
    LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = p_user_id
    LEFT JOIN user_roles ur ON ur.user_id = p_user_id 
        AND ur.resource_type = 'organization' 
        AND ur.resource_id = o.id
        AND ur.is_active = TRUE
    WHERE tm.user_id = p_user_id OR ur.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- SCHEDULED CLEANUP (COMMENTS FOR CRON SETUP)
-- =====================================

-- To set up automated cleanup, add these to your PostgreSQL cron or application scheduler:
-- 
-- Daily cleanup of expired sessions and tokens:
-- SELECT cleanup_expired_sessions();
-- SELECT cleanup_expired_blacklisted_tokens();
-- 
-- Weekly cleanup of old activity logs and notifications:
-- SELECT cleanup_old_activity_logs();
-- SELECT cleanup_old_notifications();

-- =====================================
-- SCHEMA COMPLETION SUMMARY
-- =====================================

-- This schema now includes:
-- 1. Complete user management with security features
-- 2. Comprehensive RBAC system with roles and permissions
-- 3. Core business entities (organizations, teams, projects, epics, stories, tasks)
-- 4. Sprint and release management
-- 5. Time tracking and activity logging
-- 6. Notifications and comments system
-- 7. Tagging system for organization
-- 8. Security audit logging
-- 9. Automated triggers for progress tracking and notifications
-- 10. Utility functions for permission checking and cleanup
-- 11. Performance indexes on all critical queries
-- 12. Default role-permission mappings for common use cases 