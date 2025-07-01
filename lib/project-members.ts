/**
 * Project Members Management Utility
 * 
 * Provides functions for managing project memberships with proper RBAC checks.
 * Used by React components and API routes.
 */

import { createClerkSupabaseClient } from '@/lib/supabase';
import { Database } from '@/lib/database.types';

export type ProjectMemberRole = Database['public']['Enums']['project_member_role'];

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface ProjectMembershipResult {
  success: boolean;
  error?: string;
  data?: any;
}

export class ProjectMembersService {
  constructor(private supabaseAccessToken: string) {}

  private getClient() {
    return createClerkSupabaseClient(this.supabaseAccessToken);
  }

  /**
   * Get all members of a project
   */
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch project members: ${error.message}`);
    }

    return (data || []).map(member => ({
      ...member,
      user: member.profiles ? {
        id: member.profiles.id,
        name: member.profiles.name,
        email: member.profiles.email,
        avatar_url: member.profiles.avatar_url,
      } : undefined
    }));
  }

  /**
   * Add a user to a project
   */
  async addProjectMember(
    projectId: string, 
    userId: string, 
    role: ProjectMemberRole = 'viewer'
  ): Promise<ProjectMembershipResult> {
    const supabase = this.getClient();

    try {
      const { data, error } = await supabase
        .rpc('add_project_member', {
          p_project_id: projectId,
          p_user_id: userId,
          p_role: role
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remove a user from a project
   */
  async removeProjectMember(
    projectId: string,
    userId: string
  ): Promise<ProjectMembershipResult> {
    const supabase = this.getClient();

    try {
      const { data, error } = await supabase
        .rpc('remove_project_member', {
          p_project_id: projectId,
          p_user_id: userId
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update a user's role in a project
   */
  async updateProjectMemberRole(
    projectId: string,
    userId: string,
    newRole: ProjectMemberRole
  ): Promise<ProjectMembershipResult> {
    const supabase = this.getClient();

    try {
      const { data, error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .select();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data?.[0]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if a user has access to a project
   */
  async hasProjectAccess(projectId: string, userId?: string): Promise<boolean> {
    const supabase = this.getClient();

    try {
      const { data, error } = await supabase
        .rpc('has_project_access', {
          project_uuid: projectId,
          user_uuid: userId
        });

      if (error) {
        console.error('Error checking project access:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking project access:', error);
      return false;
    }
  }

  /**
   * Get a user's role in a project
   */
  async getUserProjectRole(projectId: string, userId: string): Promise<ProjectMemberRole | null> {
    const supabase = this.getClient();

    try {
      // First check if user is project owner
      const { data: project } = await supabase
        .from('projects')
        .select('created_by, owner_id')
        .eq('id', projectId)
        .single();

      if (project && (project.created_by === userId || project.owner_id === userId)) {
        return 'admin'; // Owners have admin-level access
      }

      // Check explicit project membership
      const { data: membership } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();

      return membership?.role || null;
    } catch (error) {
      console.error('Error getting user project role:', error);
      return null;
    }
  }

  /**
   * Get available users that can be added to a project
   */
  async getAvailableUsers(projectId: string, searchTerm?: string): Promise<any[]> {
    const supabase = this.getClient();

    try {
      // Get all active users
      let query = supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .neq('is_admin', true); // Exclude global admins from the list

      // Apply search filter if provided
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data: allUsers, error: usersError } = await query;

      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      // Get existing project members
      const { data: existingMembers, error: membersError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);

      if (membersError) {
        throw new Error(`Failed to fetch project members: ${membersError.message}`);
      }

      // Filter out existing members
      const existingMemberIds = new Set(existingMembers?.map(m => m.user_id) || []);
      const availableUsers = (allUsers || []).filter(user => !existingMemberIds.has(user.id));

      return availableUsers;
    } catch (error) {
      console.error('Error getting available users:', error);
      return [];
    }
  }

  /**
   * Bulk add multiple users to a project
   */
  async addMultipleMembers(
    projectId: string,
    userRoles: Array<{ userId: string; role: ProjectMemberRole }>
  ): Promise<ProjectMembershipResult> {
    const results = [];
    const errors = [];

    for (const { userId, role } of userRoles) {
      const result = await this.addProjectMember(projectId, userId, role);
      if (result.success) {
        results.push(result);
      } else {
        errors.push(`${userId}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      data: results,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  }
}

/**
 * Role-based permission utilities
 */
export const ProjectPermissions = {
  canRead: (role: ProjectMemberRole | null): boolean => {
    return role !== null;
  },

  canCreate: (role: ProjectMemberRole | null): boolean => {
    return role !== null; // All members can create content
  },

  canUpdate: (role: ProjectMemberRole | null): boolean => {
    return role !== null; // All members can update content
  },

  canDelete: (role: ProjectMemberRole | null): boolean => {
    return role === 'editor' || role === 'admin';
  },

  canManageMembers: (role: ProjectMemberRole | null): boolean => {
    return role === 'admin';
  },

  canAssignAdminRole: (role: ProjectMemberRole | null, isOwner: boolean): boolean => {
    return isOwner; // Only project owners can assign admin role
  },

  getRoleDescription: (role: ProjectMemberRole): string => {
    switch (role) {
      case 'viewer':
        return 'Can view project content but cannot make changes';
      case 'editor':
        return 'Can view, create, update, and delete project content';
      case 'admin':
        return 'Full access including member management (except granting admin role)';
      default:
        return 'Unknown role';
    }
  },

  getRoleColor: (role: ProjectMemberRole): string => {
    switch (role) {
      case 'viewer':
        return 'bg-blue-100 text-blue-800';
      case 'editor':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
};

/**
 * Helper function to create service instance with current user's token
 */
export const createProjectMembersService = async (): Promise<ProjectMembersService> => {
  if (typeof window === 'undefined') {
    throw new Error('ProjectMembersService can only be used on the client side');
  }

  const token = await window.Clerk?.session?.getToken({ template: 'supabase' });
  if (!token) {
    throw new Error('No authentication token available');
  }

  return new ProjectMembersService(token);
}; 