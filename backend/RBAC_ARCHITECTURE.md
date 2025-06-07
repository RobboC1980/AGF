# AgileForge Backend v2.0 - RBAC & Modular Architecture

This document describes the Role-Based Access Control (RBAC) implementation and the new modular architecture introduced in AgileForge Backend v2.0.

## 🏗️ Architecture Overview

### Before (v1.0)
```
src/
├── index.ts (500+ lines, mixed concerns)
├── plugins/
├── services/
│   └── aiService.ts (mixed AI logic)
└── routes/
    └── genericCrud.ts (basic CRUD, no RBAC)
```

### After (v2.0)
```
src/
├── index.new.ts (clean, modular)
├── types/
│   └── auth.ts (RBAC types & permissions)
├── guards/
│   └── auth.guard.ts (authorization middleware)
├── modules/
│   ├── auth/
│   │   └── auth.routes.ts (authentication & user management)
│   ├── projects/
│   │   └── projects.routes.ts (project CRUD with RBAC)
│   └── ai/
│       ├── ai.service.ts (moved from services/)
│       └── ai.routes.ts (AI endpoints with RBAC)
├── plugins/ (enhanced)
└── routes/ (legacy, to be migrated)
```

## 🔐 Role-Based Access Control (RBAC)

### User Roles Hierarchy

```
ADMIN (👑)
├── Full system access
├── User role management
├── AI configuration
└── System administration

PROJECT_MANAGER (📋)
├── Project creation/management
├── Epic & story management
├── Team coordination
└── AI usage

DEVELOPER (💻)
├── Story & task management
├── Development features
├── AI usage
└── Read project data

CONTRIBUTOR (🤝)
├── Task updates
├── Limited project access
├── AI usage
└── Read-only for most data

VIEWER (👀)
├── Read-only access
├── Basic project visibility
└── Dashboard access
```

### Permission System

#### User Management
- `CREATE_USER` - Create new users (Admin only)
- `READ_USER` - View user information
- `UPDATE_USER` - Modify user data (Admin only)
- `DELETE_USER` - Remove users (Admin only)

#### Project Management
- `CREATE_PROJECT` - Create new projects (PM+)
- `READ_PROJECT` - View project data
- `UPDATE_PROJECT` - Modify projects (PM+)
- `DELETE_PROJECT` - Remove projects (PM+)

#### Epic Management
- `CREATE_EPIC` - Create epics (PM+)
- `READ_EPIC` - View epic data
- `UPDATE_EPIC` - Modify epics (PM+)
- `DELETE_EPIC` - Remove epics (PM+)

#### Story Management
- `CREATE_STORY` - Create stories (Developer+)
- `READ_STORY` - View story data
- `UPDATE_STORY` - Modify stories (Developer+)
- `DELETE_STORY` - Remove stories (Developer+)

#### Task Management
- `CREATE_TASK` - Create tasks (Developer+)
- `READ_TASK` - View task data
- `UPDATE_TASK` - Modify tasks (Contributor+)
- `DELETE_TASK` - Remove tasks (Developer+)

#### AI Features
- `USE_AI_GENERATION` - Use AI generation features
- `ACCESS_AI_ADMIN` - Access AI admin panel (Admin only)

#### System Administration
- `ACCESS_ADMIN_PANEL` - Access admin interface (Admin only)
- `MANAGE_SYSTEM_CONFIG` - Modify system settings (Admin only)

## 🛡️ Guards & Middleware

### Authentication Guards

```typescript
// Require valid JWT token
requireAuth

// Require specific role
requireRole(UserRole.ADMIN)

// Require any of multiple roles
requireAnyRole([UserRole.ADMIN, UserRole.PROJECT_MANAGER])

// Require specific permission
requirePermission(Permission.CREATE_PROJECT)

// Require any of multiple permissions
requireAnyPermission([Permission.READ_PROJECT, Permission.READ_EPIC])

// Optional authentication (doesn't fail if no token)
optionalAuth
```

### Convenience Guards

```typescript
// Pre-configured role guards
requireAdmin
requireProjectManagerOrAbove
requireDeveloperOrAbove
```

## 📡 API Endpoints with RBAC

### Authentication Module (`/auth`)

| Method | Endpoint | Access Level | Description |
|--------|----------|--------------|-------------|
| POST | `/auth/login` | Public | User login |
| POST | `/auth/register` | Public | User registration |
| GET | `/auth/me` | Authenticated | Current user info |
| GET | `/auth/users` | Admin Only | List all users |
| PUT | `/auth/users/:id/role` | Admin Only | Update user role |

### Projects Module (`/projects`)

| Method | Endpoint | Permission Required | Description |
|--------|----------|-------------------|-------------|
| GET | `/projects` | READ_PROJECT | List projects |
| POST | `/projects` | CREATE_PROJECT | Create project |
| GET | `/projects/:id` | READ_PROJECT | Get project details |
| PUT | `/projects/:id` | UPDATE_PROJECT | Update project |
| DELETE | `/projects/:id` | DELETE_PROJECT | Delete project |
| GET | `/projects/:id/stats` | Developer+ | Project statistics |

### AI Module (`/ai`)

| Method | Endpoint | Permission Required | Description |
|--------|----------|-------------------|-------------|
| GET | `/ai/health` | USE_AI_GENERATION | AI service status |
| POST | `/ai/generate-story` | USE_AI_GENERATION | Generate user story |
| POST | `/ai/generate-epic` | USE_AI_GENERATION | Generate epic |
| POST | `/ai/generate-tasks` | USE_AI_GENERATION | Generate tasks |
| GET | `/ai/stats` | Admin Only | AI usage statistics |
| GET | `/ai/config` | Admin Only | AI configuration |
| PUT | `/ai/config` | Admin Only | Update AI config |

## 🔧 Implementation Details

### JWT Token Structure

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "DEVELOPER",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Role Assignment

New users are assigned `VIEWER` role by default. Only admins can update user roles:

```bash
# Update user role (Admin only)
PUT /auth/users/{userId}/role
{
  "role": "PROJECT_MANAGER"
}
```

### Permission Checking

```typescript
// Example: Check if user can create projects
if (hasPermission(user.role, Permission.CREATE_PROJECT)) {
  // Allow project creation
}

// Example: Get all permissions for a role
const permissions = getPermissionsForRole(UserRole.DEVELOPER);
```

## 🚀 Migration Guide

### From v1.0 to v2.0

1. **Update your authentication tokens**
   - New tokens include `role` field
   - Existing tokens will default to `VIEWER` role

2. **Update API calls**
   - Authentication routes moved to `/auth` prefix
   - Projects routes moved to `/projects` prefix
   - AI routes moved to `/ai` prefix

3. **Handle new error responses**
   ```json
   {
     "error": "Insufficient privileges",
     "message": "Permission CREATE_PROJECT required",
     "code": "FORBIDDEN",
     "userRole": "VIEWER",
     "requiredPermission": "CREATE_PROJECT"
   }
   ```

### Backward Compatibility

- Legacy CRUD routes still work with basic authentication
- Existing JWT tokens are supported (with default VIEWER role)
- Old endpoints remain functional during migration period

## 🧪 Testing RBAC

### Create Test Users

```bash
# Create admin user
POST /auth/register
{
  "email": "admin@example.com",
  "password": "admin123",
  "name": "Admin User",
  "role": "ADMIN"
}

# Create project manager
POST /auth/register
{
  "email": "pm@example.com",
  "password": "pm123",
  "name": "Project Manager",
  "role": "PROJECT_MANAGER"
}
```

### Test Role Restrictions

```bash
# Try to create project as VIEWER (should fail)
curl -H "Authorization: Bearer <viewer-token>" \
     -X POST http://localhost:4000/projects \
     -d '{"name": "Test Project", "description": "Test"}'

# Response: 403 Forbidden
{
  "error": "Insufficient privileges",
  "message": "Permission CREATE_PROJECT required",
  "code": "FORBIDDEN"
}
```

## 📊 Monitoring & Logs

### Authentication Logs

```
Auth: User admin@example.com (ADMIN) authenticated
Auth: User dev@example.com role DEVELOPER insufficient, required: ADMIN
Auth: User pm@example.com has required role: PROJECT_MANAGER
```

### Authorization Logs

```
User pm@example.com created project: AgileForge v2.0
User dev@example.com (DEVELOPER) generating story for epic: User Authentication
Admin admin@example.com updating AI configuration
```

## 🔒 Security Best Practices

1. **Principle of Least Privilege**
   - Users get minimum permissions needed
   - Regular role audits recommended

2. **Token Security**
   - JWT tokens include role information
   - Tokens expire and must be refreshed
   - Secure token storage required

3. **API Security**
   - All endpoints require authentication (except public ones)
   - Permission checks on every protected route
   - Detailed audit logging

4. **Role Management**
   - Only admins can modify user roles
   - Role changes are logged
   - No self-role-elevation possible

## 📈 Performance Considerations

- **Permission Checking**: O(1) lookup using role-permission mapping
- **Token Validation**: Stateless JWT validation
- **Database Queries**: Efficient permission-based filtering
- **Caching**: Role-permission mappings cached in memory

## 🔄 Future Enhancements

- [ ] Project-level permissions (per-project roles)
- [ ] Time-based role assignments
- [ ] Permission inheritance
- [ ] External identity provider integration
- [ ] Advanced audit logging with database storage 