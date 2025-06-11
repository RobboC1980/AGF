"""
Enterprise-Level Role-Based Access Control (RBAC) System
Provides comprehensive authorization with roles, permissions, and resource-based access control.
"""

from enum import Enum
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
import json
import logging

logger = logging.getLogger(__name__)

# =====================================
# PERMISSION SYSTEM
# =====================================

class Permission(str, Enum):
    """System-wide permissions"""
    
    # User Management
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    USER_MANAGE_ROLES = "user:manage_roles"
    USER_IMPERSONATE = "user:impersonate"
    
    # Organization Management
    ORG_CREATE = "org:create"
    ORG_READ = "org:read"
    ORG_UPDATE = "org:update"
    ORG_DELETE = "org:delete"
    ORG_MANAGE_MEMBERS = "org:manage_members"
    ORG_MANAGE_BILLING = "org:manage_billing"
    ORG_MANAGE_SETTINGS = "org:manage_settings"
    
    # Team Management
    TEAM_CREATE = "team:create"
    TEAM_READ = "team:read"
    TEAM_UPDATE = "team:update"
    TEAM_DELETE = "team:delete"
    TEAM_MANAGE_MEMBERS = "team:manage_members"
    
    # Project Management
    PROJECT_CREATE = "project:create"
    PROJECT_READ = "project:read"
    PROJECT_UPDATE = "project:update"
    PROJECT_DELETE = "project:delete"
    PROJECT_MANAGE_MEMBERS = "project:manage_members"
    PROJECT_MANAGE_SETTINGS = "project:manage_settings"
    PROJECT_ARCHIVE = "project:archive"
    
    # Epic Management
    EPIC_CREATE = "epic:create"
    EPIC_READ = "epic:read"
    EPIC_UPDATE = "epic:update"
    EPIC_DELETE = "epic:delete"
    EPIC_ASSIGN = "epic:assign"
    
    # Story Management
    STORY_CREATE = "story:create"
    STORY_READ = "story:read"
    STORY_UPDATE = "story:update"
    STORY_DELETE = "story:delete"
    STORY_ASSIGN = "story:assign"
    STORY_TRANSITION = "story:transition"
    
    # Task Management
    TASK_CREATE = "task:create"
    TASK_READ = "task:read"
    TASK_UPDATE = "task:update"
    TASK_DELETE = "task:delete"
    TASK_ASSIGN = "task:assign"
    TASK_TRANSITION = "task:transition"
    
    # Sprint Management
    SPRINT_CREATE = "sprint:create"
    SPRINT_READ = "sprint:read"
    SPRINT_UPDATE = "sprint:update"
    SPRINT_DELETE = "sprint:delete"
    SPRINT_START = "sprint:start"
    SPRINT_COMPLETE = "sprint:complete"
    
    # Release Management
    RELEASE_CREATE = "release:create"
    RELEASE_READ = "release:read"
    RELEASE_UPDATE = "release:update"
    RELEASE_DELETE = "release:delete"
    RELEASE_DEPLOY = "release:deploy"
    
    # Comment & Communication
    COMMENT_CREATE = "comment:create"
    COMMENT_READ = "comment:read"
    COMMENT_UPDATE = "comment:update"
    COMMENT_DELETE = "comment:delete"
    COMMENT_MODERATE = "comment:moderate"
    
    # Time Tracking
    TIME_LOG = "time:log"
    TIME_READ = "time:read"
    TIME_UPDATE = "time:update"
    TIME_DELETE = "time:delete"
    TIME_APPROVE = "time:approve"
    
    # Reporting & Analytics
    ANALYTICS_READ = "analytics:read"
    ANALYTICS_EXPORT = "analytics:export"
    ANALYTICS_ADVANCED = "analytics:advanced"
    
    # System Administration
    SYSTEM_ADMIN = "system:admin"
    SYSTEM_AUDIT = "system:audit"
    SYSTEM_BACKUP = "system:backup"
    SYSTEM_MAINTENANCE = "system:maintenance"
    
    # AI Features
    AI_GENERATE_STORIES = "ai:generate_stories"
    AI_GENERATE_TASKS = "ai:generate_tasks"
    AI_ANALYZE = "ai:analyze"
    AI_SUGGEST = "ai:suggest"
    
    # Billing & Subscription
    BILLING_READ = "billing:read"
    BILLING_MANAGE = "billing:manage"
    BILLING_ADMIN = "billing:admin"

class ResourceType(str, Enum):
    """Resource types for resource-based permissions"""
    ORGANIZATION = "organization"
    TEAM = "team"
    PROJECT = "project"
    EPIC = "epic"
    STORY = "story"
    TASK = "task"
    SPRINT = "sprint"
    RELEASE = "release"
    USER = "user"

class Role(str, Enum):
    """System roles with hierarchical permissions"""
    
    # System-level roles
    SUPER_ADMIN = "super_admin"
    SYSTEM_ADMIN = "system_admin"
    
    # Organization-level roles
    ORG_OWNER = "org_owner"
    ORG_ADMIN = "org_admin"
    ORG_MEMBER = "org_member"
    
    # Team-level roles
    TEAM_LEAD = "team_lead"
    TEAM_MEMBER = "team_member"
    
    # Project-level roles
    PROJECT_MANAGER = "project_manager"
    PRODUCT_OWNER = "product_owner"
    SCRUM_MASTER = "scrum_master"
    TECH_LEAD = "tech_lead"
    
    # Functional roles
    DEVELOPER = "developer"
    SENIOR_DEVELOPER = "senior_developer"
    TESTER = "tester"
    DESIGNER = "designer"
    ANALYST = "analyst"
    STAKEHOLDER = "stakeholder"
    
    # Read-only roles
    VIEWER = "viewer"
    GUEST = "guest"

@dataclass
class RolePermissions:
    """Role with its associated permissions"""
    role: Role
    permissions: Set[Permission]
    inherits_from: Optional[List[Role]] = None
    description: str = ""

@dataclass
class ResourcePermission:
    """Resource-specific permission"""
    resource_type: ResourceType
    resource_id: str
    permission: Permission
    granted_by: str
    granted_at: datetime
    expires_at: Optional[datetime] = None

@dataclass
class UserRole:
    """User role assignment"""
    user_id: str
    role: Role
    resource_type: Optional[ResourceType] = None
    resource_id: Optional[str] = None
    granted_by: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool = True

class RBACManager:
    """Role-Based Access Control Manager"""
    
    def __init__(self):
        self._role_permissions = self._initialize_role_permissions()
        self._user_roles: Dict[str, List[UserRole]] = {}
        self._resource_permissions: Dict[str, List[ResourcePermission]] = {}
        
    def _initialize_role_permissions(self) -> Dict[Role, RolePermissions]:
        """Initialize role permissions hierarchy"""
        
        # Base permissions for different role types
        base_read_permissions = {
            Permission.USER_READ, Permission.ORG_READ, Permission.TEAM_READ,
            Permission.PROJECT_READ, Permission.EPIC_READ, Permission.STORY_READ,
            Permission.TASK_READ, Permission.COMMENT_READ, Permission.TIME_READ
        }
        
        viewer_permissions = base_read_permissions.copy()
        
        guest_permissions = {
            Permission.PROJECT_READ, Permission.EPIC_READ, Permission.STORY_READ,
            Permission.TASK_READ, Permission.COMMENT_READ
        }
        
        developer_permissions = base_read_permissions | {
            Permission.STORY_UPDATE, Permission.TASK_CREATE, Permission.TASK_UPDATE,
            Permission.TASK_ASSIGN, Permission.TASK_TRANSITION, Permission.COMMENT_CREATE,
            Permission.COMMENT_UPDATE, Permission.TIME_LOG, Permission.TIME_UPDATE
        }
        
        senior_developer_permissions = developer_permissions | {
            Permission.EPIC_UPDATE, Permission.STORY_CREATE, Permission.STORY_ASSIGN,
            Permission.STORY_TRANSITION, Permission.TASK_DELETE, Permission.COMMENT_DELETE
        }
        
        tester_permissions = base_read_permissions | {
            Permission.TASK_UPDATE, Permission.TASK_TRANSITION, Permission.COMMENT_CREATE,
            Permission.COMMENT_UPDATE, Permission.TIME_LOG
        }
        
        designer_permissions = base_read_permissions | {
            Permission.STORY_UPDATE, Permission.TASK_UPDATE, Permission.COMMENT_CREATE,
            Permission.COMMENT_UPDATE, Permission.TIME_LOG
        }
        
        analyst_permissions = base_read_permissions | {
            Permission.ANALYTICS_READ, Permission.ANALYTICS_EXPORT, Permission.COMMENT_CREATE
        }
        
        scrum_master_permissions = developer_permissions | {
            Permission.SPRINT_CREATE, Permission.SPRINT_UPDATE, Permission.SPRINT_START,
            Permission.SPRINT_COMPLETE, Permission.STORY_CREATE, Permission.STORY_ASSIGN,
            Permission.TASK_ASSIGN, Permission.ANALYTICS_READ
        }
        
        tech_lead_permissions = senior_developer_permissions | {
            Permission.EPIC_CREATE, Permission.EPIC_ASSIGN, Permission.STORY_DELETE,
            Permission.TASK_DELETE, Permission.SPRINT_READ, Permission.ANALYTICS_READ,
            Permission.AI_GENERATE_STORIES, Permission.AI_GENERATE_TASKS
        }
        
        product_owner_permissions = base_read_permissions | {
            Permission.EPIC_CREATE, Permission.EPIC_UPDATE, Permission.EPIC_DELETE,
            Permission.EPIC_ASSIGN, Permission.STORY_CREATE, Permission.STORY_UPDATE,
            Permission.STORY_DELETE, Permission.STORY_ASSIGN, Permission.STORY_TRANSITION,
            Permission.SPRINT_READ, Permission.RELEASE_CREATE, Permission.RELEASE_UPDATE,
            Permission.ANALYTICS_READ, Permission.AI_GENERATE_STORIES
        }
        
        project_manager_permissions = product_owner_permissions | {
            Permission.PROJECT_UPDATE, Permission.PROJECT_MANAGE_MEMBERS,
            Permission.TEAM_MANAGE_MEMBERS, Permission.SPRINT_CREATE, Permission.SPRINT_UPDATE,
            Permission.SPRINT_DELETE, Permission.RELEASE_DELETE, Permission.ANALYTICS_ADVANCED,
            Permission.TIME_APPROVE, Permission.AI_ANALYZE
        }
        
        team_lead_permissions = project_manager_permissions | {
            Permission.TEAM_CREATE, Permission.TEAM_UPDATE, Permission.TEAM_DELETE,
            Permission.PROJECT_CREATE, Permission.USER_UPDATE
        }
        
        org_member_permissions = viewer_permissions | {
            Permission.COMMENT_CREATE, Permission.TIME_LOG
        }
        
        org_admin_permissions = team_lead_permissions | {
            Permission.ORG_UPDATE, Permission.ORG_MANAGE_MEMBERS, Permission.ORG_MANAGE_SETTINGS,
            Permission.USER_CREATE, Permission.USER_DELETE, Permission.USER_MANAGE_ROLES,
            Permission.PROJECT_DELETE, Permission.PROJECT_ARCHIVE, Permission.BILLING_READ
        }
        
        org_owner_permissions = org_admin_permissions | {
            Permission.ORG_DELETE, Permission.ORG_MANAGE_BILLING, Permission.BILLING_MANAGE,
            Permission.SYSTEM_AUDIT
        }
        
        system_admin_permissions = org_owner_permissions | {
            Permission.ORG_CREATE, Permission.USER_IMPERSONATE, Permission.SYSTEM_ADMIN,
            Permission.SYSTEM_BACKUP, Permission.SYSTEM_MAINTENANCE, Permission.BILLING_ADMIN,
            Permission.COMMENT_MODERATE
        }
        
        super_admin_permissions = system_admin_permissions | {
            Permission.SYSTEM_AUDIT, Permission.AI_SUGGEST
        }
        
        return {
            Role.GUEST: RolePermissions(Role.GUEST, guest_permissions, description="Guest user with limited read access"),
            Role.VIEWER: RolePermissions(Role.VIEWER, viewer_permissions, description="Read-only access to most resources"),
            Role.DEVELOPER: RolePermissions(Role.DEVELOPER, developer_permissions, description="Standard developer permissions"),
            Role.SENIOR_DEVELOPER: RolePermissions(Role.SENIOR_DEVELOPER, senior_developer_permissions, [Role.DEVELOPER], "Senior developer with additional permissions"),
            Role.TESTER: RolePermissions(Role.TESTER, tester_permissions, description="Quality assurance and testing permissions"),
            Role.DESIGNER: RolePermissions(Role.DESIGNER, designer_permissions, description="Design and UX permissions"),
            Role.ANALYST: RolePermissions(Role.ANALYST, analyst_permissions, description="Business analyst permissions"),
            Role.SCRUM_MASTER: RolePermissions(Role.SCRUM_MASTER, scrum_master_permissions, [Role.DEVELOPER], "Scrum master permissions"),
            Role.TECH_LEAD: RolePermissions(Role.TECH_LEAD, tech_lead_permissions, [Role.SENIOR_DEVELOPER], "Technical leadership permissions"),
            Role.PRODUCT_OWNER: RolePermissions(Role.PRODUCT_OWNER, product_owner_permissions, description="Product ownership permissions"),
            Role.PROJECT_MANAGER: RolePermissions(Role.PROJECT_MANAGER, project_manager_permissions, [Role.PRODUCT_OWNER], "Project management permissions"),
            Role.TEAM_LEAD: RolePermissions(Role.TEAM_LEAD, team_lead_permissions, [Role.PROJECT_MANAGER], "Team leadership permissions"),
            Role.TEAM_MEMBER: RolePermissions(Role.TEAM_MEMBER, developer_permissions, [Role.DEVELOPER], "Standard team member"),
            Role.ORG_MEMBER: RolePermissions(Role.ORG_MEMBER, org_member_permissions, description="Organization member"),
            Role.ORG_ADMIN: RolePermissions(Role.ORG_ADMIN, org_admin_permissions, [Role.TEAM_LEAD], "Organization administrator"),
            Role.ORG_OWNER: RolePermissions(Role.ORG_OWNER, org_owner_permissions, [Role.ORG_ADMIN], "Organization owner"),
            Role.SYSTEM_ADMIN: RolePermissions(Role.SYSTEM_ADMIN, system_admin_permissions, [Role.ORG_OWNER], "System administrator"),
            Role.SUPER_ADMIN: RolePermissions(Role.SUPER_ADMIN, super_admin_permissions, [Role.SYSTEM_ADMIN], "Super administrator"),
            Role.STAKEHOLDER: RolePermissions(Role.STAKEHOLDER, viewer_permissions | {Permission.COMMENT_CREATE}, description="External stakeholder")
        }
    
    def get_role_permissions(self, role: Role) -> Set[Permission]:
        """Get all permissions for a role including inherited permissions"""
        if role not in self._role_permissions:
            return set()
        
        role_perms = self._role_permissions[role]
        permissions = role_perms.permissions.copy()
        
        # Add inherited permissions
        if role_perms.inherits_from:
            for inherited_role in role_perms.inherits_from:
                permissions.update(self.get_role_permissions(inherited_role))
        
        return permissions
    
    def assign_role(self, user_id: str, role: Role, resource_type: Optional[ResourceType] = None, 
                   resource_id: Optional[str] = None, granted_by: str = "system",
                   expires_at: Optional[datetime] = None) -> bool:
        """Assign a role to a user"""
        try:
            if user_id not in self._user_roles:
                self._user_roles[user_id] = []
            
            user_role = UserRole(
                user_id=user_id,
                role=role,
                resource_type=resource_type,
                resource_id=resource_id,
                granted_by=granted_by,
                granted_at=datetime.utcnow(),
                expires_at=expires_at
            )
            
            self._user_roles[user_id].append(user_role)
            logger.info(f"Assigned role {role} to user {user_id} for resource {resource_type}:{resource_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to assign role {role} to user {user_id}: {e}")
            return False
    
    def revoke_role(self, user_id: str, role: Role, resource_type: Optional[ResourceType] = None,
                   resource_id: Optional[str] = None) -> bool:
        """Revoke a role from a user"""
        try:
            if user_id not in self._user_roles:
                return False
            
            user_roles = self._user_roles[user_id]
            for user_role in user_roles:
                if (user_role.role == role and 
                    user_role.resource_type == resource_type and 
                    user_role.resource_id == resource_id):
                    user_role.is_active = False
                    logger.info(f"Revoked role {role} from user {user_id} for resource {resource_type}:{resource_id}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to revoke role {role} from user {user_id}: {e}")
            return False
    
    def get_user_roles(self, user_id: str) -> List[UserRole]:
        """Get all active roles for a user"""
        if user_id not in self._user_roles:
            return []
        
        now = datetime.utcnow()
        active_roles = []
        
        for user_role in self._user_roles[user_id]:
            if (user_role.is_active and 
                (user_role.expires_at is None or user_role.expires_at > now)):
                active_roles.append(user_role)
        
        return active_roles
    
    def get_user_permissions(self, user_id: str, resource_type: Optional[ResourceType] = None,
                           resource_id: Optional[str] = None) -> Set[Permission]:
        """Get all permissions for a user in a specific context"""
        user_roles = self.get_user_roles(user_id)
        permissions = set()
        
        for user_role in user_roles:
            # Global roles apply everywhere
            if user_role.resource_type is None:
                permissions.update(self.get_role_permissions(user_role.role))
            
            # Resource-specific roles
            elif (resource_type and user_role.resource_type == resource_type and
                  user_role.resource_id == resource_id):
                permissions.update(self.get_role_permissions(user_role.role))
        
        return permissions
    
    def has_permission(self, user_id: str, permission: Permission, 
                      resource_type: Optional[ResourceType] = None,
                      resource_id: Optional[str] = None) -> bool:
        """Check if user has a specific permission"""
        user_permissions = self.get_user_permissions(user_id, resource_type, resource_id)
        return permission in user_permissions
    
    def has_any_permission(self, user_id: str, permissions: List[Permission],
                          resource_type: Optional[ResourceType] = None,
                          resource_id: Optional[str] = None) -> bool:
        """Check if user has any of the specified permissions"""
        user_permissions = self.get_user_permissions(user_id, resource_type, resource_id)
        return any(perm in user_permissions for perm in permissions)
    
    def has_all_permissions(self, user_id: str, permissions: List[Permission],
                           resource_type: Optional[ResourceType] = None,
                           resource_id: Optional[str] = None) -> bool:
        """Check if user has all of the specified permissions"""
        user_permissions = self.get_user_permissions(user_id, resource_type, resource_id)
        return all(perm in user_permissions for perm in permissions)
    
    def is_admin(self, user_id: str, resource_type: Optional[ResourceType] = None,
                resource_id: Optional[str] = None) -> bool:
        """Check if user has admin privileges"""
        admin_permissions = [
            Permission.SYSTEM_ADMIN, Permission.ORG_ADMIN, 
            Permission.PROJECT_MANAGE_MEMBERS, Permission.TEAM_MANAGE_MEMBERS
        ]
        return self.has_any_permission(user_id, admin_permissions, resource_type, resource_id)
    
    def can_access_resource(self, user_id: str, resource_type: ResourceType,
                           resource_id: str, permission: Permission) -> bool:
        """Check if user can access a specific resource with given permission"""
        
        # Check direct resource permission
        if self.has_permission(user_id, permission, resource_type, resource_id):
            return True
        
        # Check global permissions
        if self.has_permission(user_id, permission):
            return True
        
        # Check hierarchical permissions (e.g., org admin can access all projects in org)
        # This would require additional logic based on resource hierarchy
        
        return False
    
    def get_accessible_resources(self, user_id: str, resource_type: ResourceType,
                               permission: Permission) -> List[str]:
        """Get list of resource IDs that user can access with given permission"""
        accessible_resources = []
        user_roles = self.get_user_roles(user_id)
        
        for user_role in user_roles:
            if user_role.resource_type == resource_type:
                if permission in self.get_role_permissions(user_role.role):
                    accessible_resources.append(user_role.resource_id)
        
        return accessible_resources

# Global RBAC manager instance
rbac_manager = RBACManager() 