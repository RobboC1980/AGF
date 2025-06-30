# SynqForge Access Control Integration Guide

## Quick Start

This guide shows how to integrate and use the new SynqForge access control system in your application.

## 1. Database Setup

### Run the Migration
```bash
# Apply the access control migration to your Supabase database
psql -h your-supabase-host -U postgres -d postgres -f supabase_migration/synqforge_access_control_migration.sql
```

### Verify Tables Created
```sql
-- Check that new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('team_members', 'project_members', 'role_audit_log');
```

## 2. Backend Integration

### Import the Access Control Service
```python
from backend.services.access_control import access_control, Action
```

### Check Permissions in API Endpoints
```python
@router.put("/api/projects/{project_id}")
async def update_project(
    project_id: str,
    project_data: ProjectUpdateRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check if user can edit this project
    if not access_control.can(db, current_user.id, Action.EDIT_PROJECT, project_id):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Proceed with project update
    # ... rest of endpoint logic
```

### Get User's Effective Role
```python
# Get what role the user has on a specific project
user_role = access_control.get_user_project_role(db, user_id, project_id)
# Returns: "project_viewer", "project_contributor", "project_admin", or None

# Check if user has access to any projects
accessible_projects = access_control.get_accessible_projects(db, user_id)
# Returns: List of project IDs the user can access
```

### Grant/Revoke Project Roles
```python
from backend.models.database_schema import ProjectRole

# Grant a project role (with permission check)
success = access_control.grant_project_role(
    db, 
    granter_id=current_user.id,
    user_id=target_user_id, 
    project_id=project_id,
    role=ProjectRole.PROJECT_CONTRIBUTOR
)

# Revoke a project role
success = access_control.revoke_project_role(
    db,
    revoker_id=current_user.id,
    user_id=target_user_id,
    project_id=project_id
)
```

## 3. Frontend Integration

### API Client Updates
```typescript
// Add to your API client (services/api.ts)
export const accessControl = {
  // Check if user can perform action on project
  checkProjectAccess: async (projectId: string, action: string) => {
    const response = await apiClient.get(
      `/api/access-control/projects/${projectId}/access-check?action=${action}`
    );
    return response.data;
  },

  // Get user's complete role information
  getUserRoles: async (userId: string) => {
    const response = await apiClient.get(`/api/access-control/users/${userId}/roles`);
    return response.data;
  },

  // Add team member
  addTeamMember: async (teamId: string, userId: string, role: string) => {
    const response = await apiClient.post(`/api/access-control/teams/${teamId}/members`, {
      user_id: userId,
      role: role
    });
    return response.data;
  },

  // Add project member  
  addProjectMember: async (projectId: string, userId: string, role: string) => {
    const response = await apiClient.post(`/api/access-control/projects/${projectId}/members`, {
      user_id: userId,
      role: role
    });
    return response.data;
  }
};
```

### Permission-based UI Components
```typescript
// React hook for checking permissions
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function useProjectPermissions(projectId: string) {
  const [permissions, setPermissions] = useState({
    canView: false,
    canEdit: false,
    canAdmin: false,
    userRole: null
  });

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const [viewCheck, editCheck, adminCheck] = await Promise.all([
          api.accessControl.checkProjectAccess(projectId, 'view_project'),
          api.accessControl.checkProjectAccess(projectId, 'edit_project'),
          api.accessControl.checkProjectAccess(projectId, 'grant_project_role')
        ]);

        setPermissions({
          canView: viewCheck.has_permission,
          canEdit: editCheck.has_permission,
          canAdmin: adminCheck.has_permission,
          userRole: viewCheck.user_role
        });
      } catch (error) {
        console.error('Failed to check permissions:', error);
      }
    };

    if (projectId) {
      checkPermissions();
    }
  }, [projectId]);

  return permissions;
}

// Usage in component
function ProjectHeader({ projectId }: { projectId: string }) {
  const { canEdit, canAdmin, userRole } = useProjectPermissions(projectId);

  return (
    <div className="project-header">
      <h1>Project Name</h1>
      
      {/* Show role badge */}
      <div className="role-badge">
        Role: {userRole || 'No Access'}
      </div>

      {/* Conditional action buttons */}
      {canEdit && (
        <button onClick={handleEdit}>Edit Project</button>
      )}
      
      {canAdmin && (
        <button onClick={handleManageMembers}>Manage Members</button>
      )}
    </div>
  );
}
```

### Team Management Component
```typescript
interface TeamMember {
  id: string;
  user_id: string;
  role: 'team_member' | 'team_admin';
  user: {
    name: string;
    email: string;
  };
}

function TeamMembersPanel({ teamId }: { teamId: string }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const addMember = async (userId: string, role: string) => {
    try {
      const newMember = await api.accessControl.addTeamMember(teamId, userId, role);
      setMembers([...members, newMember]);
    } catch (error) {
      console.error('Failed to add team member:', error);
    }
  };

  const updateMemberRole = async (userId: string, newRole: string) => {
    try {
      await api.accessControl.updateTeamMember(teamId, userId, { role: newRole });
      // Refresh members list
      loadMembers();
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  return (
    <div className="team-members-panel">
      <h3>Team Members</h3>
      
      {members.map(member => (
        <div key={member.id} className="member-row">
          <span>{member.user.name}</span>
          <span className="role-badge">{member.role}</span>
          
          {isAdmin && (
            <select 
              value={member.role}
              onChange={(e) => updateMemberRole(member.user_id, e.target.value)}
            >
              <option value="team_member">Team Member</option>
              <option value="team_admin">Team Admin</option>
            </select>
          )}
        </div>
      ))}

      {isAdmin && (
        <button onClick={() => setShowInviteModal(true)}>
          Invite Member
        </button>
      )}
    </div>
  );
}
```

## 4. Common Usage Patterns

### Pattern 1: Team-based Project Access
```python
# When a user joins a team, they automatically get access to team projects
# No additional setup needed - handled by access control service

# Check what projects a user can access
accessible_projects = access_control.get_accessible_projects(db, user_id)
```

### Pattern 2: External Collaborator
```python
# Add external user to specific project without team membership
access_control.grant_project_role(
    db,
    granter_id=team_admin_id,
    user_id=external_user_id,
    project_id=project_id,
    role=ProjectRole.PROJECT_CONTRIBUTOR
)

# External user now has contributor access to this project only
```

### Pattern 3: Role Escalation
```python
# Promote team member to team admin
supabase.table('team_members').update({
    'role': 'team_admin'
}).eq('team_id', team_id).eq('user_id', user_id).execute()

# User now has admin access to all team projects automatically
```

### Pattern 4: Cross-team Project Sharing
```python
# Team A admin grants Team B member access to Team A project
access_control.grant_project_role(
    db,
    granter_id=team_a_admin_id,
    user_id=team_b_member_id,
    project_id=team_a_project_id,
    role=ProjectRole.PROJECT_VIEWER
)
```

## 5. Testing Access Control

### Unit Tests
```python
import pytest
from backend.services.access_control import access_control, Action
from backend.models.database_schema import TeamRole, ProjectRole

def test_team_member_project_access():
    # Setup: User is team member
    # Verify: Has viewer access to team projects
    assert access_control.can(db, user_id, Action.VIEW_PROJECT, project_id)
    assert not access_control.can(db, user_id, Action.EDIT_PROJECT, project_id)

def test_explicit_project_role_priority():
    # Setup: User has both team membership and explicit project role
    # Verify: Explicit role takes precedence
    role = access_control.get_user_project_role(db, user_id, project_id)
    assert role == "project_contributor"  # Not inherited team role
```

### Integration Tests
```python
def test_role_grant_workflow():
    # Test complete workflow of granting and using project role
    
    # 1. Grant role
    success = access_control.grant_project_role(
        db, admin_id, user_id, project_id, ProjectRole.PROJECT_CONTRIBUTOR
    )
    assert success
    
    # 2. Verify permissions
    assert access_control.can(db, user_id, Action.CREATE_STORY, project_id)
    assert access_control.can(db, user_id, Action.EDIT_TASK, project_id)
    assert not access_control.can(db, user_id, Action.DELETE_PROJECT, project_id)
    
    # 3. Check audit log
    audit_entries = db.query(RoleAuditLog).filter_by(
        target_user_id=user_id,
        scope_id=project_id
    ).all()
    assert len(audit_entries) == 1
    assert audit_entries[0].action == "granted"
```

## 6. Troubleshooting

### Common Issues

**Issue**: User can't access project despite being team member
```python
# Check team membership
team_membership = supabase.table('team_members').select('*').eq(
    'user_id', user_id
).eq('is_active', True).execute()

# Check project team assignment
project_info = supabase.table('projects').select('team_id').eq(
    'id', project_id
).single().execute()

# Verify team connection
print(f"User teams: {[m['team_id'] for m in team_membership.data]}")
print(f"Project team: {project_info.data['team_id']}")
```

**Issue**: Permission denied despite apparent role
```python
# Debug permission check
user_role = access_control.get_user_project_role(db, user_id, project_id)
print(f"User role: {user_role}")

# Check specific permission
has_permission = access_control.can(db, user_id, Action.EDIT_PROJECT, project_id)
print(f"Can edit: {has_permission}")

# Check audit log for recent changes
recent_changes = supabase.table('role_audit_log').select('*').eq(
    'target_user_id', user_id
).order('created_at', desc=True).limit(5).execute()
```

**Issue**: Role changes not taking effect
```sql
-- Check for stale data
SELECT * FROM team_members WHERE user_id = 'user-uuid' AND is_active = true;
SELECT * FROM project_members WHERE user_id = 'user-uuid' AND is_active = true;

-- Verify RLS policies are working
SELECT current_setting('request.jwt.claims', true)::json->>'sub' as current_user;
```

## 7. Performance Considerations

### Optimize Database Queries
```python
# Use indexes for common queries
# Already created in migration:
# - idx_team_members_user_id
# - idx_project_members_user_id  
# - idx_team_members_role
# - idx_project_members_role

# Cache user permissions for session duration
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_cached_user_role(user_id: str, project_id: str) -> Optional[str]:
    return access_control.get_user_project_role(db, user_id, project_id)
```

### Batch Permission Checks
```python
# Instead of checking permissions one by one
projects_with_permissions = []
for project_id in project_ids:
    if access_control.can(db, user_id, Action.VIEW_PROJECT, project_id):
        projects_with_permissions.append(project_id)

# Use bulk access check
accessible_project_ids = access_control.get_accessible_projects(db, user_id)
projects_with_permissions = [p for p in project_ids if p in accessible_project_ids]
```

This integration guide provides practical examples for implementing the SynqForge access control system in your application. The system is designed to be flexible and secure while maintaining good performance characteristics. 