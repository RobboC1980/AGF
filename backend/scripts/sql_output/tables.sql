-- TABLES STATEMENTS

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
is_active BOOLEAN DEFAULT TRUE NOT NULL,
is_verified BOOLEAN DEFAULT FALSE NOT NULL,
last_login TIMESTAMP WITH TIME ZONE,
failed_login_attempts INTEGER DEFAULT 0,
locked_until TIMESTAMP WITH TIME ZONE,
password_reset_token VARCHAR(255),
password_reset_expires TIMESTAMP WITH TIME ZONE,
verification_token VARCHAR(255),
theme VARCHAR(20) DEFAULT 'light',
notifications_enabled BOOLEAN DEFAULT TRUE,
email_notifications BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by VARCHAR(36) REFERENCES users(id)
);

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

CREATE TABLE IF NOT EXISTS roles (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
name VARCHAR(50) UNIQUE NOT NULL,
display_name VARCHAR(100) NOT NULL,
description TEXT,
is_system_role BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
name VARCHAR(100) UNIQUE NOT NULL,
display_name VARCHAR(100) NOT NULL,
description TEXT,
resource_type VARCHAR(50),
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
role_id VARCHAR(36) REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
permission_id VARCHAR(36) REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
UNIQUE(role_id, permission_id)
);

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

CREATE TABLE IF NOT EXISTS failed_login_attempts (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
email VARCHAR(255),
ip_address INET NOT NULL,
user_agent TEXT,
attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
failure_reason VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS token_blacklist (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
token_hash VARCHAR(255) NOT NULL UNIQUE,
token_type VARCHAR(20) NOT NULL, -- access, refresh, api_key
user_id VARCHAR(36) REFERENCES users(id),
blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
expires_at TIMESTAMP WITH TIME ZONE,
reason VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS organizations (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
name VARCHAR(200) NOT NULL,
slug VARCHAR(100) UNIQUE NOT NULL,
description TEXT,
website VARCHAR(500),
logo_url VARCHAR(500),
default_timezone VARCHAR(50) DEFAULT 'UTC',
currency VARCHAR(3) DEFAULT 'USD',
date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
plan_type VARCHAR(50) DEFAULT 'free',
max_users INTEGER DEFAULT 10,
max_projects INTEGER DEFAULT 5,
billing_email VARCHAR(255),
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by VARCHAR(36) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS teams (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
name VARCHAR(200) NOT NULL,
description TEXT,
avatar_url VARCHAR(500),
color VARCHAR(7), -- Hex color
is_default BOOLEAN DEFAULT FALSE,
is_private BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by VARCHAR(36) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS team_members (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
team_id VARCHAR(36) REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
role VARCHAR(50) NOT NULL DEFAULT 'developer',
can_manage_team BOOLEAN DEFAULT FALSE,
can_manage_projects BOOLEAN DEFAULT FALSE,
can_assign_tasks BOOLEAN DEFAULT TRUE,
joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
invited_by VARCHAR(36) REFERENCES users(id),
UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS projects (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
team_id VARCHAR(36) REFERENCES teams(id),
name VARCHAR(200) NOT NULL,
key VARCHAR(10) NOT NULL, -- Project key like "PROJ"
description TEXT,
vision TEXT,
goals JSONB, -- Array of goal objects
avatar_url VARCHAR(500),
color VARCHAR(7), -- Hex color
start_date TIMESTAMP WITH TIME ZONE,
target_end_date TIMESTAMP WITH TIME ZONE,
actual_end_date TIMESTAMP WITH TIME ZONE,
status VARCHAR(50) DEFAULT 'backlog' NOT NULL,
priority VARCHAR(20) DEFAULT 'medium',
progress INTEGER DEFAULT 0, -- 0-100
health_status VARCHAR(20) DEFAULT 'green', -- green, yellow, red
budget DECIMAL(15, 2),
currency VARCHAR(3) DEFAULT 'USD',
estimated_hours INTEGER,
actual_hours INTEGER DEFAULT 0,
is_private BOOLEAN DEFAULT FALSE,
is_archived BOOLEAN DEFAULT FALSE,
is_template BOOLEAN DEFAULT FALSE,
auto_assign BOOLEAN DEFAULT FALSE,
methodology VARCHAR(50) DEFAULT 'scrum', -- scrum, kanban, waterfall
sprint_duration INTEGER DEFAULT 14, -- days
story_point_scale VARCHAR(50) DEFAULT 'fibonacci',
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by VARCHAR(36) REFERENCES users(id) NOT NULL,
UNIQUE(organization_id, key)
);

CREATE TABLE IF NOT EXISTS epics (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
title VARCHAR(500) NOT NULL,
description TEXT,
acceptance_criteria TEXT,
business_value TEXT,
parent_epic_id VARCHAR(36) REFERENCES epics(id),
epic_key VARCHAR(20) NOT NULL, -- PROJ-123
status VARCHAR(50) DEFAULT 'backlog' NOT NULL,
priority VARCHAR(20) DEFAULT 'medium',
start_date TIMESTAMP WITH TIME ZONE,
target_end_date TIMESTAMP WITH TIME ZONE,
actual_end_date TIMESTAMP WITH TIME ZONE,
estimated_story_points INTEGER,
actual_story_points INTEGER DEFAULT 0,
progress INTEGER DEFAULT 0, -- 0-100
roi_estimate DECIMAL(10, 2),
risk_level VARCHAR(20) DEFAULT 'medium',
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by VARCHAR(36) REFERENCES users(id),
UNIQUE(project_id, epic_key)
);

CREATE TABLE IF NOT EXISTS sprints (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
name VARCHAR(200) NOT NULL,
goal TEXT,
description TEXT,
sprint_number INTEGER NOT NULL,
start_date TIMESTAMP WITH TIME ZONE NOT NULL,
end_date TIMESTAMP WITH TIME ZONE NOT NULL,
actual_start_date TIMESTAMP WITH TIME ZONE,
actual_end_date TIMESTAMP WITH TIME ZONE,
status VARCHAR(20) DEFAULT 'planning', -- planning, active, completed, cancelled
team_capacity DECIMAL(5, 2), -- Total team capacity in hours
planned_story_points INTEGER,
completed_story_points INTEGER DEFAULT 0,
velocity DECIMAL(5, 2),
burndown_data JSONB, -- Daily burndown data
scope_changes INTEGER DEFAULT 0,
what_went_well TEXT,
what_to_improve TEXT,
action_items JSONB,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by VARCHAR(36) REFERENCES users(id),
UNIQUE(project_id, sprint_number)
);

CREATE TABLE IF NOT EXISTS stories (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
epic_id VARCHAR(36) REFERENCES epics(id) ON DELETE CASCADE NOT NULL,
sprint_id VARCHAR(36) REFERENCES sprints(id),
title VARCHAR(500) NOT NULL,
description TEXT,
story_key VARCHAR(20) NOT NULL, -- PROJ-456
as_a VARCHAR(200), -- User role
i_want TEXT, -- Goal
so_that TEXT, -- Benefit
acceptance_criteria TEXT NOT NULL,
definition_of_done TEXT,
status VARCHAR(50) DEFAULT 'backlog' NOT NULL,
priority VARCHAR(20) DEFAULT 'medium',
story_type VARCHAR(20) DEFAULT 'story',
assignee_id VARCHAR(36) REFERENCES users(id),
reporter_id VARCHAR(36) REFERENCES users(id),
story_points INTEGER,
estimated_hours DECIMAL(5, 2),
actual_hours DECIMAL(5, 2) DEFAULT 0,
remaining_hours DECIMAL(5, 2),
due_date TIMESTAMP WITH TIME ZONE,
started_at TIMESTAMP WITH TIME ZONE,
completed_at TIMESTAMP WITH TIME ZONE,
test_cases_count INTEGER DEFAULT 0,
passed_tests_count INTEGER DEFAULT 0,
bug_count INTEGER DEFAULT 0,
business_value INTEGER, -- 1-100
customer_priority INTEGER, -- 1-100
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by VARCHAR(36) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tasks (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
story_id VARCHAR(36) REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
parent_task_id VARCHAR(36) REFERENCES tasks(id),
title VARCHAR(500) NOT NULL,
description TEXT,
task_key VARCHAR(20) NOT NULL, -- PROJ-789
task_type VARCHAR(20) DEFAULT 'task',
status VARCHAR(50) DEFAULT 'todo' NOT NULL,
priority VARCHAR(20) DEFAULT 'medium',
assignee_id VARCHAR(36) REFERENCES users(id),
reviewer_id VARCHAR(36) REFERENCES users(id),
estimated_hours DECIMAL(5, 2) NOT NULL,
actual_hours DECIMAL(5, 2) DEFAULT 0,
remaining_hours DECIMAL(5, 2),
due_date TIMESTAMP WITH TIME ZONE,
started_at TIMESTAMP WITH TIME ZONE,
completed_at TIMESTAMP WITH TIME ZONE,
technical_notes TEXT,
blockers JSONB, -- Array of blocker objects
dependencies JSONB, -- Array of dependency task IDs
is_blocked BOOLEAN DEFAULT FALSE,
blocker_reason TEXT,
review_required BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by VARCHAR(36) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS comments (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
entity_type VARCHAR(50) NOT NULL, -- project, epic, story, task
entity_id VARCHAR(36) NOT NULL,
content TEXT NOT NULL,
content_type VARCHAR(20) DEFAULT 'text', -- text, markdown
parent_comment_id VARCHAR(36) REFERENCES comments(id),
thread_level INTEGER DEFAULT 0,
is_edited BOOLEAN DEFAULT FALSE,
is_deleted BOOLEAN DEFAULT FALSE,
is_internal BOOLEAN DEFAULT FALSE, -- Internal team comments
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by VARCHAR(36) REFERENCES users(id) NOT NULL,
edited_by VARCHAR(36) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS time_logs (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
task_id VARCHAR(36) REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
hours_logged DECIMAL(5, 2) NOT NULL,
log_date DATE NOT NULL,
start_time TIME,
end_time TIME,
description TEXT,
work_type VARCHAR(50) DEFAULT 'development', -- development, testing, review, meeting, etc.
is_billable BOOLEAN DEFAULT TRUE,
is_approved BOOLEAN DEFAULT FALSE,
approved_by VARCHAR(36) REFERENCES users(id),
approved_at TIMESTAMP WITH TIME ZONE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
user_id VARCHAR(36) REFERENCES users(id),
action VARCHAR(100) NOT NULL, -- created, updated, deleted, assigned, etc.
entity_type VARCHAR(50) NOT NULL, -- project, epic, story, task, etc.
entity_id VARCHAR(36) NOT NULL,
entity_name VARCHAR(500),
old_values JSONB,
new_values JSONB,
changes_summary TEXT,
ip_address INET,
user_agent TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
title VARCHAR(200) NOT NULL,
message TEXT NOT NULL,
notification_type VARCHAR(50) NOT NULL, -- assignment, mention, deadline, etc.
entity_type VARCHAR(50), -- project, epic, story, task
entity_id VARCHAR(36),
is_read BOOLEAN DEFAULT FALSE,
is_email_sent BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
read_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS tags (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
name VARCHAR(100) NOT NULL,
color VARCHAR(7), -- Hex color
description TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
created_by VARCHAR(36) REFERENCES users(id),
UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS entity_tags (
id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
tag_id VARCHAR(36) REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
entity_type VARCHAR(50) NOT NULL, -- project, epic, story, task
entity_id VARCHAR(36) NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
created_by VARCHAR(36) REFERENCES users(id),
UNIQUE(tag_id, entity_type, entity_id)
);

