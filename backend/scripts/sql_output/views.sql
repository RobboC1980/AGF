-- VIEWS STATEMENTS

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

