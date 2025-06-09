// Authentication and Authorization Types

export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER', 
  DEVELOPER = 'DEVELOPER',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER'
}

export enum Permission {
  // User management
  CREATE_USER = 'CREATE_USER',
  READ_USER = 'READ_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  
  // Project management
  CREATE_PROJECT = 'CREATE_PROJECT',
  READ_PROJECT = 'READ_PROJECT',
  UPDATE_PROJECT = 'UPDATE_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',
  
  // Epic management
  CREATE_EPIC = 'CREATE_EPIC',
  READ_EPIC = 'READ_EPIC',
  UPDATE_EPIC = 'UPDATE_EPIC',
  DELETE_EPIC = 'DELETE_EPIC',
  
  // Story management
  CREATE_STORY = 'CREATE_STORY',
  READ_STORY = 'READ_STORY',
  UPDATE_STORY = 'UPDATE_STORY',
  DELETE_STORY = 'DELETE_STORY',
  
  // Task management
  CREATE_TASK = 'CREATE_TASK',
  READ_TASK = 'READ_TASK',
  UPDATE_TASK = 'UPDATE_TASK',
  DELETE_TASK = 'DELETE_TASK',
  
  // AI features
  USE_AI_GENERATION = 'USE_AI_GENERATION',
  ACCESS_AI_ADMIN = 'ACCESS_AI_ADMIN',
  
  // System admin
  ACCESS_ADMIN_PANEL = 'ACCESS_ADMIN_PANEL',
  MANAGE_SYSTEM_CONFIG = 'MANAGE_SYSTEM_CONFIG'
}

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions?: Permission[];
}

export interface JWTPayload extends UserPayload {
  iat?: number;
  exp?: number;
}

// Role to Permissions mapping
export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full access to everything
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.CREATE_PROJECT,
    Permission.READ_PROJECT,
    Permission.UPDATE_PROJECT,
    Permission.DELETE_PROJECT,
    Permission.CREATE_EPIC,
    Permission.READ_EPIC,
    Permission.UPDATE_EPIC,
    Permission.DELETE_EPIC,
    Permission.CREATE_STORY,
    Permission.READ_STORY,
    Permission.UPDATE_STORY,
    Permission.DELETE_STORY,
    Permission.CREATE_TASK,
    Permission.READ_TASK,
    Permission.UPDATE_TASK,
    Permission.DELETE_TASK,
    Permission.USE_AI_GENERATION,
    Permission.ACCESS_AI_ADMIN,
    Permission.ACCESS_ADMIN_PANEL,
    Permission.MANAGE_SYSTEM_CONFIG,
  ],
  
  [UserRole.PROJECT_MANAGER]: [
    // Can manage projects and read users
    Permission.READ_USER,
    Permission.CREATE_PROJECT,
    Permission.READ_PROJECT,
    Permission.UPDATE_PROJECT,
    Permission.DELETE_PROJECT,
    Permission.CREATE_EPIC,
    Permission.READ_EPIC,
    Permission.UPDATE_EPIC,
    Permission.DELETE_EPIC,
    Permission.CREATE_STORY,
    Permission.READ_STORY,
    Permission.UPDATE_STORY,
    Permission.DELETE_STORY,
    Permission.CREATE_TASK,
    Permission.READ_TASK,
    Permission.UPDATE_TASK,
    Permission.DELETE_TASK,
    Permission.USE_AI_GENERATION,
  ],
  
  [UserRole.DEVELOPER]: [
    // Can manage stories and tasks, read projects
    Permission.READ_USER,
    Permission.READ_PROJECT,
    Permission.READ_EPIC,
    Permission.CREATE_STORY,
    Permission.READ_STORY,
    Permission.UPDATE_STORY,
    Permission.CREATE_TASK,
    Permission.READ_TASK,
    Permission.UPDATE_TASK,
    Permission.DELETE_TASK,
    Permission.USE_AI_GENERATION,
  ],
  
  [UserRole.CONTRIBUTOR]: [
    // Can read everything, update tasks
    Permission.READ_USER,
    Permission.READ_PROJECT,
    Permission.READ_EPIC,
    Permission.READ_STORY,
    Permission.READ_TASK,
    Permission.UPDATE_TASK,
    Permission.USE_AI_GENERATION,
  ],
  
  [UserRole.VIEWER]: [
    // Read-only access
    Permission.READ_USER,
    Permission.READ_PROJECT,
    Permission.READ_EPIC,
    Permission.READ_STORY,
    Permission.READ_TASK,
  ],
}

// Helper function to get permissions for a role
export function getPermissionsForRole(role: UserRole): Permission[] {
  return RolePermissions[role] || []
}

// Helper function to check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission)
} 