-- DATA STATEMENTS

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

INSERT INTO permissions (id, name, display_name, description, resource_type) VALUES
('perm-user-create', 'user:create', 'Create Users', 'Create new users', 'user'),
('perm-user-read', 'user:read', 'Read Users', 'View user information', 'user'),
('perm-user-update', 'user:update', 'Update Users', 'Update user information', 'user'),
('perm-user-delete', 'user:delete', 'Delete Users', 'Delete users', 'user'),
('perm-user-manage-roles', 'user:manage_roles', 'Manage User Roles', 'Assign/revoke user roles', 'user'),
('perm-user-impersonate', 'user:impersonate', 'Impersonate Users', 'Impersonate other users', 'user'),
('perm-org-create', 'org:create', 'Create Organizations', 'Create new organizations', 'organization'),
('perm-org-read', 'org:read', 'Read Organizations', 'View organization information', 'organization'),
('perm-org-update', 'org:update', 'Update Organizations', 'Update organization information', 'organization'),
('perm-org-delete', 'org:delete', 'Delete Organizations', 'Delete organizations', 'organization'),
('perm-org-manage-members', 'org:manage_members', 'Manage Organization Members', 'Manage organization membership', 'organization'),
('perm-org-manage-billing', 'org:manage_billing', 'Manage Organization Billing', 'Manage billing and subscriptions', 'organization'),
('perm-org-manage-settings', 'org:manage_settings', 'Manage Organization Settings', 'Manage organization settings', 'organization'),
('perm-team-create', 'team:create', 'Create Teams', 'Create new teams', 'team'),
('perm-team-read', 'team:read', 'Read Teams', 'View team information', 'team'),
('perm-team-update', 'team:update', 'Update Teams', 'Update team information', 'team'),
('perm-team-delete', 'team:delete', 'Delete Teams', 'Delete teams', 'team'),
('perm-team-manage-members', 'team:manage_members', 'Manage Team Members', 'Manage team membership', 'team'),
('perm-project-create', 'project:create', 'Create Projects', 'Create new projects', 'project'),
('perm-project-read', 'project:read', 'Read Projects', 'View project information', 'project'),
('perm-project-update', 'project:update', 'Update Projects', 'Update project information', 'project'),
('perm-project-delete', 'project:delete', 'Delete Projects', 'Delete projects', 'project'),
('perm-project-manage-members', 'project:manage_members', 'Manage Project Members', 'Manage project membership', 'project'),
('perm-project-manage-settings', 'project:manage_settings', 'Manage Project Settings', 'Manage project settings', 'project'),
('perm-project-archive', 'project:archive', 'Archive Projects', 'Archive projects', 'project'),
('perm-story-create', 'story:create', 'Create Stories', 'Create new stories', 'story'),
('perm-story-read', 'story:read', 'Read Stories', 'View story information', 'story'),
('perm-story-update', 'story:update', 'Update Stories', 'Update story information', 'story'),
('perm-story-delete', 'story:delete', 'Delete Stories', 'Delete stories', 'story'),
('perm-story-assign', 'story:assign', 'Assign Stories', 'Assign stories to users', 'story'),
('perm-story-transition', 'story:transition', 'Transition Stories', 'Change story status', 'story'),
('perm-task-create', 'task:create', 'Create Tasks', 'Create new tasks', 'task'),
('perm-task-read', 'task:read', 'Read Tasks', 'View task information', 'task'),
('perm-task-update', 'task:update', 'Update Tasks', 'Update task information', 'task'),
('perm-task-delete', 'task:delete', 'Delete Tasks', 'Delete tasks', 'task'),
('perm-task-assign', 'task:assign', 'Assign Tasks', 'Assign tasks to users', 'task'),
('perm-task-transition', 'task:transition', 'Transition Tasks', 'Change task status', 'task'),
('perm-comment-create', 'comment:create', 'Create Comments', 'Create new comments', 'comment'),
('perm-comment-read', 'comment:read', 'Read Comments', 'View comments', 'comment'),
('perm-comment-update', 'comment:update', 'Update Comments', 'Update comments', 'comment'),
('perm-comment-delete', 'comment:delete', 'Delete Comments', 'Delete comments', 'comment'),
('perm-comment-moderate', 'comment:moderate', 'Moderate Comments', 'Moderate comments', 'comment'),
('perm-time-log', 'time:log', 'Log Time', 'Log time entries', 'time'),
('perm-time-read', 'time:read', 'Read Time Logs', 'View time logs', 'time'),
('perm-time-update', 'time:update', 'Update Time Logs', 'Update time logs', 'time'),
('perm-time-delete', 'time:delete', 'Delete Time Logs', 'Delete time logs', 'time'),
('perm-time-approve', 'time:approve', 'Approve Time Logs', 'Approve time logs', 'time'),
('perm-analytics-read', 'analytics:read', 'Read Analytics', 'View analytics', 'analytics'),
('perm-analytics-export', 'analytics:export', 'Export Analytics', 'Export analytics data', 'analytics'),
('perm-analytics-advanced', 'analytics:advanced', 'Advanced Analytics', 'Access advanced analytics', 'analytics'),
('perm-system-admin', 'system:admin', 'System Administration', 'Full system administration', 'system'),
('perm-system-audit', 'system:audit', 'System Audit', 'Access audit logs', 'system'),
('perm-system-backup', 'system:backup', 'System Backup', 'Perform system backups', 'system'),
('perm-system-maintenance', 'system:maintenance', 'System Maintenance', 'Perform system maintenance', 'system'),
('perm-ai-generate-stories', 'ai:generate_stories', 'Generate Stories with AI', 'Use AI to generate stories', 'ai'),
('perm-ai-generate-tasks', 'ai:generate_tasks', 'Generate Tasks with AI', 'Use AI to generate tasks', 'ai'),
('perm-ai-analyze', 'ai:analyze', 'AI Analysis', 'Use AI analysis features', 'ai'),
('perm-ai-suggest', 'ai:suggest', 'AI Suggestions', 'Use AI suggestion features', 'ai'),
('perm-billing-read', 'billing:read', 'Read Billing', 'View billing information', 'billing'),
('perm-billing-manage', 'billing:manage', 'Manage Billing', 'Manage billing and payments', 'billing'),
('perm-billing-admin', 'billing:admin', 'Billing Administration', 'Full billing administration', 'billing'),
('perm-epic-create', 'epic:create', 'Create Epics', 'Create new epics', 'epic'),
('perm-epic-read', 'epic:read', 'Read Epics', 'View epic information', 'epic'),
('perm-epic-update', 'epic:update', 'Update Epics', 'Update epic information', 'epic'),
('perm-epic-delete', 'epic:delete', 'Delete Epics', 'Delete epics', 'epic'),
('perm-epic-assign', 'epic:assign', 'Assign Epics', 'Assign epics to users', 'epic'),
('perm-sprint-create', 'sprint:create', 'Create Sprints', 'Create new sprints', 'sprint'),
('perm-sprint-read', 'sprint:read', 'Read Sprints', 'View sprint information', 'sprint'),
('perm-sprint-update', 'sprint:update', 'Update Sprints', 'Update sprint information', 'sprint'),
('perm-sprint-delete', 'sprint:delete', 'Delete Sprints', 'Delete sprints', 'sprint'),
('perm-sprint-manage', 'sprint:manage', 'Manage Sprints', 'Start/end sprints', 'sprint'),
('perm-release-create', 'release:create', 'Create Releases', 'Create new releases', 'release'),
('perm-release-read', 'release:read', 'Read Releases', 'View release information', 'release'),
('perm-release-update', 'release:update', 'Update Releases', 'Update release information', 'release'),
('perm-release-delete', 'release:delete', 'Delete Releases', 'Delete releases', 'release'),
('perm-release-deploy', 'release:deploy', 'Deploy Releases', 'Deploy releases', 'release'),
('perm-tag-create', 'tag:create', 'Create Tags', 'Create new tags', 'tag'),
('perm-tag-read', 'tag:read', 'Read Tags', 'View tags', 'tag'),
('perm-tag-update', 'tag:update', 'Update Tags', 'Update tags', 'tag'),
('perm-tag-delete', 'tag:delete', 'Delete Tags', 'Delete tags', 'tag'),
('perm-notification-read', 'notification:read', 'Read Notifications', 'View notifications', 'notification'),
('perm-notification-manage', 'notification:manage', 'Manage Notifications', 'Manage notification settings', 'notification')
ON CONFLICT (name) DO NOTHING;

$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;

$$ LANGUAGE plpgsql;

$$ LANGUAGE plpgsql;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_progress ON stories;

$$ LANGUAGE plpgsql;

$$ LANGUAGE plpgsql;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-super-admin', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-system-admin', id FROM permissions
WHERE name != 'user:impersonate'
ON CONFLICT (role_id, permission_id) DO NOTHING;

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

$$ LANGUAGE plpgsql;

$$ LANGUAGE plpgsql;

$$ LANGUAGE plpgsql;

$$ LANGUAGE plpgsql;

$$ LANGUAGE plpgsql;

