export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export enum Permission {
  // Project permissions
  CREATE_PROJECT = 'create:project',
  READ_PROJECT = 'read:project',
  UPDATE_PROJECT = 'update:project',
  DELETE_PROJECT = 'delete:project',
  ASSIGN_PROJECT = 'assign:project',
  
  // Epic permissions
  CREATE_EPIC = 'create:epic',
  READ_EPIC = 'read:epic',
  UPDATE_EPIC = 'update:epic',
  DELETE_EPIC = 'delete:epic',
  
  // Story permissions
  CREATE_STORY = 'create:story',
  READ_STORY = 'read:story',
  UPDATE_STORY = 'update:story',
  DELETE_STORY = 'delete:story',
  
  // Task permissions
  CREATE_TASK = 'create:task',
  READ_TASK = 'read:task',
  UPDATE_TASK = 'update:task',
  DELETE_TASK = 'delete:task',
  
  // User management
  MANAGE_USERS = 'manage:users',
  ASSIGN_USERS = 'assign:users',
  VIEW_USERS = 'view:users',
  
  // Analytics permissions
  VIEW_ANALYTICS = 'view:analytics',
  VIEW_ADMIN_ANALYTICS = 'view:admin_analytics',
  
  // Team permissions
  MANAGE_TEAMS = 'manage:teams',
  VIEW_TEAMS = 'view:teams',
}

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full access to everything
    Permission.CREATE_PROJECT,
    Permission.READ_PROJECT,
    Permission.UPDATE_PROJECT,
    Permission.DELETE_PROJECT,
    Permission.ASSIGN_PROJECT,
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
    Permission.MANAGE_USERS,
    Permission.ASSIGN_USERS,
    Permission.VIEW_USERS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ADMIN_ANALYTICS,
    Permission.MANAGE_TEAMS,
    Permission.VIEW_TEAMS,
  ],
  
  [UserRole.MANAGER]: [
    // Can manage projects and teams, but not user assignments
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
    Permission.VIEW_USERS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_TEAMS,
    Permission.VIEW_TEAMS,
  ],
  
  [UserRole.MEMBER]: [
    // Can work on assigned projects
    Permission.READ_PROJECT,
    Permission.CREATE_EPIC,
    Permission.READ_EPIC,
    Permission.UPDATE_EPIC,
    Permission.CREATE_STORY,
    Permission.READ_STORY,
    Permission.UPDATE_STORY,
    Permission.CREATE_TASK,
    Permission.READ_TASK,
    Permission.UPDATE_TASK,
    Permission.DELETE_TASK,
    Permission.VIEW_USERS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_TEAMS,
  ],
  
  [UserRole.VIEWER]: [
    // Read-only access
    Permission.READ_PROJECT,
    Permission.READ_EPIC,
    Permission.READ_STORY,
    Permission.READ_TASK,
    Permission.VIEW_USERS,
    Permission.VIEW_TEAMS,
  ],
}

export interface UserPermissions {
  userId: string
  role: UserRole
  projectAccess: ProjectAccess[]
  teamMemberships: TeamMembership[]
}

export interface ProjectAccess {
  projectId: string
  role: UserRole
  permissions: Permission[]
  assignedBy: string
  assignedAt: Date
}

export interface TeamMembership {
  teamId: string
  role: UserRole
  joinedAt: Date
}

export class RBACService {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(userPermissions: UserPermissions, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userPermissions.role]
    return rolePermissions.includes(permission)
  }

  /**
   * Check if a user can access a specific project
   */
  static canAccessProject(userPermissions: UserPermissions, projectId: string): boolean {
    // Admins can access all projects
    if (userPermissions.role === UserRole.ADMIN) {
      return true
    }

    // Check if user has explicit project access
    const projectAccess = userPermissions.projectAccess.find(
      access => access.projectId === projectId
    )

    return !!projectAccess
  }

  /**
   * Check if user can perform action on project
   */
  static canPerformProjectAction(
    userPermissions: UserPermissions, 
    projectId: string, 
    permission: Permission
  ): boolean {
    // First check if user can access the project
    if (!this.canAccessProject(userPermissions, projectId)) {
      return false
    }

    // Project owners have full admin permissions for their projects
    const projectAccess = userPermissions.projectAccess.find(
      access => access.projectId === projectId
    )
    
    if (projectAccess && projectAccess.role === UserRole.ADMIN) {
      // Project admins have all permissions for the project
      return ROLE_PERMISSIONS[UserRole.ADMIN].includes(permission)
    }

    // Then check if they have the required permission based on their role
    return this.hasPermission(userPermissions, permission)
  }

  /**
   * Check if user owns a project (created it)
   */
  static ownsProject(userPermissions: UserPermissions, project: any): boolean {
    return project.created_by === userPermissions.userId || project.owner_id === userPermissions.userId
  }

  /**
   * Check if user can assign others to project (project admins and global admins)
   */
  static canAssignToProject(userPermissions: UserPermissions, projectId?: string): boolean {
    // Global admins can assign to any project
    if (userPermissions.role === UserRole.ADMIN && 
        this.hasPermission(userPermissions, Permission.ASSIGN_USERS)) {
      return true
    }

    // Project admins can assign to their specific project
    if (projectId) {
      const projectAccess = userPermissions.projectAccess.find(
        access => access.projectId === projectId
      )
      return projectAccess?.role === UserRole.ADMIN
    }

    return false
  }

  /**
   * Get user's effective permissions for a project
   */
  static getProjectPermissions(
    userPermissions: UserPermissions, 
    projectId: string
  ): Permission[] {
    if (!this.canAccessProject(userPermissions, projectId)) {
      return []
    }

    const projectAccess = userPermissions.projectAccess.find(
      access => access.projectId === projectId
    )

    if (projectAccess) {
      // Return permissions based on project-specific role
      return ROLE_PERMISSIONS[projectAccess.role]
    }

    // Default to role-based permissions
    return ROLE_PERMISSIONS[userPermissions.role]
  }

  /**
   * Filter projects based on user access
   */
  static filterAccessibleProjects(
    userPermissions: UserPermissions, 
    projects: any[]
  ): any[] {
    if (userPermissions.role === UserRole.ADMIN) {
      return projects // Global admins see all
    }

    return projects.filter(project => 
      this.canAccessProject(userPermissions, project.id) ||
      this.ownsProject(userPermissions, project)
    )
  }

  /**
   * Check if user can modify resource
   */
  static canModifyResource(
    userPermissions: UserPermissions,
    resource: any,
    permission: Permission
  ): boolean {
    // Check if user has the permission
    if (!this.hasPermission(userPermissions, permission)) {
      return false
    }

    // Admins can modify anything
    if (userPermissions.role === UserRole.ADMIN) {
      return true
    }

    // Check if user created the resource
    if (resource.created_by === userPermissions.userId) {
      return true
    }

    // Check if user is assigned to the resource
    if (resource.assignee_id === userPermissions.userId) {
      return true
    }

    return false
  }

  /**
   * Validate project assignment (admin only)
   */
  static validateProjectAssignment(
    assigner: UserPermissions,
    projectId: string,
    targetUserId: string,
    role: UserRole
  ): { valid: boolean; error?: string } {
    // Only admins can assign users to projects
    if (!this.canAssignToProject(assigner)) {
      return {
        valid: false,
        error: 'Only administrators can assign users to projects'
      }
    }

    // Admins can't assign admin role to others (prevent privilege escalation)
    if (role === UserRole.ADMIN && assigner.role !== UserRole.ADMIN) {
      return {
        valid: false,
        error: 'Cannot assign admin role'
      }
    }

    return { valid: true }
  }
} 