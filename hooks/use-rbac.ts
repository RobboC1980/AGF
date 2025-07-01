import { useUser } from '@clerk/nextjs'
import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  UserRole, 
  Permission, 
  UserPermissions, 
  ProjectAccess, 
  TeamMembership,
  RBACService 
} from '@/lib/rbac'

// Hook to manage user permissions and RBAC
export function useRBAC() {
  const { user, isLoaded } = useUser()
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)

  // Fetch user permissions from your backend/database
  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      // This would typically fetch from your backend
      // For now, we'll determine role from Clerk metadata
      const role = getUserRoleFromClerk(user)
      
      // In a real implementation, you'd fetch project access from your database
      const projectAccess: ProjectAccess[] = await fetchUserProjectAccess(user.id)
      const teamMemberships: TeamMembership[] = await fetchUserTeamMemberships(user.id)
      
      return {
        userId: user.id,
        role,
        projectAccess,
        teamMemberships
      }
    },
    enabled: isLoaded && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  useEffect(() => {
    if (permissionsData) {
      setUserPermissions(permissionsData)
    }
  }, [permissionsData])

  // Helper functions for permission checking
  const rbac = useMemo(() => {
    if (!userPermissions) {
      return {
        hasPermission: () => false,
        canAccessProject: () => false,
        canPerformProjectAction: () => false,
        ownsProject: () => false,
        canAssignToProject: () => false,
        canModifyResource: () => false,
        filterAccessibleProjects: () => [],
        getProjectPermissions: () => [],
        validateProjectAssignment: () => ({ valid: false, error: 'User not loaded' }),
        userPermissions: null,
        isAdmin: false,
        isManager: false,
        isMember: false,
        isViewer: false,
      }
    }

    return {
      hasPermission: (permission: Permission) => 
        RBACService.hasPermission(userPermissions, permission),
      
      canAccessProject: (projectId: string) => 
        RBACService.canAccessProject(userPermissions, projectId),
      
      canPerformProjectAction: (projectId: string, permission: Permission) => 
        RBACService.canPerformProjectAction(userPermissions, projectId, permission),
      
      ownsProject: (project: any) => 
        RBACService.ownsProject(userPermissions, project),
      
      canAssignToProject: () => 
        RBACService.canAssignToProject(userPermissions),
      
      canModifyResource: (resource: any, permission: Permission) => 
        RBACService.canModifyResource(userPermissions, resource, permission),
      
      filterAccessibleProjects: (projects: any[]) => 
        RBACService.filterAccessibleProjects(userPermissions, projects),
      
      getProjectPermissions: (projectId: string) => 
        RBACService.getProjectPermissions(userPermissions, projectId),
      
      validateProjectAssignment: (projectId: string, targetUserId: string, role: UserRole) => 
        RBACService.validateProjectAssignment(userPermissions, projectId, targetUserId, role),
      
      userPermissions,
      isAdmin: userPermissions.role === UserRole.ADMIN,
      isManager: userPermissions.role === UserRole.MANAGER,
      isMember: userPermissions.role === UserRole.MEMBER,
      isViewer: userPermissions.role === UserRole.VIEWER,
    }
  }, [userPermissions])

  return {
    ...rbac,
    isLoading: isLoading || !isLoaded,
    user,
  }
}

// Helper function to determine user role from Clerk metadata
function getUserRoleFromClerk(user: any): UserRole {
  // Check public metadata first (set by admin)
  const publicRole = user.publicMetadata?.role
  if (publicRole && Object.values(UserRole).includes(publicRole)) {
    return publicRole as UserRole
  }

  // Check private metadata (set by your backend)
  const privateRole = user.privateMetadata?.role
  if (privateRole && Object.values(UserRole).includes(privateRole)) {
    return privateRole as UserRole
  }

  // Default to member role
  return UserRole.MEMBER
}

// API functions for fetching user permissions
async function fetchUserProjectAccess(userId: string): Promise<ProjectAccess[]> {
  try {
    const token = await window.Clerk?.session?.getToken()
    if (!token) throw new Error('No authentication token')
    
    const response = await fetch(`/api/users/${userId}/project-access`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch project access: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.map((access: any) => ({
      projectId: access.project_id,
      role: access.role as UserRole,
      permissions: access.permissions || [],
      assignedBy: access.assigned_by,
      assignedAt: new Date(access.assigned_at)
    }))
  } catch (error) {
    console.error('Failed to fetch user project access:', error)
    throw error
  }
}

async function fetchUserTeamMemberships(userId: string): Promise<TeamMembership[]> {
  try {
    const token = await window.Clerk?.session?.getToken()
    if (!token) throw new Error('No authentication token')
    
    const response = await fetch(`/api/users/${userId}/team-memberships`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch team memberships: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.map((membership: any) => ({
      teamId: membership.team_id,
      role: membership.role as UserRole,
      joinedAt: new Date(membership.joined_at)
    }))
  } catch (error) {
    console.error('Failed to fetch user team memberships:', error)
    throw error
  }
}

// Hook for checking specific permissions
export function usePermission(permission: Permission) {
  const { hasPermission, isLoading } = useRBAC()
  
  return {
    hasPermission: hasPermission(permission),
    isLoading,
  }
}

// Hook for project-specific permissions
export function useProjectPermissions(projectId: string) {
  const rbac = useRBAC()
  
  return {
    canAccess: rbac.canAccessProject(projectId),
    canRead: rbac.canPerformProjectAction(projectId, Permission.READ_PROJECT),
    canUpdate: rbac.canPerformProjectAction(projectId, Permission.UPDATE_PROJECT),
    canDelete: rbac.canPerformProjectAction(projectId, Permission.DELETE_PROJECT),
    canCreateEpic: rbac.canPerformProjectAction(projectId, Permission.CREATE_EPIC),
    canCreateStory: rbac.canPerformProjectAction(projectId, Permission.CREATE_STORY),
    canCreateTask: rbac.canPerformProjectAction(projectId, Permission.CREATE_TASK),
    permissions: rbac.getProjectPermissions(projectId),
    isLoading: rbac.isLoading,
  }
}

// Hook for filtering data based on permissions
export function useSecureData() {
  const rbac = useRBAC()
  
  return {
    filterProjects: (projects: any[]) => rbac.filterAccessibleProjects(projects),
    canModifyStory: (story: any) => rbac.canModifyResource(story, Permission.UPDATE_STORY),
    canModifyTask: (task: any) => rbac.canModifyResource(task, Permission.UPDATE_TASK),
    canModifyEpic: (epic: any) => rbac.canModifyResource(epic, Permission.UPDATE_EPIC),
    canAssignUsers: rbac.canAssignToProject(),
    isLoading: rbac.isLoading,
  }
} 