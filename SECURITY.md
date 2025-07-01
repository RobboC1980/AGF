# AgileForge Security & Access Control

This document explains the comprehensive Role-Based Access Control (RBAC) system implemented in AgileForge, including security patterns, developer guidelines, and onboarding procedures.

## Overview

AgileForge implements strict project-based access control using:
- **Clerk** for authentication and JWT token management
- **Supabase Row-Level Security (RLS)** for database-level access control
- **Project-based permissions** with role inheritance
- **Global admin override** capabilities

## Access Control Model

### Core Principle
**Every project and its child entities (epics, stories, tasks, sprints, analytics) are protected by the same access rule:**

```sql
-- A user can access content if they are:
-- 1. Global admin (is_admin = true)
-- 2. Project owner (created_by or owner_id = user_id)
-- 3. Explicit project member (in project_members table)
```

### User Roles

#### Global Roles
- **Global Admin** (`is_admin = true`): Bypasses all project restrictions, can access everything
- **Regular User** (`is_admin = false`): Subject to project-level permissions

#### Project-Level Roles
- **Project Owner**: Full control, can assign admin roles to others
- **Project Admin**: Full access except cannot grant admin role to others
- **Project Editor**: Can create, read, update, and delete content
- **Project Viewer**: Read-only access to all project content

## Database Schema

### Core Tables

```sql
-- User profiles with global admin flag
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,  -- Global admin flag
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Project ownership and basic info
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_by UUID REFERENCES public.profiles(id),
    owner_id UUID REFERENCES public.profiles(id),  -- Explicit ownership
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Project membership with role-based access
CREATE TYPE project_member_role AS ENUM ('viewer', 'editor', 'admin');

CREATE TABLE public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role project_member_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);
```

### RLS Policies Pattern

All protected tables follow this RLS pattern:

```sql
-- SELECT: Can read if has project access
CREATE POLICY "Users can see [entity] in accessible projects"
    ON public.[entity] FOR SELECT
    USING (has_project_access(get_project_id_for_[entity](id)));

-- INSERT: Can create if has project access
CREATE POLICY "Project members can create [entity]"
    ON public.[entity] FOR INSERT
    WITH CHECK (has_project_access([parent_project_id]));

-- UPDATE: Can modify if has project access
CREATE POLICY "Project members can update [entity]"
    ON public.[entity] FOR UPDATE
    USING (has_project_access(get_project_id_for_[entity](id)));

-- DELETE: Only editors/admins can delete (with exceptions)
CREATE POLICY "Project editors and admins can delete [entity]"
    ON public.[entity] FOR DELETE
    USING (
        -- Global admin
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        OR
        -- Project owner
        [owner_check]
        OR
        -- Project editor/admin
        [editor_admin_check]
    );
```

## Security Functions

### Core Access Control Function

```sql
CREATE OR REPLACE FUNCTION has_project_access(project_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_uuid AND is_admin = TRUE) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is project owner
    IF EXISTS (SELECT 1 FROM public.projects WHERE id = project_uuid AND (owner_id = user_uuid OR created_by = user_uuid)) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is explicit project member
    IF EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_uuid AND user_id = user_uuid) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Member Management Functions

```sql
-- Add member with role escalation prevention
CREATE OR REPLACE FUNCTION add_project_member(
    p_project_id UUID,
    p_user_id UUID, 
    p_role TEXT DEFAULT 'viewer'
) RETURNS BOOLEAN;

-- Remove member
CREATE OR REPLACE FUNCTION remove_project_member(
    p_project_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN;
```

## Authentication Integration

### Clerk JWT Template

Configure Clerk to include the user ID in Supabase-compatible JWTs:

```json
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "app_metadata": {
    "provider": "clerk"
  }
}
```

### Supabase Client Creation

```typescript
import { createClient } from '@supabase/supabase-js';

export const createClerkSupabaseClient = (supabaseAccessToken?: string) => {
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: supabaseAccessToken ? {
          Authorization: `Bearer ${supabaseAccessToken}`,
        } : {},
      },
      auth: {
        persistSession: false,
      },
    }
  );
};
```

## API Routes Implementation

### Next.js API Routes

```typescript
// app/api/users/[userId]/project-access/route.ts
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const { userId: currentUserId, getToken } = auth();
  const supabaseAccessToken = await getToken({ template: 'supabase' });
  const supabase = createClerkSupabaseClient(supabaseAccessToken);
  
  // Access control logic...
}
```

## Role Permissions Matrix

| Action | Viewer | Editor | Admin | Owner | Global Admin |
|--------|--------|--------|-------|-------|--------------|
| Read Project | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update Project | ❌ | ✅ | ✅ | ✅ | ✅ |
| Delete Project | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create Epics/Stories/Tasks | ❌ | ✅ | ✅ | ✅ | ✅ |
| Update Epics/Stories/Tasks | ❌ | ✅ | ✅ | ✅ | ✅ |
| Delete Epics/Stories | ❌ | ✅ | ✅ | ✅ | ✅ |
| Delete Own Tasks | ❌ | ✅ | ✅ | ✅ | ✅ |
| View Project Members | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add Project Members | ❌ | ❌ | ✅ | ✅ | ✅ |
| Remove Project Members | ❌ | ❌ | ✅ | ✅ | ✅ |
| Grant Admin Role | ❌ | ❌ | ❌ | ✅ | ✅ |

## Developer Guidelines

### 1. Adding New Protected Entities

When adding a new entity (e.g., `comments`):

1. **Add project reference**: Ensure the entity can trace back to a project
2. **Enable RLS**: `ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;`
3. **Create helper function**: `get_project_id_for_comment(comment_uuid UUID)`
4. **Add RLS policies**: Follow the standard pattern
5. **Update database types**: Add to `Database` interface
6. **Test thoroughly**: Verify all role combinations

### 2. API Route Security

```typescript
// Always authenticate
const { userId, getToken } = auth();
if (!userId) return unauthorized();

// Get Supabase token
const token = await getToken({ template: 'supabase' });
const supabase = createClerkSupabaseClient(token);

// Let RLS handle access control - don't implement custom logic
const { data, error } = await supabase.from('entity').select('*');
```

### 3. Frontend Component Security

```typescript
// Use RBAC hooks
const { canAccessProject, isLoading } = useProjectPermissions(projectId);

if (isLoading) return <Spinner />;
if (!canAccessProject) return <AccessDenied />;

// Component renders securely
```

### 4. Testing Requirements

Every new feature must include tests for:
- ✅ Owner can perform action
- ✅ Admin can perform action  
- ✅ Editor permissions (read/write but limited delete)
- ✅ Viewer permissions (read-only)
- ❌ Non-member cannot access
- ✅ Global admin bypasses restrictions

## Security Best Practices

### ✅ Do
- Always use RLS policies instead of application-level checks
- Use `SECURITY INVOKER` for helper functions that query protected tables
- Implement role escalation prevention
- Use UTC timestamps consistently
- Test with different user roles
- Use enum types for better performance
- Create partial indexes for frequently queried conditions

### ❌ Don't
- Implement access control logic in API routes (use RLS)
- Use `SECURITY DEFINER` for functions that bypass RLS
- Allow project admins to grant admin roles
- Trust client-side permission checks
- Forget to enable RLS on new tables
- Mix different access control patterns

## Onboarding New Developers

### 1. Required Reading
- [ ] This SECURITY.md document
- [ ] Supabase RLS documentation
- [ ] Clerk authentication guide

### 2. Environment Setup
- [ ] Configure Clerk JWT template
- [ ] Set up Supabase environment variables
- [ ] Run RBAC migration: `psql -f supabase_migration/rbac_implementation.sql`
- [ ] Run tests: `npm run test -- __tests__/rbac-integration.test.ts`

### 3. Development Workflow
- [ ] Always test with multiple user roles
- [ ] Use the RBAC testing utilities
- [ ] Verify RLS policies in Supabase dashboard
- [ ] Check API routes return proper errors for unauthorized access

## Troubleshooting

### Common Issues

**"Failed to fetch project access: Not Found"**
- Check API routes exist: `app/api/users/[userId]/project-access/route.ts`
- Verify Clerk JWT template includes `sub` claim
- Ensure Supabase environment variables are set

**"RLS policy violation"**
- Verify user has project access
- Check if RLS is enabled on the table
- Confirm helper functions use `SECURITY INVOKER`

**"Permission denied" on member management**
- Verify user has `admin` role on project
- Check role escalation prevention logic
- Confirm project ownership

### Debugging Tools

```sql
-- Check user's project access
SELECT has_project_access('[project-id]', '[user-id]');

-- View user's project memberships
SELECT * FROM project_members WHERE user_id = '[user-id]';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'projects';
```

## Migration and Updates

When updating the RBAC system:

1. **Test in development first**
2. **Backup production database**
3. **Run migration during low-traffic period**
4. **Verify with integration tests**
5. **Monitor for access issues**

## Security Incident Response

If unauthorized access is suspected:

1. **Immediately check RLS policies**: Verify they're enabled and correct
2. **Audit recent access**: Check Supabase logs for unusual activity
3. **Review project memberships**: Look for unexpected role assignments
4. **Update affected users**: Force re-authentication if needed
5. **Document and improve**: Add tests to prevent recurrence

---

For questions about the security implementation, contact the development team or file an issue in the repository. 