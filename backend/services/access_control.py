"""
SynqForge Access Control Service

Implements the comprehensive access control model as specified:
- Team roles: Team Member, Team Admin
- Project roles: Project Viewer, Project Contributor, Project Admin
- Access resolution with priority order:
  1. Explicit Project Role
  2. Team Inheritance
  3. No Match => No Access
"""

import logging
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from backend.models.database_schema import (
    User, Team, Project, TeamMember, ProjectMember,
    TeamRole, ProjectRole, AccessScope
)

logger = logging.getLogger(__name__)

class Action(str, Enum):
    """Actions that can be performed on resources"""
    # Project actions
    VIEW_PROJECT = "view_project"
    EDIT_PROJECT = "edit_project"
    DELETE_PROJECT = "delete_project"
    ARCHIVE_PROJECT = "archive_project"
    
    # Project management actions
    CREATE_EPIC = "create_epic"
    EDIT_EPIC = "edit_epic"
    DELETE_EPIC = "delete_epic"
    
    CREATE_STORY = "create_story"
    EDIT_STORY = "edit_story"
    DELETE_STORY = "delete_story"
    ASSIGN_STORY = "assign_story"
    
    CREATE_TASK = "create_task"
    EDIT_TASK = "edit_task"
    DELETE_TASK = "delete_task"
    ASSIGN_TASK = "assign_task"
    
    # File and collaboration actions
    UPLOAD_FILE = "upload_file"
    DELETE_FILE = "delete_file"
    CREATE_COMMENT = "create_comment"
    EDIT_COMMENT = "edit_comment"
    DELETE_COMMENT = "delete_comment"
    
    # Project role management
    GRANT_PROJECT_ROLE = "grant_project_role"
    REVOKE_PROJECT_ROLE = "revoke_project_role"
    
    # Team actions
    VIEW_TEAM = "view_team"
    EDIT_TEAM = "edit_team"
    DELETE_TEAM = "delete_team"
    
    # Team member management
    INVITE_TEAM_MEMBER = "invite_team_member"
    REMOVE_TEAM_MEMBER = "remove_team_member"
    PROMOTE_TEAM_ADMIN = "promote_team_admin"
    DEMOTE_TEAM_ADMIN = "demote_team_admin"
    
    # Team project management
    CREATE_PROJECT = "create_project"
    TRANSFER_PROJECT = "transfer_project"

class AccessControlService:
    """Core access control service implementing SynqForge authorization model"""
    
    def __init__(self):
        self.logger = logger
        
        # Define role permissions mapping
        self._team_permissions = {
            TeamRole.TEAM_MEMBER: {
                Action.VIEW_TEAM,
                # Implicit Project Viewer on all team projects
                Action.VIEW_PROJECT,
            },
            TeamRole.TEAM_ADMIN: {
                Action.VIEW_TEAM,
                Action.EDIT_TEAM,
                Action.DELETE_TEAM,
                Action.INVITE_TEAM_MEMBER,
                Action.REMOVE_TEAM_MEMBER,
                Action.PROMOTE_TEAM_ADMIN,
                Action.DEMOTE_TEAM_ADMIN,
                Action.CREATE_PROJECT,
                Action.TRANSFER_PROJECT,
                Action.GRANT_PROJECT_ROLE,
                Action.REVOKE_PROJECT_ROLE,
                # Implicit Project Admin on all team projects
                Action.VIEW_PROJECT,
                Action.EDIT_PROJECT,
                Action.DELETE_PROJECT,
                Action.ARCHIVE_PROJECT,
                Action.CREATE_EPIC,
                Action.EDIT_EPIC,
                Action.DELETE_EPIC,
                Action.CREATE_STORY,
                Action.EDIT_STORY,
                Action.DELETE_STORY,
                Action.ASSIGN_STORY,
                Action.CREATE_TASK,
                Action.EDIT_TASK,
                Action.DELETE_TASK,
                Action.ASSIGN_TASK,
                Action.UPLOAD_FILE,
                Action.DELETE_FILE,
                Action.CREATE_COMMENT,
                Action.EDIT_COMMENT,
                Action.DELETE_COMMENT,
            }
        }
        
        self._project_permissions = {
            ProjectRole.PROJECT_VIEWER: {
                Action.VIEW_PROJECT,
            },
            ProjectRole.PROJECT_CONTRIBUTOR: {
                Action.VIEW_PROJECT,
                Action.CREATE_STORY,
                Action.EDIT_STORY,
                Action.CREATE_TASK,
                Action.EDIT_TASK,
                Action.UPLOAD_FILE,
                Action.CREATE_COMMENT,
                Action.EDIT_COMMENT,
            },
            ProjectRole.PROJECT_ADMIN: {
                Action.VIEW_PROJECT,
                Action.EDIT_PROJECT,
                Action.DELETE_PROJECT,
                Action.ARCHIVE_PROJECT,
                Action.CREATE_EPIC,
                Action.EDIT_EPIC,
                Action.DELETE_EPIC,
                Action.CREATE_STORY,
                Action.EDIT_STORY,
                Action.DELETE_STORY,
                Action.ASSIGN_STORY,
                Action.CREATE_TASK,
                Action.EDIT_TASK,
                Action.DELETE_TASK,
                Action.ASSIGN_TASK,
                Action.UPLOAD_FILE,
                Action.DELETE_FILE,
                Action.CREATE_COMMENT,
                Action.EDIT_COMMENT,
                Action.DELETE_COMMENT,
                Action.GRANT_PROJECT_ROLE,
                Action.REVOKE_PROJECT_ROLE,
            }
        }
    
    def can(self, db: Session, user_id: str, action: Action, project_id: str) -> bool:
        """
        Main authorization check - determines if user can perform action on project
        
        Implements priority order:
        1. Explicit Project Role - if user has direct project role, use it
        2. Team Inheritance - if no explicit role, check team membership
        3. No Match => No Access - deny by default
        """
        try:
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
            
        except Exception as e:
            self.logger.error(f"Error checking permissions for user {user_id}, action {action}, project {project_id}: {str(e)}")
            return False
    
    def can_team_action(self, db: Session, user_id: str, action: Action, team_id: str) -> bool:
        """Check if user can perform team-level action"""
        try:
            team_role = self._get_team_role(db, user_id, team_id)
            if team_role:
                return self._has_team_permission(team_role, action)
            return False
        except Exception as e:
            self.logger.error(f"Error checking team permissions for user {user_id}, action {action}, team {team_id}: {str(e)}")
            return False
    
    def get_user_project_role(self, db: Session, user_id: str, project_id: str) -> Optional[str]:
        """Get the effective role a user has on a project (for UI display)"""
        try:
            # Check explicit project role first
            project_role = self._get_project_role(db, user_id, project_id)
            if project_role:
                return project_role.value
            
            # Check team inheritance
            team_role = self._get_team_role_for_project(db, user_id, project_id)
            if team_role == TeamRole.TEAM_ADMIN:
                return ProjectRole.PROJECT_ADMIN.value
            elif team_role == TeamRole.TEAM_MEMBER:
                return ProjectRole.PROJECT_VIEWER.value
            
            return None
        except Exception as e:
            self.logger.error(f"Error getting user project role: {str(e)}")
            return None
    
    def get_user_team_role(self, db: Session, user_id: str, team_id: str) -> Optional[str]:
        """Get the role a user has on a team"""
        try:
            team_role = self._get_team_role(db, user_id, team_id)
            return team_role.value if team_role else None
        except Exception as e:
            self.logger.error(f"Error getting user team role: {str(e)}")
            return None
    
    def get_accessible_projects(self, db: Session, user_id: str) -> List[str]:
        """Get list of project IDs the user has access to"""
        try:
            project_ids = set()
            
            # Add projects with explicit roles
            explicit_projects = db.query(ProjectMember.project_id).filter(
                and_(
                    ProjectMember.user_id == user_id,
                    ProjectMember.is_active == True
                )
            ).all()
            project_ids.update([p.project_id for p in explicit_projects])
            
            # Add projects from team memberships
            team_projects = db.query(Project.id).join(Team).join(TeamMember).filter(
                and_(
                    TeamMember.user_id == user_id,
                    TeamMember.is_active == True
                )
            ).all()
            project_ids.update([p.id for p in team_projects])
            
            return list(project_ids)
        except Exception as e:
            self.logger.error(f"Error getting accessible projects: {str(e)}")
            return []
    
    def grant_project_role(self, db: Session, granter_id: str, user_id: str, project_id: str, role: ProjectRole) -> bool:
        """Grant a project role to a user (with authorization check)"""
        try:
            # Check if granter has permission
            if not self.can(db, granter_id, Action.GRANT_PROJECT_ROLE, project_id):
                self.logger.warning(f"User {granter_id} attempted to grant role without permission")
                return False
            
            # Check if membership already exists
            existing = db.query(ProjectMember).filter(
                and_(
                    ProjectMember.project_id == project_id,
                    ProjectMember.user_id == user_id
                )
            ).first()
            
            if existing:
                # Update existing role
                existing.role = role
                existing.is_active = True
                existing.granted_by = granter_id
            else:
                # Create new membership
                membership = ProjectMember(
                    project_id=project_id,
                    user_id=user_id,
                    role=role,
                    granted_by=granter_id
                )
                db.add(membership)
            
            db.commit()
            self.logger.info(f"Granted {role.value} role to user {user_id} on project {project_id} by {granter_id}")
            return True
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Error granting project role: {str(e)}")
            return False
    
    def revoke_project_role(self, db: Session, revoker_id: str, user_id: str, project_id: str) -> bool:
        """Revoke a project role from a user"""
        try:
            # Check if revoker has permission
            if not self.can(db, revoker_id, Action.REVOKE_PROJECT_ROLE, project_id):
                self.logger.warning(f"User {revoker_id} attempted to revoke role without permission")
                return False
            
            # Deactivate membership
            membership = db.query(ProjectMember).filter(
                and_(
                    ProjectMember.project_id == project_id,
                    ProjectMember.user_id == user_id,
                    ProjectMember.is_active == True
                )
            ).first()
            
            if membership:
                membership.is_active = False
                db.commit()
                self.logger.info(f"Revoked project role from user {user_id} on project {project_id} by {revoker_id}")
                return True
            
            return False
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Error revoking project role: {str(e)}")
            return False
    
    def _get_project_role(self, db: Session, user_id: str, project_id: str) -> Optional[ProjectRole]:
        """Get explicit project role for user"""
        membership = db.query(ProjectMember).filter(
            and_(
                ProjectMember.user_id == user_id,
                ProjectMember.project_id == project_id,
                ProjectMember.is_active == True
            )
        ).first()
        
        return membership.role if membership else None
    
    def _get_team_role(self, db: Session, user_id: str, team_id: str) -> Optional[TeamRole]:
        """Get team role for user"""
        membership = db.query(TeamMember).filter(
            and_(
                TeamMember.user_id == user_id,
                TeamMember.team_id == team_id,
                TeamMember.is_active == True
            )
        ).first()
        
        return membership.role if membership else None
    
    def _get_team_role_for_project(self, db: Session, user_id: str, project_id: str) -> Optional[TeamRole]:
        """Get team role for user via project's team"""
        # Get project's team
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project or not project.team_id:
            return None
        
        return self._get_team_role(db, user_id, project.team_id)
    
    def _has_project_permission(self, role: ProjectRole, action: Action) -> bool:
        """Check if project role has permission for action"""
        return action in self._project_permissions.get(role, set())
    
    def _has_team_permission(self, role: TeamRole, action: Action) -> bool:
        """Check if team role has permission for action"""
        return action in self._team_permissions.get(role, set())

# Global instance
access_control = AccessControlService() 