# AgileForge RBAC Security Implementation Guide

## Overview

This document outlines the complete Role-Based Access Control (RBAC) security implementation for AgileForge, ensuring users can only access projects they created or are assigned to, with admin-only assignment capabilities.

## Security Architecture

### Core Principles

1. **Principle of Least Privilege**: Users get minimum necessary permissions
2. **Admin-Only Assignment**: Only administrators can assign users to projects
3. **Owner-Based Access**: Project creators have full access to their projects
4. **Explicit Access**: Access must be explicitly granted (no implicit permissions)
5. **Audit Trail**: All access changes are logged with timestamps and assigners

## Role Hierarchy

### User Roles (in order of privileges)

1. **Admin** (`admin`)
   - Full system access
   - Can assign/remove users from any project
   - Can create, read, update, delete any resource
   - Can view admin analytics and manage users

2. **Manager** (`manager`)
   - Can create and manage projects
   - Full access to assigned projects
   - Cannot assign users to projects
   - Can manage teams within their scope

3. **Member** (`member`)
   - Can work on assigned projects
   - Can create epics, stories, tasks within assigned projects
   - Cannot create new projects (unless upgraded)
   - Cannot assign other users

4. **Viewer** (`viewer`)
   - Read-only access to assigned projects
   - Cannot create or modify any resources
   - Suitable for stakeholders and observers

## Database Schema Implementation

### Key Tables

#### 1. Users Table
```sql
CREATE TABLE public.users (
    id TEXT PRIMARY KEY, -- Clerk user ID
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    is_active BOOLEAN DEFAULT TRUE,
    -- ... other fields
);
```

#### 2. Project Access Control
```sql
CREATE TABLE public.project_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    user_id TEXT NOT NULL REFERENCES public.users(id),
    role TEXT NOT NULL,
    assigned_by TEXT NOT NULL REFERENCES public.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(project_id, user_id)
);
```

### Row Level Security (RLS) Policies

All tables have RLS enabled with policies that:
- Allow admins full access
- Allow owners full access to their resources
- Allow assigned users access based on project membership
- Deny access to unauthorized users

## Frontend Implementation

### 1. RBAC Hook System

#### Core Hooks

```typescript
// Main RBAC hook
const { 
  hasPermission, 
  canAccessProject, 
  isAdmin, 
  filterProjects 
} = useRBAC()

// Permission-specific hooks
const { hasPermission: canCreate } = usePermission(Permission.CREATE_PROJECT)
const { canAccess, canUpdate } = useProjectPermissions(projectId)
const { filterProjects } = useSecureData()
```

### 2. Component Security Integration

#### Project Lists
```typescript
// Filter projects based on user access
const projects = useMemo(() => {
  return filterProjects(allProjects)
}, [allProjects, filterProjects])

// Conditional rendering based on permissions
{canCreateProject && (
  <Button onClick={onCreateNew}>Create Project</Button>
)}
```

#### Action Menus
```typescript
// Conditional dropdown menu items
{canUpdateProject && (
  <DropdownMenuItem onClick={() => handleEdit(project)}>
    Edit Project
  </DropdownMenuItem>
)}

{canAssignUsers && (
  <DropdownMenuItem onClick={() => openAssignmentPanel(project)}>
    Manage Access
  </DropdownMenuItem>
)}
```

### 3. Admin-Only Assignment Panel

The `ProjectAssignmentPanel` component provides:
- Search and filter available users
- Role-based assignment with validation
- Current assignments display
- Remove user functionality
- Security checks and error handling

```typescript
// Early permission check
if (!isAdmin || !canAssignToProject) {
  return <AccessDeniedMessage />
}
```

## Backend Security Integration

### 1. Clerk JWT Verification

```python
# backend/auth/clerk_auth.py
def verify_clerk_token(token: str) -> dict:
    """Verify Clerk JWT token and extract user info"""
    try:
        payload = jwt.decode(token, public_key, algorithms=['RS256'])
        return {
            'user_id': payload['sub'],
            'email': payload.get('email'),
            'role': get_user_role(payload['sub'])
        }
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
```

### 2. Authorization Dependencies

```python
# Authentication dependency
async def get_current_user(token: str = Depends(oauth2_scheme)):
    return verify_clerk_token(token)

# Admin-only dependency
async def require_admin(user = Depends(get_current_user)):
    if user['role'] != 'admin':
        raise HTTPException(403, "Admin access required")
    return user
```

### 3. API Endpoint Security

```python
# Project assignment endpoint (admin only)
@router.post("/projects/{project_id}/assignments")
async def assign_user_to_project(
    project_id: str,
    assignment: UserAssignment,
    current_user = Depends(require_admin)
):
    # Validate assignment using database function
    result = await db.execute(
        "SELECT assign_user_to_project($1, $2, $3)",
        project_id, assignment.user_id, assignment.role
    )
    return {"success": True}
```

### 4. Database Function Security

```sql
-- Admin-only assignment function
CREATE OR REPLACE FUNCTION assign_user_to_project(
    p_project_id UUID,
    p_user_id TEXT,
    p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is admin
    IF NOT auth.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can assign users';
    END IF;
    
    -- Perform assignment logic
    -- ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Clerk Integration

### 1. User Role Management

#### Setting User Roles
```typescript
// Set role in Clerk public metadata (admin only)
await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: { role: 'manager' }
})
```

#### Reading User Roles
```typescript
// Get role from Clerk user object
function getUserRole(user: any): UserRole {
  return user.publicMetadata?.role || UserRole.MEMBER
}
```

### 2. JWT Template Configuration

In Clerk Dashboard, create JWT template with:
```json
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "role": "{{user.public_metadata.role}}",
  "iss": "https://your-clerk-domain.clerk.accounts.dev",
  "aud": "your-audience"
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# JWT Configuration (for backend)
CLERK_PEM_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

## Security Best Practices

### 1. Frontend Security

- **Never trust client-side permissions**: Always validate on backend
- **Use TypeScript**: Ensure type safety for roles and permissions
- **Hide UI elements**: Don't show actions users can't perform
- **Graceful degradation**: Handle permission errors elegantly

### 2. Backend Security

- **Validate every request**: Check permissions on all endpoints
- **Use RLS policies**: Database-level security as last line of defense
- **Audit trails**: Log all permission changes and access attempts
- **Rate limiting**: Prevent abuse of assignment endpoints

### 3. Database Security

- **Enable RLS**: All tables should have Row Level Security
- **Security definer functions**: Use for privileged operations
- **Proper indexing**: Ensure security checks are performant
- **Regular backups**: Protect against data loss

## Testing Strategy

### 1. Unit Tests

```typescript
// Test permission checking
describe('useRBAC', () => {
  it('should deny project access for non-members', () => {
    const { canAccessProject } = renderHook(() => useRBAC())
    expect(canAccessProject('project-id')).toBe(false)
  })
})
```

### 2. Integration Tests

```python
# Test API endpoint security
def test_assign_user_requires_admin():
    response = client.post(
        "/projects/123/assignments",
        headers={"Authorization": f"Bearer {member_token}"}
    )
    assert response.status_code == 403
```

### 3. End-to-End Tests

```typescript
// Test complete user workflow
test('member cannot assign users to projects', async () => {
  await loginAs('member')
  await goToProject('project-1')
  expect(page.locator('[data-testid="assign-user-button"]')).not.toBeVisible()
})
```

## Monitoring and Auditing

### 1. Access Logs

- Log all project access attempts
- Track permission changes
- Monitor failed authorization attempts
- Alert on suspicious patterns

### 2. Metrics to Track

- Failed permission checks per user
- Project assignment frequency
- Role distribution across users
- Access pattern anomalies

### 3. Security Alerts

Set up alerts for:
- Multiple failed admin access attempts
- Unusual project assignment patterns
- Permission escalation attempts
- Suspicious user behavior

## Migration and Deployment

### 1. Database Migration

```sql
-- Run the RBAC schema migration
\i docs/RBAC_DATABASE_SCHEMA.sql

-- Set initial admin user
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@yourcompany.com';
```

### 2. Clerk Configuration

1. Create JWT template in Clerk Dashboard
2. Configure redirect URLs
3. Set up webhook endpoints (optional)
4. Test authentication flow

### 3. Environment Setup

1. Deploy backend with new environment variables
2. Update frontend build with Clerk keys
3. Run database migrations
4. Test complete authorization flow

## Troubleshooting

### Common Issues

1. **Users can't access their own projects**
   - Check RLS policies are enabled
   - Verify JWT token contains correct user ID
   - Ensure project ownership is correctly set

2. **Admin can't assign users**
   - Verify admin role in Clerk metadata
   - Check JWT template includes role claim
   - Validate admin permissions in database

3. **Database function errors**
   - Check auth functions exist and are accessible
   - Verify RLS policies don't conflict
   - Ensure proper indexing for performance

### Debug Steps

1. Check browser network tab for API errors
2. Verify JWT token content using jwt.io
3. Test RLS policies directly in Supabase
4. Check server logs for authorization failures

## Conclusion

This RBAC implementation provides comprehensive security for AgileForge:

- ✅ Users can only access projects they created or are assigned to
- ✅ Only admins can assign users to projects
- ✅ Proper role hierarchy with appropriate permissions
- ✅ Database-level security with RLS policies
- ✅ Frontend security with conditional rendering
- ✅ Backend security with JWT verification
- ✅ Audit trails and monitoring capabilities

The system is designed to be secure by default, with multiple layers of protection and clear separation of concerns between roles. 