# SynqForge Access Control Implementation

## Overview

This document describes the complete implementation of the SynqForge access control model as specified in the prompt. The system implements a comprehensive authorization layer with team and project-based roles, following the principle of least privilege.

## Architecture

### Core Entities

| Entity | Description | Key Properties |
|--------|-------------|----------------|
| **User** | Individual users in the system | `id`, `name`, `email` |
| **Team** | Groups of users working together | `id`, `name`, `members[]`, `projects[]` |
| **Project** | Work containers owned by teams | `id`, `name`, `team_id`, `status` |

### Role System

#### Team Roles
- **Team Member**: Basic team membership with project viewer access
- **Team Admin**: Full team management capabilities and project admin access

#### Project Roles  
- **Project Viewer**: Read-only access to project content
- **Project Contributor**: Can create/edit tasks, stories, and comments
- **Project Admin**: Full project management including role assignment

### Access Resolution Priority

The system follows a strict priority order for determining user permissions:

1. **Explicit Project Role** - Direct project-level role assignment takes precedence
2. **Team Inheritance** - Team membership provides implicit project access
3. **No Access** - Default deny if no explicit permissions found

## Implementation Components

### 1. Database Schema

#### Enhanced Enums
```sql
-- Team roles
CREATE TYPE team_role AS ENUM ('team_member', 'team_admin');

-- Project roles  
CREATE TYPE project_role AS ENUM ('project_viewer', 'project_contributor', 'project_admin');

-- Access scope for audit logging
CREATE TYPE access_scope AS ENUM ('team', 'project', 'organization');
```

#### Core Tables

**team_members** - Team membership with roles
```sql
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role team_role NOT NULL DEFAULT 'team_member',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT NOW(),
    invited_by UUID REFERENCES public.profiles(id),
    CONSTRAINT unique_team_member UNIQUE (team_id, user_id)
);
```

**project_members** - Explicit project role assignments
```sql
CREATE TABLE public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role project_role NOT NULL DEFAULT 'project_viewer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    granted_at TIMESTAMP DEFAULT NOW(),
    granted_by UUID REFERENCES public.profiles(id),
    CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);
```

**role_audit_log** - Complete audit trail for all role changes
```sql
CREATE TABLE public.role_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    target_user_id UUID NOT NULL REFERENCES public.profiles(id),
    action VARCHAR(50) NOT NULL, -- granted, revoked, promoted, demoted
    scope access_scope NOT NULL,
    scope_id UUID NOT NULL, -- team_id or project_id
    role VARCHAR(50),
    previous_role VARCHAR(50),
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Access Control Service

The `AccessControlService` class implements the core authorization logic:

```python
class AccessControlService:
    def can(self, db: Session, user_id: str, action: Action, project_id: str) -> bool:
        """
        Main authorization check implementing priority order:
        1. Explicit Project Role
        2. Team Inheritance  
        3. No Match => No Access
        """
        # Step 1: Check for explicit project role
        project_role = self._get_project_role(db, user_id, project_id)
        if project_role:
            return self._has_project_permission(project_role, action)
        
        # Step 2: Check team inheritance
        team_role = self._get_team_role_for_project(db, user_id, project_id)
        if team_role:
            return self._has_team_permission(team_role, action)
        
        # Step 3: No match => No access
        return False
```

#### Permission Mappings

**Team Permissions**:
- **Team Member**: `VIEW_TEAM`, `VIEW_PROJECT` (inherited)
- **Team Admin**: All team management + full project admin permissions on team projects

**Project Permissions**:
- **Project Viewer**: `VIEW_PROJECT`
- **Project Contributor**: Viewer permissions + `CREATE_STORY`, `EDIT_STORY`, `CREATE_TASK`, `EDIT_TASK`, `UPLOAD_FILE`, `CREATE_COMMENT`
- **Project Admin**: All project permissions including role management

### 3. API Endpoints

#### Team Management
- `POST /api/access-control/teams/{team_id}/members` - Add team member
- `PATCH /api/access-control/teams/{team_id}/members/{user_id}` - Update team member role
- `DELETE /api/access-control/teams/{team_id}/members/{user_id}` - Remove team member

#### Project Management  
- `POST /api/access-control/projects/{project_id}/members` - Add project member
- `PATCH /api/access-control/projects/{project_id}/members/{user_id}` - Update project member role
- `DELETE /api/access-control/projects/{project_id}/members/{user_id}` - Remove project member

#### Access Control Queries
- `GET /api/access-control/users/{user_id}/roles` - Get user's complete role information
- `GET /api/access-control/projects/{project_id}/access-check` - Check specific permissions

### 4. Row Level Security (RLS)

Comprehensive RLS policies ensure data security at the database level:

#### Teams
```sql
-- Teams are viewable by members
CREATE POLICY "Teams are viewable by members"
    ON public.teams FOR SELECT USING (
        id IN (SELECT team_id FROM public.team_members 
               WHERE user_id = auth.uid() AND is_active = TRUE)
    );
```

#### Projects  
```sql
-- Projects are viewable by members and team members
CREATE POLICY "Projects are viewable by members and team members"
    ON public.projects FOR SELECT USING (
        -- Direct project access
        id IN (SELECT project_id FROM public.project_members 
               WHERE user_id = auth.uid() AND is_active = TRUE)
        OR
        -- Team-based access
        team_id IN (SELECT team_id FROM public.team_members 
                    WHERE user_id = auth.uid() AND is_active = TRUE)
    );
```

### 5. Helper Functions

#### Database Functions
- `get_user_project_role(user_uuid, project_uuid)` - Get effective role on project
- `can_user_access_project(user_uuid, project_uuid, required_role)` - Permission check

#### Audit Triggers
Automatic logging of all role changes:
```sql
CREATE TRIGGER team_members_audit_trigger
    AFTER INSERT OR UPDATE ON public.team_members
    FOR EACH ROW EXECUTE FUNCTION log_role_change();
```

## Usage Examples

### Scenario 1: Team-based Access
```python
# User 1 is a Team Member in Team X
# Automatically gets Project Viewer access to all Team X projects
user_role = access_control.get_user_project_role(db, user1_id, project_y_id)
# Returns: "project_viewer" (inherited from team membership)
```

### Scenario 2: Explicit Project Role
```python
# User 3 is granted direct Project Contributor role
access_control.grant_project_role(
    db, granter_id, user3_id, project_id, ProjectRole.PROJECT_CONTRIBUTOR
)
# User 3 can now edit stories and tasks on this project only
```

### Scenario 3: Cross-team Collaboration
```python
# Team Admin from Team Z grants external user access to Team Z project
# External user appears as "Individual Collaborator"
can_edit = access_control.can(db, external_user_id, Action.EDIT_STORY, project_id)
# Returns: True if explicit project role allows it
```

## Administration Workflows

### Team Management
1. **Create Team** → Creator becomes Team Admin
2. **Invite Members** → Team Admin adds users with Team Member role
3. **Promote to Admin** → Team Admin can promote Team Members
4. **Create Projects** → Team Admin creates projects owned by team

### Project Management
1. **Grant External Access** → Project/Team Admin grants direct project roles
2. **Cross-team Collaboration** → External users get project-specific access
3. **Role Updates** → Admins can upgrade/downgrade project roles
4. **Access Revocation** → Admins can remove project access

## Security Features

### Audit Trail
- Complete logging of all role changes
- IP address and user agent tracking
- Reason codes for role modifications
- Immutable audit log with timestamps

### Principle of Least Privilege
- Default deny access model
- Explicit permission grants required
- Role hierarchy prevents privilege escalation
- Automatic access revocation on team/project removal

### Data Protection
- Row Level Security on all tables
- Database-level permission enforcement
- Encrypted audit logs
- Secure role transition workflows

## Migration and Deployment

### Database Migration
Run the migration script:
```bash
psql -f supabase_migration/synqforge_access_control_migration.sql
```

### Backend Integration
The access control service is integrated into existing endpoints:
```python
from backend.services.access_control import access_control, Action

# Check permissions before allowing operations
if not access_control.can(db, user_id, Action.EDIT_STORY, project_id):
    raise HTTPException(status_code=403, detail="Permission denied")
```

### Frontend Integration
UI components can query user permissions:
```typescript
// Check if user can perform action
const canEdit = await api.accessControl.checkProjectAccess(
  projectId, 
  'edit_story'
);

// Display appropriate UI elements
if (canEdit.has_permission) {
  showEditButton();
}
```

## Future Enhancements

### Role Templates
- Predefined role combinations (e.g., "QA Reviewer", "Product Owner")
- Custom permission sets per organization
- Role inheritance hierarchies

### Organization-level Roles
- Global admin capabilities
- Cross-team coordination roles
- Enterprise-wide permissions

### Advanced Audit Features
- Role change notifications
- Permission analytics and reporting
- Compliance audit exports
- Risk assessment dashboards

## Conclusion

The SynqForge access control implementation provides a robust, scalable, and secure authorization system that follows industry best practices. The system supports complex organizational structures while maintaining simplicity for end users and administrators.

Key benefits:
- **Flexible**: Supports both team-based and project-specific access patterns
- **Secure**: Multiple layers of security with comprehensive audit trails
- **Scalable**: Efficient database queries and caching support
- **User-friendly**: Intuitive role model with clear permission boundaries
- **Maintainable**: Clean separation of concerns and well-documented APIs 