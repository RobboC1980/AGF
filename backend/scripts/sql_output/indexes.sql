-- INDEXES STATEMENTS

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_resource ON user_roles(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON user_permissions(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active);

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

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);

CREATE INDEX IF NOT EXISTS idx_teams_organization_id ON teams(organization_id);

CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);

CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

CREATE INDEX IF NOT EXISTS idx_epics_project_id ON epics(project_id);

CREATE INDEX IF NOT EXISTS idx_epics_status ON epics(status);

CREATE INDEX IF NOT EXISTS idx_epics_created_by ON epics(created_by);

CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);

CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);

CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_stories_epic_id ON stories(epic_id);

CREATE INDEX IF NOT EXISTS idx_stories_sprint_id ON stories(sprint_id);

CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);

CREATE INDEX IF NOT EXISTS idx_stories_assignee_id ON stories(assignee_id);

CREATE INDEX IF NOT EXISTS idx_stories_created_by ON stories(created_by);

CREATE INDEX IF NOT EXISTS idx_tasks_story_id ON tasks(story_id);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_comments_created_by ON comments(created_by);

CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON time_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON time_logs(task_id);

CREATE INDEX IF NOT EXISTS idx_time_logs_date ON time_logs(log_date);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_tags_organization_id ON tags(organization_id);

CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_tags_tag_id ON entity_tags(tag_id);

