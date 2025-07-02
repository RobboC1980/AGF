# Project Admin System

## Overview

AgileForge implements a flexible role-based access control (RBAC) system that automatically makes users administrators of projects they create, while also supporting team collaboration.

## User Roles

### Global Roles
- **Admin**: Full system access, can manage all projects and users
- **Manager**: Can create and manage projects, but limited user management
- **Member**: Can create projects and work on assigned projects
- **Viewer**: Read-only access to assigned projects

### Project-Specific Roles
- **Project Admin**: Full control over a specific project
- **Project Editor**: Can create/edit content but not manage members
- **Project Viewer**: Read-only access to project content

## How It Works

### New User Registration
1. When a user signs up with Clerk, they automatically get:
   - A profile in the database
   - **Member** role by default
   - Ability to create their own projects

### Project Creation
When a user creates a new project:
1. ✅ **Automatic Ownership**: User becomes the project owner (`owner_id` and `created_by`)
2. ✅ **Automatic Admin Role**: User is automatically added to `project_members` with `admin` role
3. ✅ **Full Permissions**: Project creators get all admin permissions for their project:
   - Create/edit/delete epics, stories, and tasks
   - Manage project members
   - Assign users to tasks
   - Delete the entire project

### Permission Hierarchy

```
Global Admin > Project Owner/Admin > Project Editor > Project Member > Project Viewer
```

### What Project Creators Can Do

As a project admin, creators can:
- ✅ **Full Project Control**: Edit project details, status, priority
- ✅ **Content Management**: Create/edit/delete all epics, stories, and tasks
- ✅ **Team Management**: Add/remove team members from their project
- ✅ **Role Assignment**: Assign roles to team members (admin, editor, viewer)
- ✅ **Project Deletion**: Delete their own projects
- ✅ **Analytics**: View project analytics and reports

### Team Collaboration

Project admins can invite others by:
1. Adding users to the project via the team management interface
2. Assigning appropriate roles:
   - **Admin**: Co-admin with full project control
   - **Editor**: Can create/edit content but not manage team
   - **Viewer**: Read-only access

### Security Features

- ✅ **Row Level Security (RLS)**: Database-level access control
- ✅ **API Authentication**: All API calls require valid Clerk tokens
- ✅ **Role Validation**: Permissions checked on every action
- ✅ **Automatic Profile Creation**: New Clerk users get profiles automatically

## Examples

### Scenario 1: Solo Developer
- User creates "My Personal Project"
- Automatically becomes project admin
- Can work alone with full control
- Can invite collaborators later if needed

### Scenario 2: Team Lead
- User creates "Team Alpha Project"
- Automatically becomes project admin
- Invites team members with appropriate roles
- Manages project timeline and deliverables

### Scenario 3: Freelancer
- User creates multiple client projects
- Each project is isolated with separate permissions
- Can give clients viewer access to their projects
- Maintains full control over project management

## API Endpoints

### Project Creation
```javascript
POST /api/projects
{
  "name": "My New Project",
  "description": "Project description",
  "status": "active",
  "priority": "high"
}
```

Response includes `creator_is_admin: true` to confirm admin role assignment.

### Project Access Check
```javascript
GET /api/users/{userId}/project-access
```

Returns list of projects user has access to with their roles.

## Database Schema

### Key Tables
- `profiles`: User profiles with global roles
- `projects`: Project information with `owner_id` and `created_by`
- `project_members`: Project-specific role assignments

### Automatic Triggers
- User profile creation on first Clerk authentication
- Project member addition on project creation
- Permission validation on all operations

## Best Practices

1. **Default Permissions**: New users start with minimal global permissions but full control over their projects
2. **Principle of Least Privilege**: Users only get access to projects they create or are explicitly added to
3. **Audit Trail**: All project creation and role assignments are logged
4. **Graceful Degradation**: System continues to work even if some permission checks fail

This system ensures that users have immediate productivity (can create and manage their own projects) while maintaining security and enabling team collaboration when needed. 