-- FUNCTIONS STATEMENTS

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;

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

CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
project_id_var VARCHAR(36);
total_stories INTEGER;
completed_stories INTEGER;
new_progress INTEGER;
BEGIN
SELECT p.id INTO project_id_var
FROM projects p
JOIN epics e ON e.project_id = p.id
WHERE e.id = COALESCE(NEW.epic_id, OLD.epic_id);
SELECT
COUNT(*) as total,
COUNT(CASE WHEN status IN ('done', 'closed') THEN 1 END) as completed
INTO total_stories, completed_stories
FROM stories s
JOIN epics e ON s.epic_id = e.id
WHERE e.project_id = project_id_var;
IF total_stories > 0 THEN
new_progress := (completed_stories * 100) / total_stories;
UPDATE projects SET
progress = new_progress,
updated_at = NOW()
WHERE id = project_id_var;
END IF;
RETURN COALESCE(NEW, OLD);
END;

CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
action_name VARCHAR(100);
entity_name_var VARCHAR(500);
user_id_var VARCHAR(36);
BEGIN
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

CREATE OR REPLACE FUNCTION create_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
notification_title VARCHAR(200);
notification_message TEXT;
entity_name_var VARCHAR(500);
BEGIN
IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id AND NEW.assignee_id IS NOT NULL THEN
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

